"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

import { CountBadge } from "./ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Persistent admin navigation.
 *
 * ## Why a sidebar rather than the previous top bar
 *
 * The old header was a single flat row of six equally-weighted links that simply
 * overflowed on a narrow window: below `md` every destination except the wordmark
 * disappeared, with nothing in its place. There was no masthead at all on mobile.
 *
 * A sidebar fixes both problems at once. Destinations can be grouped so the
 * hierarchy is visible (overview, then the catalogue, then the request queues,
 * then settings), counts can sit beside the queues that have outstanding work,
 * and collapsing to a drawer on small screens keeps every destination reachable
 * rather than hidden.
 *
 * ## Groups, not a flat list
 *
 * "Custom Orders", "Appointments" and "Orders" are all inbound queues the owner
 * works through; "Catalogue" and "Content" are things the owner edits; "Settings"
 * is configuration touched rarely. Presenting them as four separate signals in one
 * list is what made the previous navigation read as a flat pile of equal links.
 *
 * ## How the three surfaces divide the work
 *
 * This component renders all of the admin's chrome, and which piece is visible is
 * decided by CSS, not by JavaScript:
 *
 *   - **`<lg`** — a compact top bar. Two things get you everywhere: the menu
 *     button, which opens the drawer holding every destination *plus* sign out and
 *     the storefront link; and a Studio Mode shortcut, because that is the other
 *     thing an owner opens the admin to do.
 *   - **`≥lg`** — the fixed navigation column, with the same items.
 *
 * The one thing both surfaces share is the storefront link and sign out, which is
 * why `signOut` arrives as a node from the layout: it is a Server Action form and
 * cannot be constructed here.
 */

interface NavCounts {
  customOrders: number;
  appointments: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Exact match only — otherwise a parent lights up on every child route. */
  exact?: boolean;
  count?: number;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Wrapper that resets the mobile drawer on navigation.
 *
 * Keying on the pathname remounts the sidebar whenever the route changes, so the
 * drawer closes as a consequence of the navigation rather than through an effect
 * that would set state during render — which is what the previous version did.
 */
export function AdminSidebar({
  counts,
  email,
  signOut,
}: {
  counts: NavCounts;
  email: string | null;
  /** The layout's sign-out form. Rendered in both the drawer and the column. */
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  return <AdminSidebarInner key={pathname} counts={counts} email={email} signOut={signOut} />;
}

function AdminSidebarInner({
  counts,
  email,
  signOut,
}: {
  counts: NavCounts;
  email: string | null;
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // While the drawer is open the page behind it must not scroll: a stray scroll
  // under a full-height overlay is disorienting, and it is what makes a drawer
  // feel like it "trapped" the page.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes it, and focus is handed back to the button that opened it, so a
  // keyboard user is not left behind an overlay they cannot see past.
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      ],
    },
    {
      label: "Storefront",
      items: [
        { href: "/admin/catalogue", label: "Catalogue", icon: Package },
        { href: "/admin/content", label: "Content & Settings", icon: Settings },
      ],
    },
    {
      label: "Requests",
      items: [
        {
          href: "/admin/custom-orders",
          label: "Custom Orders",
          icon: Sparkles,
          count: counts.customOrders,
        },
        {
          href: "/admin/appointments",
          label: "Appointments",
          icon: CalendarDays,
          count: counts.appointments,
        },
        { href: "/admin/orders", label: "Orders", icon: Receipt },
      ],
    },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  /*
   * `withSignOut` distinguishes the two surfaces that render this list.
   *
   * The drawer needs sign out because it is the only chrome a phone has. The
   * desktop column does not, because the header above the content already carries
   * it — rendering it twice on `lg` would be two controls for one action.
   */
  const renderNav = ({ withSignOut }: { withSignOut: boolean }) => (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Admin">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13.5px] font-medium transition-colors lg:py-2",
                  active
                    ? "bg-surface-subtle text-foreground"
                    : "text-muted-foreground hover:bg-surface-subtle/70 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-accent" : "text-muted-foreground/80",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {typeof item.count === "number" && (
                  <CountBadge value={item.count} tone="attention" />
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Studio Mode is the fast path for visual edits, so it is offered from
          the navigation rather than buried in a dashboard banner. */}
      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-4">
        <Link
          href="/?studio=1"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13.5px] font-medium text-accent transition-colors hover:bg-accent-subtle lg:py-2"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Open Studio Mode</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground lg:py-2"
        >
          <ShoppingBag className="h-4 w-4 shrink-0 text-muted-foreground/80" />
          <span className="min-w-0 flex-1 truncate">View storefront</span>
        </Link>
        {withSignOut && signOut}
        {email && (
          <p className="mt-2 truncate px-2.5 text-xs text-muted-foreground/70">{email}</p>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/*
        Compact bar for small screens. Deliberately two controls wide: the menu
        opens the drawer that holds everything, and the Studio Mode shortcut is
        the one destination worth a permanent slot because it is the other half of
        the job. Everything the drawer holds — including sign out — is one tap
        away, and nothing is a cramped row of horizontal links.
      */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/70 bg-background/95 px-2 backdrop-blur sm:px-4 lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-subtle"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/admin" className="flex min-w-0 items-baseline gap-2 rounded-md px-1 py-1">
          <span className="font-display text-lg text-foreground">Studio</span>
        </Link>

        <Link
          href="/?studio=1"
          aria-label="Open Studio Mode"
          className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-subtle"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="hidden min-[380px]:inline">Studio Mode</span>
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-foreground/25 backdrop-blur-[2px]"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-[17.5rem] max-w-[86vw] flex-col border-r border-border bg-background shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
              <span className="font-display text-lg text-foreground">Studio</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  menuButtonRef.current?.focus();
                }}
                aria-label="Close navigation"
                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNav({ withSignOut: true })}
          </div>
        </div>
      )}

      {/* Fixed sidebar from `lg` up. */}
      <aside className="sticky top-0 hidden h-screen w-[15.5rem] shrink-0 flex-col border-r border-border/70 bg-background lg:flex">
        <div className="flex h-16 flex-col justify-center px-5">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-display text-xl text-foreground">Studio</span>
            <span className="text-xs text-muted-foreground">Control Center</span>
          </Link>
        </div>
        {renderNav({ withSignOut: false })}
      </aside>
    </>
  );
}
