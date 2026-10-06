"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";

import {
  archiveCollection,
  archiveProduct,
  deleteCollection,
  deleteProduct,
  reassignCollectionProducts,
  restoreCollection,
  restoreProduct,
} from "@/app/admin/catalogue-lifecycle-actions";
import { AdminSection, StatusPill } from "@/components/admin/ui/primitives";
import {
  AdminButton,
  Field,
  Select,
  TextInput,
} from "@/components/admin/ui/controls";
import { cn } from "@/lib/utils";

/**
 * Archive, restore and permanent-delete controls.
 *
 * ## Progressive disclosure is the point
 *
 * These are the destructive controls, and in the previous design they sat open on
 * the page beneath the product's ordinary fields: an archive button, a note field,
 * and a permanently-expanded "Delete permanently…" disclosure, all visible on
 * every visit. That made the end of every edit screen feel like a hazard.
 *
 * Now the section states the product's retirement options in one sentence, with
 * **Archive** as the single visible action and permanent deletion behind a
 * disclosure that must be opened deliberately. The typed-name confirmation is
 * unchanged and is still re-checked on the server, so this is a presentation
 * change only.
 *
 * ## Why deletion stays in the Control Center rather than Studio Mode
 *
 * Studio Mode is for editing what customers see. Permanently destroying a row and
 * its files is not a visual edit, and it needs room to explain the consequences —
 * which is what this panel is for.
 */
export function ProductLifecyclePanel({
  productId,
  productName,
  slug,
  archived,
}: {
  productId: string;
  productName: string;
  slug: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [note, setNote] = useState("");

  const run = (
    operation: () => Promise<{ ok: boolean; message?: string; error?: string }>,
    options: { reload?: boolean } = {},
  ) => {
    setNotice(null);
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message ?? "Done." });
        setShowDelete(false);
        setConfirmName("");
        if (options.reload !== false) router.refresh();
      } else {
        setNotice({ kind: "error", message: result.error ?? "That could not be done." });
      }
    });
  };

  return (
    <AdminSection
      title={archived ? "This product is archived" : "Retire this product"}
      description={
        archived
          ? "It is hidden from the storefront, search and its collection. Its photos and address are kept."
          : "Archiving hides it everywhere without deleting anything, and can be undone at any time."
      }
      divided
    >
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

      {archived ? (
        <div>
          <AdminButton
            disabled={pending}
            onClick={() => run(() => restoreProduct({ productId }))}
          >
            {pending ? "Restoring…" : "Restore as draft"}
          </AdminButton>
          <p className="mt-2 text-xs text-muted-foreground">
            Restoring brings it back unpublished, so you can review it before it goes live.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field
            label="Note for your own reference"
            htmlFor="archive-note"
            optional
            hint="Only visible to you, in the archived list."
          >
            <TextInput
              id="archive-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              placeholder="e.g. discontinued colourway"
            />
          </Field>
          <div>
            <AdminButton
              variant="attention"
              disabled={pending}
              onClick={() => run(() => archiveProduct({ productId, note }))}
            >
              {pending ? "Archiving…" : "Archive product"}
            </AdminButton>
          </div>
        </div>
      )}

      {/* Permanent deletion, behind a disclosure. */}
      <div className="border-t border-border/60 pt-5">
        {!showDelete ? (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="touch-target inline-flex items-center text-[13px] text-muted-foreground transition-colors hover:text-rose-600 dark:hover:text-rose-400"
          >
            Delete permanently…
          </button>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/25">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-rose-800 dark:text-rose-300">
                <p className="font-medium">This cannot be undone.</p>
                <p>
                  The set and its image files are removed from the database and storage permanently.
                  Past orders are <strong className="font-medium">not</strong> affected — each order
                  line keeps its own copy of the name, collection and price — but the address{" "}
                  <span className="font-mono text-xs">/product/{slug}</span> stops working.
                </p>
              </div>
            </div>

            <Field
              label="Type the product's name to confirm"
              htmlFor="confirm-product-name"
              hint={productName}
            >
              <TextInput
                id="confirm-product-name"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={productName}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                variant="danger"
                disabled={pending || confirmName.trim() !== productName}
                onClick={() => run(() => deleteProduct({ productId, confirmName }), { reload: false })}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </AdminButton>
              <AdminButton
                variant="ghost"
                onClick={() => {
                  setShowDelete(false);
                  setConfirmName("");
                }}
              >
                Cancel
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </AdminSection>
  );
}

export function CollectionLifecyclePanel({
  collectionId,
  collectionTitle,
  collectionSlug,
  archived,
  productCount,
  otherCollections,
}: {
  collectionId: string;
  collectionTitle: string;
  /** The real storefront path segment, so the warning names a URL that exists. */
  collectionSlug: string;
  archived: boolean;
  productCount: number;
  otherCollections: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [note, setNote] = useState("");
  const [moveTo, setMoveTo] = useState("");

  const run = (operation: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setNotice(null);
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message ?? "Done." });
        setShowDelete(false);
        setConfirmName("");
        router.refresh();
      } else {
        setNotice({ kind: "error", message: result.error ?? "That could not be done." });
      }
    });
  };

  return (
    <AdminSection
      title={archived ? "This collection is archived" : "Retire this collection"}
      description={
        archived
          ? "It is hidden from the storefront, and so is every product inside it."
          : `Archiving hides this collection and the ${productCount} product${productCount === 1 ? "" : "s"} inside it. Nothing is deleted, and it can be restored.`
      }
      divided
    >
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

      {archived ? (
        <div>
          <AdminButton
            disabled={pending}
            onClick={() => run(() => restoreCollection({ collectionId }))}
          >
            {pending ? "Restoring…" : "Restore as draft"}
          </AdminButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Note for your own reference" htmlFor="archive-collection-note" optional>
            <TextInput
              id="archive-collection-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
            />
          </Field>
          <div>
            <AdminButton
              variant="attention"
              disabled={pending}
              onClick={() => run(() => archiveCollection({ collectionId, note }))}
            >
              {pending ? "Archiving…" : "Archive collection"}
            </AdminButton>
          </div>
        </div>
      )}

      <div className="border-t border-border/60 pt-5">
        {!showDelete ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="touch-target inline-flex items-center text-[13px] text-muted-foreground transition-colors hover:text-rose-600 dark:hover:text-rose-400"
            >
              Delete permanently…
            </button>
            {productCount > 0 && (
              <StatusPill tone="neutral">
                {productCount} product{productCount === 1 ? "" : "s"} inside
              </StatusPill>
            )}
          </div>
        ) : productCount > 0 ? (
          /*
           * Blocked by dependency. The old design showed this as a warning box
           * with a nested select and button; it is the same workflow, but stated
           * as the two steps it actually is.
           */
          <div className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="flex flex-col gap-1 text-[13px] leading-relaxed text-amber-900 dark:text-amber-300">
                <p className="font-medium">
                  Move the {productCount} product{productCount === 1 ? "" : "s"} out first
                </p>
                <p>
                  Deleting a collection never deletes the products inside it, so they need somewhere
                  to go — another collection, or no collection at all.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <Field label="Move them to" htmlFor="move-target" className="min-w-[12rem]">
                <Select
                  id="move-target"
                  value={moveTo}
                  onChange={(event) => setMoveTo(event.target.value)}
                >
                  <option value="">Choose…</option>
                  <option value="none">No collection</option>
                  {otherCollections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <AdminButton
                disabled={pending || moveTo === ""}
                onClick={() =>
                  run(() =>
                    reassignCollectionProducts({
                      fromCollectionId: collectionId,
                      toCollectionId: moveTo === "none" ? null : moveTo,
                    }),
                  )
                }
              >
                <ArrowRight className="h-4 w-4" />
                {pending ? "Moving…" : "Move products"}
              </AdminButton>
            </div>

            <div>
              <AdminButton variant="ghost" size="sm" onClick={() => setShowDelete(false)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/25">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex flex-col gap-1 text-[13px] leading-relaxed text-rose-800 dark:text-rose-300">
                <p className="font-medium">This cannot be undone.</p>
                <p>
                  The collection is empty, so only the collection itself is removed. Its address{" "}
                  <span className="font-mono text-xs">/collections/{collectionSlug}</span> stops
                  working.
                </p>
              </div>
            </div>

            <Field
              label="Type the collection's title to confirm"
              htmlFor="confirm-collection-title"
              hint={collectionTitle}
            >
              <TextInput
                id="confirm-collection-title"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={collectionTitle}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                variant="danger"
                disabled={pending || confirmName.trim() !== collectionTitle}
                onClick={() => run(() => deleteCollection({ collectionId, confirmName }))}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </AdminButton>
              <AdminButton
                variant="ghost"
                onClick={() => {
                  setShowDelete(false);
                  setConfirmName("");
                }}
              >
                Cancel
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </AdminSection>
  );
}
