-- B1.3b — Catalogue domain: standalone performance indexes.
-- Migration phase 2 of 4 per the approved catalogue design:
--   001: tables + constraints   (20260902162857_catalog_tables.sql)
--   002 (this file): indexes
--   003: RLS                    (catalog_rls.sql)
--   004: triggers               (catalog_triggers.sql)
--
-- Only indexes that materially support current storefront access patterns.
-- Indexes already provided implicitly are deliberately NOT duplicated here:
--   * collections_pkey / products_pkey / product_images_pkey   (primary keys)
--   * collections_slug_key / products_slug_key                 (UNIQUE slug constraints)
--   * product_images_one_primary_per_product                   (partial UNIQUE integrity rule)
-- PostgreSQL does not index foreign key columns automatically, so the two
-- relationship lookups below are genuinely uncovered.

-- Collection pages (/collections/[slug]) and the /shop collection filter
-- resolve products by their owning collection.
create index products_collection_id_idx
  on public.products (collection_id);

-- Public storefront reads exclude unpublished drafts, so only active rows
-- need to be visible to the planner for product listings.
create index products_is_active_idx
  on public.products (is_active)
  where is_active = true;

-- Public collection reads exclude unpublished collections.
create index collections_is_active_idx
  on public.collections (is_active)
  where is_active = true;

-- Product gallery and card image lookup by owning product.
create index product_images_product_id_idx
  on public.product_images (product_id);
