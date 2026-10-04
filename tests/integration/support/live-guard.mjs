/**
 * The opt-in gate for live integration tests.
 *
 * Kept in its own module so both the session helper and each test file can call
 * it, and so the check happens before any privileged client is constructed.
 */
export function assertLiveWritesAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run live integration tests with NODE_ENV=production.");
  }
  if (process.env.E2E_ALLOW_LIVE_WRITES !== "1") {
    throw new Error(
      "Refusing to run live integration tests. Set E2E_ALLOW_LIVE_WRITES=1 to confirm " +
        "you intend to write to the live Supabase project.",
    );
  }
}
