import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/auth";
import {
  CUSTOM_ORDER_STATUSES,
  CUSTOM_ORDER_STATUS_LABELS,
  isCustomOrderStatus,
} from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";
import { AdminQueue, QueueStatusFilter, type QueueItem } from "@/components/admin/QueueList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom Orders — Studio Control Center",
  robots: { index: false, follow: false },
};

const shortDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * The custom-order queue.
 *
 * Content and filtering are unchanged — same query, same statuses, same search
 * fields. What changed is the presentation: rows carry one status instead of a
 * bordered badge plus a file count plus a raw timestamp, the timestamp is
 * formatted for a person rather than printed as an ISO slice, and the status
 * filter moved behind `Filters` so the default view is a list rather than a form.
 */
export default async function AdminCustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin("/admin/custom-orders");
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = isCustomOrderStatus(status) ? status : undefined;

  const requests = await getPrisma().custom_order_requests.findMany({
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

  const items: QueueItem[] = requests.map((request) => {
    const label =
      CUSTOM_ORDER_STATUS_LABELS[request.status as keyof typeof CUSTOM_ORDER_STATUS_LABELS] ??
      request.status;

    return {
      id: request.id,
      href: `/admin/custom-orders/${request.id}`,
      title: request.name,
      subtitle: [
        request.shape,
        request.length,
        request.instagram ? `@${request.instagram}` : request.email,
      ]
        .filter(Boolean)
        .join(" · "),
      meta: [
        shortDate(request.created_at),
        request._count.custom_order_attachments > 0
          ? `${request._count.custom_order_attachments} file${request._count.custom_order_attachments === 1 ? "" : "s"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      status: {
        label,
        tone: request.status === "pending_review" ? "attention" : "neutral",
      },
    };
  });

  const pending = requests.filter((row) => row.status === "pending_review").length;

  return (
    <AdminQueue
      title="Custom Orders"
      description="Commission requests submitted through the storefront. Opening one shows the customer's full brief and the reference files they sent."
      count={`${requests.length} request${requests.length === 1 ? "" : "s"}${
        pending > 0 ? ` · ${pending} awaiting review` : ""
      }`}
      items={items}
      searchAction="/admin/custom-orders"
      query={query}
      searchPlaceholder="Search by name, email or Instagram"
      activeFilterCount={statusFilter ? 1 : 0}
      filters={
        <QueueStatusFilter
          action="/admin/custom-orders"
          value={statusFilter ?? ""}
          query={query}
          options={CUSTOM_ORDER_STATUSES.map((value) => ({
            value,
            label: CUSTOM_ORDER_STATUS_LABELS[value],
          }))}
        />
      }
      emptyTitle={query || statusFilter ? "No requests match" : "No custom orders yet"}
      emptyDescription={
        query || statusFilter
          ? "Try a different search, or reset the filters."
          : "Requests submitted through the custom order form appear here."
      }
      viewLabel="Open"
    />
  );
}
