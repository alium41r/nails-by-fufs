import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
import { getPrisma } from "@/lib/prisma/db";

import { Sparkles, ArrowRight } from "lucide-react";

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

  // Studio operations attention counts: pending work first, nothing analytical.
  const [customPending, customInReview, appointmentsPending, appointmentsConfirmed, recentOrders] =
    await Promise.all([
      prisma.custom_order_requests.count({ where: { status: "pending_review" } }),
      prisma.custom_order_requests.count({ where: { status: "in_review" } }),
      prisma.appointment_requests.count({ where: { status: "pending_review" } }),
      prisma.appointment_requests.count({ where: { status: "confirmed" } }),
      prisma.orders.findMany({
        orderBy: [{ created_at: "desc" }],
        take: 3,
        select: { id: true, status: true, currency: true, total_minor: true, created_at: true },
      }),
    ]);
  const unpricedCount = products.filter(
    (product) => product.price_minor === null || product.currency === null,
  ).length;

  return (
    <div className="flex flex-col gap-10">
      {/* Studio Mode Visual Editor Banner */}
      <section className="p-4 sm:p-5 border border-accent/40 bg-surface rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-full bg-accent-subtle text-accent shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg text-foreground font-medium">Studio Mode Visual Storefront Editor</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-accent text-accent-foreground rounded-xs font-semibold">
                Live Editing
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Browse the actual customer storefront and edit sets, pricing, imagery, and collections directly in-place without returning to forms.
            </p>
          </div>
        </div>

        <Link
          href="/shop?studio=1"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background text-xs font-mono uppercase tracking-[0.16em] rounded-xs hover:bg-accent hover:text-accent-foreground transition-colors shrink-0 w-full sm:w-auto"
        >
          <span>Open Studio Mode</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-accent">Studio Operations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/admin/custom-orders?status=pending_review"
            className="border border-border bg-surface p-4 flex flex-col gap-1 hover:border-accent/40 transition-colors"
          >
            <span className="font-display font-light text-3xl text-foreground">{customPending}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Custom orders to review
            </span>
          </Link>
          <Link
            href="/admin/custom-orders?status=in_review"
            className="border border-border bg-surface p-4 flex flex-col gap-1 hover:border-accent/40 transition-colors"
          >
            <span className="font-display font-light text-3xl text-foreground">{customInReview}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Custom orders in review
            </span>
          </Link>
          <Link
            href="/admin/appointments?status=pending_review"
            className="border border-border bg-surface p-4 flex flex-col gap-1 hover:border-accent/40 transition-colors"
          >
            <span className="font-display font-light text-3xl text-foreground">{appointmentsPending}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Appointments to review
            </span>
          </Link>
          <Link
            href="/admin/appointments?status=confirmed"
            className="border border-border bg-surface p-4 flex flex-col gap-1 hover:border-accent/40 transition-colors"
          >
            <span className="font-display font-light text-3xl text-foreground">{appointmentsConfirmed}</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Confirmed appointments
            </span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          {unpricedCount > 0 && (
            <span className="px-2 py-1 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400">
              {unpricedCount} product{unpricedCount === 1 ? "" : "s"} unpriced — not checkout-eligible
            </span>
          )}
          <Link href="/admin/orders" className="px-2 py-1 border border-border text-muted-foreground hover:text-accent">
            {recentOrders.length === 0
              ? "No orders yet"
              : `Latest order ${recentOrders[0].currency} ${(recentOrders[0].total_minor / 100).toFixed(2)} · ${recentOrders[0].status}`}
          </Link>
        </div>
      </section>

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
                  <span className="text-accent underline underline-offset-2 ml-1">
                    Studio ↗
                  </span>
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
                <span className="text-accent underline underline-offset-2 ml-1">
                  Studio ↗
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
