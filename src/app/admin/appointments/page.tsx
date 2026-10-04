import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  isAppointmentStatus,
} from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";

export const dynamic = "force-dynamic";

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

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
      created_at: true,
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Studio Admin
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">Appointments</h1>
        <p className="text-xs text-muted-foreground font-sans">
          {requests.length} request{requests.length === 1 ? "" : "s"}
          {statusFilter ? ` · ${APPOINTMENT_STATUS_LABELS[statusFilter]}` : ""} · earliest preferred date first
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name, phone or email"
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
            {APPOINTMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {APPOINTMENT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 px-4 bg-foreground text-background text-xs uppercase tracking-[0.16em]">
          Filter
        </button>
        {(query || statusFilter) && (
          <Link href="/admin/appointments" className="h-10 inline-flex items-center text-xs text-muted-foreground hover:text-accent">
            Clear
          </Link>
        )}
      </form>

      <div className="border border-border divide-y divide-border/60 bg-surface">
        {requests.length === 0 && <p className="p-5 text-xs text-muted-foreground">No appointment requests match.</p>}
        {requests.map((request) => (
          <Link
            key={request.id}
            href={`/admin/appointments/${request.id}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-subtle/40 transition-colors"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-foreground truncate">
                {isoDate(request.preferred_date)} · {request.preferred_time} — {request.name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground truncate">
                {request.phone}
                {request.email ? ` · ${request.email}` : ""} · {request.service_type}
                {request.alternate_date ? ` · alt ${isoDate(request.alternate_date)}` : ""}
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-border text-muted-foreground">
              {APPOINTMENT_STATUS_LABELS[request.status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? request.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
