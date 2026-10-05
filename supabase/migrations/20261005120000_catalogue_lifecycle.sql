-- B10.1 — Catalogue lifecycle: archive state, and products that may exist
-- without a collection.
--
-- Two problems this migration solves, both discovered while making the admin a
-- full catalogue manager:
--
-- 1. NOTHING TO RETIRE A ROW WITH.
--    `is_active` already means "shown on the storefront", and the admin uses it
--    that way (a set that is not ready yet, a collection temporarily pulled). If
--    `is_active = false` were also the archive, the admin would have no way to
--    tell "draft I am still working on" from "finished with this, get it out of
--    my working list", and a retired set would sit in the main catalogue view
--    forever. `archived_at` is that second, distinct state. It is a timestamp
--    rather than a boolean so the archive carries *when*, which is what makes an
--    archive list sortable without a second column.
--
--    Archiving is published-visible immediately: every public read filters
--    `archived_at is null` (see src/lib/catalogue.ts). Restoring clears it.
--
-- 2. A PRODUCT HAD TO BELONG TO A COLLECTION.
--    `collection_id` was NOT NULL with ON DELETE RESTRICT. That is the right
--    shape for a merchandised catalogue, but it makes two ordinary admin
--    operations impossible:
--      * retiring an inactive collection without first editing every product by
--        hand, and
--      * creating a product before deciding which collection it belongs to.
--    `collection_id` therefore becomes nullable. Products with no collection
--    remain valid rows; the storefront renders them with an empty collection
--    name, and the public filter is unaffected because a NULL collection is not
--    an active collection.
--
--    The FK stays and keeps ON DELETE RESTRICT on purpose. The admin offers an
--    explicit reassignment workflow (move the products out, or delete them
--    together) rather than silently cascading a collection deletion into product
--    deletions — a cascade here would destroy catalogue rows and their images
--    from a single click.
--
-- No data is modified by this migration: existing rows keep their values, and
-- every existing product already has a collection.

-- ---------------------------------------------------------------------------
-- 1. Products may exist without a collection.
-- ---------------------------------------------------------------------------
alter table public.products
  alter column collection_id drop not null;

comment on column public.products.collection_id is
  'Merchandising collection. NULL means the product is not currently assigned to one; the storefront renders it with no collection name.';

-- ---------------------------------------------------------------------------
-- 2. Archive state.
--
--    `archive_note` is free text the owner writes when archiving, shown back in
--    the archive list. It is not a business rule and nothing reads it for logic.
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists archived_at timestamptz,
  add column if not exists archive_note text;

alter table public.collections
  add column if not exists archived_at timestamptz,
  add column if not exists archive_note text;

comment on column public.products.archived_at is
  'When the product was archived. Non-null means retired: hidden from every public read and removed from the working catalogue list. Distinct from is_active, which is a temporary storefront visibility switch.';
comment on column public.collections.archived_at is
  'When the collection was archived. Non-null hides the collection AND its products from every public read, exactly as an inactive collection does.';

-- ---------------------------------------------------------------------------
-- 3. Partial indexes for the two hot reads: "the working catalogue" (archived
--    rows excluded) and "the archive list" (only archived rows).
--
--    Both are partial, so they stay small: the working set is the common query
--    and the archive set is expected to grow slowly.
-- ---------------------------------------------------------------------------
create index if not exists products_active_not_archived_idx
  on public.products (display_order, slug)
  where is_active and archived_at is null;

create index if not exists products_archived_idx
  on public.products (archived_at desc)
  where archived_at is not null;

create index if not exists collections_not_archived_idx
  on public.collections (display_order, slug)
  where archived_at is null;

create index if not exists collections_archived_idx
  on public.collections (archived_at desc)
  where archived_at is not null;

-- ---------------------------------------------------------------------------
-- 4. Archived slugs stay reserved.
--
--    `slug` is UNIQUE and storefront URLs are /product/<slug> and
--    /collections/<slug>, so an archived row must keep its slug: freeing it
--    would let a new row claim a URL that customers still have bookmarked and
--    that the archive list still displays. The admin therefore reports a slug
--    collision as "this slug is held by an archived row — restore it, or change
--    this row's slug" instead of renaming anything automatically. No schema
--    change is needed for that; the existing unique index already enforces it.
--    This note exists so the behaviour is not mistaken for a bug later.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. RLS is unchanged and still correct.
--
--    20261004114546_catalog_rls.sql grants anon/authenticated SELECT only and
--    gates rows on is_active. The two new columns are therefore readable by
--    clients, which is harmless (a client can already see is_active), and no
--    write grant exists, so neither column can be set from a browser. The
--    server-side public filters in src/lib/catalogue.ts are what exclude
--    archived rows, and they are mandatory because the privileged Prisma
--    connection bypasses RLS.
-- ---------------------------------------------------------------------------
