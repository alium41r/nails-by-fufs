"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createCollection, createProduct } from "@/app/admin/catalogue-lifecycle-actions";
import { AdminButton, Field, Select, TextInput } from "@/components/admin/ui/controls";

/**
 * The create product / create collection forms.
 *
 * Revealed on demand rather than occupying permanent space in the toolbar, and
 * deliberately asking for almost nothing: a name, and optionally a collection.
 * Everything else is on the item's own screen, and the row is created
 * **unpublished**, so a half-filled draft can never reach the storefront.
 *
 * These return a structured result instead of redirecting only on failure — on
 * success the owner is taken straight to the new item, because the next thing they
 * want is to fill the rest of it in.
 */
export function CatalogueCreateProduct({
  collections,
  onClose,
}: {
  collections: { id: string; title: string }[];
  /**
   * Provided when the form is revealed inline (the catalogue toolbar), where it
   * collapses again. Absent on the dedicated `/admin/products/new` page, where
   * there is nothing to collapse and the header's back link does that job — a
   * no-op handler could not be passed across the Server/Client boundary anyway.
   */
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createProduct({ name, collectionId: collectionId || null });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.id) {
        router.push(`/admin/products/${result.id}?saved=${encodeURIComponent(result.message)}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-lg border border-accent/40 bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium text-foreground">New product</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      <Field label="Product name" htmlFor="new-product-name">
        <TextInput
          id="new-product-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          maxLength={200}
          placeholder="e.g. Pearl Glaze"
        />
      </Field>

      <Field label="Collection" htmlFor="new-product-collection" optional hint="You can change this later, or leave it unassigned.">
        <Select
          id="new-product-collection"
          value={collectionId}
          onChange={(event) => setCollectionId(event.target.value)}
        >
          <option value="">No collection</option>
          {collections.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title}
            </option>
          ))}
        </Select>
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <AdminButton type="submit" variant="primary" disabled={pending || name.trim().length === 0}>
          {pending ? "Creating…" : "Create product"}
        </AdminButton>
        <p className="text-xs text-muted-foreground">Created as a draft.</p>
      </div>
    </form>
  );
}

export function CatalogueCreateCollection({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCollection({ title });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.id) {
        router.push(
          `/admin/collections/${result.id}?saved=${encodeURIComponent(result.message)}`,
        );
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-lg border border-accent/40 bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium text-foreground">New collection</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <Field
        label="Collection title"
        htmlFor="new-collection-title"
        hint="Created unpublished — a hidden collection also hides the products inside it."
      >
        <TextInput
          id="new-collection-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
          maxLength={200}
          placeholder="e.g. Winter Velvets"
        />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <AdminButton type="submit" variant="primary" disabled={pending || title.trim().length === 0}>
          {pending ? "Creating…" : "Create collection"}
        </AdminButton>
        <p className="text-xs text-muted-foreground">Created as a draft.</p>
      </div>
    </form>
  );
}
