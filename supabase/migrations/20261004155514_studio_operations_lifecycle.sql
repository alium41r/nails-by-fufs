-- B8B.1 — Admin review lifecycle for custom orders and appointments.
--
-- Both tables were created without a workflow on purpose ("the UI defines no
-- lifecycle, so none is invented"). B8B is where the studio makes those business
-- decisions, so the lifecycle is added now — minimally, and only for admin
-- review. Nothing customer-facing is implied: no notification is sent, and no
-- payment or fulfillment state is invented (that is B6's call).

-- Custom orders: a review pipeline, plus an admin-managed note. Every original
-- submitted field stays untouched and immutable; only these admin fields change.
alter table public.custom_order_requests
  add column status text not null default 'pending_review',
  add column status_updated_at timestamptz,
  add column admin_note text;

alter table public.custom_order_requests
  add constraint custom_order_requests_status_valid
    check (status in ('pending_review', 'in_review', 'accepted', 'declined')),
  add constraint custom_order_requests_admin_note_len
    check (admin_note is null or char_length(admin_note) <= 2000);

create index custom_order_requests_status_created_at_idx
  on public.custom_order_requests (status, created_at desc);

-- Appointments: pending_review -> confirmed | declined.
alter table public.appointment_requests
  drop constraint appointment_requests_status_valid;

alter table public.appointment_requests
  add column status_updated_at timestamptz,
  add column admin_note text,
  add constraint appointment_requests_status_valid
    check (status in ('pending_review', 'confirmed', 'declined')),
  add constraint appointment_requests_admin_note_len
    check (admin_note is null or char_length(admin_note) <= 2000);

-- Conflict prevention: no two CONFIRMED appointments may occupy the same
-- requested date and time.
--
-- Overlapping *requests* remain allowed (that was deliberate in B7), and
-- declined or pending rows are unaffected. The admin is expected to resolve a
-- clash explicitly in the UI; this partial unique index is the last line of
-- defence behind the server-side conflict check, so a race between two admins
-- can never silently produce a double booking.
create unique index appointment_requests_confirmed_slot_key
  on public.appointment_requests (preferred_date, preferred_time)
  where status = 'confirmed';
