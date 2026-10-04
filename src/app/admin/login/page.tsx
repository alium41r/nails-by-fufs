import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Container } from "@/components/layout/Container";
import { isAdminConfigured } from "@/config/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Admin — Nails by Fufs",
  robots: { index: false, follow: false },
};

/**
 * Admin sign-in. There is no sign-up route anywhere in the app: accounts are
 * created by the owner in the Supabase dashboard, and only emails on the
 * server-side allowlist are treated as admins.
 */
export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-16 bg-background">
      <Container size="narrow">
        <div className="max-w-sm mx-auto flex flex-col gap-6 border border-border bg-surface p-7 sm:p-8">
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-accent">Studio Admin</span>
            <h1 className="font-display font-light text-2xl text-foreground">Sign In</h1>
            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              For the studio owner only. Accounts are created in the Supabase dashboard; there is no
              public sign-up.
            </p>
          </div>

          {!isAdminConfigured() && (
            <p
              role="alert"
              className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3"
            >
              ADMIN_EMAILS is not set, so no account can be treated as an admin yet. Add the owner&apos;s
              email to ADMIN_EMAILS in the server environment and restart.
            </p>
          )}

          <Suspense fallback={<div className="h-40" />}>
            <AdminLoginForm />
          </Suspense>

          <Link href="/" className="text-[11px] text-muted-foreground hover:text-accent transition-colors">
            ← Back to the storefront
          </Link>
        </div>
      </Container>
    </div>
  );
}
