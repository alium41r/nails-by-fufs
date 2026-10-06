import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";

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

  /*
   * Sign out is built here, in the Server Component, because it posts to a Server
   * Action. It is handed to the sidebar as a node so the *same* control can be
   * rendered in whichever chrome the viewport is using — the desktop column or
   * the mobile drawer.
   *
   * Before this it existed only inside the `hidden lg:block` header, which meant
   * a phone or tablet had no way to sign out at all: the drawer listed every
   * destination but not the one action that ends the session.
   */
  const signOut = (
    <form action={signOutAction} className="w-full">
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );

  return (
    /*
     * Column below `lg`, row from `lg` up.
     *
     * This is the single most consequential class in the admin. The shell was a
     * bare `flex` (i.e. a row at every width) while the sidebar component renders
     * *three* siblings: a mobile top bar, the drawer, and the desktop `<aside>`.
     * In a row, the mobile top bar stopped being a bar: it became a ~256px-wide
     * column at the left of the viewport, and the content was squeezed into the
     * ~134px that was left — on a 390px phone, and still on a 768px tablet.
     * Everything else on this page was downstream of that one mistake.
     */
    <div className="admin-shell flex min-h-screen flex-col bg-background lg:flex-row">
      <AdminSidebar counts={counts} email={user.email ?? null} signOut={signOut} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden border-b border-border/70 lg:block">
          <div className="flex h-16 items-center justify-between gap-4 px-6 xl:px-10">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-muted-foreground">{identity.name}</p>
            </div>
            {signOut}
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
