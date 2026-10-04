-- B1.3c — Catalogue domain: row level security and client privileges.
-- Migration phase 3 of 4 per the approved catalogue design:
--   001: tables + constraints   (20260902162857_catalog_tables.sql)
--   002: indexes                (20261004113957_catalog_indexes.sql)
--   003 (this file): RLS + client grants
--   004: triggers               (catalog_triggers.sql)
--
-- Access model: public read / server write.
--   * anon + authenticated may only SELECT, and only published catalogue rows.
--   * No INSERT/UPDATE/DELETE grant or policy is created, so clients have no
--     write path at all.
--   * RLS is enabled without FORCE, so the table owner and BYPASSRLS roles
--     (service_role, and the privileged connection used by Prisma later)
--     are deliberately unaffected.
--   * Note for later server code: privileged connections bypass RLS, so
--     repositories must still scope public reads by is_active explicitly.

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on every catalogue table.
-- ---------------------------------------------------------------------------
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Client privileges: SELECT only for anon and authenticated.
--    service_role and every other role are intentionally left untouched.
-- ---------------------------------------------------------------------------
revoke all privileges on table public.collections from anon, authenticated;
revoke all privileges on table public.products from anon, authenticated;
revoke all privileges on table public.product_images from anon, authenticated;

grant select on table public.collections to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.product_images to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Public read policies (SELECT only).
-- ---------------------------------------------------------------------------

-- Unpublished collections are invisible to clients.
create policy collections_public_read
  on public.collections
  for select
  to anon, authenticated
  using (is_active = true);

-- A product is readable only when it is published AND its collection is
-- published, so an active product inside an inactive collection cannot leak
-- through direct API access.
create policy products_public_read
  on public.products
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.collections c
      where c.id = products.collection_id
        and c.is_active = true
    )
  );

-- Images inherit the visibility of their product and that product's collection.
create policy product_images_public_read
  on public.product_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      join public.collections c on c.id = p.collection_id
      where p.id = product_images.product_id
        and p.is_active = true
        and c.is_active = true
    )
  );
