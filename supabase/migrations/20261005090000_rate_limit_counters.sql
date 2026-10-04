-- B9 — Durable rate limiting for public submission surfaces.
--
-- Purpose: the public write endpoints (custom-order reference uploads and
-- submissions, appointment requests, order placement) and the admin write
-- actions are all unauthenticated or lightly authenticated and each one costs
-- real work — a Storage object, a database row, or a signed URL. Without a
-- limiter a single script can fill the private bucket or spam the studio's
-- inbox, and Vercel's edge protection does not know which endpoints matter.
--
-- Why this is a table and not memory: Vercel runs each request in a short-lived
-- serverless instance, so an in-process counter would be per-instance and reset
-- on every cold start — it would not limit anything. Postgres is already the
-- system of record, so the counter lives there and is shared by every instance.
--
-- Fixed windows, not a sliding log. One row per (key, window) keeps the write
-- volume at one upsert per request instead of one insert per hit, and the
-- atomicity of a single `insert ... on conflict` is what makes the count exact
-- under concurrency.
--
-- The key never contains a raw IP address: callers pass a keyed hash (see
-- src/lib/security/rate-limit.ts), so this table cannot become a log of who
-- visited the site.

create table if not exists public.rate_limit_counters (
  key           text        not null,
  window_start  timestamptz not null,
  hits          integer     not null default 0,
  updated_at    timestamptz not null default now(),

  constraint rate_limit_counters_pkey primary key (key, window_start),
  constraint rate_limit_counters_hits_non_negative check (hits >= 0)
);

comment on table public.rate_limit_counters is
  'Fixed-window rate limit counters. key is a keyed hash of the caller, never a raw identifier. Maintained only by public.consume_rate_limit().';

-- Pruning deletes by window_start, so that is the index that matters.
create index if not exists rate_limit_counters_window_start_idx
  on public.rate_limit_counters (window_start);

alter table public.rate_limit_counters enable row level security;

-- No policies are created. The application connects as the table owner, which
-- bypasses RLS; every other role is denied below, so this table is reachable
-- only through the function.
revoke all on table public.rate_limit_counters from anon, authenticated;

/**
 * Consumes one unit for `p_key` in the current fixed window.
 *
 * Returns whether the request may proceed, how many requests remain in the
 * window, and when the window rolls over. Callers treat an unavailable result as
 * a refusal rather than a pass (see the fail-closed note in the TypeScript
 * wrapper): a limiter that fails open is not a limiter.
 *
 * `security invoker` deliberately: it runs with the caller's privileges, so
 * granting execute on this function grants nothing else.
 */
create or replace function public.consume_rate_limit(
  p_key           text,
  p_window_seconds integer,
  p_max_hits       integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now          timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_hits         integer;
  v_reset_at     timestamptz;
begin
  if p_key is null or length(p_key) = 0 then
    raise exception 'rate limit key is required';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'rate limit window must be positive';
  end if;
  if p_max_hits is null or p_max_hits <= 0 then
    raise exception 'rate limit maximum must be positive';
  end if;

  -- Date-bucket the window start so every instance agrees on the same bucket.
  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);

  -- Opportunistic retention: counters older than a day cannot affect any
  -- decision, so each call clears a bounded slice rather than needing pg_cron.
  -- Postgres has no LIMIT on DELETE, hence the ctid CTE.
  with expired as (
    select ctid
      from public.rate_limit_counters
     where window_start < v_now - interval '1 day'
     order by window_start
     limit 500
  )
  delete from public.rate_limit_counters c
   using expired e
   where c.ctid = e.ctid;

  insert into public.rate_limit_counters as c (key, window_start, hits, updated_at)
  values (p_key, v_window_start, 1, v_now)
  on conflict (key, window_start) do update
    set hits = c.hits + 1,
        updated_at = v_now
  returning c.hits into v_hits;

  return query select
    (v_hits <= p_max_hits),
    greatest(p_max_hits - v_hits, 0),
    v_reset_at;
end;
$$;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Atomically consumes one unit for a key in a fixed window. Returns allowed, remaining and the window reset time.';

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
