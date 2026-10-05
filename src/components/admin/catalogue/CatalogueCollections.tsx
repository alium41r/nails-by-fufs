"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";

import {
  archiveCollection,
  bulkUpdateCollections,
  restoreCollection,
} from "@/app/admin/catalogue-lifecycle-actions";
import { CatalogueCreateCollection } from "./CatalogueCreate";
import { AdminEmptyState, AdminToolbar, StatusPill, type StatusTone } from "@/components/admin/ui/primitives";
import { AdminButton, MenuItem, RowActionsMenu, TextInput } from "@/components/admin/ui/controls";
import { cn } from "@/lib/utils";
import type { CatalogueCollectionRow, CatalogueProductRow } from "@/app/admin/catalogue/page";

/**
 * The collections list.
 *
 * Same shape and rules as the product list — one thumbnail, one identity, one
 * status, one `···` menu — because collections are the same kind of thing to
 * manage and should not need a second mental model.
 *
 * Collections carry one extra consequence worth surfacing: hiding a collection
 * hides every product inside it. That is stated once, on the status itself, rather
 * than repeated as a warning on every row.
 */
function primaryStatus(row: CatalogueCollectionRow): { label: string; tone: StatusTone; title?: string } {
  if (row.archived) {
    return { label: "Archived", tone: "neutral", title: "Hidden from the storefront, along with its products." };
  }
  if (!row.isActive) {
    return {
      label: "Hidden",
      tone: "attention",
      title: "Not published: this collection and every product inside it are hidden from the storefront.",
    };
  }
  if (row.productCount === 0) return { label: "Empty", tone: "neutral" };
  return { label: "Live", tone: "positive" };
}

export function CatalogueCollections({
  collections,
  query,
  productCounts,
}: {
  collections: CatalogueCollectionRow[];
  query: string;
  productCounts: CatalogueProductRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const run = (operation: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setNotice(null);
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message ?? "Saved." });
        setSelected([]);
        router.refresh();
      } else {
        setNotice({ kind: "error", message: result.error ?? "That could not be done." });
      }
    });
  };

  const needle = query.toLowerCase();
  const visible = needle
    ? collections.filter(
        (row) =>
          row.title.toLowerCase().includes(needle) || row.slug.toLowerCase().includes(needle),
      )
    : collections;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg border p-3.5 text-[13px]",
            notice.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
          )}
        >
          {notice.message}
        </p>
      )}

      <AdminToolbar
        search={
          <form action="/admin/catalogue" className="flex items-center gap-2">
            <input type="hidden" name="tab" value="collections" />
            <TextInput
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search collections"
              aria-label="Search collections"
            />
            {query && (
              <Link
                href="/admin/catalogue?tab=collections"
                className="shrink-0 text-[13px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </Link>
            )}
          </form>
        }
        primaryAction={
          <AdminButton variant="primary" onClick={() => setCreating(true)}>
            Add collection
          </AdminButton>
        }
      />

      {creating && <CatalogueCreateCollection onClose={() => setCreating(false)} />}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
          <span className="text-[13px] font-medium text-foreground">{selected.length} selected</span>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          {(
            [
              ["activate", "Publish"],
              ["deactivate", "Unpublish"],
              ["feature", "Feature"],
            ] as const
          ).map(([action, label]) => (
            <AdminButton
              key={action}
              size="sm"
              disabled={pending}
              onClick={() => run(() => bulkUpdateCollections({ collectionIds: selected, action }))}
            >
              {label}
            </AdminButton>
          ))}
          <AdminButton
            size="sm"
            variant="attention"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  `Archive ${selected.length} collection${selected.length === 1 ? "" : "s"}? Their products are hidden from the storefront too, until restored.`,
                )
              ) {
                return;
              }
              run(() => bulkUpdateCollections({ collectionIds: selected, action: "archive" }));
            }}
          >
            Archive
          </AdminButton>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <AdminEmptyState
          title={query ? "No collections match that search" : "No collections yet"}
          description={
            query
              ? "Try a different title, or clear the search."
              : "Collections group your sets into the edits customers browse."
          }
          action={
            !query ? (
              <AdminButton variant="primary" onClick={() => setCreating(true)}>
                Add collection
              </AdminButton>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface">
          {visible.map((row) => {
            const status = primaryStatus(row);
            const isSelected = selected.includes(row.id);
            const live = productCounts.filter(
              (product) => product.collectionId === row.id && !product.archived,
            ).length;

            return (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 transition-colors sm:gap-4 sm:px-4",
                  isSelected ? "bg-accent-subtle/40" : "hover:bg-surface-subtle/50",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(row.id)}
                  aria-label={`Select ${row.title}`}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                />

                <Link
                  href={`/admin/collections/${row.id}`}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/70 bg-surface-subtle"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {row.coverPath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external Storage URL; next/image needs remotePatterns config
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/product-images/${row.coverPath}`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    href={`/admin/collections/${row.id}`}
                    className="truncate text-sm font-medium text-foreground transition-colors hover:text-accent"
                  >
                    {row.title}
                  </Link>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {live} product{live === 1 ? "" : "s"}
                    {row.featured ? " · featured" : ""}
                  </span>
                </div>

                <StatusPill tone={status.tone} title={status.title}>
                  {status.label}
                </StatusPill>

                <RowActionsMenu label={`Actions for ${row.title}`}>
                  <Link
                    href={`/admin/collections/${row.id}`}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-surface-subtle"
                  >
                    Manage details
                  </Link>
                  <Link
                    href={`/collections/${row.slug}?studio=1`}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-accent transition-colors hover:bg-accent-subtle"
                  >
                    Edit in Studio
                  </Link>

                  <div className="my-1 h-px bg-border/70" aria-hidden="true" />

                  {row.archived ? (
                    <MenuItem
                      disabled={pending}
                      onClick={() => run(() => restoreCollection({ collectionId: row.id }))}
                    >
                      Restore as draft
                    </MenuItem>
                  ) : (
                    <MenuItem
                      disabled={pending}
                      onClick={() => run(() => archiveCollection({ collectionId: row.id }))}
                    >
                      Archive
                    </MenuItem>
                  )}

                  <Link
                    href={`/admin/collections/${row.id}#danger`}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    Delete…
                  </Link>
                </RowActionsMenu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
