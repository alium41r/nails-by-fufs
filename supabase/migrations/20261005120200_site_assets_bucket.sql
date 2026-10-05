-- B10.3 — Public bucket for owner-uploaded storefront imagery.
--
-- The homepage hero, the featured-collection lookbook, the bespoke feature and
-- the four editorial gallery tiles had no photo path at all before this: the
-- components passed no `src`, so those slots could only ever render the
-- "awaiting photography" placeholder. Making that imagery owner-managed needs
-- somewhere to put the files.
--
-- ## Why a separate bucket rather than reusing `product-images`
--
-- `product-images` is scoped per product: paths are `products/<productId>/…` and
-- the admin's path predicate (`src/lib/admin/paths.ts`) refuses any path that is
-- not inside the product folder it was minted for. Site imagery has no product,
-- and widening that predicate to accept a second prefix would weaken the check
-- that currently makes a forged upload path impossible. A second bucket keeps
-- each predicate narrow: `site-assets` is only ever written under `site/<key>/…`.
--
-- ## Access model — identical posture to `product-images`
--
--   * PUBLIC to read, because this is storefront photography rendered to
--     anonymous visitors through /storage/v1/object/public/…;
--   * NO storage.objects policy for anon or authenticated, so a client cannot
--     upload, replace, list or delete anything;
--   * the admin uploads through a short-lived signed upload URL minted
--     server-side by an admin-only action using the secret key, and the browser
--     PUTs the file straight to Storage;
--   * object paths are server-generated and derived from a fixed content key, so
--     a client can never choose a path, collide with another slot's file, or
--     write outside the slot it was authorised for.
--
-- Limits are technical bounds, not business rules: 10 MiB per file and the same
-- image types the studio already accepts. Storage enforces them, and the action
-- that mints the signed URL re-checks both before issuing it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
