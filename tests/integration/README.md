# Live integration tests (opt-in)

These tests drive the **real** Studio server actions against the **real** Supabase
project with a **real** admin session. They are not part of `npm test` and must
never run as part of a normal suite: they write to the live catalogue, upload and
delete Storage objects, and mint temporary auth sessions.

## Safety gate

Every file refuses to run unless `E2E_ALLOW_LIVE_WRITES=1` is set, and refuses
outright when `NODE_ENV=production`. That is deliberate — an accidental
`vitest run` must not touch production data.

## What they need

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | direct catalogue reads for assertions and restoration |
| `SUPABASE_URL` | project URL for Storage and the auth admin API |
| `SUPABASE_SECRET_KEY` | privileged Storage + `auth.admin` access |
| `NEXT_PUBLIC_SUPABASE_URL` | derives the `@supabase/ssr` cookie name |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | exchanges a magic-link token for a session |
| `ADMIN_EMAILS` | the admin whose session the writes run as |
| `E2E_ALLOW_LIVE_WRITES=1` | the safety gate |

## Running

```bash
E2E_ALLOW_LIVE_WRITES=1 npm run test:e2e
```

## If a run is killed

These suites capture the catalogue and `site_content` at the start and write them
back at the end, which is what makes them non-destructive. The consequence is that
a run killed mid-flight (timeout, Ctrl-C, dropped connection) leaves its *current*
state in place, and the next run captures that as its baseline — so the damage
becomes sticky and every later run faithfully preserves it.

Check for drift from the seed and repair it before re-running:

```bash
node scripts/checks/restore-seeded-content.mjs --check   # report, changes nothing
node scripts/checks/restore-seeded-content.mjs --all     # repair from the seed
```

`content.e2e.test.ts` also refuses to start on a blanked announcement or a
non-shipped default currency, and names this command, so the failure is explicit
rather than silent.

Note that `supabase db query -f supabase/migrations/…site_content.sql` does **not**
fix this: the seed uses `on conflict (key) do nothing` on purpose, so that
re-applying it can never revert the owner's edits.

## How they stay reversible

- The catalogue is captured before the first write and written back **before**
  and **after** the run, so a previously failed run cannot poison the next one
  and the project is left exactly as found.
- Every object uploaded during a run is tracked and removed; both suites assert
  the bucket is empty at the end.
- The temporary non-admin account created for the authorization sweep is deleted
  in `afterAll`.

## What they cover

`authorization.e2e.test.ts`
: every exported action is refused for an anonymous request and for a real
signed-in user who is not on the admin allowlist, and nothing is written.

`studio.e2e.test.ts`
: product text edits and restore; price set → priced → cleared → unpriced;
active/featured/display-order changes and restore; image upload, second upload,
reorder, primary, alt text, replace-in-place and delete; collection field edits,
deactivate/reactivate, cover upload, cover replace and cover removal; and the
stale-`updated_at` conflict on both a product and a collection.
