import type { NextConfig } from "next";

/**
 * Production configuration assertion: the rate-limit salt must be present.
 *
 * `src/lib/security/rate-limit.ts` hashes caller identifiers with this salt so
 * the counter table cannot be read back as a visitor log. A publicly known salt
 * defeats that, so the limiter refuses requests rather than fall back to the
 * development constant — which means a deployment that forgot the variable runs
 * with submission surfaces effectively disabled.
 *
 * That failure mode is silent at build time and confusing at runtime, so the
 * build fails instead. `next build` runs in the deployment's environment, so this
 * catches a missing Vercel variable before it reaches visitors.
 */
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  // Builds during local verification may opt out explicitly.
  if (process.env.SKIP_ENV_ASSERTIONS === "1") return;

  if (!process.env.RATE_LIMIT_SALT?.trim()) {
    throw new Error(
      "RATE_LIMIT_SALT is not set for a production build.\n" +
        "Abuse protection hashes caller identifiers with this value, so a missing " +
        "salt is refused at runtime rather than replaced with a public default — " +
        "which would leave the public submission forms unable to accept anything.\n" +
        "Set RATE_LIMIT_SALT to a long random string in the deployment environment " +
        "(for example: openssl rand -base64 48).",
    );
  }
}

assertProductionSecrets();

/**
 * Next.js configuration.
 *
 * Two production concerns live here: a baseline of security response headers, and
 * making sure the admin surface is never stored anywhere it could be replayed to
 * someone else.
 */

/**
 * Supabase project origin, needed by the Content-Security-Policy.
 *
 * Product and collection photography is served from Storage's public object
 * endpoint, and Supabase Auth is called from the browser for the admin sign-in
 * flow, so both have to be named explicitly — a CSP without them would break
 * images and login.
 */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

/**
 * Content-Security-Policy.
 *
 * `script-src` has to allow inline scripts for two reasons that cannot be nonced
 * away cheaply: Next.js inlines its own bootstrap and hydration payload, and the
 * theme initialiser in `src/app/layout.tsx` is inline by design so the page does
 * not flash the wrong theme before paint.
 *
 * `frame-ancestors 'none'` is the directive that actually stops clickjacking;
 * `X-Frame-Options` is kept alongside it for older browsers.
 *
 * `connect-src` includes the Supabase origin because the admin browser client
 * talks to Supabase Auth directly. `img-src` includes Storage and permits blob:
 * because Studio Mode previews a locally picked file before it is uploaded.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and the design tokens compile to a stylesheet, but React emits
  // inline style attributes for layout, which need this.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Two years, with preload, so a browser refuses plaintext to this host.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Stops a response being sniffed as a type it is not.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Belt-and-braces with frame-ancestors for browsers that ignore it.
  { key: "X-Frame-Options", value: "DENY" },
  // Do not leak full URLs (which can carry identifiers) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No feature on this storefront needs any of these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // The catalogue has no cross-origin embedding requirement.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  /**
   * The certificate is read at runtime by `src/lib/prisma/tls.ts`, so it has to be
   * traced into the serverless bundle. Without this the file is absent in
   * production and the connection would silently lose verification.
   */
  outputFileTracingIncludes: {
    "/**": ["./certs/supabase-root-2021.crt"],
  },

  // Do not advertise the framework version.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Everything: the baseline applies site-wide.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /**
         * Admin responses render one admin's data and act on the signed-in
         * session, so no shared or browser cache may replay one to somebody else.
         * `private` also keeps them out of any intermediary that ignores
         * `no-store`.
         */
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" }],
      },
      {
        // Not content: these paths only redirect, and must never be indexed.
        source: "/admin/attachments/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
