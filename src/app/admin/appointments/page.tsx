import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/auth";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  isAppointmentStatus,
} from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";
import { AdminQueue, QueueStatusFilter, type QueueItem } from "@/components/admin/QueueList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointments — Studio Control Center",
  robots: { index: false, follow: false },
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

const readableDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * The appointment queue.
 *
 * Ordered by the *requested* date rather than by when the request arrived, which
 * is what the previous version did and what the owner actually needs — the
 * soonest appointment is the most urgent one. The header states that ordering so
 * it is not a hidden assumption.
 */
export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin("/admin/appointments");
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = isAppointmentStatus(status) ? status : undefined;

  const requests = await getPrisma().appointment_requests.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ preferred_date: "asc" }, { preferred_time: "asc" }, { created_at: "desc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      service_type: true,
      preferred_date: true,
      preferred_time: true,
      alternate_date: true,
      status: true,
    },
  });

  const items: QueueItem[] = requests.map((request) => {
    const label =
      APPOINTMENT_STATUS_LABELS[request.status as keyof typeof APPOINTMENT_STATUS_LABELS] ??
      request.status;

    return {
      id: request.id,
      href: `/admin/appointments/${request.id}`,
      title: `${readableDate(request.preferred_date)} at ${request.preferred_time} — ${request.name}`,
      subtitle: [request.service_type, request.phone, request.email]
        .filter(Boolean)
        .join(" · "),
      meta: request.alternate_date ? `Alt ${isoDate(request.alternate_date)}` : undefined,
      status: {
        label,
        tone: request.status === "pending_review" ? "attention" : "neutral",
      },
    };
  });

  const pending = requests.filter((row) => row.status === "pending_review").length;

  return (
    <AdminQueue
      title="Appointments"
      description="Booking requests, soonest first. Confirming one holds that time — the customer is not notified automatically."
      count={`${requests.length} request${requests.length === 1 ? "" : "s"}${
        pending > 0 ? ` · ${pending} awaiting review` : ""
      }`}
      items={items}
      searchAction="/admin/appointments"
      query={query}
      searchPlaceholder="Search by name, phone or email"
      activeFilterCount={statusFilter ? 1 : 0}
      filters={
        <QueueStatusFilter
          action="/admin/appointments"
          value={statusFilter ?? ""}
          query={query}
          options={APPOINTMENT_STATUSES.map((value) => ({
            value,
            label: APPOINTMENT_STATUS_LABELS[value],
          }))}
        />
      }
      emptyTitle={query || statusFilter ? "No appointments match" : "No appointment requests yet"}
      emptyDescription={
        query || statusFilter
          ? "Try a different search, or reset the filters."
          : "Requests submitted through the booking page appear here, soonest first."
      }
      viewLabel="Open"
    />
  );
}
