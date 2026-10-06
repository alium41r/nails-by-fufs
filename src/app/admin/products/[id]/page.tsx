import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import {
  deleteProductImageAction,
  moveProductImageAction,
  setPrimaryProductImageAction,
  updateProductAction,
  updateProductImageAltAction,
  updateProductPriceAction,
  updateProductVisibilityAction,
} from "@/app/admin/actions";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";
import { ProductLifecyclePanel } from "@/components/admin/CatalogueLifecyclePanels";
import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { getSiteBasics } from "@/lib/site-content";
import { CURRENCIES, isPriced, majorUnitsHint, pricePlaceholder } from "@/lib/currency";
import {
  AdminPageHeader,
  AdminSection,
  StatusPill,
} from "@/components/admin/ui/primitives";
import {
  AdminButton,
  CheckboxField,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/ui/controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product — Studio Control Center",
  robots: { index: false, follow: false },
};

const IMAGE_BUCKET_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/product-images`;

/**
 * The product editor.
 *
 * ## The same controls, re-organised
 *
 * This screen keeps every field and every action it had — three separate
 * `<form>` posts to three separate server actions (details, price, visibility),
 * individual image set-primary / reorder / alt / delete forms, and the archive
 * and permanent-delete flows. What changed is only *presentation*:
 *
 *   - the header states the product's real situation once, as a single status plus
 *     the specific problems, instead of five competing badges;
 *   - each group is a titled section with normal-case labels, so the form reads as
 *     a document rather than a spec sheet;
 *   - the price field explains minor units in terms of the currency actually
 *     selected, and the currency list is the picker's (which now includes PKR)
 *     with the store's configured default first;
 *   - a direct link to edit the same product visually in Studio Mode, because
 *     for wording and photography that is faster than a form.
 *
 * ## Why the forms stayed separate
 *
 * Each group posts to its own server action, and those actions are the
 * independently-authorised write surface. Merging them into one `<form>` would
 * either need a new combined action (a behaviour change) or nested forms (invalid
 * HTML). The grouping is therefore visual: one section per action, each with its
 * own clear save button — which is also easier to reason about than one giant
 * submit that silently rewrites fields you did not touch.
 */
export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/catalogue");
  const { id } = await params;

  const prisma = getPrisma();
  const product = await prisma.products.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      descriptor: true,
      description: true,
      shape: true,
      default_length: true,
      finish: true,
      tag: true,
      included: true,
      display_order: true,
      is_active: true,
      featured: true,
      price_minor: true,
      currency: true,
      collection_id: true,
      archived_at: true,
      collections: { select: { id: true, title: true, is_active: true, archived_at: true } },
    },
  });

  if (!product) notFound();

  // Ordered separately: the partial unique index makes products -> product_images
  // a 1:1 relation in Prisma, so the gallery is queried directly.
  const [images, collections, { defaultCurrency }] = await Promise.all([
    prisma.product_images.findMany({
      where: { product_id: product.id },
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: { id: true, storage_path: true, alt_text: true, sort_order: true, is_primary: true },
    }),
    prisma.collections.findMany({
      where: { archived_at: null },
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      select: { id: true, title: true },
    }),
    getSiteBasics(),
  ]);

  const priced = isPriced(product.price_minor, product.currency);
  const hiddenCollection = product.collections
    ? !product.collections.is_active || product.collections.archived_at !== null
    : false;

  /*
   * One line that says what this product's actual situation is. The owner should
   * not have to infer "can I sell this?" from a set of independent badges.
   */
  const issues: string[] = [];
  if (product.archived_at === null) {
    if (!priced) issues.push("no price");
    if (images.length === 0) issues.push("no photo");
    if (hiddenCollection) issues.push("collection hidden");
  }

  const status = product.archived_at
    ? { label: "Archived", tone: "neutral" as const }
    : issues.length > 0
      ? { label: "Needs attention", tone: "attention" as const }
      : product.is_active
        ? { label: "Live", tone: "positive" as const }
        : { label: "Draft", tone: "neutral" as const };

  const activeCurrency = product.currency ?? defaultCurrency;
  const currencyChoices = CURRENCIES.some((entry) => entry.code === product.currency)
    ? CURRENCIES
    : product.currency
      ? [{ code: product.currency, symbol: product.currency, label: "Current", decimals: 2 }, ...CURRENCIES]
      : CURRENCIES;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        back={{ href: "/admin/catalogue", label: "Catalogue" }}
        title={product.name}
        count={`/product/${product.slug}${product.collections ? ` · ${product.collections.title}` : " · no collection"}`}
        actions={
          <>
            <Link href={`/product/${product.slug}?studio=1`}>
              <AdminButton>
                <Sparkles className="h-4 w-4" />
                Edit in Studio
              </AdminButton>
            </Link>
            {!product.archived_at && (
              <Link href={`/product/${product.slug}`} target="_blank" rel="noreferrer">
                <AdminButton variant="ghost">View</AdminButton>
              </Link>
            )}
          </>
        }
      />

      {/* One status, plus the specific problems behind it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {issues.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            {issues.join(" · ")} —{" "}
            {priced ? "fix below" : "set a price and this becomes sellable"}
          </p>
        )}
      </div>

      {/* ── Photos ──────────────────────────────────────────────────────── */}
      <AdminSection
        title="Photos"
        description="The first photo is what customers see on the shop and collection pages."
      >
        <ProductImageUploader productId={product.id} />

        {images.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            No photos yet — the storefront shows a placeholder frame until one is uploaded.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface">
            {images.map((image, index) => (
              <li key={image.id} className="flex flex-col gap-3 p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Same 4:5 frame the catalogue list and the storefront use, so
                      a photo is cropped the same way wherever it appears. */}
                  <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md border border-border/70 bg-surface-subtle sm:w-16">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL; next/image needs remotePatterns config */}
                    <img
                      src={`${IMAGE_BUCKET_URL}/${image.storage_path}`}
                      alt={image.alt_text || `${product.name} photo ${index + 1}`}
                      className="h-full w-full object-cover object-center"
                    />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">
                        Photo {index + 1}
                      </span>
                      {image.is_primary && <StatusPill tone="accent">Main</StatusPill>}
                    </div>

                    <form action={updateProductImageAltAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="image_id" value={image.id} />
                      <Field
                        label="Description for screen readers"
                        htmlFor={`alt-${image.id}`}
                        className="w-full min-w-0 flex-1 sm:min-w-[12rem]"
                        optional
                      >
                        <TextInput
                          id={`alt-${image.id}`}
                          name="alt_text"
                          defaultValue={image.alt_text}
                          placeholder="e.g. Almond set with a deep cherry gloss finish"
                        />
                      </Field>
                      <AdminButton type="submit" size="sm" className="w-full sm:w-auto">
                        Save
                      </AdminButton>
                    </form>
                  </div>
                </div>

                {/* Indented to line up with the alt-text field on wider screens;
                    on a phone the buttons take the full width so they are
                    comfortably tappable instead of sharing a 256px row. */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:pl-20">
                  {!image.is_primary && (
                    <form action={setPrimaryProductImageAction} className="col-span-2 sm:col-span-1">
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="image_id" value={image.id} />
                      <AdminButton type="submit" size="sm" className="w-full sm:w-auto">
                        Make main photo
                      </AdminButton>
                    </form>
                  )}

                  {(["up", "down"] as const).map((direction) => (
                    <form key={direction} action={moveProductImageAction}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="image_id" value={image.id} />
                      <input type="hidden" name="direction" value={direction} />
                      <AdminButton
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        disabled={direction === "up" ? index === 0 : index === images.length - 1}
                        aria-label={`Move photo ${index + 1} ${direction}`}
                      >
                        {direction === "up" ? "↑ Move up" : "↓ Move down"}
                      </AdminButton>
                    </form>
                  ))}

                  <form action={deleteProductImageAction} className="col-span-2 sm:col-span-1 sm:ml-auto">
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="image_id" value={image.id} />
                    <AdminButton type="submit" size="sm" variant="danger" className="w-full sm:w-auto">
                      Remove
                    </AdminButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {/* ── Details ─────────────────────────────────────────────────────── */}
      <AdminSection
        title="Details"
        description="How the set is described and classified on the storefront."
        divided
      >
        <form action={updateProductAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={product.id} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Name" htmlFor="p-name">
              <TextInput id="p-name" name="name" defaultValue={product.name} required />
            </Field>
            <Field label="Tag" htmlFor="p-tag" optional hint="A short badge, e.g. “New”.">
              <TextInput id="p-tag" name="tag" defaultValue={product.tag ?? ""} />
            </Field>
          </div>

          <Field label="Subtitle" htmlFor="p-descriptor" optional hint="Shown under the name, e.g. “Almond • Soft Gloss Finish”.">
            <TextInput id="p-descriptor" name="descriptor" defaultValue={product.descriptor} />
          </Field>

          <Field label="Description" htmlFor="p-description" optional>
            <TextArea id="p-description" name="description" defaultValue={product.description} rows={4} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Shape" htmlFor="p-shape">
              <TextInput id="p-shape" name="shape" defaultValue={product.shape} required />
            </Field>
            <Field label="Default length" htmlFor="p-length">
              <Select id="p-length" name="default_length" defaultValue={product.default_length}>
                <option value="Short">Short</option>
                <option value="Medium">Medium</option>
                <option value="Long">Long</option>
              </Select>
            </Field>
            <Field label="Finish" htmlFor="p-finish" optional>
              <TextInput id="p-finish" name="finish" defaultValue={product.finish} />
            </Field>
          </div>

          <Field
            label="What's included"
            htmlFor="p-included"
            optional
            hint="One item per line. Shown in the “What's in the box” list."
          >
            <TextArea
              id="p-included"
              name="included"
              defaultValue={product.included.join("\n")}
              rows={4}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Collection"
              htmlFor="p-collection"
              hint={
                product.collections && hiddenCollection
                  ? "This collection is not published, so the set stays hidden from the storefront."
                  : "Which edit the set is browsed under."
              }
            >
              <Select
                id="p-collection"
                name="collection_id"
                defaultValue={product.collection_id ?? ""}
              >
                <option value="">No collection</option>
                {collections.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Position in catalogue" htmlFor="p-order" optional hint="Lower numbers appear first.">
              <TextInput
                id="p-order"
                name="display_order"
                type="number"
                defaultValue={product.display_order ?? ""}
              />
            </Field>
          </div>

          <Field
            label="Web address"
            htmlFor="p-slug"
            hint="Changing this breaks any existing link to the product."
          >
            <TextInput id="p-slug" name="slug" defaultValue={product.slug} required />
          </Field>

          <div>
            <AdminButton type="submit" variant="primary">
              Save details
            </AdminButton>
          </div>
        </form>
      </AdminSection>

      {/* ── Price ───────────────────────────────────────────────────────── */}
      <AdminSection
        title="Price"
        description="A set becomes buyable only when it has both a price and a currency."
        divided
      >
        <form action={updateProductPriceAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={product.id} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[10rem_1fr]">
            <Field label="Currency" htmlFor="p-currency">
              <Select id="p-currency" name="currency" defaultValue={product.currency ?? defaultCurrency}>
                {currencyChoices.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.code} ({entry.symbol})
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Price"
              htmlFor="p-price"
              hint={
                priced
                  ? majorUnitsHint(activeCurrency)
                  : `Leave both empty to keep it unpriced — the storefront then shows ${pricePlaceholder(defaultCurrency)}.`
              }
            >
              <TextInput
                id="p-price"
                name="price"
                type="number"
                min="0"
                step="1"
                defaultValue={product.price_minor ?? ""}
                placeholder="e.g. 450000"
              />
            </Field>
          </div>

          <p className="rounded-md bg-surface-subtle/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            Changing the currency here never converts the amount — it relabels it. Prices are stored
            exactly as typed, so switch currency and re-enter the figure if the set is now sold in a
            different one.
          </p>

          <div>
            <AdminButton type="submit" variant="primary">
              Save price
            </AdminButton>
          </div>
        </form>
      </AdminSection>

      {/* ── Visibility ──────────────────────────────────────────────────── */}
      <AdminSection
        title="Visibility"
        description="Whether this set appears on the storefront."
        divided
      >
        <form action={updateProductVisibilityAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={product.id} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CheckboxField
              name="is_active"
              label="Published"
              description="Visible on the shop, collections and search."
              defaultChecked={product.is_active}
            />
            <CheckboxField
              name="featured"
              label="Featured"
              description="Eligible for featured placements."
              defaultChecked={product.featured}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AdminButton type="submit" variant="primary">
              Save visibility
            </AdminButton>
            {product.collection_id === null && (
              <Link
                href="/admin/catalogue?collection=none"
                className="text-[13px] text-muted-foreground hover:text-foreground"
              >
                Other sets with no collection
              </Link>
            )}
          </div>
        </form>
      </AdminSection>

      {/* ── Archive / delete ────────────────────────────────────────────── */}
      <div id="danger" className="scroll-mt-24">
        <ProductLifecyclePanel
          productId={product.id}
          productName={product.name}
          slug={product.slug}
          archived={product.archived_at !== null}
        />
      </div>
    </div>
  );
}
