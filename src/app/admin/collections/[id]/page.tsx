import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { removeCollectionCoverAction, updateCollectionAction } from "@/app/admin/actions";
import { CollectionCoverUploader } from "@/components/admin/CollectionCoverUploader";
import { CollectionLifecyclePanel } from "@/components/admin/CatalogueLifecyclePanels";
import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { AdminPageHeader, AdminSection, StatusPill } from "@/components/admin/ui/primitives";
import {
  AdminButton,
  CheckboxField,
  Field,
  TextArea,
  TextInput,
} from "@/components/admin/ui/controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collection — Studio Control Center",
  robots: { index: false, follow: false },
};

const COVER_BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/product-images`;

/**
 * The collection editor.
 *
 * Same shape and reasoning as the product editor: one status in the header, then
 * named sections — Products, Cover, Details — each posting to the action that
 * already owned those fields. No capability moved; the cover controls and the
 * deactivate/feature flags are all still here.
 *
 * The products inside the collection are listed with a link out, because the
 * common reason to open a collection is to see what is in it, and the previous
 * screen only showed a count.
 */
export default async function AdminCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/catalogue");
  const { id } = await params;

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
      archived_at: true,
    },
  });

  if (!collection) notFound();

  // Products in this collection (shown in full), plus the destinations a
  // reassignment could use for the safe-deletion workflow.
  const [products, otherCollections] = await Promise.all([
    prisma.products.findMany({
      where: { collection_id: collection.id },
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      select: { id: true, name: true, is_active: true, archived_at: true, price_minor: true, currency: true },
    }),
    prisma.collections.findMany({
      where: { id: { not: collection.id }, archived_at: null },
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      select: { id: true, title: true },
    }),
  ]);

  const productCount = products.length;
  const liveCount = products.filter((row) => row.is_active && row.archived_at === null).length;

  const status = collection.archived_at
    ? { label: "Archived", tone: "neutral" as const }
    : !collection.is_active
      ? { label: "Hidden", tone: "attention" as const }
      : { label: "Live", tone: "positive" as const };

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        back={{ href: "/admin/catalogue?tab=collections", label: "Collections" }}
        title={collection.title}
        count={`/collections/${collection.slug} · ${liveCount} of ${productCount} product${productCount === 1 ? "" : "s"} live`}
        actions={
          <Link href={`/collections/${collection.slug}?studio=1`}>
            <AdminButton>
              <Sparkles className="h-4 w-4" />
              Edit in Studio
            </AdminButton>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {!collection.is_active && !collection.archived_at && (
          <p className="text-[13px] text-muted-foreground">
            Not published — this collection and everything inside it are hidden from the storefront.
          </p>
        )}
      </div>

      {/* ── Products ────────────────────────────────────────────────────── */}
      <AdminSection
        title="Products in this collection"
        description="Customers browse these together. Order and visibility are managed per product."
        actions={
          <Link
            href="/admin/catalogue"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Manage all products
          </Link>
        }
      >
        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nothing in this collection yet. Assign products from the catalogue, or change a product&rsquo;s
            collection on its own screen.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle/50 sm:items-center sm:gap-4"
                >
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-foreground sm:truncate">
                    {product.name}
                  </span>
                  <StatusPill
                    tone={
                      product.archived_at
                        ? "neutral"
                        : product.is_active
                          ? "positive"
                          : "neutral"
                    }
                  >
                    {product.archived_at ? "Archived" : product.is_active ? "Live" : "Draft"}
                  </StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {/* ── Cover ───────────────────────────────────────────────────────── */}
      <AdminSection
        title="Cover photo"
        description="Shown on the collections index and when this collection is featured."
        divided
      >
        {collection.cover_image_path ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* A 3:2 frame, which is the ratio the collections index shows a cover
                in — so this preview is the crop a customer actually gets. */}
            <span className="relative aspect-[3/2] w-full max-w-[13.5rem] shrink-0 overflow-hidden rounded-md border border-border/70 bg-surface-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL; next/image needs remotePatterns config */}
              <img
                src={`${COVER_BUCKET_URL}/${collection.cover_image_path}`}
                alt={`${collection.title} cover`}
                className="h-full w-full object-cover object-center"
              />
            </span>
            <div className="flex flex-col gap-3">
              <CollectionCoverUploader collectionId={collection.id} />
              <form action={removeCollectionCoverAction}>
                <input type="hidden" name="id" value={collection.id} />
                <AdminButton type="submit" size="sm" variant="danger">
                  Remove cover
                </AdminButton>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted-foreground">
              No cover yet — the collections index shows a placeholder frame without one.
            </p>
            <CollectionCoverUploader collectionId={collection.id} />
          </div>
        )}
      </AdminSection>

      {/* ── Details ─────────────────────────────────────────────────────── */}
      <AdminSection title="Details" divided>
        <form action={updateCollectionAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={collection.id} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="c-title">
              <TextInput id="c-title" name="title" defaultValue={collection.title} required />
            </Field>
            <Field label="Tag" htmlFor="c-tag" optional hint="A short badge, e.g. “Seasonal Edit”.">
              <TextInput id="c-tag" name="tag" defaultValue={collection.tag ?? ""} />
            </Field>
          </div>

          <Field label="Subtitle" htmlFor="c-subtitle" optional hint="Shown under the title on the collections index.">
            <TextInput id="c-subtitle" name="subtitle" defaultValue={collection.subtitle} />
          </Field>

          <Field label="Description" htmlFor="c-description" optional>
            <TextArea
              id="c-description"
              name="description"
              defaultValue={collection.description}
              rows={4}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Web address"
              htmlFor="c-slug"
              hint="Changing this breaks any existing link to the collection."
            >
              <TextInput id="c-slug" name="slug" defaultValue={collection.slug} required />
            </Field>
            <Field label="Position in list" htmlFor="c-order" optional hint="Lower numbers appear first.">
              <TextInput
                id="c-order"
                name="display_order"
                type="number"
                defaultValue={collection.display_order ?? ""}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CheckboxField
              name="is_active"
              label="Published"
              description="Visible on the storefront, along with its products."
              defaultChecked={collection.is_active}
            />
            <CheckboxField
              name="featured"
              label="Featured"
              description="Eligible for featured placements."
              defaultChecked={collection.featured}
            />
          </div>

          <div>
            <AdminButton type="submit" variant="primary">
              Save collection
            </AdminButton>
          </div>
        </form>
      </AdminSection>

      <div id="danger" className="scroll-mt-24">
        <CollectionLifecyclePanel
          collectionId={collection.id}
          collectionTitle={collection.title}
          collectionSlug={collection.slug}
          archived={collection.archived_at !== null}
          productCount={productCount}
          otherCollections={otherCollections}
        />
      </div>
    </div>
  );
}
