import { NextResponse } from "next/server";

import {
  clearSamples,
  recentSamples,
  TIMING_ENDPOINT_ENV,
  TIMING_REQUEST_HEADER,
  timingEnabled,
  timingReport,
} from "@/lib/perf/catalogue-timing";

/**
 * Readout for the catalogue stage-timing samples.
 *
 * ## Why an endpoint and not a response header
 *
 * `proxy.ts` runs *before* the page renders, so it cannot read render-phase
 * timings to attach a `Server-Timing` header — by the time the function is
 * entered, the response headers are already fixed. The samples therefore have to
 * be collected in-process and read back over a second request.
 *
 * ## Why this is safe to have in the codebase
 *
 * - **Disabled by default.** Without `NBF_CATALOGUE_TIMING=1` in the environment
 *   this returns 404, so a normal deployment exposes nothing and the route cannot
 *   be found and read uninvited.
 * - **Nothing sensitive is returned.** The payload is durations and counters
 *   only: no SQL, no parameters, no row data, no error text, no connection
 *   string, no user or request identifiers. See `@/lib/perf/catalogue-timing`.
 * - **Read-only and bounded.** It reports a fixed-size in-process ring buffer.
 * - `DELETE` clears the buffer so a measurement run can start from a known state.
 *
 * Because each serverless instance holds its own buffer, repeated reads sample
 * whatever instances answer; the buffer is per-process, so this reports that
 * instance's traffic, not a global view. That is acceptable for attributing
 * per-request cost and is called out in the readout.
 */

export const dynamic = "force-dynamic";

function enabled(): boolean {
  return process.env[TIMING_ENDPOINT_ENV] === "1";
}

export async function GET(request: Request) {
  if (!enabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const report = timingReport();

  return NextResponse.json(
    {
      note:
        "Per-process stage timings for the public catalogue read. Samples are collected only " +
        "for requests carrying the x-nbf-timing: 1 request header. Durations in milliseconds.",
      /*
       * Diagnostics.
       *
       * Distinguishes "the sampled request landed on a different instance than
       * this readout" (in which case the numbers are simply elsewhere) from
       * "sampling never runs in this deployment" (in which case no amount of
       * readout will ever see a sample). Without these two facts the empty
       * buffer is ambiguous.
       */
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      timingEnabled: timingEnabled(),
      requestId: request.headers.get("x-vercel-id") ?? null,
      probeHeaderSeen: request.headers.get(TIMING_REQUEST_HEADER) ?? null,
      instanceRegion: process.env.VERCEL_REGION ?? null,
      ...report,
      recent: recentSamples().slice(-25),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE() {
  if (!enabled()) {
    return new NextResponse("Not found", { status: 404 });
  }
  clearSamples();
  return NextResponse.json({ cleared: true });
}
