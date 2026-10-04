import { describe, expect, it } from "vitest";

import {
  connectionStringWithoutSslParams,
  databaseSslConfig,
} from "@/lib/prisma/tls";

/**
 * Database TLS configuration.
 *
 * The live handshake is verified by the integration suite; these cases pin the
 * decisions that are easy to regress silently — that libpq ssl parameters are
 * stripped (so they cannot override the explicit `ssl` object) and that
 * verification is on whenever the pinned CA is readable.
 */

describe("database TLS: connection string sanitising", () => {
  it("removes every libpq ssl parameter", () => {
    const stripped = connectionStringWithoutSslParams(
      "postgresql://user:pass@host:6543/postgres?sslmode=require&uselibpqcompat=true&sslmode=require",
    );
    expect(stripped).toBe("postgresql://user:pass@host:6543/postgres");
    expect(stripped).not.toContain("sslmode");
    expect(stripped).not.toContain("uselibpqcompat");
  });

  it("keeps unrelated parameters", () => {
    const stripped = connectionStringWithoutSslParams(
      "postgresql://user:pass@host:6543/postgres?sslmode=require&application_name=app&pgbouncer=true",
    );
    expect(stripped).toContain("application_name=app");
    expect(stripped).toContain("pgbouncer=true");
    expect(stripped).not.toContain("sslmode");
  });

  it("leaves a parameter-free string untouched", () => {
    const bare = "postgresql://user:pass@host:6543/postgres";
    expect(connectionStringWithoutSslParams(bare)).toBe(bare);
  });
});

describe("database TLS: verification settings", () => {
  it("verifies the chain and sets SNI when the pinned CA is present", () => {
    const ssl = databaseSslConfig("postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres");
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toContain("BEGIN CERTIFICATE");
    expect(ssl.servername).toBe("aws-0-eu-west-1.pooler.supabase.com");
  });

  it("pins the Supabase root rather than the system store", () => {
    const ssl = databaseSslConfig("postgresql://user:pass@host:6543/postgres");
    // The committed trust anchor is self-signed, so it is not in Node's store.
    expect(ssl.ca).toContain("Supabase Root 2021 CA");
  });

  it("survives an unparseable connection string", () => {
    const ssl = databaseSslConfig("not-a-url");
    expect(ssl.ca).toContain("BEGIN CERTIFICATE");
    expect(ssl.servername).toBeUndefined();
  });
});
