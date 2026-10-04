import { describe, expect, it } from "vitest";

import { APPOINTMENT_SERVICES } from "@/data/appointment";
import {
  FIELD_LIMITS,
  SERVICE_IDS,
  isValidIsoDate,
  isValidRequestToken,
  isValidTime,
  todayIsoUtc,
  validateAppointmentRequest,
} from "@/lib/appointment-validation";

const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";

const valid = {
  requestToken: TOKEN,
  name: "Fatima Noor",
  phone: "0300 1234567",
  email: "fatima@example.com",
  serviceType: "fufs_set",
  preferredDate: "2026-12-01",
  preferredTime: "14:30",
  alternateDate: "2026-12-03",
  setDetails: "Glazed Truffle",
  notes: "Evening preferred",
};

/** Today for the tests, so "past date" behaviour is deterministic. */
const TODAY = "2026-12-01";

describe("appointment option ids", () => {
  it("derives the accepted ids from the UI's own option list", () => {
    expect(SERVICE_IDS).toEqual(APPOINTMENT_SERVICES.map((service) => service.id));
    expect(SERVICE_IDS).toEqual(["fufs_set", "own_set", "undecided"]);
  });
});

describe("validateAppointmentRequest", () => {
  it("accepts the UI's happy path and trims text", () => {
    const result = validateAppointmentRequest({ ...valid, name: "  Fatima Noor  " }, TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toEqual({
      requestToken: TOKEN,
      name: "Fatima Noor",
      phone: "0300 1234567",
      email: "fatima@example.com",
      serviceType: "fufs_set",
      preferredDate: "2026-12-01",
      preferredTime: "14:30",
      alternateDate: "2026-12-03",
      setDetails: "Glazed Truffle",
      notes: "Evening preferred",
    });
  });

  it("turns empty optional fields into null rather than empty strings", () => {
    const result = validateAppointmentRequest(
      { ...valid, email: " ", alternateDate: "", setDetails: "", notes: "   " },
      TODAY,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.email).toBeNull();
    expect(result.data.alternateDate).toBeNull();
    expect(result.data.setDetails).toBeNull();
    expect(result.data.notes).toBeNull();
  });

  it("requires the fields the form marks required", () => {
    const result = validateAppointmentRequest(
      { ...valid, name: " ", phone: "", preferredDate: "", preferredTime: "" },
      TODAY,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "name",
      "phone",
      "preferredDate",
      "preferredTime",
    ]);
  });

  it("rejects a missing or malformed idempotency token", () => {
    for (const requestToken of [undefined, "", "not-a-uuid", TOKEN.replace(/-/g, ""), 42]) {
      const result = validateAppointmentRequest({ ...valid, requestToken }, TODAY);
      expect(result.ok, String(requestToken)).toBe(false);
      if (!result.ok) expect(result.errors.form).toBeTruthy();
    }
    expect(isValidRequestToken(TOKEN)).toBe(true);
  });

  it("accepts only the appointment types the page offers", () => {
    for (const serviceType of SERVICE_IDS) {
      expect(validateAppointmentRequest({ ...valid, serviceType }, TODAY).ok, serviceType).toBe(true);
    }
    for (const serviceType of ["", "manicure", "fufs-set", "FUFS_SET"]) {
      const result = validateAppointmentRequest({ ...valid, serviceType }, TODAY);
      expect(result.ok, serviceType).toBe(false);
      if (!result.ok) expect(result.errors.serviceType).toBeTruthy();
    }
  });

  it("rejects past dates and accepts today or later", () => {
    const past = validateAppointmentRequest({ ...valid, preferredDate: "2026-11-30" }, TODAY);
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.errors.preferredDate).toBe("Please choose a date in the future");

    expect(validateAppointmentRequest({ ...valid, preferredDate: TODAY }, TODAY).ok).toBe(true);
    expect(validateAppointmentRequest({ ...valid, preferredDate: "2027-01-01" }, TODAY).ok).toBe(true);
  });

  it("rejects impossible calendar dates and malformed date strings", () => {
    for (const preferredDate of ["2026-02-31", "2026-13-01", "2026-1-1", "01-12-2026", "tomorrow", "2026/12/01"]) {
      const result = validateAppointmentRequest({ ...valid, preferredDate }, TODAY);
      expect(result.ok, preferredDate).toBe(false);
    }
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false); // 2026 is not a leap year
    expect(isValidIsoDate("2028-02-29")).toBe(true);
  });

  it("validates the preferred time as a real 24h clock value", () => {
    for (const preferredTime of ["00:00", "09:05", "23:59"]) {
      expect(validateAppointmentRequest({ ...valid, preferredTime }, TODAY).ok, preferredTime).toBe(true);
    }
    for (const preferredTime of ["24:00", "9:05", "14:60", "2:30 PM", ""]) {
      expect(validateAppointmentRequest({ ...valid, preferredTime }, TODAY).ok, preferredTime).toBe(false);
    }
    expect(isValidTime("14:30")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
  });

  it("checks the optional alternate date against today and the preferred date", () => {
    const past = validateAppointmentRequest({ ...valid, alternateDate: "2026-11-01" }, TODAY);
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.errors.alternateDate).toBeTruthy();

    const same = validateAppointmentRequest({ ...valid, alternateDate: valid.preferredDate }, TODAY);
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.errors.alternateDate).toBe("Please choose a different alternate date");

    const broken = validateAppointmentRequest({ ...valid, alternateDate: "2026-02-31" }, TODAY);
    expect(broken.ok).toBe(false);
  });

  it("validates phone and optional email the way the form does", () => {
    for (const phone of ["03001234567", "+92 300 1234567", "(0300) 123-4567"]) {
      expect(validateAppointmentRequest({ ...valid, phone }, TODAY).ok, phone).toBe(true);
    }
    for (const phone of ["12345", "abc", "0300 123456789012345678"]) {
      expect(validateAppointmentRequest({ ...valid, phone }, TODAY).ok, phone).toBe(false);
    }
    for (const email of ["nope", "a@b", "@example.com"]) {
      const result = validateAppointmentRequest({ ...valid, email }, TODAY);
      expect(result.ok, email).toBe(false);
    }
    expect(validateAppointmentRequest({ ...valid, email: "" }, TODAY).ok).toBe(true);
  });

  it("enforces the field caps the database also enforces", () => {
    expect(validateAppointmentRequest({ ...valid, name: "n".repeat(FIELD_LIMITS.name + 1) }, TODAY).ok).toBe(false);
    expect(validateAppointmentRequest({ ...valid, setDetails: "s".repeat(FIELD_LIMITS.setDetails + 1) }, TODAY).ok).toBe(false);
    expect(validateAppointmentRequest({ ...valid, notes: "n".repeat(FIELD_LIMITS.notes + 1) }, TODAY).ok).toBe(false);
    expect(validateAppointmentRequest({ ...valid, notes: "n".repeat(FIELD_LIMITS.notes) }, TODAY).ok).toBe(true);
  });

  it("ignores unknown fields instead of trusting them", () => {
    const result = validateAppointmentRequest(
      { ...valid, status: "confirmed", id: "attacker", houseNumber: "12-A", price: 0 },
      TODAY,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.data).sort()).toEqual([
      "alternateDate",
      "email",
      "name",
      "notes",
      "phone",
      "preferredDate",
      "preferredTime",
      "requestToken",
      "serviceType",
      "setDetails",
    ]);
  });

  it("rejects non-object payloads", () => {
    for (const raw of [undefined, null, "payload", 42, []]) {
      expect(validateAppointmentRequest(raw, TODAY).ok, String(raw)).toBe(false);
    }
  });

  it("derives today in UTC", () => {
    expect(todayIsoUtc(new Date("2026-12-01T23:30:00.000Z"))).toBe("2026-12-01");
    expect(todayIsoUtc(new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12-01");
  });
});
