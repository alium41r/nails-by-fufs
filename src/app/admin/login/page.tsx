import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Sign in — Studio Control Center",
  robots: { index: false, follow: false },
};

/**
 * Admin sign-in.
 *
 * Centred, quiet, and deliberately minimal: this page is reached rarely and its
 * only job is to get the owner in.
 *
 * It carries `admin-shell` for the admin's neutral ground and sans headings, but
 * renders no sidebar — a sign-in screen should not advertise navigation to pages
 * the visitor cannot reach yet.
 */
export default function AdminLoginPage() {
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
