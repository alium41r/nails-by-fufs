import "server-only";

import { redirect } from "next/navigation";

import { isAdminConfigured, isAdminUser } from "@/config/admin";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

/**
 * The authorisation gate for everything under /admin.
 *
 * Every admin page and every admin Server Action calls this independently, so
 * access does not depend on the UI hiding links or on the proxy alone. Returns
 * the signed-in admin's user record, or redirects to the login page.
 *
 * `next` is where the visitor was heading, so login can send them back.
 */
export async function requireAdmin(next = "/admin") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  }

  if (!isAdminUser(user)) {
    // Signed in, but not on the allowlist: never treat this as admin access.
    redirect("/admin/login?error=not_admin");
  }

  return user;
}

/** Non-redirecting variant for actions that must return a structured error. */
export async function getAdminUser() {
  if (!isAdminConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return isAdminUser(user) ? user : null;
  } catch {
    return null;
  }
}
