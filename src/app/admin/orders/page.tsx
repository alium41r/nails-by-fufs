import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { AdminEmptyState, AdminPageHeader, StatusPill } from "@/components/admin/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders — Studio Control Center",
  robots: { index: false, follow: false },
};

const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toFixed(2)}`;

const readable = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Orders — read-only, and unapologetically so.
 *
 * ## What changed
 *
 * The previous page opened with a three-line bordered paragraph explaining
 * `pending_payment`, snapshots and B6/PayFast. That is accurate but it is
 * engineering documentation, and it was the first thing on the screen. The same
 * facts are now one short line, and the detail is in a disclosure for whoever
 * wants it.
 *
 * ## Why each order is collapsed
 *
 * An order is a receipt. The owner needs the total, the date, the status and the
 * items; the per-item snapshot detail matters only when reconciling a specific
 * order. Each order is a native `<details>`, so the page lists all orders compactly
 * and any one can be opened — no client JavaScript, and it works before hydration.
 */
export default async function AdminOrdersPage() {
  await requireAdmin("/admin/orders");

  const orders = await getPrisma().orders.findMany({
    orderBy: [{ created_at: "desc" }],
    take: 100,
    select: {
      id: true,
      order_token: true,
      currency: true,
      subtotal_minor: true,
      total_minor: true,
      status: true,
      created_at: true,
      order_items: {
        orderBy: [{ created_at: "asc" }],
        select: {
          id: true,
          product_name: true,
          product_slug: true,
          selected_size_label: true,
          selected_length: true,
          product_shape: true,
          product_finish: true,
          unit_price_minor: true,
          currency: true,
          quantity: true,
          line_total_minor: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Orders"
        description="A record of completed checkouts. Nothing here can be changed — each order stores its own copy of what was bought, so editing the catalogue never rewrites past orders."
        count={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
      />

      {orders.length === 0 ? (
        <AdminEmptyState
          title="No orders yet"
          description="Orders appear here once checkout can complete."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id}>
              <details className="group overflow-hidden rounded-lg border border-border/70 bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-subtle/50">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {money(order.total_minor, order.currency)}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {order.order_items.length} item
                      {order.order_items.length === 1 ? "" : "s"} · {readable(order.created_at)}
                    </span>
                  </span>

                  <StatusPill tone="neutral">{order.status.replace(/_/g, " ")}</StatusPill>

                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-border/60">
                  <ul className="divide-y divide-border/50">
                    {order.order_items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <Link
                            href={`/product/${item.product_slug}`}
                            className="truncate text-[13px] font-medium text-foreground transition-colors hover:text-accent"
                          >
                            {item.product_name}
                          </Link>
                          <span className="truncate text-xs text-muted-foreground">
                            {[
                              item.selected_size_label,
                              item.selected_length,
                              item.product_shape,
                              item.product_finish,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="text-[13px] tabular-nums text-muted-foreground">
                          {item.quantity} × {money(item.unit_price_minor, item.currency)}
                          <span className="ml-2 text-foreground">
                            {money(item.line_total_minor, item.currency)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <dt>Subtotal</dt>
                      <dd className="tabular-nums">
                        {money(order.subtotal_minor, order.currency)}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <dt>Total</dt>
                      <dd className="tabular-nums text-foreground">
                        {money(order.total_minor, order.currency)}
                      </dd>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <dt>Reference</dt>
                      <dd className="truncate font-mono">{order.order_token}</dd>
                    </div>
                  </dl>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
