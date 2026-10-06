"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Search } from "lucide-react";

import {
  archiveProduct,
  bulkUpdateProducts,
  duplicateProduct,
  reorderProducts,
  restoreProduct,
} from "@/app/admin/catalogue-lifecycle-actions";
import { CatalogueCreateProduct } from "./CatalogueCreate";
import {
  AdminEmptyState,
  AdminToolbar,
  StatusPill,
  type StatusTone,
} from "@/components/admin/ui/primitives";
import {
  AdminButton,
  MenuItem,
  RowActionsMenu,
  Select,
  TextInput,
  adminButtonClass,
} from "@/components/admin/ui/controls";
import { cn } from "@/lib/utils";
import type { CatalogueFilter, CatalogueProductRow, CatalogueSort } from "@/app/admin/catalogue/page";

/**
 * The product list.
 *
 * ## The row, and what it is allowed to show
 *
 * The previous row rendered up to five separate bordered badges per product —
 * Inactive, Featured, Unpriced, No images, plus the price and a Studio link — all
 * at the same visual weight. With everything shouting, nothing stood out, and
 * finding the one product that could not actually be sold meant reading every
 * badge on every row.
 *
 * A row now shows, in order: a thumbnail, the name, the collection, the price,
 * **one** status, and a `···` menu. The status is the single most important unmet
 * condition (or "Live"), and every other condition is available by opening the
 * row's details. That is the whole idea: the default view answers "what is this
 * and is it OK", and the detail screen answers "what exactly is wrong".
 *
 * ## Why reordering is drag-only on the row
 *
 * Reordering is a rare, deliberate action. It is shown only when the sort is
 * "catalogue order" (the only sort where an order is meaningful), rather than
 * offering a grip handle that does nothing under a name or price sort.
 */
export interface CatalogueProductsProps {
  products: CatalogueProductRow[];
  counts: Record<CatalogueFilter, number>;
  query: string;
  filter: CatalogueFilter;
  sort: CatalogueSort;
  collection: string;
  collections: { id: string; title: string }[];
  /** Media tab: the same list, but each row leads with its specific gap. */
  attentionOnly?: boolean;
  missing?: string;
}

/** The one status a row shows, with the tone it deserves. */
function primaryStatus(row: CatalogueProductRow): { label: string; tone: StatusTone } {
  if (row.archived) return { label: "Archived", tone: "neutral" };
  if (row.issues.includes("No price")) return { label: "No price", tone: "critical" };
  if (row.issues.includes("Collection hidden")) return { label: "Hidden", tone: "attention" };
  if (row.issues.includes("No photo")) return { label: "No photo", tone: "attention" };
  if (row.issues.includes("No collection")) return { label: "Unsorted", tone: "attention" };
  if (!row.isActive) return { label: "Draft", tone: "neutral" };
  return { label: "Live", tone: "positive" };
}

export function CatalogueProducts({
  products,
  counts,
  query,
  filter,
  sort,
  collection,
  collections,
  attentionOnly = false,
}: CatalogueProductsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [creating, setCreating] = useState(false);

  // Local order so a drag is reflected immediately, tagged with the server list it
  // came from. When the server hands back a different list the tag stops matching
  // and the local order is ignored — no effect, so no second render pass.
  const serverOrderKey = products.map((row) => row.id).join(",");
  const [pendingOrder, setPendingOrder] = useState<{ base: string; ids: string[] } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const localOrder = pendingOrder?.base === serverOrderKey ? pendingOrder.ids : null;
  const orderedProducts = useMemo(() => {
    if (!localOrder) return products;
    const byId = new Map(products.map((row) => [row.id, row]));
    const ordered = localOrder
      .map((id) => byId.get(id))
      .filter((row): row is CatalogueProductRow => row !== undefined);
    for (const row of products) if (!localOrder.includes(row.id)) ordered.push(row);
    return ordered;
  }, [products, localOrder]);

  const orderDirty = localOrder !== null && localOrder.join(",") !== serverOrderKey;
  const canReorder = sort === "order" && filter !== "archived" && !query && !collection && !attentionOnly;

  const run = (
    operation: () => Promise<{ ok: boolean; message?: string; error?: string }>,
    options: { clearSelection?: boolean } = {},
  ) => {
    setNotice(null);
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message ?? "Saved." });
        if (options.clearSelection !== false) setSelected([]);
        router.refresh();
      } else {
        setNotice({ kind: "error", message: result.error ?? "That could not be done." });
      }
    });
  };

  const moveBefore = (dragged: string, target: string) => {
    const current = orderedProducts.map((row) => row.id);
    const from = current.indexOf(dragged);
    const to = current.indexOf(target);
    if (from === -1 || to === -1 || from === to) return;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, dragged);
    setPendingOrder({ base: serverOrderKey, ids: next });
  };

  /**
   * Moves one row by a single step.
   *
   * The keyboard- and touch-reachable equivalent of dragging: it produces the
   * same `pendingOrder`, so the "Order changed — not saved yet" bar and the
   * `Save order` write are shared rather than duplicated.
   */
  const moveBy = (id: string, delta: -1 | 1) => {
    const current = orderedProducts.map((row) => row.id);
    const from = current.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= current.length) return;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, id);
    setPendingOrder({ base: serverOrderKey, ids: next });
  };

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  /** Preserves the current view when changing one of its parameters. */
  const hrefFor = (patch: Record<string, string>) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (filter !== "all") search.set("filter", filter);
    if (sort !== "order") search.set("sort", sort);
    if (collection) search.set("collection", collection);
    for (const [key, value] of Object.entries(patch)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    const qs = search.toString();
    return qs ? `/admin/catalogue?${qs}` : "/admin/catalogue";
  };

  const activeFilterCount =
    (filter !== "all" ? 1 : 0) + (collection ? 1 : 0) + (sort !== "order" ? 1 : 0);

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

      {/*
        The attention banner appears only when there is genuinely something to fix
        and the owner is not already looking at it. It is a single line, not a wall.
      */}
      {counts.attention > 0 && filter !== "attention" && !attentionOnly && (
        <Link
          href={hrefFor({ filter: "attention", tab: "" })}
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 transition-colors hover:bg-amber-100/70 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <span>
            <strong className="font-medium">{counts.attention}</strong>{" "}
            {counts.attention === 1 ? "product needs" : "products need"} attention before they can sell.
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <AdminToolbar
        activeFilterCount={activeFilterCount}
        search={
          <form action="/admin/catalogue" className="flex items-center gap-2">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            {sort !== "order" && <input type="hidden" name="sort" value={sort} />}
            {collection && <input type="hidden" name="collection" value={collection} />}
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
              />
              <TextInput
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search products"
                aria-label="Search products"
                className="pl-9"
              />
            </div>
            {query && (
              <Link
                href={hrefFor({ q: "" })}
                className="shrink-0 text-[13px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </Link>
            )}
          </form>
        }
        filters={
          <form action="/admin/catalogue" className="flex flex-col gap-4">
            {query && <input type="hidden" name="q" value={query} />}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-foreground">Collection</span>
              <Select name="collection" defaultValue={collection}>
                <option value="">All collections</option>
                <option value="none">Not in a collection</option>
                {collections.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-foreground">Sort by</span>
              <Select name="sort" defaultValue={sort}>
                <option value="order">Catalogue order</option>
                <option value="name">Name</option>
                <option value="price">Sellable first</option>
                <option value="updated">Recently changed</option>
              </Select>
            </label>
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <div className="flex items-center gap-2">
              <AdminButton type="submit" variant="primary" size="sm">
                Apply
              </AdminButton>
              <Link
                href="/admin/catalogue"
                className={cn(adminButtonClass("ghost", "sm"))}
              >
                Reset
              </Link>
            </div>
          </form>
        }
        primaryAction={
          <AdminButton variant="primary" onClick={() => setCreating(true)}>
            Add product
          </AdminButton>
        }
      />

      {creating && <CatalogueCreateProduct onClose={() => setCreating(false)} collections={collections} />}

      {/* View filters, each with its own count so the state is legible at a glance.
          A single swipeable strip on a phone — five labelled chips with counts do
          not fit one line at 320px, and wrapping them onto two ragged lines makes
          the counts harder to compare. From `sm` up they wrap normally. */}
      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {(
          [
            ["all", "All"],
            ["published", "Live"],
            ["draft", "Drafts"],
            ["attention", "Needs attention"],
            ["archived", "Archived"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={hrefFor({ filter: value === "all" ? "" : value })}
            aria-current={filter === value ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] transition-colors sm:py-1.5",
              filter === value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
            )}
          >
            {label}
            <span className="text-[11px] tabular-nums opacity-70">{counts[value]}</span>
          </Link>
        ))}
      </div>

      {/* Bulk actions exist only once something is selected.

          On a phone these are a two-column grid under a "N selected / Clear"
          header rather than a wrapped row of five unequal buttons: a ragged wrap
          puts the destructive Archive action wherever it happens to land, and
          makes the whole bar two or three lines tall. */}
      {selected.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 sm:contents">
            <span className="text-[13px] font-medium text-foreground">
              {selected.length} selected
            </span>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:order-last sm:ml-auto"
            >
              Clear
            </button>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />

          {filter === "archived" ? (
            <AdminButton
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => bulkUpdateProducts({ productIds: selected, action: "restore" }))
              }
            >
              Restore as drafts
            </AdminButton>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <AdminButton
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => bulkUpdateProducts({ productIds: selected, action: "activate" }))
                  }
                >
                  Publish
                </AdminButton>
                <AdminButton
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => bulkUpdateProducts({ productIds: selected, action: "deactivate" }))
                  }
                >
                  Unpublish
                </AdminButton>
                <AdminButton
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      bulkUpdateProducts({
                        productIds: selected,
                        action: "feature",
                      }),
                    )
                  }
                >
                  Feature
                </AdminButton>

                <AdminButton
                  size="sm"
                  variant="attention"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Archive ${selected.length} product${selected.length === 1 ? "" : "s"}? They are hidden from the storefront and can be restored from Archived.`,
                      )
                    ) {
                      return;
                    }
                    run(() => bulkUpdateProducts({ productIds: selected, action: "archive" }));
                  }}
                >
                  Archive
                </AdminButton>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:gap-1.5">
                <Select
                  value={assignTo}
                  onChange={(event) => setAssignTo(event.target.value)}
                  aria-label="Move selected products to a collection"
                  className="h-10 min-w-0 text-[13px] sm:h-9 sm:w-auto"
                >
                  <option value="">Move to…</option>
                  <option value="none">No collection</option>
                  {collections.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </Select>
                <AdminButton
                  size="sm"
                  disabled={pending || assignTo === ""}
                  onClick={() =>
                    run(() =>
                      bulkUpdateProducts({
                        productIds: selected,
                        action: "assign-collection",
                        collectionId: assignTo === "none" ? null : assignTo,
                      }),
                    )
                  }
                >
                  Move
                </AdminButton>
              </div>
            </>
          )}
        </div>
      )}

      {orderDirty && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <span className="text-[13px] text-muted-foreground">
            Order changed — not saved yet.
          </span>
          <div className="flex items-center gap-2">
            <AdminButton size="sm" variant="ghost" onClick={() => setPendingOrder(null)}>
              Undo
            </AdminButton>
            <AdminButton
              size="sm"
              variant="primary"
              disabled={pending}
              onClick={() =>
                run(() => reorderProducts({ productIds: orderedProducts.map((row) => row.id) }), {
                  clearSelection: false,
                })
              }
            >
              Save order
            </AdminButton>
          </div>
        </div>
      )}

      {orderedProducts.length === 0 ? (
        <AdminEmptyState
          title={
            attentionOnly
              ? "Nothing is missing"
              : query
                ? "No products match that search"
                : filter === "archived"
                  ? "Nothing archived"
                  : "No products yet"
          }
          description={
            attentionOnly
              ? "Every product in the working catalogue has a price, a photo and a visible collection."
              : query
                ? "Try a different name, or clear the search."
                : filter === "archived"
                  ? "Archived products are hidden from the storefront but kept here, and can be restored at any time."
                  : "Add your first set to start building the catalogue."
          }
          action={
            !query && filter !== "archived" && !attentionOnly ? (
              <AdminButton variant="primary" onClick={() => setCreating(true)}>
                Add product
              </AdminButton>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/70 bg-surface [&>li:first-child]:rounded-t-lg [&>li:last-child]:rounded-b-lg">
          {orderedProducts.map((row) => {
            const status = primaryStatus(row);
            const isSelected = selected.includes(row.id);
            return (
              <li
                key={row.id}
                draggable={canReorder}
                onDragStart={canReorder ? () => setDragId(row.id) : undefined}
                onDragEnd={canReorder ? () => setDragId(null) : undefined}
                onDragOver={
                  canReorder
                    ? (event) => {
                        if (dragId && dragId !== row.id) event.preventDefault();
                      }
                    : undefined
                }
                onDrop={
                  canReorder
                    ? (event) => {
                        event.preventDefault();
                        if (dragId && dragId !== row.id) moveBefore(dragId, row.id);
                        setDragId(null);
                      }
                    : undefined
                }
                className={cn(
                  "group flex items-start gap-3 px-3 py-3 transition-colors sm:items-center sm:gap-4 sm:px-4",
                  isSelected ? "bg-accent-subtle/40" : "hover:bg-surface-subtle/50",
                  dragId === row.id && "opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(row.id)}
                  aria-label={`Select ${row.name}`}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)] sm:mt-0"
                />

                {/*
                  Thumbnail. A quiet placeholder rather than a badge when there is
                  no photo — the status already says so. Both states use the same
                  4:5 frame, which is the ratio product photography is shot in, so
                  a row's geometry does not change when a photo is added.
                */}
                <Link
                  href={`/admin/products/${row.id}`}
                  className="relative aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-md border border-border/70 bg-surface-subtle sm:w-12"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {row.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external Storage URL; next/image needs remotePatterns config
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/product-images/${row.imagePath}`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  )}
                </Link>

                {/*
                  The row's body, laid out as two different shapes from one tree.

                  On a phone it is a three-line card: the name, then the collection
                  and price, then the status. The alternative — name and status
                  sharing the first line — was tried and is worse at 320px: the pill
                  is wide enough that the name elides to "Smoked Qua…", and sharing
                  the second line with the metadata squeezes the collection to
                  "The …". Stacking costs about 20px per row and keeps every value
                  readable, which is the whole point of the card.

                  The price is not in a side column on a phone because it was
                  `hidden` there before — it moves into the metadata line instead of
                  disappearing.

                  From `sm` up the identity stacks again exactly as it did before,
                  with the price and status back in their own columns.
                */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/admin/products/${row.id}`}
                      className="min-w-0 truncate text-sm font-medium text-foreground transition-colors hover:text-accent"
                    >
                      {row.name}
                    </Link>

                    <span className="min-w-0 truncate text-[13px] text-muted-foreground">
                      {row.collectionTitle ?? "No collection"}
                      <span className="tabular-nums sm:hidden"> · {row.priceLabel}</span>
                    </span>

                    <span className="mt-1 sm:hidden">
                      <StatusPill
                        tone={status.tone}
                        title={row.issues.length > 0 ? row.issues.join(" · ") : undefined}
                      >
                        {status.label}
                        {row.issues.length > 1 && (
                          <span className="tabular-nums opacity-70">+{row.issues.length - 1}</span>
                        )}
                      </StatusPill>
                    </span>
                  </div>

                  <span className="hidden shrink-0 text-[13px] tabular-nums text-muted-foreground sm:block">
                    {row.priceLabel}
                  </span>

                  <span className="hidden shrink-0 sm:block">
                    <StatusPill
                      tone={status.tone}
                      title={row.issues.length > 0 ? row.issues.join(" · ") : undefined}
                    >
                      {status.label}
                      {row.issues.length > 1 && (
                        <span className="tabular-nums opacity-70">+{row.issues.length - 1}</span>
                      )}
                    </StatusPill>
                  </span>
                </div>

                <RowActionsMenu label={`Actions for ${row.name}`}>
                  <Link
                    href={`/admin/products/${row.id}`}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-surface-subtle"
                  >
                    Manage details
                  </Link>
                  <Link
                    href={`/product/${row.slug}?studio=1`}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-accent transition-colors hover:bg-accent-subtle"
                  >
                    Edit in Studio
                  </Link>

                  {/*
                    Reordering used to be drag-only, which is a desktop gesture:
                    HTML5 `draggable` fires nothing on a touch screen, so on a
                    phone the catalogue order could not be changed at all. These
                    two entries reuse the same local reorder and the same
                    `reorderProducts` write the drag uses, so the two paths cannot
                    disagree about what the order is.
                  */}
                  {canReorder && (
                    <>
                      <div className="my-1 h-px bg-border/70" aria-hidden="true" />
                      <MenuItem
                        disabled={pending || orderedProducts[0]?.id === row.id}
                        onClick={() => moveBy(row.id, -1)}
                      >
                        Move up
                      </MenuItem>
                      <MenuItem
                        disabled={pending || orderedProducts[orderedProducts.length - 1]?.id === row.id}
                        onClick={() => moveBy(row.id, 1)}
                      >
                        Move down
                      </MenuItem>
                    </>
                  )}

                  <div className="my-1 h-px bg-border/70" aria-hidden="true" />

                  <MenuItem
                    disabled={pending}
                    onClick={() => run(() => duplicateProduct({ productId: row.id }))}
                  >
                    Duplicate
                  </MenuItem>

                  {row.archived ? (
                    <MenuItem
                      disabled={pending}
                      onClick={() => run(() => restoreProduct({ productId: row.id }))}
                    >
                      Restore as draft
                    </MenuItem>
                  ) : (
                    <MenuItem
                      disabled={pending}
                      onClick={() => run(() => archiveProduct({ productId: row.id }))}
                    >
                      Archive
                    </MenuItem>
                  )}

                  {/* Permanent deletion lives on the product's own screen, where the
                      typed confirmation has room to explain what will be lost. */}
                  <Link
                    href={`/admin/products/${row.id}#danger`}
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

      {orderedProducts.length > 0 && canReorder && (
        <p className="text-xs text-muted-foreground">
          Drag a row to reorder, or use <span className="font-medium">Move up</span> /{" "}
          <span className="font-medium">Move down</span> in a row&rsquo;s menu — dragging needs a
          mouse, so the menu is the way to do it on a touch screen. The order here is the order
          customers see.
        </p>
      )}
    </div>
  );
}
