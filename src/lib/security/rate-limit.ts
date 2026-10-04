import "server-only";

import { createHash } from "node:crypto";

import { getPrisma } from "@/lib/prisma/db";

/**
 * Durable, database-backed rate limiting for the public write surfaces.
 *
 * ## Why not in-process
 *
 * Every route on Vercel runs in a short-lived serverless instance, so a counter
 * held in module memory is per-instance and starts empty on each cold start. It
 * would look like protection while limiting nothing. The counter therefore lives
 * in Postgres (`public.consume_rate_limit`), which every instance shares.
 *
 * ## Windows, not sliding logs
 *
 * One row per `(key, window)` means one upsert per request rather than one insert
 * per hit, and a single `insert ... on conflict do update` is what makes the count
 * exact when several requests race. The trade-off is a boundary burst: a caller
 * can spend a full allowance either side of a window edge. For abuse protection —
 * which is what this is — that is the right trade.
 *
 * ## Privacy
 *
 * The stored key is a keyed hash of the caller, never a raw IP address, so this
 * table cannot become a record of who visited the site. See `callerKey`.
 *
 * ## Fails closed
 *
 * If the limiter cannot be reached the request is refused rather than allowed.
 * "Fail open" would mean an attacker who can induce an error bypasses the limit
 * entirely, and a public form that cannot record a request is not useful anyway —
 * the same database is about to be written to.
 */

/** What each limited surface allows. Kept explicit so the policy is reviewable. */
export const RATE_LIMITS = {
  /** Mints signed upload URLs — each one can create a Storage object. */
  customOrderUpload: { windowSeconds: 60 * 60, maxHits: 20 },
  /** Submits a custom request. Generous: a real person may revise and retry. */
  customOrderSubmit: { windowSeconds: 60 * 60, maxHits: 10 },
  /** Requests a studio appointment. */
  appointmentRequest: { windowSeconds: 60 * 60, maxHits: 10 },
  /** Places an order. Deliberately low: a person does not order 8 times an hour. */
  orderPlacement: { windowSeconds: 60 * 60, maxHits: 8 },
  /**
   * Admin image and cover uploads.
   *
   * The allowlist is the real boundary; this bounds the one admin operation that
   * creates Storage objects, so a compromised session cannot fill the bucket or
   * burn the project's storage quota in a single burst. The allowance is well
   * above real use — a full 8-image gallery uploaded twice a minute.
   */
  adminUpload: { windowSeconds: 60, maxHits: 16 },
  /** Mints a short-lived signed URL for a private reference file. */
  privateFileAccess: { windowSeconds: 60, maxHits: 60 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export type RateLimitOutcome =
  | { allowed: true; remaining: number; resetAt: Date }
  | { allowed: false; reason: "exceeded" | "unavailable"; retryAfterSeconds: number; message: string };

/**
 * Development-only salt.
 *
 * Deliberately a constant that is obviously not a secret. It exists so
 * `npm run dev` and the test suites work on a fresh clone with no configuration;
 * using it in production is refused (see {@link rateLimitSalt}).
 */
const DEVELOPMENT_SALT = "nails-by-fufs-development-salt";

let warnedAboutMissingSalt = false;

/**
 * The salt for hashing caller identifiers.
 *
 * ## Why a missing salt is refused rather than defaulted
 *
 * The limiter has to tell callers apart, but storing a raw IP address would build
 * a visitor log as a side effect of abuse protection, so the key it writes is
 * `SHA-256(salt + identifier)`. With a *known* salt that hashing stops protecting
 * anything: somebody wanting to spend another caller's allowance — or to check
 * whether a given address had visited — can compute the keys themselves.
 *
 * A silent fallback is therefore the wrong behaviour in production, and it would
 * be invisible: the site would look protected. Instead the salt is required once
 * `NODE_ENV` is production, and a missing one is reported loudly and treated as a
 * limiter that cannot be reached — which is a refusal, not a free pass.
 */
function rateLimitSalt(): string | null {
  const configured = process.env.RATE_LIMIT_SALT?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    if (!warnedAboutMissingSalt) {
      warnedAboutMissingSalt = true;
      console.error(
        "[security] RATE_LIMIT_SALT is not set. Rate limiting is refusing requests " +
          "rather than hashing caller identifiers with a publicly known salt. " +
          "Set RATE_LIMIT_SALT to a long random string in the deployment environment.",
      );
    }
    return null;
  }

  return DEVELOPMENT_SALT;
}

/**
 * Derives the storage key for a caller.
 *
 * Stable within a deployment (so repeated requests correlate) and not reversible
 * to an address. Returns null when no salt is available in production, which the
 * caller turns into a refusal.
 */
export function callerKey(scope: string, identifier: string): string | null {
  const salt = rateLimitSalt();
  if (!salt) return null;

  const digest = createHash("sha256").update(`${salt}:${identifier}`).digest("hex").slice(0, 32);
  return `${scope}:${digest}`;
}

/**
 * Best-effort client identity, from the headers the platform sets.
 *
 * ## Provenance
 *
 * On Vercel, `x-real-ip` is set by the platform's edge and `x-forwarded-for` is
 * appended to. A client-supplied `x-forwarded-for` cannot override
 * `x-real-ip`, which is why that is preferred; the right-most entry of
 * `x-forwarded-for` is the value added by the trusted proxy directly in front of
 * the app, so it is the next-best signal.
 *
 * This value is only ever used to *separate* callers for rate limiting. It is not
 * an authorization decision, so a caller who can influence it gains, at most, a
 * separate rate-limit bucket — never access to anything.
 */
export function clientIdentifierFromHeaders(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    // The last hop is the one the platform appended.
    if (parts.length > 0) return parts[parts.length - 1];
  }

  // No usable signal: everything shares one bucket rather than being unlimited.
  return "unknown";
}

/**
 * Consumes one unit for `key`, returning whether the caller may proceed.
 *
 * The identifier for a public caller is normally derived with
 * {@link clientIdentifierFromHeaders}; a fixed identifier is used where there is
 * no meaningful caller (for example a shared administrative action).
 */
export async function consumeRateLimit(
  action: RateLimitAction,
  key: string | null,
): Promise<RateLimitOutcome> {
  const { windowSeconds, maxHits } = RATE_LIMITS[action];

  if (!key) {
    // No salt in production: refuse rather than hash with a known value.
    return {
      allowed: false,
      reason: "unavailable",
      retryAfterSeconds: 60,
      message: "We could not check that request just now. Please try again in a moment.",
    };
  }

  try {
    const rows = await getPrisma().$queryRaw<
      { allowed: boolean; remaining: number; reset_at: Date }[]
    >`select * from public.consume_rate_limit(${key}, ${windowSeconds}, ${maxHits})`;

    const row = rows[0];
    if (!row) {
      return {
        allowed: false,
        reason: "unavailable",
        retryAfterSeconds: 60,
        message: "We could not check that request just now. Please try again in a moment.",
      };
    }

    if (row.allowed) {
      return { allowed: true, remaining: Number(row.remaining), resetAt: row.reset_at };
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000),
    );
    return {
      allowed: false,
      reason: "exceeded",
      retryAfterSeconds,
      message:
        "We have received a lot of requests from this connection recently. " +
        "Please wait a few minutes and try again.",
    };
  } catch {
    // Deliberately closed: an unreachable limiter must not become no limiter.
    return {
      allowed: false,
      reason: "unavailable",
      retryAfterSeconds: 60,
      message: "We could not check that request just now. Please try again in a moment.",
    };
  }
}

/**
 * Convenience wrapper for a request-scoped caller.
 *
 * Returns the same refusal shape as {@link consumeRateLimit}.
 */
export async function consumeRateLimitForRequest(
  action: RateLimitAction,
  headers: Headers,
): Promise<RateLimitOutcome> {
  return consumeRateLimit(action, callerKey(action, clientIdentifierFromHeaders(headers)));
}
