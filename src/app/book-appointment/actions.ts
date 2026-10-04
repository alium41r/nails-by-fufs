"use server";

import type { AppointmentResult } from "@/data/appointment";
import { validateAppointmentRequest } from "@/lib/appointment-validation";
import { getPrisma } from "@/lib/prisma/db";
import { guardRateLimit } from "@/lib/security/rate-limit-guard";

/**
 * Server action for the /book-appointment request form.
 *
 * A request is a request, not a booking: it records the preferred date and time
 * for the studio to review, and the exact address is never collected, stored or
 * returned — it is shared by the studio after confirmation.
 *
 * Overlapping requested times are deliberately allowed: the studio decides what
 * it confirms, and no availability model exists yet.
 *
 * Idempotent: `request_token` is UNIQUE, so a double click or a retry with the
 * same token resolves to the existing request instead of creating a second one.
 */
export async function submitAppointmentRequest(raw: unknown): Promise<AppointmentResult> {
  const limit = await guardRateLimit("appointmentRequest");
  if (!limit.allowed) return { ok: false, errors: { form: limit.message } };

  const parsed = validateAppointmentRequest(raw);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const data = parsed.data;

  try {
    const prisma = getPrisma();

    const existing = await prisma.appointment_requests.findUnique({
      where: { request_token: data.requestToken },
      select: { id: true },
    });
    if (existing) return { ok: true };

    await prisma.appointment_requests.create({
      data: {
        request_token: data.requestToken,
        name: data.name,
        phone: data.phone,
        email: data.email,
        service_type: data.serviceType,
        // Date columns: UTC midnight, so the stored calendar date is exact.
        preferred_date: new Date(`${data.preferredDate}T00:00:00.000Z`),
        preferred_time: data.preferredTime,
        alternate_date: data.alternateDate
          ? new Date(`${data.alternateDate}T00:00:00.000Z`)
          : null,
        set_details: data.setDetails,
        notes: data.notes,
        status: "pending_review",
      },
    });

    return { ok: true };
  } catch {
    return {
      ok: false,
      errors: {
        form: "We could not send your request just now. Your details are still here — please try again.",
      },
    };
  }
}
