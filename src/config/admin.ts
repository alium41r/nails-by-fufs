/**
 * Admin access control.
 *
 * The allowlist is the whole authorisation model: a Supabase Auth account only
 * becomes an admin if its email (or id) is listed in the server environment.
 * Any other authenticated user is treated as a normal visitor — there is no
 * public sign-up, so accounts can only be created by the owner in the Supabase
 * dashboard (see SETUP.md).
 *
 * Server-side only by convention: this module reads non-public env values, so it
 * must never be imported into a Client Component. `src/lib/admin/auth.ts` wraps
 * it with `server-only` and the request-level checks.
 */

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/** Emails allowed to administer the studio. `ADMIN_EMAILS=a@b.com,c@d.com` */
export function adminEmails(): string[] {
  return parseList(process.env.ADMIN_EMAILS);
}

/** Optional user-id allowlist, for accounts whose email may change. */
export function adminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function isAdminConfigured(): boolean {
  return adminEmails().length > 0 || adminUserIds().length > 0;
}

export function isAdminUser(user: { id?: string | null; email?: string | null } | null | undefined): boolean {
  if (!user) return false;

  const ids = adminUserIds();
  if (user.id && ids.includes(user.id)) return true;

  const emails = adminEmails();
  if (!user.email) return false;

  return emails.includes(user.email.trim().toLowerCase());
}
