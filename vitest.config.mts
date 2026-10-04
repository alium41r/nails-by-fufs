import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // See tests/support/server-only.ts for why the marker is neutralised here.
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // The live integration suites are opt-in: see vitest.integration.config.mts.
    exclude: ["**/node_modules/**", "**/.git/**", "tests/integration/**"],
    environment: "node",
  },
});
