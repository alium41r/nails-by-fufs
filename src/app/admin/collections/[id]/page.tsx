import Link from "next/link";
import { notFound } from "next/navigation";

import { removeCollectionCoverAction, updateCollectionAction } from "@/app/admin/actions";
import { CollectionCoverUploader } from "@/components/admin/CollectionCoverUploader";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
import { getPrisma } from "@/lib/prisma/db";

const fieldClass =
  "h-10 px-3 bg-background border border-border text-sm text-foreground w-full rounded-xs";
const labelClass = "text-[11px] uppercase tracking-wider font-mono text-muted-foreground";
const submitClass = "h-10 px-4 bg-foreground text-background text-[11px] uppercase tracking-[0.16em]";

export default async function AdminCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const prisma = getPrisma();
  const collection = await prisma.collections.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      tag: true,
      is_active: true,
      featured: true,
      display_order: true,
      cover_image_path: true,
    },
  });

  if (!collection) notFound();

  const productCount = await prisma.products.count({ where: { collection_id: collection.id } });

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Catalogue
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">{collection.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
          <span className="px-2 py-0.5 border border-border text-muted-foreground">
            {productCount} product{productCount === 1 ? "" : "s"}
          </span>
          {!collection.is_active && (
            <span className="px-2 py-0.5 border border-border text-muted-foreground">
              Inactive — hides its products on the storefront
            </span>
          )}
          {!collection.cover_image_path && (
            <span className="px-2 py-0.5 border border-border text-muted-foreground">No cover</span>
          )}
        </div>
      </div>

      {(saved || error) && (
        <p
          role="status"
          className={
            error
              ? "text-xs border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-3"
              : "text-xs border border-accent/30 bg-accent-subtle text-accent p-3"
          }
        >
          {error ?? "Saved."}
        </p>
      )}

      <form action={updateCollectionAction} className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Details</h2>
        <input type="hidden" name="id" value={collection.id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Title</span>
            <input name="title" defaultValue={collection.title} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Slug</span>
            <input name="slug" defaultValue={collection.slug} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Subtitle</span>
            <input name="subtitle" defaultValue={collection.subtitle} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Tag</span>
            <input name="tag" defaultValue={collection.tag ?? ""} className={fieldClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Description</span>
          <textarea
            name="description"
            defaultValue={collection.description}
            rows={3}
            className="p-3 bg-background border border-border text-sm text-foreground w-full rounded-xs"
          />
        </label>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" name="is_active" defaultChecked={collection.is_active} />
            Active
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" name="featured" defaultChecked={collection.featured} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <span className={labelClass}>Order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={collection.display_order ?? ""}
              className="h-9 w-24 px-3 bg-background border border-border text-sm text-foreground rounded-xs"
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Making a collection inactive hides it and every product inside it on the storefront — the
          existing catalogue rule. Deactivate rather than delete.
        </p>
        <button type="submit" className={submitClass}>
          Save Collection
        </button>
      </form>

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Cover Image</h2>

        {collection.cover_image_path ? (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              {collection.cover_image_path}
            </p>
            <form action={removeCollectionCoverAction}>
              <input type="hidden" name="id" value={collection.id} />
              <button
                type="submit"
                className="h-9 px-3 border border-rose-300 dark:border-rose-900/60 text-[11px] text-rose-600 dark:text-rose-400"
              >
                Remove Cover
              </button>
            </form>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            No cover image — the storefront uses its placeholder frame.
          </p>
        )}

        <CollectionCoverUploader collectionId={collection.id} />
      </section>
    </div>
  );
}
