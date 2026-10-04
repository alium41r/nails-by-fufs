-- B3 — Verified catalogue seed.
--
-- Single source of truth for the real catalogue content that the storefront used
-- to hold as static TypeScript (src/data/collections.ts, src/data/products.ts).
-- Supabase SQL migrations remain the only *schema* authority; this file seeds
-- *data* only, and never touches prices.
--
-- Applied by:
--   * the local stack: `supabase db reset` / `supabase start` (supabase/seed.sql)
--   * remote:          `npx supabase db query --linked -f supabase/seed.sql`
--                      (or `npm run db:seed:remote`)
--
-- SAFELY REPEATABLE: every statement is an upsert keyed on the natural key
-- (`slug`). Re-running updates the same rows in place — it never duplicates them
-- — and existing ids are preserved so nothing that references them breaks.
--
-- Deliberately NOT seeded:
--   * prices — `price_minor` / `currency` stay NULL; the project has no verified
--     price (the storefront shows a "$XX" placeholder). The upserts below never
--     write these columns, so a future real price would not be clobbered.
--   * product_images — the project contains no image files or Storage bucket, and
--     `storage_path` is NOT NULL, so inserting rows would mean inventing image
--     metadata. The storefront renders its placeholder gallery instead.
--   * `cover_image_path` — same reason.
--   * products.featured — not set, so it stays at its default (false): the
--     storefront's "featured" ordering is driven by `tag`, not this flag.

-- ---------------------------------------------------------------------------
-- Collections (order 1..3 from the former static array)
-- ---------------------------------------------------------------------------
insert into public.collections (
  slug, title, subtitle, description, tag, featured, display_order, is_active
)
values
  (
    'core-edit',
    'The Core Edit',
    'Everyday Neutrals & Sheer Finishes',
    'A timeless series of understated glazed tones, milky neutrals, and delicate pearl sheers designed for seamless daily wear.',
    'Core Release',
    true,
    1,
    true
  ),
  (
    'season-01',
    'Season 01 — Cherry & Velvet',
    'Deep Wine Hues & Tactile Finishes',
    'Rich burgundy palettes, chrome accents, and romantic studio designs inspired by Fatima''s signature nail art.',
    'Seasonal Edit',
    true,
    2,
    true
  ),
  (
    'raw-earth',
    'Raw Earth Series',
    'Warm Terracotta & Grounded Matte',
    'Warm clay tones, satin textures, and sculpted organic shapes designed for relaxed warmth and tactile comfort.',
    'Studio Series',
    false,
    3,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  tag = excluded.tag,
  featured = excluded.featured,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Products (order 1..8 from the former static array), linked by collection slug
-- ---------------------------------------------------------------------------
insert into public.products (
  collection_id, slug, name, descriptor, description, shape, default_length,
  finish, tag, display_order, is_active, included
)
select
  c.id,
  v.slug,
  v.name,
  v.descriptor,
  v.description,
  v.shape,
  v.default_length,
  v.finish,
  v.tag,
  v.display_order,
  true,
  v.included
from (
  values
    (
      'core-edit', 'glazed-truffle', 'Glazed Truffle', 'Almond • Soft Gloss Finish',
      'A rich, creamy taupe glaze with a soft reflective finish. Designed for understated elegance and versatile everyday wear.',
      'Almond', 'Medium', 'Soft Gloss', 'New', 1,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'core-edit', 'alabaster-aura', 'Alabaster Aura', 'Short Square • Sheer Pearl',
      'A delicate, translucent milky base infused with micro-pearl iridescence. Subtle, clean, and effortlessly polished.',
      'Short Square', 'Short', 'Sheer Pearl', 'Featured', 2,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'season-01', 'smoked-quartz', 'Smoked Quartz', 'Stiletto • Velvet Texture',
      'A deep smoky charcoal-plum base with tactile velvet magnetic dimension. Dramatic, moody, and sculpted.',
      'Stiletto', 'Long', 'Velvet Texture', null, 3,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'raw-earth', 'raw-terracotta', 'Raw Terracotta', 'Oval • Warm Matte',
      'Warm sun-baked clay tones with a velvety smooth matte seal. Grounded, organic, and beautifully modern.',
      'Oval', 'Medium', 'Warm Matte', null, 4,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'season-01', 'cherry-glaze', 'Cherry Glaze', 'Almond • Deep Wine Gloss',
      'A deep, romantic black-cherry syrup wash with a mirror-glass topcoat. Inspired by Fatima''s signature studio nail art.',
      'Almond', 'Medium', 'Deep Wine Gloss', 'Seasonal', 5,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'core-edit', 'blush-chrome', 'Blush Chrome', 'Short Almond • Mirror Chrome',
      'A soft baby pink base glazed with ultra-fine rose chrome powder. Luminous, playful, and chic in every light.',
      'Almond', 'Short', 'Mirror Chrome', 'New', 6,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'core-edit', 'espresso-french', 'Espresso French', 'Short Square • Micro-French',
      'A sheer nude base framed by an ultra-thin deep espresso smile line. A contemporary, minimalist take on the classic French manicure.',
      'Short Square', 'Short', 'Micro-French', null, 7,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    ),
    (
      'season-01', 'opaline-petal', 'Opaline Petal', 'Oval • Iridescent Sheer',
      'Subtle blush petals infused with crystalline opal shifts that catch the light with every hand movement.',
      'Oval', 'Medium', 'Iridescent Sheer', null, 8,
      array['10 custom-fit press-on nails', 'Full prep kit (nail buffer, cuticle stick, prep wipe)', 'Adhesive tabs and salon-grade nail glue', 'Complimentary bespoke sizing card']::text[]
    )
) as v (
  collection_slug, slug, name, descriptor, description, shape, default_length,
  finish, tag, display_order, included
)
join public.collections c on c.slug = v.collection_slug
on conflict (slug) do update set
  collection_id = excluded.collection_id,
  name = excluded.name,
  descriptor = excluded.descriptor,
  description = excluded.description,
  shape = excluded.shape,
  default_length = excluded.default_length,
  finish = excluded.finish,
  tag = excluded.tag,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  included = excluded.included;

-- ---------------------------------------------------------------------------
-- Self-verifying tail: the CLI prints this result, so an apply is auditable.
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.collections) as collections,
  (select count(*) from public.products) as products,
  (select count(*) from public.product_images) as product_images;
