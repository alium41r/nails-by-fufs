import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminUser } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Sign in — Studio Control Center",
  robots: { index: false, follow: false },
};

/**
 * Admin sign-in.
 *
 * ## Already signed in? Straight through.
 *
 * Without this redirect an owner who is already signed in and returns to
 * `/admin/login` sees a sign-in form they do not need — framed by the Control
 * Center navigation, because the shell is rendered for any signed-in user. That
 * is confusing on its own, and it is what made signing in look like it "did
 * nothing": the page they were on already had the shell around it, so a
 * successful sign-in changed nothing visible and the form stayed put.
 *
 * Redirecting is also the safer shape. A signed-in admin arriving here with a
 * stale `?next=` is sent to the destination they asked for rather than being shown
 * a form that, if used, would simply re-authenticate them over the top.
 *
 * `getAdminUser()` is the same check every admin page uses, so this cannot admit
 * anyone the pages would refuse.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAdminUser();

  if (user) {
    const { next } = await searchParams;
    // Only ever an admin path, so a crafted `?next=` cannot bounce someone
    // off-site (an absolute URL would not start with `/admin`).
    redirect(next && next.startsWith("/admin") ? next : "/admin");
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col gap-1.5 text-center">
          <span className="font-display text-2xl text-foreground">Nails by Fufs</span>
          <span className="text-[13px] text-muted-foreground">Studio Control Center</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface p-6 shadow-sm">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
