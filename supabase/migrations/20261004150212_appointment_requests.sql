-- B7.1 — Appointment requests.
--
-- Derived strictly from the existing /book-appointment UI
-- (src/data/appointment.ts + src/components/appointment/AppointmentForm.tsx):
--   type (fufs_set | own_set | undecided), preferred date, preferred time,
--   optional alternate date, name, phone, optional email, optional set details,
--   optional notes.
--
-- Request-based by design: a row is a REQUEST for a preferred time, not a
-- confirmed booking. So:
--   • overlapping requested times are NOT rejected — B8 admin decides what gets
--     confirmed and what availability means;
--   • no duration, price, deposit or slot column exists, because none is defined;
--   • no address column exists at all. The exact address is shared by the studio
--     after confirmation and must never be stored or published here.
--
-- Privacy: server-only. RLS is enabled with NO policies and every client grant is
-- revoked, exactly like the custom-order and order tables.

create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),

  -- Client-supplied idempotency key: a double click or retry with the same token
  -- resolves to the same request instead of creating a second one.
  request_token uuid not null unique,

  -- Contact (name, phone and email only — nothing else is collected)
  name text not null,
  phone text not null,
  email text,

  -- The request itself
  service_type text not null,
  preferred_date date not null,
  -- Stored as "HH:mm" text: the value is what the customer chose and is displayed
  -- back verbatim, with no timezone arithmetic. The CHECK keeps the format exact.
  preferred_time text not null,
  alternate_date date,
  set_details text,
  notes text,

  -- Minimal technical lifecycle: a request awaits studio review. B8 extends this
  -- set when confirmation exists; no business status is invented here.
  status text not null default 'pending_review',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointment_requests_name_len check (char_length(name) between 1 and 120),
  constraint appointment_requests_phone_len check (char_length(phone) between 7 and 24),
  constraint appointment_requests_phone_format check (phone ~ '^[+()0-9 .-]+$'),
  constraint appointment_requests_email_len check (email is null or char_length(email) <= 254),
  constraint appointment_requests_email_format check (
    email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  -- Option ids come from APPOINTMENT_SERVICES in the existing UI.
  constraint appointment_requests_service_type_valid check (
    service_type in ('fufs_set', 'own_set', 'undecided')
  ),
  -- "No past dates." Evaluated at write time against the database clock (UTC on
  -- Supabase), which the server-side validation also uses, so the two agree. The
  -- studio serves Pakistan (UTC+5), where a customer's "today" is never behind
  -- the UTC date, so this cannot reject a date the customer considers upcoming.
  constraint appointment_requests_preferred_date_not_past check (preferred_date >= current_date),
  constraint appointment_requests_alternate_date_not_past check (
    alternate_date is null or alternate_date >= current_date
  ),
  constraint appointment_requests_alternate_after_preferred check (
    alternate_date is null or alternate_date <> preferred_date
  ),
  constraint appointment_requests_time_format check (
    preferred_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  constraint appointment_requests_set_details_len check (
    set_details is null or char_length(set_details) <= 500
  ),
  constraint appointment_requests_notes_len check (notes is null or char_length(notes) <= 2000),
  constraint appointment_requests_status_valid check (status in ('pending_review'))
);

-- B8 admin review listing: pending requests, newest first.
create index appointment_requests_status_created_at_idx
  on public.appointment_requests (status, created_at desc);

-- Timestamps: reuse the helper deployed in 20261004114808_catalog_triggers.sql.
create trigger set_appointment_requests_updated_at
  before update on public.appointment_requests
  for each row
  execute function public.set_updated_at();

alter table public.appointment_requests enable row level security;

revoke all privileges on table public.appointment_requests from anon, authenticated;
