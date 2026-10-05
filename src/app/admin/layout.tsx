import type { Metadata } from "next";
import { Suspense } from "react";

import { signOutAction } from "@/app/admin/actions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { getAdminUser } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { getSiteBasics } from "@/lib/site-content";

// Session-gated pages must be rendered per request, never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Control Center",
  robots: { index: false, follow: false },
};

/**
 * The Control Center shell.
 *
 * ## What changed, and why it needed to
 *
 * The previous shell was a single top bar with six flat links, `Studio Admin` as
 * the only identity, and a hard `hidden md:flex` on the navigation — so on a
 * phone the admin had *no navigation at all* except the wordmark. It also had no
 * room for the outstanding-work counts that make a control center useful.
 *
 * This is a sidebar layout: grouped destinations, live counts on the inbound
 * queues, a drawer instead of a disappearance on small screens, and a neutral
 * background so the content reads as the subject rather than the chrome.
 *
 * ## Why the layout awaits admin data
 *
 * The counts and the signed-in address are read here, once, and passed down.
 * `getAdminUser()` still returns null for a non-admin, and the layout deliberately
 * does not redirect — `/admin/login` lives inside this segment, so redirecting
 * here would loop the sign-in page against itself. Each page calls
 * `requireAdmin()` itself and `src/proxy.ts` gates the whole segment, exactly as
 * before.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();

  /*
   * Signed out: render the page with no chrome at all.
   *
   * `/admin/login` is the only page reachable without a session — the proxy gates
   * everything else — so this branch exists for exactly one screen. Rendering the
   * sidebar around it was wrong twice over: it advertised navigation to pages the
   * visitor is not allowed to open, and it gave the sign-in form a "Sign out"
   * button above it, which reads as though they were already signed in.
   *
   * Returning the children bare also means an unauthenticated render touches the
   * database not at all: the counts and the studio name below are only read once
   * there is a session.
   */
  if (!user) {
    return <>{children}</>;
  }

  // Outstanding-work counts for the sidebar. Read here, once, and passed down, so
  // the navigation and the pages it links to cannot disagree.
  const prisma = getPrisma();
  const [customOrders, appointments] = await Promise.all([
    prisma.custom_order_requests.count({ where: { status: "pending_review" } }),
    prisma.appointment_requests.count({ where: { status: "pending_review" } }),
  ]);
  const counts = { customOrders, appointments };


  // The wordmark is the studio's own name rather than a hardcoded string, so the
  // admin and the storefront agree.
  const { identity } = await getSiteBasics();

  return (
    <div className="admin-shell flex min-h-screen bg-background">
      <AdminSidebar counts={counts} email={user.email ?? null} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden border-b border-border/70 lg:block">
          <div className="flex h-16 items-center justify-between gap-4 px-6 xl:px-10">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-muted-foreground">{identity.name}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            {/*
              Reads `?saved=` / `?error=` from whichever page redirected here, so
              no page has to remember to place it. Wrapped in Suspense because
              `useSearchParams` suspends during a static prerender.
            */}
            <Suspense fallback={null}>
              <AdminNotice />
            </Suspense>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
