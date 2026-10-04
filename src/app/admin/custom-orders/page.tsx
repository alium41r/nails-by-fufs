import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { CUSTOM_ORDER_STATUSES, CUSTOM_ORDER_STATUS_LABELS, isCustomOrderStatus } from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";

export const dynamic = "force-dynamic";

const fmt = (value: Date) => value.toISOString().slice(0, 16).replace("T", " ");

export default async function AdminCustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin("/admin/custom-orders");
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = isCustomOrderStatus(status) ? status : undefined;

  const prisma = getPrisma();
  const requests = await prisma.custom_order_requests.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
              { instagram: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      instagram: true,
      shape: true,
      length: true,
      status: true,
      created_at: true,
      _count: { select: { custom_order_attachments: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Studio Admin
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">Custom Orders</h1>
        <p className="text-xs text-muted-foreground font-sans">
          {requests.length} request{requests.length === 1 ? "" : "s"}
          {statusFilter ? ` · ${CUSTOM_ORDER_STATUS_LABELS[statusFilter]}` : ""}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name, email or Instagram"
            className="h-10 px-3 bg-background border border-border text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 px-3 bg-background border border-border text-sm text-foreground"
          >
            <option value="">All</option>
            {CUSTOM_ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {CUSTOM_ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 px-4 bg-foreground text-background text-xs uppercase tracking-[0.16em]">
          Filter
        </button>
        {(query || statusFilter) && (
          <Link href="/admin/custom-orders" className="h-10 inline-flex items-center text-xs text-muted-foreground hover:text-accent">
            Clear
          </Link>
        )}
      </form>

      <div className="border border-border divide-y divide-border/60 bg-surface">
        {requests.length === 0 && <p className="p-5 text-xs text-muted-foreground">No custom-order requests match.</p>}
        {requests.map((request) => (
          <Link
            key={request.id}
            href={`/admin/custom-orders/${request.id}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-subtle/40 transition-colors"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-foreground truncate">{request.name}</span>
              <span className="text-[11px] font-mono text-muted-foreground truncate">
                {request.email}
                {request.instagram ? ` · @${request.instagram}` : ""} · {request.shape} · {request.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <span className="px-2 py-0.5 border border-border text-muted-foreground">
                {CUSTOM_ORDER_STATUS_LABELS[request.status as keyof typeof CUSTOM_ORDER_STATUS_LABELS] ?? request.status}
              </span>
              {request._count.custom_order_attachments > 0 && (
                <span className="text-muted-foreground">{request._count.custom_order_attachments} file(s)</span>
              )}
              <span className="text-muted-foreground">{fmt(request.created_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
