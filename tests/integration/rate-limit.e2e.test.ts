import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import pg from "pg";

import { setRequestHeaders } from "./support/request-headers";
import { assertLiveWritesAllowed } from "./session.mjs";
import { submitAppointmentRequest } from "@/app/book-appointment/actions";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { callerKey } from "@/lib/security/rate-limit";

/**
 * The limiter exercised through the REAL server action and the REAL database.
 *
 * Uses a distinct synthetic IP so the run cannot consume a real visitor's
 * allowance, then removes only the rows it created.
 */

// Refuses unless E2E_ALLOW_LIVE_WRITES=1.
assertLiveWritesAllowed();

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const TEST_IP = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

const validRequest = () => ({
  requestToken: crypto.randomUUID(),
  name: "Rate Limit Probe",
  phone: "+92 300 0000000",
  email: "probe@example.com",
  serviceType: "fufs_set",
  preferredDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  preferredTime: "11:00",
  alternateDate: "",
  setDetails: "",
  notes: "",
});

beforeAll(async () => {
  await db.connect();
  setRequestHeaders({ "x-real-ip": TEST_IP });
});

afterAll(async () => {
  const key = callerKey("appointmentRequest", TEST_IP);
  await db.query(`delete from rate_limit_counters where key = $1`, [key]);
  await db.query(`delete from appointment_requests where name = 'Rate Limit Probe'`);
  const left = await db.query(`select count(*)::int n from appointment_requests where name = 'Rate Limit Probe'`);
  console.log("probe rows left:", left.rows[0].n);
  await db.end();
});

describe("rate limiting through the appointment action", () => {
  it("allows up to the limit, then refuses with a retryable message", async () => {
    const { maxHits } = RATE_LIMITS.appointmentRequest;
    const results: boolean[] = [];

    for (let i = 0; i < maxHits + 2; i += 1) {
      const result = await submitAppointmentRequest(validRequest());
      results.push(result.ok);
    }

    const allowed = results.filter(Boolean).length;
    const refused = results.length - allowed;

    console.log(`limit=${maxHits} allowed=${allowed} refused=${refused}`);
    expect(allowed).toBe(maxHits);
    expect(refused).toBe(2);
  });

  it("refuses with a user-facing message rather than an error", async () => {
    const result = await submitAppointmentRequest(validRequest());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.form).toMatch(/wait a few minutes/i);
  });

  it("refused requests wrote nothing to the database", async () => {
    const { maxHits } = RATE_LIMITS.appointmentRequest;
    const count = await db.query(
      `select count(*)::int n from appointment_requests where name = 'Rate Limit Probe'`,
    );
    // Only the allowed attempts created a row.
    expect(count.rows[0].n).toBe(maxHits);
  });

  it("keeps the counter in the database rather than in process memory", async () => {
    const key = callerKey("appointmentRequest", TEST_IP);
    const rows = await db.query(`select key, hits, window_start from rate_limit_counters where key = $1`, [key]);

    // The row itself is the evidence: a per-instance counter would leave nothing
    // behind, and a cold start would reset it.
    expect(rows.rows.length).toBeGreaterThan(0);
    const total = rows.rows.reduce((sum, r) => sum + r.hits, 0);
    expect(total).toBeGreaterThanOrEqual(RATE_LIMITS.appointmentRequest.maxHits);
    // The raw IP must never be the key.
    expect(rows.rows[0].key).not.toContain(TEST_IP);
    console.log(`durable counter rows: ${rows.rows.length}, total hits: ${total}`);
  });

  it("a different caller is unaffected", async () => {
    setRequestHeaders({ "x-real-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` });
    const result = await submitAppointmentRequest({
      ...validRequest(),
      name: "Rate Limit Probe Other",
    });
    expect(result.ok).toBe(true);
    await db.query(`delete from appointment_requests where name = 'Rate Limit Probe Other'`);
    setRequestHeaders({ "x-real-ip": TEST_IP });
  });
});
