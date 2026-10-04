/**
 * Appointment request validation.
 *
 * Pure and dependency-free (no Prisma, no `server-only`) so the same rules run
 * on the server as the authority and can be unit-tested directly.
 *
 * Everything is derived from the existing UI contract in
 * `src/data/appointment.ts` and `AppointmentForm.tsx`: the option ids, the
 * "YYYY-MM-DD" date inputs, the "HH:mm" time input, and the optional fields.
 *
 * The browser is untrusted: the server re-validates every field, including the
 * idempotency token, and rejects past dates. No price, duration, slot or
 * availability rule exists here, because none is defined.
 */

import { APPOINTMENT_SERVICES, type AppointmentServiceId } from "@/data/appointment";

export const SERVICE_IDS = APPOINTMENT_SERVICES.map((service) => service.id);

/** Field caps, mirroring the database CHECK constraints. */
export const FIELD_LIMITS = {
  name: 120,
  phone: 24,
  email: 254,
  setDetails: 500,
  notes: 2000,
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_PATTERN = /^[+()0-9 .-]+$/;

export type AppointmentField = "name" | "phone" | "email" | "serviceType"
  | "preferredDate" | "preferredTime" | "alternateDate" | "setDetails" | "notes";

export type AppointmentErrors = Partial<Record<AppointmentField | "form", string>>;

export interface NormalizedAppointmentRequest {
  requestToken: string;
  name: string;
  phone: string;
  email: string | null;
  serviceType: AppointmentServiceId;
  /** YYYY-MM-DD */
  preferredDate: string;
  /** HH:mm (24h) */
  preferredTime: string;
  /** YYYY-MM-DD or null */
  alternateDate: string | null;
  setDetails: string | null;
  notes: string | null;
}

export type AppointmentValidation =
  | { ok: true; data: NormalizedAppointmentRequest }
  | { ok: false; errors: AppointmentErrors };

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidRequestToken(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Today as YYYY-MM-DD in UTC — the same basis the database CHECK uses. */
export function todayIsoUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * True for a well-formed date that also exists in the calendar, so impossible
 * dates such as 2026-02-31 are rejected rather than silently rolled over.
 */
export function isValidIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Validates one appointment request.
 *
 * `today` is injectable so "past date" behaviour can be tested deterministically.
 */
export function validateAppointmentRequest(
  raw: unknown,
  today: string = todayIsoUtc(),
): AppointmentValidation {
  const input = asRecord(raw);
  const errors: AppointmentErrors = {};

  const requestToken = readText(input.requestToken);
  if (!isValidRequestToken(requestToken)) {
    errors.form = "This request could not be identified. Please reload the page and try again.";
  }

  const name = readText(input.name);
  if (!name) errors.name = "Please enter your name";
  else if (name.length > FIELD_LIMITS.name) errors.name = "Please enter a shorter name";

  const phone = readText(input.phone);
  const phoneDigits = phone.replace(/\D/g, "");
  if (!phone) {
    errors.phone = "Please enter a phone or WhatsApp number";
  } else if (!PHONE_PATTERN.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Please enter a valid phone number";
  } else if (phone.length > FIELD_LIMITS.phone) {
    errors.phone = "Please enter a shorter phone number";
  }

  const email = readText(input.email);
  if (email.length > 0) {
    if (email.length > FIELD_LIMITS.email || !EMAIL_PATTERN.test(email)) {
      errors.email = "Please enter a valid email address";
    }
  }

  const serviceType = readText(input.serviceType);
  if (!SERVICE_IDS.includes(serviceType as AppointmentServiceId)) {
    errors.serviceType = "Please choose what you would like applied";
  }

  const preferredDate = readText(input.preferredDate);
  if (!preferredDate) {
    errors.preferredDate = "Please choose a preferred date";
  } else if (!isValidIsoDate(preferredDate)) {
    errors.preferredDate = "Please choose a valid date";
  } else if (preferredDate < today) {
    errors.preferredDate = "Please choose a date in the future";
  }

  const preferredTime = readText(input.preferredTime);
  if (!preferredTime) {
    errors.preferredTime = "Please choose a preferred time";
  } else if (!isValidTime(preferredTime)) {
    errors.preferredTime = "Please choose a valid time";
  }

  const alternateDate = readText(input.alternateDate);
  if (alternateDate.length > 0) {
    if (!isValidIsoDate(alternateDate)) {
      errors.alternateDate = "Please choose a valid date";
    } else if (alternateDate < today) {
      errors.alternateDate = "Please choose a date in the future";
    } else if (alternateDate === preferredDate) {
      errors.alternateDate = "Please choose a different alternate date";
    }
  }

  const setDetails = readText(input.setDetails);
  if (setDetails.length > FIELD_LIMITS.setDetails) {
    errors.setDetails = `Please keep this under ${FIELD_LIMITS.setDetails} characters.`;
  }

  const notes = readText(input.notes);
  if (notes.length > FIELD_LIMITS.notes) {
    errors.notes = `Please keep this under ${FIELD_LIMITS.notes} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      requestToken,
      name,
      phone,
      email: email.length > 0 ? email : null,
      serviceType: serviceType as AppointmentServiceId,
      preferredDate,
      preferredTime,
      alternateDate: alternateDate.length > 0 ? alternateDate : null,
      setDetails: setDetails.length > 0 ? setDetails : null,
      notes: notes.length > 0 ? notes : null,
    },
  };
}
