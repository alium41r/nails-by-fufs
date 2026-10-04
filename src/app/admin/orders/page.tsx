import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";

export const dynamic = "force-dynamic";

const fmt = (value: Date) => value.toISOString().slice(0, 16).replace("T", " ");
const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toFixed(2)}`;

/**
 * Read-only order view.
 *
 * Orders carry authoritative snapshots written at checkout, so this page only
 * displays them. There are deliberately no status or fulfillment actions: the
 * real lifecycle is defined by B6/PayFast, and `pending_payment` is currently the
 * only technical state. Nothing here can move money or an order.
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
          product_descriptor: true,
          product_shape: true,
          product_finish: true,
          collection_slug: true,
          selected_size: true,
          selected_size_label: true,
          selected_length: true,
          unit_price_minor: true,
          currency: true,
          quantity: true,
          line_total_minor: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Studio Admin
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">Orders</h1>
        <p className="text-xs text-muted-foreground font-sans">
          {orders.length} order{orders.length === 1 ? "" : "s"} · read-only
        </p>
      </div>

      <p className="text-[11px] border border-border bg-surface text-muted-foreground p-3 leading-relaxed">
        Read-only by design. Payment and fulfilment are not managed here: the lifecycle is defined by B6/PayFast,
        and the only technical state today is <span className="font-mono">pending_payment</span>. Amounts and item
        details are the snapshots captured when the order was created, so later catalogue edits never rewrite an
        existing order.
      </p>

      {orders.length === 0 && (
        <div className="border border-border bg-surface p-6 text-xs text-muted-foreground">
          No orders yet. Orders appear here once checkout is able to complete (B6).
        </div>
      )}

      <div className="flex flex-col gap-5">
        {orders.map((order) => (
          <section key={order.id} className="border border-border bg-surface">
            <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-foreground">
                  {order.order_items.length} item{order.order_items.length === 1 ? "" : "s"} ·{" "}
                  {money(order.total_minor, order.currency)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {order.id} · placed {fmt(order.created_at)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                <span className="px-2 py-0.5 border border-border text-muted-foreground">{order.status}</span>
                <span className="text-muted-foreground">
                  subtotal {money(order.subtotal_minor, order.currency)}
                </span>
              </div>
            </header>

            <ul className="divide-y divide-border/60">
              {order.order_items.map((item) => (
                <li key={item.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm text-foreground truncate">{item.product_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      /{item.product_slug}
                      {item.collection_slug ? ` · ${item.collection_slug}` : ""} · {item.selected_size_label} ·{" "}
                      {item.selected_length}
                      {item.product_shape ? ` · ${item.product_shape}` : ""}
                      {item.product_finish ? ` · ${item.product_finish}` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {item.quantity} × {money(item.unit_price_minor, item.currency)} ={" "}
                    <span className="text-foreground">{money(item.line_total_minor, item.currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
