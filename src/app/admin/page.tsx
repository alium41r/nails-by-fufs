import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
import { getPrisma } from "@/lib/prisma/db";

/** Minimal catalogue dashboard: search products, see what needs attention. */
export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const prisma = getPrisma();

  const [products, collections] = await Promise.all([
    prisma.products.findMany({
      where: query
        ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }] }
        : undefined,
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        price_minor: true,
        currency: true,
        is_active: true,
        featured: true,
        display_order: true,
      },
    }),
    prisma.collections.findMany({
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        is_active: true,
        featured: true,
        display_order: true,
        cover_image_path: true,
        _count: { select: { products: true } },
      },
    }),
  ]);

  // Image counts come from a separate query: the partial unique index on
  // product_images makes Prisma model products -> product_images as 1:1, so
  // relation `_count` is not available for it.
  const imageRows = products.length
    ? await prisma.product_images.findMany({
        where: { product_id: { in: products.map((product) => product.id) } },
        select: { product_id: true },
      })
    : [];
  const imageCounts = new Map<string, number>();
  for (const row of imageRows) {
    imageCounts.set(row.product_id, (imageCounts.get(row.product_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display font-light text-3xl text-foreground">Catalogue</h1>
        <p className="text-xs text-muted-foreground font-sans">
          {products.length} product{products.length === 1 ? "" : "s"} · {collections.length} collection
          {collections.length === 1 ? "" : "s"}
        </p>
      </div>

      <form className="flex items-end gap-3 border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
            Search products
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name or slug"
            className="h-10 px-3 bg-background border border-border text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="h-10 px-4 bg-foreground text-background text-xs uppercase tracking-[0.16em]"
        >
          Search
        </button>
        {query && (
          <Link href="/admin" className="h-10 inline-flex items-center text-xs text-muted-foreground hover:text-accent">
            Clear
          </Link>
        )}
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-accent">Products</h2>
        <div className="border border-border divide-y divide-border/60 bg-surface">
          {products.length === 0 && (
            <p className="p-5 text-xs text-muted-foreground">No products match that search.</p>
          )}
          {products.map((product) => {
            const unpriced = product.price_minor === null || product.currency === null;
            const noImages = (imageCounts.get(product.id) ?? 0) === 0;
            return (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-subtle/40 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-foreground truncate">{product.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    /{product.slug}
                    {product.display_order === null ? "" : ` · order ${product.display_order}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  {!product.is_active && <span className="px-2 py-0.5 border border-border text-muted-foreground">Inactive</span>}
                  {product.featured && <span className="px-2 py-0.5 border border-accent/40 text-accent">Featured</span>}
                  {unpriced && (
                    <span className="px-2 py-0.5 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400">
                      Unpriced
                    </span>
                  )}
                  {noImages && (
                    <span className="px-2 py-0.5 border border-border text-muted-foreground">No images</span>
                  )}
                  {!unpriced && (
                    <span className="text-muted-foreground">
                      {product.currency} {(product.price_minor ?? 0) / 100}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-accent">Collections</h2>
        <div className="border border-border divide-y divide-border/60 bg-surface">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/admin/collections/${collection.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-subtle/40 transition-colors"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-foreground truncate">{collection.title}</span>
                <span className="text-[11px] font-mono text-muted-foreground truncate">
                  /{collection.slug} · {collection._count.products} product
                  {collection._count.products === 1 ? "" : "s"}
                  {collection.display_order === null ? "" : ` · order ${collection.display_order}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                {!collection.is_active && (
                  <span className="px-2 py-0.5 border border-border text-muted-foreground">
                    Inactive — hides its products
                  </span>
                )}
                {collection.featured && <span className="px-2 py-0.5 border border-accent/40 text-accent">Featured</span>}
                {!collection.cover_image_path && (
                  <span className="px-2 py-0.5 border border-border text-muted-foreground">No cover</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
