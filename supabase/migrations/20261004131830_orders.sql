-- B5.1 — Orders and immutable order-item snapshots.
--
-- Derived strictly from what the storefront actually collects today:
--   src/providers/CartProvider.tsx  (line items: product id, selected size,
--                                    selected length, quantity capped at 10)
--   src/app/cart/cart-content.tsx   (the only checkout affordance)
--   src/app/checkout/page.tsx       (a placeholder route: collects NO customer
--                                    fields, so none are stored here)
--
-- Deliberately absent, because nothing invents it: customer name/email/address,
-- shipping fees, taxes, discounts, stock, fulfilment promises, payment data.
-- B6 adds payment; B7 (or a real checkout form) adds the customer fields.
--
-- Money is stored only as integer minor units plus an ISO-4217 code. The
-- catalogue currently has no verified prices (`price_minor` / `currency` are
-- NULL), so server-side order creation refuses unpriced items: this schema never
-- needs a placeholder value to exist.

-- ---------------------------------------------------------------------------
-- orders — one row per placed order.
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),

  -- Client-supplied idempotency key: a retry or double-click with the same
  -- token resolves to the same order instead of creating a second one.
  order_token uuid not null unique,

  currency char(3) not null,
  subtotal_minor integer not null,
  total_minor integer not null,

  -- Minimal technical lifecycle: an order is recorded and awaits payment. B6
  -- extends this set when a payment provider exists; nothing else is invented.
  status text not null default 'pending_payment',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint orders_amounts_nonnegative check (subtotal_minor >= 0 and total_minor >= 0),
  -- The current UI collects no shipping, tax or discount, so the total is the
  -- subtotal. B6 relaxes this when fees exist, rather than letting the two
  -- silently diverge today.
  constraint orders_total_equals_subtotal check (total_minor = subtotal_minor),
  constraint orders_status_valid check (status in ('pending_payment'))
);

create index orders_created_at_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- order_items — immutable snapshot of each ordered line.
--
-- Every value the customer saw at purchase time is copied here, so editing or
-- repricing a product later cannot rewrite order history. `product_id` is a
-- convenience reference only (ON DELETE SET NULL) and is never used to render a
-- historical order.
-- ---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,

  -- Snapshot: catalogue identity
  product_slug text not null,
  product_name text not null,
  product_descriptor text not null,
  product_shape text not null,
  product_finish text not null,
  collection_slug text not null,

  -- Snapshot: the options the customer picked in the cart
  selected_size text not null,
  selected_size_label text not null,
  selected_length text not null,

  -- Snapshot: money, integer minor units
  unit_price_minor integer not null,
  currency char(3) not null,
  quantity integer not null,
  line_total_minor integer not null,

  created_at timestamptz not null default now(),

  constraint order_items_snapshot_text check (
    char_length(product_slug) between 1 and 200
    and char_length(product_name) between 1 and 200
    and char_length(product_descriptor) <= 300
    and char_length(product_shape) <= 100
    and char_length(product_finish) <= 100
    and char_length(collection_slug) between 1 and 200
  ),
  -- Option ids come from ProductOptions.tsx.
  constraint order_items_size_valid check (selected_size in ('xs', 's', 'm', 'l', 'custom')),
  constraint order_items_size_label_valid check (
    selected_size_label in ('XS', 'S', 'M', 'L', 'Custom')
  ),
  constraint order_items_length_valid check (selected_length in ('Short', 'Medium', 'Long')),
  -- Quantity bounds mirror the cart's own clamp.
  constraint order_items_quantity_bounds check (quantity between 1 and 10),
  constraint order_items_unit_price_nonnegative check (unit_price_minor >= 0),
  constraint order_items_currency_format check (currency ~ '^[A-Z]{3}$'),
  -- The line total must equal the snapshot maths, so the two can never disagree.
  constraint order_items_line_total_matches check (line_total_minor = unit_price_minor * quantity)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- Timestamps: reuse the helper deployed in 20261004114808_catalog_triggers.sql.
-- ---------------------------------------------------------------------------
create trigger set_orders_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privacy: orders are server-only. RLS on, no policies, no client grants —
-- the same lock-down as the custom-order tables. The storefront reaches this
-- data exclusively through server actions on the privileged connection.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all privileges on table public.orders from anon, authenticated;
revoke all privileges on table public.order_items from anon, authenticated;
