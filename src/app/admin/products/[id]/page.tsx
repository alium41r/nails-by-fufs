import Link from "next/link";
import { notFound } from "next/navigation";

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
import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";

const fieldClass =
  "h-10 px-3 bg-background border border-border text-sm text-foreground w-full rounded-xs";
const labelClass = "text-[11px] uppercase tracking-wider font-mono text-muted-foreground";
const submitClass =
  "h-10 px-4 bg-foreground text-background text-[11px] uppercase tracking-[0.16em]";

export default async function AdminProductPage({
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
    },
  });

  if (!product) notFound();

  // Ordered separately: the partial unique index makes products -> product_images
  // a 1:1 relation in Prisma, so the gallery is queried directly.
  const images = await prisma.product_images.findMany({
    where: { product_id: product.id },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: { id: true, storage_path: true, alt_text: true, sort_order: true, is_primary: true },
  });
  const unpriced = product.price_minor === null || product.currency === null;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Catalogue
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
          {unpriced ? (
            <span className="px-2 py-0.5 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400">
              Unpriced — checkout refuses it
            </span>
          ) : (
            <span className="px-2 py-0.5 border border-accent/40 text-accent">
              {product.currency} {((product.price_minor ?? 0) / 100).toFixed(2)} — checkout eligible
            </span>
          )}
          {images.length === 0 && (
            <span className="px-2 py-0.5 border border-border text-muted-foreground">No images</span>
          )}
          {!product.is_active && (
            <span className="px-2 py-0.5 border border-border text-muted-foreground">Inactive</span>
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

      {/* Details */}
      <form action={updateProductAction} className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Details</h2>
        <input type="hidden" name="id" value={product.id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Name</span>
            <input name="name" defaultValue={product.name} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Slug</span>
            <input name="slug" defaultValue={product.slug} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Descriptor</span>
            <input name="descriptor" defaultValue={product.descriptor} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Tag</span>
            <input name="tag" defaultValue={product.tag ?? ""} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Shape</span>
            <input name="shape" defaultValue={product.shape} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Default length</span>
            <select name="default_length" defaultValue={product.default_length} className={fieldClass}>
              <option value="Short">Short</option>
              <option value="Medium">Medium</option>
              <option value="Long">Long</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Finish</span>
            <input name="finish" defaultValue={product.finish} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Display order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={product.display_order ?? ""}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Description</span>
          <textarea
            name="description"
            defaultValue={product.description}
            rows={3}
            className="p-3 bg-background border border-border text-sm text-foreground w-full rounded-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Included items (one per line)</span>
          <textarea
            name="included"
            defaultValue={product.included.join("\n")}
            rows={4}
            className="p-3 bg-background border border-border text-sm text-foreground w-full rounded-xs"
          />
        </label>
        <button type="submit" className={submitClass}>
          Save Details
        </button>
      </form>

      {/* Price */}
      <form action={updateProductPriceAction} className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Price</h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Leave both fields empty to remove the price. A product only becomes checkout-eligible when
          price and currency are both set; the storefront shows its placeholder otherwise.
        </p>
        <input type="hidden" name="id" value={product.id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Price (minor units, e.g. 4500 = 45.00)</span>
            <input
              name="price"
              type="number"
              min="0"
              step="1"
              defaultValue={product.price_minor ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Currency (ISO 4217, e.g. USD)</span>
            <input
              name="currency"
              defaultValue={product.currency ?? ""}
              maxLength={3}
              className={fieldClass}
            />
          </label>
        </div>
        <button type="submit" className={submitClass}>
          Save Price
        </button>
      </form>

      {/* Visibility */}
      <form
        action={updateProductVisibilityAction}
        className="border border-border bg-surface p-5 flex flex-col gap-4"
      >
        <h2 className="eyebrow text-accent">Visibility</h2>
        <input type="hidden" name="id" value={product.id} />
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" name="is_active" defaultChecked={product.is_active} />
            Active (visible on the storefront)
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" name="featured" defaultChecked={product.featured} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <span className={labelClass}>Order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={product.display_order ?? ""}
              className="h-9 w-24 px-3 bg-background border border-border text-sm text-foreground rounded-xs"
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Deactivate instead of deleting: catalogue records are never removed from here.
        </p>
        <button type="submit" className={submitClass}>
          Save Visibility
        </button>
      </form>

      {/* Images */}
      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="eyebrow text-accent">Images</h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            {images.length} image{images.length === 1 ? "" : "s"}
          </span>
        </div>

        <ProductImageUploader productId={product.id} />

        {images.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No images yet — the storefront shows its placeholder frame until one is uploaded.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 border-t border-border">
            {images.map((image, index) => (
              <li key={image.id} className="py-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  <span className="text-muted-foreground">#{image.sort_order}</span>
                  {image.is_primary && (
                    <span className="px-2 py-0.5 border border-accent/40 text-accent">Primary</span>
                  )}
                  <span className="text-muted-foreground truncate max-w-[22rem]">{image.storage_path}</span>
                </div>

                <form action={updateProductImageAltAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="image_id" value={image.id} />
                  <label className="flex flex-col gap-1 flex-1 min-w-[14rem]">
                    <span className={labelClass}>Alt text</span>
                    <input name="alt_text" defaultValue={image.alt_text} className={fieldClass} />
                  </label>
                  <button type="submit" className="h-10 px-3 border border-border text-[11px]">
                    Save Alt
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  {!image.is_primary && (
                    <form action={setPrimaryProductImageAction}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="image_id" value={image.id} />
                      <button type="submit" className="h-9 px-3 border border-border text-[11px]">
                        Make Primary
                      </button>
                    </form>
                  )}

                  <form action={moveProductImageAction}>
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="image_id" value={image.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      className="h-9 px-3 border border-border text-[11px] disabled:opacity-40"
                    >
                      ↑
                    </button>
                  </form>

                  <form action={moveProductImageAction}>
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="image_id" value={image.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === images.length - 1}
                      className="h-9 px-3 border border-border text-[11px] disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </form>

                  <form action={deleteProductImageAction}>
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="image_id" value={image.id} />
                    <button
                      type="submit"
                      className="h-9 px-3 border border-rose-300 dark:border-rose-900/60 text-[11px] text-rose-600 dark:text-rose-400"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
