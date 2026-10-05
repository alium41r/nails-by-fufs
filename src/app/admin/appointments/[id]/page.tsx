import Link from "next/link";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";

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
import {
  AdminFieldList,
  AdminPageHeader,
  AdminSection,
  StatusPill,
} from "@/components/admin/ui/primitives";
import { AdminButton, Field, Select, TextArea } from "@/components/admin/ui/controls";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Appointment — Studio Control Center",
  robots: { index: false, follow: false },
};

const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

const readable = (value: Date) =>
  value.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

/**
 * One appointment request.
 *
 * The conflict check is unchanged and still authoritative — a slot held by another
 * confirmed appointment still blocks confirmation, the option stays disabled, and
 * the server re-checks. What changed is that the warning now explains the situation
 * in plain language and links straight to the conflicting request, instead of
 * presenting it as a technical constraint.
 */
export default async function AdminAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/appointments");
  const { id } = await params;

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
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        back={{ href: "/admin/appointments", label: "Appointments" }}
        title={describeSlot(date, time)}
        count={`Requested ${readable(request.created_at)}${
          request.status_updated_at ? ` · last updated ${readable(request.status_updated_at)}` : ""
        }`}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill tone={request.status === "pending_review" ? "attention" : "neutral"}>
          {statusLabel}
        </StatusPill>
        <p className="text-[13px] text-muted-foreground">
          {request.phone}
          {request.email ? ` · ${request.email}` : ""}
        </p>
      </div>

      {conflicts.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-amber-900 dark:text-amber-300">
            <p className="font-medium">
              {describeSlot(date, time)} is already held by{" "}
              {conflicts.map((conflict) => conflict.name).join(", ")}
            </p>
            <p>
              Two appointments cannot be confirmed for the same time. Decline or move the other
              request first, then come back and confirm this one.
            </p>
            <Link
              href={`/admin/appointments/${conflicts[0].id}`}
              className="w-fit font-medium underline underline-offset-2"
            >
              Open the conflicting request →
            </Link>
          </div>
        </div>
      )}

      <AdminSection title="Request">
        <AdminFieldList
          fields={[
            { label: "Name", value: request.name },
            { label: "Phone / WhatsApp", value: request.phone },
            { label: "Email", value: request.email },
            { label: "Appointment type", value: request.service_type },
            { label: "Preferred date", value: request.preferred_date ? readable(request.preferred_date) : null },
            { label: "Preferred time", value: request.preferred_time },
            {
              label: "Alternate date",
              value: request.alternate_date ? readable(request.alternate_date) : null,
            },
            { label: "Set / design details", value: request.set_details, wide: true },
            { label: "Notes", value: request.notes, wide: true },
          ]}
        />
      </AdminSection>

      <AdminSection
        title="Your decision"
        description="Confirming records that this time is held for the customer. The studio's address is never shown here — share it with them yourself once confirmed."
        divided
      >
        <form action={updateAppointmentStatusAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={request.id} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Move to" htmlFor="ap-status">
              <Select id="ap-status" name="status" defaultValue={nextStatuses[0] ?? ""}>
                {nextStatuses.map((value) => (
                  <option
                    key={value}
                    value={value}
                    disabled={value === "confirmed" && conflicts.length > 0}
                  >
                    {APPOINTMENT_STATUS_LABELS[value]}
                    {value === "confirmed" && conflicts.length > 0 ? " — time already taken" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Internal note" htmlFor="ap-note" optional hint="Only visible to you.">
              <TextArea
                id="ap-note"
                name="admin_note"
                defaultValue={request.admin_note ?? ""}
                rows={3}
              />
            </Field>
          </div>

          <div>
            <AdminButton type="submit" variant="primary">
              Save decision
            </AdminButton>
          </div>
        </form>
      </AdminSection>

      <p className="text-xs leading-relaxed text-muted-foreground">
        No email, SMS or WhatsApp message is sent by the system, and no working-hours or
        availability calendar exists — confirming here records the decision, nothing more.
      </p>
    </div>
  );
}
