/**
 * Admin review lifecycle for studio operations.
 *
 * Pure and dependency-free so the rules can be unit-tested and reused by both
 * the pages (what buttons to offer) and the server actions (what is actually
 * allowed). The server action is the authority; the UI only reflects it.
 *
 * Scope note: these are review states, not payment or fulfillment states. B6
 * owns anything to do with money.
 */

/* -------------------------------------------------------------------------- */
/* Custom orders                                                              */
/* -------------------------------------------------------------------------- */

export const CUSTOM_ORDER_STATUSES = ["pending_review", "in_review", "accepted", "declined"] as const;
export type CustomOrderStatus = (typeof CUSTOM_ORDER_STATUSES)[number];

export const CUSTOM_ORDER_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  pending_review: "Pending review",
  in_review: "In review",
  accepted: "Accepted",
  declined: "Declined",
};

/**
 * Review/accept/decline, and reopening a decision that was made by mistake.
 * A decided request cannot jump straight to the other decision: it goes back
 * through review first, so an accidental click is always visible and undoable.
 */
const CUSTOM_ORDER_TRANSITIONS: Record<CustomOrderStatus, readonly CustomOrderStatus[]> = {
  pending_review: ["in_review", "accepted", "declined"],
  in_review: ["accepted", "declined", "pending_review"],
  accepted: ["in_review"],
  declined: ["in_review"],
};

export function isCustomOrderStatus(value: unknown): value is CustomOrderStatus {
  return typeof value === "string" && (CUSTOM_ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransitionCustomOrder(from: string, to: CustomOrderStatus): boolean {
  if (!isCustomOrderStatus(from)) return false;
  return CUSTOM_ORDER_TRANSITIONS[from].includes(to);
}

export function customOrderNextStatuses(from: string): readonly CustomOrderStatus[] {
  return isCustomOrderStatus(from) ? CUSTOM_ORDER_TRANSITIONS[from] : [];
}

/* -------------------------------------------------------------------------- */
/* Appointments                                                               */
/* -------------------------------------------------------------------------- */

export const APPOINTMENT_STATUSES = ["pending_review", "confirmed", "declined"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending_review: "Pending review",
  confirmed: "Confirmed",
  declined: "Declined",
};

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending_review: ["confirmed", "declined"],
  confirmed: ["declined", "pending_review"],
  declined: ["pending_review"],
};

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionAppointment(from: string, to: AppointmentStatus): boolean {
  if (!isAppointmentStatus(from)) return false;
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

export function appointmentNextStatuses(from: string): readonly AppointmentStatus[] {
  return isAppointmentStatus(from) ? APPOINTMENT_TRANSITIONS[from] : [];
}

/* -------------------------------------------------------------------------- */
/* Slot conflicts                                                             */
/* -------------------------------------------------------------------------- */

export interface AppointmentSlot {
  id: string;
  /** YYYY-MM-DD */
  preferred_date: string;
  /** HH:mm */
  preferred_time: string;
  status: string;
  name?: string;
}

export interface SlotTarget {
  id: string;
  preferred_date: string;
  preferred_time: string;
}

/**
 * Confirmed appointments occupying the same requested date and time as the
 * target, excluding the target itself.
 *
 * Deliberately narrow: this is the one business rule the studio has actually
 * decided (two confirmed appointments cannot share a slot). It is not an
 * availability system — there are no working hours, durations or time slots, and
 * an empty result does not mean the studio is free.
 */
export function findSlotConflicts<T extends AppointmentSlot>(
  existing: readonly T[],
  target: SlotTarget,
): T[] {
  return existing.filter(
    (row) =>
      row.id !== target.id &&
      row.status === "confirmed" &&
      row.preferred_date === target.preferred_date &&
      row.preferred_time === target.preferred_time,
  );
}

export function describeSlot(date: string, time: string): string {
  return `${date} at ${time}`;
}

/* -------------------------------------------------------------------------- */
/* Admin note                                                                 */
/* -------------------------------------------------------------------------- */

export const ADMIN_NOTE_MAX = 2000;

/** Internal studio note. Never sent to the customer, so it is trimmed and capped. */
export function normalizeAdminNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, ADMIN_NOTE_MAX);
}
