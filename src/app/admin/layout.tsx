import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { getAdminUser } from "@/lib/admin/auth";

// Session-gated pages must be rendered per request, never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Admin — Nails by Fufs",
  robots: { index: false, follow: false },
};

/**
 * Guarded shell for every /admin page. `requireAdmin()` runs here and again in
 * each page and action, so authorisation never depends on the proxy or on a link
 * being hidden.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Intentionally NOT a guard: /admin/login lives inside this segment, so
  // redirecting here would loop the sign-in page against itself. Each admin page
  // calls requireAdmin() itself, and src/proxy.ts gates the whole segment.
  const user = await getAdminUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <Container size="wide">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="font-display text-lg text-foreground tracking-wide">
                Studio Admin
              </Link>
              <nav className="hidden md:flex items-center gap-4 text-xs">
                <Link href="/admin" className="text-muted-foreground hover:text-accent transition-colors">
                  Catalogue
                </Link>
                <Link href="/admin/custom-orders" className="text-muted-foreground hover:text-accent transition-colors">
                  Custom Orders
                </Link>
                <Link href="/admin/appointments" className="text-muted-foreground hover:text-accent transition-colors">
                  Appointments
                </Link>
                <Link href="/admin/orders" className="text-muted-foreground hover:text-accent transition-colors">
                  Orders
                </Link>
                <Link href="/shop" className="text-muted-foreground hover:text-accent transition-colors">
                  View Storefront
                </Link>
                <Link
                  href="/shop?studio=1"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs border border-accent/40 bg-accent-subtle/50 text-accent font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Open storefront in visual Studio Mode"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                  </span>
                  Studio Mode
                </Link>
              </nav>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground">
                  {user.email}
                </span>
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" size="sm" className="text-[11px]">
                    Sign Out
                  </Button>
                </form>
              </div>
            )}
          </div>
        </Container>
      </header>

      <main className="py-8 sm:py-10">
        <Container size="wide">{children}</Container>
      </main>
    </div>
  );
}
