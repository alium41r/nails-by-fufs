import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminToolbar,
  StatusPill,
  type StatusTone,
} from "@/components/admin/ui/primitives";
import { AdminButton, TextInput } from "@/components/admin/ui/controls";
import { cn } from "@/lib/utils";

/**
 * The shared shape for the three inbound request queues.
 *
 * ## Why one component
 *
 * Custom orders, appointments and orders are the same job — work through a list
 * of things people sent you — and they had three separately written pages with
 * three copies of the same search/filter form, three different header layouts and
 * three different row structures. That is how surfaces drift apart and start
 * feeling like different products.
 *
 * They still differ where they should: the queue supplies its own row renderer,
 * its own status vocabulary and its own filter controls.
 *
 * ## One toolbar, filters on demand
 *
 * Search is always visible because it is the primary way to find a specific
 * person's request; the status filter and anything else live behind `Filters`.
 * The previous pages displayed search *and* a status select *and* a submit button
 * permanently, inside a bordered box, on every one of the three screens.
 */
export interface QueueItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  meta?: string;
  status: { label: string; tone: StatusTone };
}

export function AdminQueue({
  title,
  description,
  count,
  items,
  searchAction,
  query,
  searchPlaceholder,
  filters,
  activeFilterCount = 0,
  emptyTitle,
  emptyDescription,
  viewLabel,
  highlight = true,
}: {
  title: string;
  description: string;
  count: string;
  items: QueueItem[];
  searchAction: string;
  query: string;
  searchPlaceholder: string;
  filters?: React.ReactNode;
  activeFilterCount?: number;
  emptyTitle: string;
  emptyDescription: string;
  /** Link text for the row's call to action, e.g. "Open request". */
  viewLabel: string;
  /** Whether "pending review" rows are visually marked as needing action. */
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={title} description={description} count={count} />

      <AdminToolbar
        activeFilterCount={activeFilterCount}
        search={
          <form action={searchAction} className="flex items-center gap-2">
            {filters ? null : null}
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
              />
              <TextInput
                type="search"
                name="q"
                defaultValue={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-9"
              />
            </div>
            {query && (
              <Link
                href={searchAction}
                className="shrink-0 text-[13px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </Link>
            )}
          </form>
        }
        filters={filters}
      />

      {items.length === 0 ? (
        <AdminEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/70 bg-surface [&>li:first-child]:rounded-t-lg [&>li:last-child]:rounded-b-lg">
          {items.map((item) => (
            <li key={item.id}>
              {/*
                One row, two shapes.

                On a phone the metadata that the desktop row keeps in its own
                right-hand column (`meta`, and the "Open" affordance) moves onto a
                second line under the request, so the title keeps the full width and
                the status pill stays beside it rather than being pushed off. The
                whole row is still a single link, so the tap target is unchanged.
              */}
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-subtle/50 sm:items-center sm:gap-4"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* `line-clamp-2` on a phone: an appointment's title is a date,
                      a time and a name, which is three times the length of a
                      product name and was being cut to one unreadable line. */}
                  <span className="line-clamp-2 text-sm font-medium text-foreground sm:truncate">
                    {item.title}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">{item.subtitle}</span>
                  {item.meta && (
                    <span className="text-[12px] text-muted-foreground/80 sm:hidden">
                      {item.meta}
                    </span>
                  )}
                </span>

                {item.meta && (
                  <span className="hidden shrink-0 text-[13px] text-muted-foreground sm:block">
                    {item.meta}
                  </span>
                )}

                <StatusPill
                  tone={highlight && item.status.tone === "attention" ? "attention" : item.status.tone}
                >
                  {item.status.label}
                </StatusPill>

                <span className="hidden shrink-0 text-[13px] text-muted-foreground lg:block">
                  {viewLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A status filter that stays behind the `Filters` disclosure.
 *
 * A plain GET form so the selection is a real URL parameter — shareable,
 * bookmarkable, and preserved by the back button — with no client state.
 */
export function QueueStatusFilter({
  action,
  name = "status",
  value,
  options,
  query,
  label = "Status",
}: {
  action: string;
  name?: string;
  value: string;
  options: { value: string; label: string }[];
  query?: string;
  label?: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {query && <input type="hidden" name="q" value={query} />}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <select
          name={name}
          defaultValue={value}
          className={cn(
            "h-10 w-full cursor-pointer rounded-md border border-border bg-surface px-3 text-sm text-foreground",
            "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none",
          )}
        >
          <option value="">All</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" variant="primary" size="sm">
          Apply
        </AdminButton>
        <Link href={action} className="text-[13px] text-muted-foreground hover:text-foreground">
          Reset
        </Link>
      </div>
    </form>
  );
}
