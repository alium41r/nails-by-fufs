import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromHere = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Live integration tests.
 *
 * Separate from `vitest.config.mts` because these write to the live Supabase
 * project: `npm test` must never pick them up. They also need three Next.js
 * request-scoped modules replaced with in-process stand-ins, which is the only
 * thing stubbed — the actions, authorisation, validation, Prisma and Storage
 * calls are the production ones.
 *
 * See tests/integration/README.md.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fromHere("./src/") },
      { find: "next/headers", replacement: fromHere("./tests/integration/support/next-headers.ts") },
      { find: "next/cache", replacement: fromHere("./tests/integration/support/next-cache.ts") },
      { find: "server-only", replacement: fromHere("./tests/integration/support/server-only.ts") },
    ],
  },
  test: {
    include: ["tests/integration/**/*.e2e.test.ts"],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Both files mutate the same rows, so they must not interleave.
    fileParallelism: false,
  },
});
