-- B1.3d — Catalogue domain: updated_at timestamp triggers.
-- Migration phase 4 of 4 per the approved catalogue design:
--   001: tables + constraints   (20260902162857_catalog_tables.sql)
--   002: indexes                (20261004113957_catalog_indexes.sql)
--   003: RLS + client grants    (20261004114546_catalog_rls.sql)
--   004 (this file): timestamps
--
-- Only collections and products carry updated_at; product_images intentionally
-- does not, so it gets no trigger.

-- Reusable BEFORE UPDATE helper: stamp the row with the current time.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_collections_updated_at
  before update on public.collections
  for each row
  execute function public.set_updated_at();

create trigger set_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();
