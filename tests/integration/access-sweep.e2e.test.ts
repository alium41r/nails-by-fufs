import { beforeAll, afterAll, describe, expect, it } from "vitest";
import "dotenv/config";

import {
  assertLiveWritesAllowed,
  sessionFor,
  encodeSessionCookie,
  adminEmails,
  admin,
} from "./session.mjs";
import { AUTH_COOKIE_NAME } from "./support/cookie";

/**
 * Live anonymous / non-admin access-control sweep.
 *
 * HTTP-level, against a running production server, with real sessions: the
 * privileged surfaces must be unreachable without an admin session, and the
 * private-file route must not reveal signed URLs.
 */

assertLiveWritesAllowed();

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";

const get = (path: string, cookie?: string) =>
  fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie: `${AUTH_COOKIE_NAME}=${cookie}` } : {},
  });

let nonAdmin: { userId: string; cookie: string };

beforeAll(async () => {
  const session = await sessionFor(`e2e-sweep-${Date.now()}@example.com`);
  nonAdmin = { userId: session.userId, cookie: encodeSessionCookie(session) };
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(nonAdmin.userId).catch(() => undefined);
});

describe("anonymous access to privileged surfaces", () => {
  const protectedPaths = [
    "/admin",
    // The catalogue moved to its own route when the overview became a dashboard;
    // an admin route that is not in this list is one whose gate is unverified.
    "/admin/catalogue",
    "/admin/content",
    "/admin/products",
    // A static segment alongside the dynamic `[id]` route: it must resolve to the
    // creation form for an admin and to the login redirect for everyone else.
    "/admin/products/new",
    "/admin/custom-orders",
    "/admin/appointments",
    "/admin/orders",
    "/admin/collections",
  ];

  it("redirects every admin page to the login form", async () => {
    for (const path of protectedPaths) {
      const response = await get(path);
      const location = response.headers.get("location") ?? "";
      expect([307, 302, 303], `${path} -> ${response.status}`).toContain(response.status);
      expect(location, `${path} location`).toContain("/admin/login");
    }
  });

  it("refuses the private attachment route without revealing a signed URL", async () => {
    const response = await get(
      "/admin/attachments/00000000-0000-4000-8000-000000000000",
    );
    expect([302, 307, 303, 401, 404]).toContain(response.status);
    const location = response.headers.get("location") ?? "";
    expect(location).not.toContain("token=");
    expect(response.headers.get("cache-control") ?? "").toMatch(/no-store|private/);
  });

  it("serves the storefront without any Studio Mode markup", async () => {
    for (const path of ["/", "/shop", "/collections", "/search"]) {
      const body = await (await get(path)).text();
      for (const marker of [
        "studio-editable-zone",
        "Studio Mode Toolbar",
        "Studio Inspector",
        "studio-field-name",
      ]) {
        expect(body, `${path} leaked ${marker}`).not.toContain(marker);
      }
    }
  });

  it("does not publish the internal design-system reference", async () => {
    const response = await get("/design-system");
    expect(response.status).toBe(404);
  });

  it("does not leak the admin allowlist into page content", async () => {
    const emails = adminEmails();
    const body = await (await get("/shop")).text();
    for (const email of emails) {
      expect(body).not.toContain(email);
    }
  });
});

describe("non-admin signed-in access", () => {
  it("is refused on admin pages with a distinguishable error", async () => {
    const response = await get("/admin", nonAdmin.cookie);
    const location = response.headers.get("location") ?? "";
    expect([307, 302, 303]).toContain(response.status);
    expect(location).toContain("not_admin");
  });

  it("gets no Studio markup on the storefront", async () => {
    const body = await (await get("/shop?studio=1", nonAdmin.cookie)).text();
    expect(body).not.toContain("studio-editable-zone");
    expect(body).not.toContain("Studio Mode Toolbar");
  });

  it("is refused by the private attachment route", async () => {
    const response = await get(
      "/admin/attachments/00000000-0000-4000-8000-000000000000",
      nonAdmin.cookie,
    );
    expect(response.status).not.toBe(200);
    expect(response.headers.get("location") ?? "").not.toContain("token=");
  });
});

describe("security headers on real responses", () => {
  it("sets the baseline on the storefront", async () => {
    const headers = (await get("/shop")).headers;
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("strict-transport-security")).toContain("max-age=");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("x-powered-by")).toBeNull();
  });

  it("marks admin responses private and uncacheable", async () => {
    const headers = (await get("/admin")).headers;
    const cacheControl = headers.get("cache-control") ?? "";
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("private");
  });
});
