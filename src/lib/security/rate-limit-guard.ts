import "server-only";

import { headers } from "next/headers";

import { consumeRateLimitForRequest, type RateLimitAction } from "./rate-limit";

/**
 * Request-scoped rate limit guard for Server Actions.
 *
 * Server Actions do not receive the request object, so the headers are read from
 * `next/headers` — the same request the action is executing in.
 *
 * Returns a discriminated result rather than throwing, because each surface has
 * its own error shape (field-keyed errors on the forms, a flat message on the
 * cart) and forcing one shape through an exception would obscure that.
 */
export type RateLimitGuardResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfterSeconds: number };

export async function guardRateLimit(action: RateLimitAction): Promise<RateLimitGuardResult> {
  const requestHeaders = await headers();
  const outcome = await consumeRateLimitForRequest(action, requestHeaders);

  if (outcome.allowed) return { allowed: true };

  return {
    allowed: false,
    message: outcome.message,
    retryAfterSeconds: outcome.retryAfterSeconds,
  };
}
