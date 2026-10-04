import { describe, expect, it } from "vitest";

import {
  ADMIN_NOTE_MAX,
  APPOINTMENT_STATUSES,
  CUSTOM_ORDER_STATUSES,
  appointmentNextStatuses,
  canTransitionAppointment,
  canTransitionCustomOrder,
  customOrderNextStatuses,
  describeSlot,
  findSlotConflicts,
  isAppointmentStatus,
  isCustomOrderStatus,
  normalizeAdminNote,
} from "@/lib/admin/lifecycle";

describe("custom order lifecycle", () => {
  it("offers exactly the review, accept and decline states", () => {
    expect([...CUSTOM_ORDER_STATUSES]).toEqual(["pending_review", "in_review", "accepted", "declined"]);
    expect(isCustomOrderStatus("accepted")).toBe(true);
    expect(isCustomOrderStatus("paid")).toBe(false);
    expect(isCustomOrderStatus(undefined)).toBe(false);
  });

  it("allows the decisions the workflow justifies", () => {
    expect(canTransitionCustomOrder("pending_review", "in_review")).toBe(true);
    expect(canTransitionCustomOrder("pending_review", "accepted")).toBe(true);
    expect(canTransitionCustomOrder("pending_review", "declined")).toBe(true);
    expect(canTransitionCustomOrder("in_review", "accepted")).toBe(true);
    expect(canTransitionCustomOrder("in_review", "declined")).toBe(true);
  });

  it("reopens a mistaken decision through review rather than switching it directly", () => {
    expect(canTransitionCustomOrder("accepted", "in_review")).toBe(true);
    expect(canTransitionCustomOrder("declined", "in_review")).toBe(true);
    expect(canTransitionCustomOrder("accepted", "declined")).toBe(false);
    expect(canTransitionCustomOrder("declined", "accepted")).toBe(false);
  });

  it("refuses no-op and unknown transitions", () => {
    expect(canTransitionCustomOrder("pending_review", "pending_review")).toBe(false);
    expect(canTransitionCustomOrder("accepted", "accepted")).toBe(false);
    expect(canTransitionCustomOrder("paid", "accepted")).toBe(false);
    expect(canTransitionCustomOrder("pending_review", "shipped" as never)).toBe(false);
    expect(customOrderNextStatuses("accepted")).toEqual(["in_review"]);
    expect(customOrderNextStatuses("nonsense")).toEqual([]);
  });
});

describe("appointment lifecycle", () => {
  it("offers exactly the review, confirm and decline states", () => {
    expect([...APPOINTMENT_STATUSES]).toEqual(["pending_review", "confirmed", "declined"]);
    expect(isAppointmentStatus("confirmed")).toBe(true);
    expect(isAppointmentStatus("completed")).toBe(false);
  });

  it("lets a pending request be confirmed or declined", () => {
    expect(canTransitionAppointment("pending_review", "confirmed")).toBe(true);
    expect(canTransitionAppointment("pending_review", "declined")).toBe(true);
    expect(canTransitionAppointment("pending_review", "pending_review")).toBe(false);
  });

  it("lets a decision be undone back to review, not flipped to the other decision", () => {
    expect(canTransitionAppointment("confirmed", "pending_review")).toBe(true);
    expect(canTransitionAppointment("confirmed", "declined")).toBe(true);
    expect(canTransitionAppointment("declined", "pending_review")).toBe(true);
    expect(canTransitionAppointment("declined", "confirmed")).toBe(false);
    expect(appointmentNextStatuses("pending_review")).toEqual(["confirmed", "declined"]);
  });
});

describe("appointment slot conflicts", () => {
  const confirmed = {
    id: "11111111-1111-4111-8111-111111111111",
    preferred_date: "2026-12-01",
    preferred_time: "14:30",
    status: "confirmed",
    name: "Confirmed Person",
  };
  const target = { id: "22222222-2222-4222-8222-222222222222", preferred_date: "2026-12-01", preferred_time: "14:30" };

  it("reports a confirmed appointment in the same slot", () => {
    const conflicts = findSlotConflicts([confirmed], target);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].name).toBe("Confirmed Person");
  });

  it("ignores pending and declined rows, other slots and the target itself", () => {
    expect(findSlotConflicts([{ ...confirmed, status: "pending_review" }], target)).toHaveLength(0);
    expect(findSlotConflicts([{ ...confirmed, status: "declined" }], target)).toHaveLength(0);
    expect(findSlotConflicts([{ ...confirmed, preferred_time: "15:00" }], target)).toHaveLength(0);
    expect(findSlotConflicts([{ ...confirmed, preferred_date: "2026-12-02" }], target)).toHaveLength(0);
    expect(findSlotConflicts([confirmed], { ...target, id: confirmed.id })).toHaveLength(0);
  });

  it("reports every conflicting appointment so the admin can resolve them", () => {
    const second = {
      id: "33333333-3333-4333-8333-333333333333",
      preferred_date: "2026-12-01",
      preferred_time: "14:30",
      status: "confirmed",
      name: "Second Person",
    };
    const conflicts = findSlotConflicts([confirmed, second], target);
    expect(conflicts.map((row) => row.name)).toEqual(["Confirmed Person", "Second Person"]);
  });

  it("returns nothing when there is no confirmed appointment at that slot", () => {
    expect(findSlotConflicts([], target)).toHaveLength(0);
  });

  it("describes a slot unambiguously", () => {
    expect(describeSlot("2026-12-01", "14:30")).toBe("2026-12-01 at 14:30");
  });
});

describe("admin note", () => {
  it("trims, nulls empties and caps the length", () => {
    expect(normalizeAdminNote("  called customer  ")).toBe("called customer");
    expect(normalizeAdminNote("   ")).toBeNull();
    expect(normalizeAdminNote("")).toBeNull();
    expect(normalizeAdminNote(undefined)).toBeNull();
    expect(normalizeAdminNote(42)).toBeNull();
    expect(normalizeAdminNote("n".repeat(ADMIN_NOTE_MAX + 500))).toHaveLength(ADMIN_NOTE_MAX);
  });
});
