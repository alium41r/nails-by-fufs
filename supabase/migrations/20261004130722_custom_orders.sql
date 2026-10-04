-- B4.1 — Custom order requests and private reference-image metadata.
--
-- Derived strictly from the existing custom-order UI:
--   src/data/custom-order.ts          (form fields + option ids)
--   src/components/custom/CustomOrderForm.tsx     (which fields are required)
--   src/components/custom/ReferenceUploader.tsx   (6 files, 10 MB, image types)
-- No status/workflow column: the UI defines no lifecycle, so none is invented.
-- Nothing here touches the catalogue tables from B1–B3.
--
-- Access model: server-only. Unlike the catalogue, these tables are never read
-- or written by browser clients — submissions and uploads go through server
-- actions using the Supabase secret key (a privileged role that bypasses RLS).
-- So: RLS is enabled with NO policies, and every client grant is revoked. The
-- default is deny; there is no public read path to leak submissions.

-- ---------------------------------------------------------------------------
-- custom_order_requests — one row per submitted custom request.
-- ---------------------------------------------------------------------------
create table public.custom_order_requests (
  id uuid primary key default gen_random_uuid(),

  -- Generated server-side when the upload targets are prepared and echoed back
  -- by the client on submit. UNIQUE, so a retried or double-clicked submission
  -- maps onto the same row instead of creating a duplicate.
  submission_token uuid not null unique,

  name text not null,
  email text not null,
  instagram text,
  shape text not null,
  length text not null,
  sizing_preference text not null,
  standard_size text,
  custom_measurements text,
  color_palette text,
  concept_description text not null,
  -- Free text by design: the UI placeholder is "Oct 24 / Wedding weekend".
  event_date text,
  -- Free text by design: the UI placeholder is "Standard custom tier / Open".
  budget_guidance text,
  additional_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint custom_order_requests_name_len check (char_length(name) between 1 and 120),
  constraint custom_order_requests_email_len check (char_length(email) between 3 and 254),
  constraint custom_order_requests_email_format check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint custom_order_requests_instagram_len check (
    instagram is null or char_length(instagram) <= 120
  ),
  -- Option ids come from the UI and are the only accepted values.
  constraint custom_order_requests_shape_valid check (
    shape in ('almond', 'short-square', 'oval', 'stiletto', 'coffin')
  ),
  constraint custom_order_requests_length_valid check (
    length in ('short', 'medium', 'long')
  ),
  constraint custom_order_requests_sizing_valid check (
    sizing_preference in ('kit_first', 'standard', 'custom_measurements')
  ),
  constraint custom_order_requests_standard_size_valid check (
    standard_size is null or standard_size in ('XS', 'S', 'M', 'L')
  ),
  constraint custom_order_requests_measurements_len check (
    custom_measurements is null or char_length(custom_measurements) <= 500
  ),
  constraint custom_order_requests_palette_len check (
    color_palette is null or char_length(color_palette) <= 500
  ),
  constraint custom_order_requests_concept_len check (
    char_length(concept_description) between 1 and 4000
  ),
  constraint custom_order_requests_event_len check (
    event_date is null or char_length(event_date) <= 200
  ),
  constraint custom_order_requests_budget_len check (
    budget_guidance is null or char_length(budget_guidance) <= 200
  ),
  constraint custom_order_requests_notes_len check (
    additional_notes is null or char_length(additional_notes) <= 2000
  ),
  -- Sizing coherence. The server normalises before insert (the UI always holds a
  -- default standardSize of "M", even when another preference is selected), and
  -- this constraint keeps that normalisation honest. Measurements stay optional
  -- because the UI does not require them.
  constraint custom_order_requests_sizing_coherent check (
    (sizing_preference = 'standard' and standard_size is not null and custom_measurements is null)
    or (sizing_preference = 'custom_measurements' and standard_size is null)
    or (sizing_preference = 'kit_first' and standard_size is null and custom_measurements is null)
  )
);

create index custom_order_requests_created_at_idx
  on public.custom_order_requests (created_at desc);

-- ---------------------------------------------------------------------------
-- custom_order_attachments — metadata for objects in the private
-- "custom-order-references" bucket.
--
-- request_id is nullable on purpose: the client uploads files first and submits
-- afterwards, so an attachment row exists unlinked for a short window. The
-- submission links the rows it verified (request_id set). Rows that never get
-- linked are orphans; they are cleaned up by the documented query at the bottom
-- of this file rather than by a workflow engine.
-- ---------------------------------------------------------------------------
create table public.custom_order_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.custom_order_requests (id) on delete cascade,

  -- Same token as the parent submission: this is the scope key that ties an
  -- object to exactly one submission attempt.
  submission_token uuid not null,

  -- Object key inside the bucket. UNIQUE blocks both overwrite collisions and
  -- double-linking of one object to two submissions.
  storage_path text not null unique,

  original_filename text not null,
  content_type text not null,
  size_bytes bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint custom_order_attachments_path_scoped check (
    storage_path like 'custom-order-references/%'
  ),
  constraint custom_order_attachments_filename_len check (
    char_length(original_filename) between 1 and 255
  ),
  constraint custom_order_attachments_content_type_valid check (
    content_type in ('image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/gif')
  ),
  -- 10 MB: the limit the existing uploader already advertises.
  constraint custom_order_attachments_size_valid check (
    size_bytes > 0 and size_bytes <= 10485760
  ),
  constraint custom_order_attachments_sort_order_valid check (sort_order >= 0)
);

create index custom_order_attachments_request_id_idx
  on public.custom_order_attachments (request_id);
create index custom_order_attachments_token_idx
  on public.custom_order_attachments (submission_token);

-- ---------------------------------------------------------------------------
-- Timestamps: reuse the helper deployed in 20261004114808_catalog_triggers.sql.
-- ---------------------------------------------------------------------------
create trigger set_custom_order_requests_updated_at
  before update on public.custom_order_requests
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock the tables down: RLS on, no policies, no client grants.
-- ---------------------------------------------------------------------------
alter table public.custom_order_requests enable row level security;
alter table public.custom_order_attachments enable row level security;

revoke all privileges on table public.custom_order_requests from anon, authenticated;
revoke all privileges on table public.custom_order_attachments from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket for reference images.
--
-- public = false, so objects are never served without a signed URL. No
-- storage.objects policy is created for anon/authenticated: the bucket is
-- deny-by-default for clients, and the server reaches it with the secret key
-- (which bypasses storage RLS) to mint short-lived signed upload/download URLs.
-- The mime allow-list and size limit are the same ones the existing uploader
-- advertises: PNG/JPG/WebP/HEIC/GIF, 10 MB per file.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'custom-order-references',
  'custom-order-references',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Orphan cleanup (documented, not automated): unlinked attachment metadata and
-- its objects, once an upload window is clearly abandoned. Run from the server
-- with the secret key; delete the objects with the Storage API before the rows.
--
--   select storage_path from public.custom_order_attachments
--    where request_id is null and created_at < now() - interval '24 hours';
-- ---------------------------------------------------------------------------
