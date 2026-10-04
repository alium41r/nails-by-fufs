import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAppointmentStatusAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import {
  APPOINTMENT_STATUS_LABELS,
  appointmentNextStatuses,
  describeSlot,
  findSlotConflicts,
  isAppointmentStatus,
} from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";

export const dynamic = "force-dynamic";

const fieldClass = "h-10 px-3 bg-background border border-border text-sm text-foreground w-full rounded-xs";
const labelClass = "text-[11px] uppercase tracking-wider font-mono text-muted-foreground";
const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelClass}>{label}</span>
      <span className="text-sm text-foreground break-words">{value && value.length > 0 ? value : "—"}</span>
    </div>
  );
}

export default async function AdminAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin("/admin/appointments");
  const { id } = await params;
  const { saved, error } = await searchParams;

  const prisma = getPrisma();
  const request = await prisma.appointment_requests.findUnique({ where: { id } });
  if (!request) notFound();

  const date = isoDate(request.preferred_date);
  const time = request.preferred_time;

  // Who else is already CONFIRMED at this requested date and time?
  const sameSlot = await prisma.appointment_requests.findMany({
    where: { status: "confirmed", preferred_date: request.preferred_date, preferred_time: time },
    select: { id: true, preferred_date: true, preferred_time: true, status: true, name: true },
  });
  const conflicts = findSlotConflicts(
    sameSlot.map((row) => ({
      id: row.id,
      preferred_date: isoDate(row.preferred_date),
      preferred_time: row.preferred_time,
      status: row.status,
      name: row.name,
    })),
    { id, preferred_date: date, preferred_time: time },
  );

  const statusLabel = isAppointmentStatus(request.status)
    ? APPOINTMENT_STATUS_LABELS[request.status]
    : request.status;
  const nextStatuses = appointmentNextStatuses(request.status);

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <Link href="/admin/appointments" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Appointments
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">
          {describeSlot(date, time)}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
          <span className="px-2 py-0.5 border border-accent/40 text-accent">{statusLabel}</span>
          <span className="text-muted-foreground">
            requested {request.created_at.toISOString().slice(0, 16).replace("T", " ")}
          </span>
          {request.status_updated_at && (
            <span className="text-muted-foreground">
              status changed {request.status_updated_at.toISOString().slice(0, 16).replace("T", " ")}
            </span>
          )}
        </div>
      </div>

      {(saved || error) && (
        <p
          role="status"
          className={
            error
              ? "text-xs border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-3"
              : "text-xs border border-accent/30 bg-accent-subtle text-accent p-3"
          }
        >
          {error ?? "Saved."}
        </p>
      )}

      {conflicts.length > 0 && (
        <div
          role="alert"
          className="text-xs border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-4 flex flex-col gap-2"
        >
          <strong className="font-normal uppercase tracking-wider text-[10px] font-mono">
            Slot already confirmed
          </strong>
          <span>
            {describeSlot(date, time)} is already held by{" "}
            {conflicts.map((conflict) => conflict.name).join(", ")}. Two confirmed appointments cannot share a
            slot, so confirming this request would be refused — resolve the other request first (decline it or
            move it back to review), then confirm this one.
          </span>
          <Link
            href={`/admin/appointments/${conflicts[0].id}`}
            className="underline underline-offset-2 self-start"
          >
            Open the conflicting appointment →
          </Link>
        </div>
      )}

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" value={request.name} />
          <Field label="Phone / WhatsApp" value={request.phone} />
          <Field label="Email" value={request.email} />
        </div>
      </section>

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Request</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Preferred date" value={date} />
          <Field label="Preferred time" value={time} />
          <Field label="Alternate date" value={request.alternate_date ? isoDate(request.alternate_date) : null} />
          <Field label="Appointment type" value={request.service_type} />
        </div>
        <Field label="Set / design details" value={request.set_details} />
        <Field label="Notes" value={request.notes} />
      </section>

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Decision</h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Confirming records the studio&apos;s decision that this time is held. The exact address is not stored
          here and is never shown on this page — share it with the customer yourself once confirmed. The system
          sends no email, SMS or WhatsApp message, and no working-hours calendar or availability model exists.
        </p>
        <form action={updateAppointmentStatusAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={request.id} />
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Move to</span>
            <select name="status" className={fieldClass} defaultValue={nextStatuses[0] ?? ""}>
              {nextStatuses.map((value) => (
                <option key={value} value={value} disabled={value === "confirmed" && conflicts.length > 0}>
                  {APPOINTMENT_STATUS_LABELS[value]}
                  {value === "confirmed" && conflicts.length > 0 ? " (slot already taken)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Internal note (never shown to the customer)</span>
            <textarea
              name="admin_note"
              defaultValue={request.admin_note ?? ""}
              rows={3}
              className="p-3 bg-background border border-border text-sm text-foreground w-full rounded-xs"
            />
          </label>
          <button type="submit" className="h-10 px-4 bg-foreground text-background text-[11px] uppercase tracking-[0.16em] self-start">
            Save Decision
          </button>
        </form>
      </section>
    </div>
  );
}
