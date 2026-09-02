-- B1.3a — Catalogue domain: tables and integrity constraints only.
-- Migration phase 1 of 4 per the approved catalogue design:
--   001 (this file): tables + constraints
--   002: indexes        (002_catalog_indexes.sql)
--   003: RLS            (003_catalog_rls.sql)
--   004: triggers       (004_catalog_triggers.sql)
-- No seed data: verified business data arrives separately in supabase/seed.sql.

-- ---------------------------------------------------------------------------
-- collections — merchandising groups; one row per collection edit.
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  tag text,
  featured boolean not null default false,
  display_order integer,
  is_active boolean not null default true,
  cover_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

-- ---------------------------------------------------------------------------
-- products — one row per sellable press-on set.
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null,
  slug text not null unique,
  name text not null,
  descriptor text not null default '',
  description text not null default '',
  shape text not null,
  default_length text not null,
  finish text not null default '',
  tag text,
  featured boolean not null default false,
  display_order integer,
  is_active boolean not null default true,
  included text[] not null default '{}',
  price_minor integer,
  currency char(3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_collection_id_fkey
    foreign key (collection_id) references public.collections (id)
    on delete restrict,

  constraint products_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),

  constraint products_default_length_valid check (
    default_length in ('Short', 'Medium', 'Long')
  ),

  -- Pricing invariants: price and currency may only exist as a verified pair.
  constraint products_price_pair check (
    (price_minor is null) = (currency is null)
  ),

  constraint products_price_minor_nonnegative check (
    price_minor is null or price_minor >= 0
  ),

  constraint products_currency_format check (
    currency is null or currency ~ '^[A-Z]{3}$'
  )
);

-- ---------------------------------------------------------------------------
-- product_images — ordered gallery metadata; image bytes live in Supabase
-- Storage (future "product-images" bucket). No placeholder rows are seeded.
-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  constraint product_images_product_id_fkey
    foreign key (product_id) references public.products (id)
    on delete cascade,

  constraint product_images_sort_order_nonnegative check (
    sort_order >= 0
  )
);

-- Table-integrity rule (not a performance index): at most one primary image
-- per product. A partial unique index is the only PostgreSQL construct able
-- to express this, so it lives here with the table definition rather than in
-- the standalone index migration.
create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;
