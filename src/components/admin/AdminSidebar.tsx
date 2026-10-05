"use client";

import React, { useEffect, useState } from "react";
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
}: {
  counts: NavCounts;
  email: string | null;
}) {
  const pathname = usePathname();
  return <AdminSidebarInner key={pathname} counts={counts} email={email} />;
}

function AdminSidebarInner({
  counts,
  email,
}: {
  counts: NavCounts;
  email: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
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

  const nav = (
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
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors",
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

      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-4">
        {/* Studio Mode is the fast path for visual edits, so it is offered from
            the navigation rather than buried in a dashboard banner. */}
        <Link
          href="/?studio=1"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium text-accent transition-colors hover:bg-accent-subtle"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Open Studio Mode</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Compact bar for small screens. The full navigation lives in the drawer
          below rather than being dropped entirely. */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-subtle"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="min-w-0">
          <span className="font-display text-lg text-foreground">Studio</span>
        </Link>
        <Link
          href="/?studio=1"
          className="ml-auto flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-subtle"
        >
          <Sparkles className="h-4 w-4" />
          Studio Mode
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-foreground/25 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-border/70 px-4">
              <span className="font-display text-lg text-foreground">Studio</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
            {email && (
              <p className="truncate border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
                {email}
              </p>
            )}
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
        {nav}
        <div className="border-t border-border/60 px-5 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            View storefront
          </Link>
          {email && <p className="mt-1.5 truncate text-xs text-muted-foreground/70">{email}</p>}
        </div>
      </aside>
    </>
  );
}
