import { createClient } from "@supabase/supabase-js";

import { REFERENCE_BUCKET } from "@/lib/custom-order-validation";

/**
 * Privileged Supabase Storage access — SERVER ONLY.
 *
 * Uses the current-format project secret key (`sb_secret_...`), which is a
 * privileged credential: it bypasses Storage RLS and the table grants that keep
 * custom-order data private. It must never reach the browser, which is why this
 * module is marked `server-only` (importing it from a Client Component is a
 * build error) and why the variable is `SUPABASE_SECRET_KEY` rather than a
 * `NEXT_PUBLIC_` name.
 *
 * Browser uploads do not use this client: the server mints short-lived signed
 * upload URLs and the browser PUTs the file straight to Storage, so no key of
 * any kind is shipped to the client and image bodies never pass through the
 * Next.js server.
 *
 * Client creation is lazy so that a missing configuration only fails when a
 * custom-order upload is actually attempted, not when a build imports a module
 * that happens to reach this file.
 */

type StorageClient = ReturnType<typeof createClient>["storage"];

let cachedStorage: StorageClient | undefined;

export function getReferenceStorage(): StorageClient {
  if (cachedStorage) return cachedStorage;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Custom-order reference uploads " +
        "need the server-only Supabase project URL and secret key (sb_secret_...). " +
        "Copy .env.example to .env and fill both in; never expose the secret key to the browser.",
    );
  }

  cachedStorage = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;

  return cachedStorage;
}

export { REFERENCE_BUCKET };
