import React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The admin's own small design vocabulary.
 *
 * ## Why the admin does not use the storefront's `Button`
 *
 * The storefront's buttons are editorial: uppercase, wide letter-spacing, tall,
 * and sized for a shopping page with one or two actions on it. In a management
 * screen with dozens of controls that treatment is unreadable — it is most of why
 * the admin read as an internal tool. Admin controls are sentence case, tighter,
 * and quieter by default, so emphasis is available for the things that need it.
 *
 * These are deliberately *not* a general-purpose component library. They are the
 * four or five shapes the admin screens actually repeat — a page header, a
 * section, a status, a quiet empty state, a toolbar — so that every surface looks
 * like the same product without each page re-inventing spacing.
 */

/* -------------------------------------------------------------------------- */
/* Page chrome                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The header every admin workspace opens with.
 *
 * Gives each page the same hierarchy: where you are, what this is, what it
 * contains, and at most two primary actions. The `back` link is for detail
 * screens that are reached *from* a list; top-level workspaces get their
 * placement from the sidebar and pass nothing.
 */
export function AdminPageHeader({
  title,
  description,
  count,
  actions,
  back,
}: {
  title: string;
  description?: string;
  /** A short factual summary line — "8 products · 3 collections". */
  count?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-4">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          {back.label}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[1.75rem] font-normal leading-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
          {count && <p className="text-[13px] text-muted-foreground/80">{count}</p>}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * A grouping of related things.
 *
 * The admin leans on these instead of the previous "bordered box around every
 * block". A section is separated by space and a heading, with a border only when
 * it genuinely needs to be distinguished from a sibling — which is why `divided`
 * is opt-in rather than the default.
 */
export function AdminSection({
  title,
  description,
  actions,
  children,
  divided = false,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Adds a rule above the section. For stacked sections of the same kind. */
  divided?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", divided && "border-t border-border/60 pt-8", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && (
              <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
            )}
            {description && (
              <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A lightly-contained panel.
 *
 * Used sparingly, for things that are genuinely a discrete object — a form, an
 * editor, a single request. Soft border, generous padding, no shadow.
 */
export function AdminPanel({
  children,
  className,
  as: Component = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "form" | "section";
}) {
  return (
    <Component
      className={cn("rounded-lg border border-border/70 bg-surface p-5 sm:p-6", className)}
    >
      {children}
    </Component>
  );
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export type StatusTone = "neutral" | "positive" | "attention" | "critical" | "accent";

/**
 * The single way the admin expresses state.
 *
 * ## The problem this solves
 *
 * Every row previously rendered up to five separate bordered, uppercase,
 * letter-spaced badges — "Inactive", "Featured", "Unpriced", "No images",
 * "Archived" — each as visually loud as the others. With one status per row
 * nothing stood out, so the owner had to read every badge on every row to find
 * the row that needed work.
 *
 * A pill is quiet by default and only raised for genuine attention, and rows
 * carry *one* of these (the condition that matters most) rather than all of them;
 * the rest are available on hover and in full on the detail screen.
 *
 * `tone` maps onto meaning rather than colour, so "attention" and "critical" can
 * be restyled without hunting down hex values across a dozen files.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  // Normal, healthy states. Deliberately muted so they recede.
  neutral: "bg-surface-subtle text-muted-foreground",
  // Live, selling, done.
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  // Needs the owner to do something, but nothing is broken.
  attention: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  // A real error or an irreversible state.
  critical: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  // The studio's own accent, for states that are a choice rather than a health.
  accent: "bg-accent-subtle text-accent",
};

export function StatusPill({
  children,
  tone = "neutral",
  title,
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A count that sits in a tab or a nav item.
 *
 * Rendered as a quiet number rather than a badge, except when it represents
 * outstanding work — then it is the one thing allowed to draw the eye.
 */
export function CountBadge({
  value,
  tone = "neutral",
}: {
  value: number;
  tone?: "neutral" | "attention";
}) {
  if (value <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
        tone === "attention"
          ? "bg-accent text-accent-foreground"
          : "bg-surface-subtle text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Toolbar                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The one toolbar shape every workspace uses: search, primary action, and an
 * optional disclosure for everything else.
 *
 * Replaces the previous pattern of a permanently-expanded filter form
 * (`flex-wrap items-end gap-3 border ...`) that showed every control at once and
 * wrapped onto three lines on a narrow screen. `filters` is rendered inside a
 * `<details>` so secondary controls cost one line until they are wanted — and
 * being a native `<details>`, it needs no client JavaScript to open.
 */
export function AdminToolbar({
  search,
  primaryAction,
  filters,
  filtersLabel = "Filters",
  activeFilterCount = 0,
  children,
}: {
  search?: React.ReactNode;
  primaryAction?: React.ReactNode;
  /** Secondary controls, revealed on demand. */
  filters?: React.ReactNode;
  filtersLabel?: string;
  /** Shown as a count so a collapsed Filters control still reports its state. */
  activeFilterCount?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {search && <div className="min-w-0 flex-1">{search}</div>}

        <div className="flex shrink-0 items-center gap-2">
          {filters && (
            <details className="group relative">
              <summary
                className={cn(
                  "flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/25 hover:bg-surface-subtle",
                  activeFilterCount > 0 && "border-foreground/25 bg-surface-subtle",
                )}
              >
                <span>{filtersLabel}</span>
                {activeFilterCount > 0 && <CountBadge value={activeFilterCount} />}
                <span
                  aria-hidden="true"
                  className="text-muted-foreground transition-transform group-open:rotate-180"
                >
                  ⌄
                </span>
              </summary>

              <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-4 shadow-lg">
                {filters}
              </div>
            </details>
          )}

          {primaryAction}
        </div>
      </div>

      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Segmented control                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Tabs for switching a workspace's view.
 *
 * Links rather than client state: every view is a real URL, so it can be
 * bookmarked, shared, reloaded and reached with the back button. The counts come
 * from the same rows the list renders, so they cannot disagree with it.
 */
export function AdminSegmentedNav({
  items,
  className,
}: {
  items: { label: string; href: string; active: boolean; count?: number }[];
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "-mx-1 flex items-center gap-1 overflow-x-auto border-b border-border/70 pb-px",
        className,
      )}
      aria-label="Workspace views"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
            item.active
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          {item.label}
          {typeof item.count === "number" && (
            <span className="text-[11px] tabular-nums text-muted-foreground/70">{item.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Quiet details                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A row whose full metadata is available on demand.
 *
 * Implements the "single subtle status area, details on hover/open" rule without
 * client JavaScript: the summary line is always visible, the expanded block is
 * native `<details>`. That keeps the server-rendered list a pure Server
 * Component — the previous implementation needed client state for every
 * interaction, which is a large part of why the list felt heavy.
 */
export function QuietDetails({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group", className)}>
      <summary className="cursor-pointer list-none text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        {summary}
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

/* -------------------------------------------------------------------------- */
/* Definition list                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Read-only field display for request detail screens.
 *
 * Replaces the previous grid of small-caps monospace labels, which made a
 * customer's own words look like a debug readout.
 */
export function AdminFieldList({
  fields,
  columns = 2,
}: {
  fields: { label: string; value: React.ReactNode; wide?: boolean }[];
  columns?: 1 | 2;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-5",
        columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
      )}
    >
      {fields.map((field) => (
        <div
          key={field.label}
          className={cn("flex min-w-0 flex-col gap-1", field.wide && "sm:col-span-2")}
        >
          <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
          <dd className="text-sm leading-relaxed break-words text-foreground">
            {field.value === null || field.value === undefined || field.value === "" ? (
              <span className="text-muted-foreground/60">Not provided</span>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
