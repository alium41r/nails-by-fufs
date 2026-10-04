-- B8A.1 — Public catalogue image bucket.
--
-- Product and collection photography is meant to be shown on the storefront, so
-- this bucket is PUBLIC to read: the storefront renders objects through
-- /storage/v1/object/public/... with no signed URL.
--
-- Writes are the sensitive part, and they are locked down:
--   * NO storage.objects policy is created for anon or authenticated, so a
--     client cannot upload, replace, list, reorder or delete anything;
--   * the admin uploads through short-lived signed upload URLs minted
--     server-side by an admin-only action using the secret key (the same pattern
--     as the private custom-order reference bucket), and the browser PUTs the
--     file straight to Storage;
--   * object paths are server-generated (products/<productId>/<uuid>.<ext>), so
--     a client can never choose a path, collide with another file or overwrite
--     an existing object.
--
-- Limits below are technical bounds, not business rules: 10 MiB per file and the
-- same image types the studio already accepts elsewhere. They are enforced by
-- Storage itself (and re-checked server-side before a signed URL is issued), so
-- the bucket cannot be used to park arbitrary files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
