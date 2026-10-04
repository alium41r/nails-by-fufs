import { describe, expect, it } from "vitest";

import {
  RATE_LIMITS,
  callerKey,
  clientIdentifierFromHeaders,
} from "@/lib/security/rate-limit";

/**
 * Rate-limit keying and caller identification.
 *
 * The database side of the limiter is covered by the live integration suite; what
 * is pinned here are the decisions that would silently weaken it — a raw IP
 * ending up in the key, or a spoofable header being trusted for identity.
 */

describe("rate limit: caller identification", () => {
  it("prefers x-real-ip, which the platform sets and a client cannot override", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.7",
      // A client trying to look like somebody else.
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(clientIdentifierFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to the right-most x-forwarded-for hop, the one the proxy added", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIdentifierFromHeaders(headers)).toBe("5.6.7.8");
  });

  it("tolerates surrounding whitespace", () => {
    const headers = new Headers({ "x-forwarded-for": " 1.2.3.4 ,  5.6.7.8  " });
    expect(clientIdentifierFromHeaders(headers)).toBe("5.6.7.8");
  });

  it("uses one shared bucket rather than no bucket when nothing is available", () => {
    // An unlimited fallback would be the bug; a shared bucket still bounds total
    // traffic, which is the safe direction.
    expect(clientIdentifierFromHeaders(new Headers())).toBe("unknown");
    expect(clientIdentifierFromHeaders(new Headers({ "x-forwarded-for": "   " }))).toBe("unknown");
  });
});

describe("rate limit: storage key", () => {
  it("never contains the identifier it was derived from", () => {
    const ip = "203.0.113.7";
    const key = callerKey("appointmentRequest", ip);
    expect(key).not.toBeNull();
    expect(key).not.toContain(ip);
    expect(key!.startsWith("appointmentRequest:")).toBe(true);
  });

  it("is stable for the same input, so repeat requests correlate", () => {
    expect(callerKey("orderPlacement", "203.0.113.7")).toBe(
      callerKey("orderPlacement", "203.0.113.7"),
    );
  });

  it("separates callers and scopes", () => {
    expect(callerKey("orderPlacement", "203.0.113.7")).not.toBe(
      callerKey("orderPlacement", "203.0.113.8"),
    );
    // The same caller under two actions must not share an allowance.
    expect(callerKey("orderPlacement", "203.0.113.7")).not.toBe(
      callerKey("appointmentRequest", "203.0.113.7"),
    );
  });

  it("produces a plain, non-secret-looking key", () => {
    const key = callerKey("customOrderUpload", "203.0.113.7");
    expect(key).toMatch(/^[a-zA-Z]+:[0-9a-f]{32}$/);
  });

  it("requires a configured salt in production instead of falling back", () => {
    // The fallback salt is public, so hashing with it protects nothing. A silent
    // fallback would leave the site looking protected while it is not.
    const original = { node: process.env.NODE_ENV, salt: process.env.RATE_LIMIT_SALT };
    try {
      // @ts-expect-error NODE_ENV is read-only in the Next.js typings.
      process.env.NODE_ENV = "production";
      delete process.env.RATE_LIMIT_SALT;
      expect(callerKey("orderPlacement", "203.0.113.7")).toBeNull();

      process.env.RATE_LIMIT_SALT = "a-real-configured-salt";
      expect(callerKey("orderPlacement", "203.0.113.7")).toMatch(/^orderPlacement:[0-9a-f]{32}$/);
    } finally {
      // @ts-expect-error restoring the test environment.
      process.env.NODE_ENV = original.node;
      if (original.salt === undefined) delete process.env.RATE_LIMIT_SALT;
      else process.env.RATE_LIMIT_SALT = original.salt;
    }
  });
});

describe("rate limit: policy", () => {
  it("defines a bounded window and ceiling for every limited action", () => {
    for (const [action, policy] of Object.entries(RATE_LIMITS)) {
      expect(policy.windowSeconds, action).toBeGreaterThan(0);
      expect(policy.maxHits, action).toBeGreaterThan(0);
      expect(Number.isInteger(policy.windowSeconds), action).toBe(true);
      expect(Number.isInteger(policy.maxHits), action).toBe(true);
    }
  });

  it("keeps the order and upload ceilings low enough to matter", () => {
    // Each of these either creates a Storage object or a durable order row.
    expect(RATE_LIMITS.customOrderUpload.maxHits).toBeLessThanOrEqual(30);
    expect(RATE_LIMITS.customOrderSubmit.maxHits).toBeLessThanOrEqual(20);
    expect(RATE_LIMITS.appointmentRequest.maxHits).toBeLessThanOrEqual(20);
    expect(RATE_LIMITS.orderPlacement.maxHits).toBeLessThanOrEqual(20);
    // Real use must not be throttled: a person does not exceed these.
    expect(RATE_LIMITS.orderPlacement.maxHits).toBeGreaterThanOrEqual(3);
  });
});
