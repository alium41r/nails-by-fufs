"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_BUCKET,
  IMAGE_EXTENSION,
  MAX_IMAGE_BYTES,
  isCollectionCoverPath,
  isProductImagePath,
  isUuid,
} from "@/lib/admin/paths";
import { getReferenceStorage } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

/**
 * Every action below re-checks authorisation independently of the proxy and of
 * the UI. Write actions use `assertAdmin()` so a forged POST cannot touch
 * catalogue data, and the admin layout/page guard covers rendering.
 */

async function assertAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* -------------------------------------------------------------------------- */
/* Validation (mirrors the database CHECK constraints, friendlier messages)     */
/* -------------------------------------------------------------------------- */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const LENGTHS = ["Short", "Medium", "Long"];

function text(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(form: FormData, field: string, max: number): string | null | string {
  const value = text(form, field);
  if (value.length === 0) return null;
  return value.length > max ? `__too_long__:${max}` : value;
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export async function updateProductAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const slug = text(formData, "slug");
  const name = text(formData, "name");
  const descriptor = text(formData, "descriptor");
  const description = text(formData, "description");
  const shape = text(formData, "shape");
  const defaultLength = text(formData, "default_length");
  const finish = text(formData, "finish");
  const tag = optionalText(formData, "tag", 60);
  const displayOrderRaw = text(formData, "display_order");
  const includedRaw = text(formData, "included");

  const errors: string[] = [];
  if (name.length === 0 || name.length > 200) errors.push("Name is required (max 200 characters).");
  if (!SLUG_PATTERN.test(slug)) errors.push("Slug must be lowercase words separated by single hyphens.");
  if (shape.length === 0) errors.push("Shape is required.");
  if (!LENGTHS.includes(defaultLength)) errors.push("Default length must be Short, Medium or Long.");
  if (typeof tag === "string" && tag.startsWith("__too_long__")) errors.push("Tag is too long.");
  const displayOrder = displayOrderRaw === "" ? null : Number(displayOrderRaw);
  if (displayOrder !== null && !Number.isInteger(displayOrder)) errors.push("Display order must be a whole number.");

  const included = includedRaw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (errors.length > 0) {
    redirect(`/admin/products/${id}?error=${encodeURIComponent(errors.join(" "))}`);
  }

  try {
    await getPrisma().products.update({
      where: { id },
      data: {
        name,
        slug,
        descriptor,
        description,
        shape,
        default_length: defaultLength,
        finish,
        tag: tag as string | null,
        display_order: displayOrder,
        included,
      },
    });
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? "");
    const friendly = message.includes("products_slug_key")
      ? "That slug is already used by another product."
      : message.includes("products_slug_format")
        ? "Slug must be lowercase words separated by single hyphens."
        : message.includes("products_default_length_valid")
          ? "Default length must be Short, Medium or Long."
          : message.includes("included")
            ? "Included items could not be saved."
            : "The product could not be saved. Please check the values and try again.";
    redirect(`/admin/products/${id}?error=${encodeURIComponent(friendly)}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${id}?saved=1`);
}

/**
 * Price pair. Both NULL means "no verified price": the storefront shows its
 * placeholder and checkout refuses the product. Both set means it is priced and
 * therefore checkout-eligible. A half-set pair is rejected here and by the
 * database CHECK.
 */
export async function updateProductPriceAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const priceRaw = text(formData, "price");
  const currencyRaw = text(formData, "currency").toUpperCase();

  try {
    if (priceRaw === "" && currencyRaw === "") {
      await getPrisma().products.update({
        where: { id },
        data: { price_minor: null, currency: null },
      });
    } else {
      const priceMinor = Number(priceRaw);
      if (!Number.isInteger(priceMinor) || priceMinor < 0) {
        redirect(`/admin/products/${id}?error=${encodeURIComponent("Price must be a whole number of minor units (for example 4500 for 45.00).")}`);
      }
      if (!CURRENCY_PATTERN.test(currencyRaw)) {
        redirect(`/admin/products/${id}?error=${encodeURIComponent("Currency must be a three-letter code such as USD.")}`);
      }
      await getPrisma().products.update({
        where: { id },
        data: { price_minor: priceMinor, currency: currencyRaw },
      });
    }
  } catch {
    redirect(`/admin/products/${id}?error=${encodeURIComponent("The price could not be saved.")}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${id}?saved=1`);
}

/** Visibility flags and display order. Deactivate rather than delete. */
export async function updateProductVisibilityAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const isActive = formData.get("is_active") === "on";
  const featured = formData.get("featured") === "on";
  const displayOrderRaw = text(formData, "display_order");
  const displayOrder = displayOrderRaw === "" ? null : Number(displayOrderRaw);

  if (displayOrder !== null && !Number.isInteger(displayOrder)) {
    redirect(`/admin/products/${id}?error=${encodeURIComponent("Display order must be a whole number.")}`);
  }

  try {
    await getPrisma().products.update({
      where: { id },
      data: { is_active: isActive, featured, display_order: displayOrder },
    });
  } catch {
    redirect(`/admin/products/${id}?error=${encodeURIComponent("Visibility could not be saved.")}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${id}?saved=1`);
}

/* -------------------------------------------------------------------------- */
/* Product images                                                              */
/* -------------------------------------------------------------------------- */


export type ImageUploadTarget =
  | { ok: true; path: string; token: string; signedUrl: string }
  | { ok: false; error: string };

/**
 * Mints one short-lived signed upload URL for a product image. The path is
 * generated here (never by the browser), so a client cannot choose a path,
 * overwrite an existing object or write outside its own product folder.
 */
export async function prepareProductImageUpload(input: {
  productId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ImageUploadTarget> {
  if (!(await getAdminUser())) return { ok: false, error: "Not authorised." };

  if (!isUuid(input.productId)) return { ok: false, error: "Unknown product." };
  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPG, WebP, HEIC or GIF." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  const product = await getPrisma().products.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Unknown product." };

  const path = `products/${product.id}/${crypto.randomUUID()}.${IMAGE_EXTENSION[input.contentType]}`;
  const { data, error } = await getReferenceStorage()
    .from(IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) return { ok: false, error: "Could not prepare the upload. Please try again." };

  return { ok: true, path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Records the metadata row — only after the object is confirmed to exist in
 * Storage. Called once the browser has PUT the file to the signed URL.
 */
export async function finalizeProductImageUpload(input: {
  productId: string;
  path: string;
  altText?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getAdminUser())) return { ok: false, error: "Not authorised." };
  if (!isProductImagePath(input.path, input.productId)) {
    return { ok: false, error: "That image path is not valid for this product." };
  }

  const prisma = getPrisma();
  const { data: info, error } = await getReferenceStorage().from(IMAGE_BUCKET).info(input.path);
  if (error || !info) return { ok: false, error: "The upload did not complete. Please try again." };
  if (!ALLOWED_IMAGE_TYPES.includes(info.contentType as string)) {
    return { ok: false, error: "Unsupported image type." };
  }
  const size = info.size ?? 0;
  if (size <= 0 || size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be 10 MB or smaller." };

  const existing = await prisma.product_images.count({ where: { product_id: input.productId } });
  const maxSort = await prisma.product_images.aggregate({
    where: { product_id: input.productId },
    _max: { sort_order: true },
  });

  await prisma.product_images.create({
    data: {
      product_id: input.productId,
      storage_path: input.path,
      alt_text: (input.altText ?? "").slice(0, 300),
      sort_order: (maxSort._max.sort_order ?? -1) + 1,
      // The first image of a product becomes its primary automatically.
      is_primary: existing === 0,
    },
  });

  revalidatePath(`/admin/products/${input.productId}`);
  revalidatePath("/shop");
  return { ok: true };
}

export async function setPrimaryProductImageAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");
  const productId = text(formData, "product_id");
  const imageId = text(formData, "image_id");

  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.product_images.updateMany({ where: { product_id: productId }, data: { is_primary: false } }),
    prisma.product_images.update({ where: { id: imageId }, data: { is_primary: true } }),
  ]);

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function updateProductImageAltAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");
  const productId = text(formData, "product_id");
  const imageId = text(formData, "image_id");
  const altText = text(formData, "alt_text").slice(0, 300);

  await getPrisma().product_images.update({ where: { id: imageId }, data: { alt_text: altText } });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${productId}?saved=1`);
}

/** Reorders by swapping sort_order with the neighbour in the given direction. */
export async function moveProductImageAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");
  const productId = text(formData, "product_id");
  const imageId = text(formData, "image_id");
  const direction = text(formData, "direction") === "up" ? -1 : 1;

  const prisma = getPrisma();
  const images = await prisma.product_images.findMany({
    where: { product_id: productId },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: { id: true, sort_order: true },
  });

  const index = images.findIndex((image) => image.id === imageId);
  const neighbour = images[index + direction];
  if (index >= 0 && neighbour) {
    // Normalise sort_order across the gallery, then swap the two positions.
    await prisma.$transaction(
      images.map((image, position) => {
        const nextPosition = image.id === imageId ? index + direction : image.id === neighbour.id ? index : position;
        return prisma.product_images.update({
          where: { id: image.id },
          data: { sort_order: nextPosition },
        });
      }),
    );
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${productId}?saved=1`);
}

/** Deletes the object first, then the metadata row, so nothing is orphaned. */
export async function deleteProductImageAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");
  const productId = text(formData, "product_id");
  const imageId = text(formData, "image_id");

  const prisma = getPrisma();
  const image = await prisma.product_images.findUnique({
    where: { id: imageId },
    select: { storage_path: true, is_primary: true },
  });

  if (image && isProductImagePath(image.storage_path, productId)) {
    await getReferenceStorage().from(IMAGE_BUCKET).remove([image.storage_path]);
  }
  if (image) {
    await prisma.product_images.delete({ where: { id: imageId } });

    // Keep exactly one primary image when the primary was removed.
    if (image.is_primary) {
      const next = await prisma.product_images.findFirst({
        where: { product_id: productId },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      if (next) {
        await prisma.product_images.update({ where: { id: next.id }, data: { is_primary: true } });
      }
    }
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  redirect(`/admin/products/${productId}?saved=1`);
}

/* -------------------------------------------------------------------------- */
/* Collections                                                                 */
/* -------------------------------------------------------------------------- */


/**
 * Collection fields. Deactivating is how a collection is retired: per the
 * catalogue rules an inactive collection also hides its products publicly.
 */
export async function updateCollectionAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const slug = text(formData, "slug");
  const title = text(formData, "title");
  const subtitle = text(formData, "subtitle");
  const description = text(formData, "description");
  const tag = optionalText(formData, "tag", 60);
  const displayOrderRaw = text(formData, "display_order");
  const displayOrder = displayOrderRaw === "" ? null : Number(displayOrderRaw);

  const errors: string[] = [];
  if (title.length === 0 || title.length > 200) errors.push("Title is required (max 200 characters).");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    errors.push("Slug must be lowercase words separated by single hyphens.");
  }
  if (typeof tag === "string" && tag.startsWith("__too_long__")) errors.push("Tag is too long.");
  if (displayOrder !== null && !Number.isInteger(displayOrder)) errors.push("Display order must be a whole number.");
  if (errors.length > 0) {
    redirect(`/admin/collections/${id}?error=${encodeURIComponent(errors.join(" "))}`);
  }

  try {
    await getPrisma().collections.update({
      where: { id },
      data: {
        slug,
        title,
        subtitle,
        description,
        tag: tag as string | null,
        is_active: formData.get("is_active") === "on",
        featured: formData.get("featured") === "on",
        display_order: displayOrder,
      },
    });
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? "");
    const friendly = message.includes("collections_slug_key")
      ? "That slug is already used by another collection."
      : message.includes("collections_slug_format")
        ? "Slug must be lowercase words separated by single hyphens."
        : "The collection could not be saved. Please check the values and try again.";
    redirect(`/admin/collections/${id}?error=${encodeURIComponent(friendly)}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/collections/${id}`);
  revalidatePath("/collections");
  revalidatePath("/shop");
  redirect(`/admin/collections/${id}?saved=1`);
}

/** Signed upload target for a collection cover image (public bucket). */
export async function prepareCollectionCoverUpload(input: {
  collectionId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ImageUploadTarget> {
  if (!(await getAdminUser())) return { ok: false, error: "Not authorised." };
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };
  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPG, WebP, HEIC or GIF." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  const collection = await getPrisma().collections.findUnique({
    where: { id: input.collectionId },
    select: { id: true },
  });
  if (!collection) return { ok: false, error: "Unknown collection." };

  const path = `collections/${collection.id}/${crypto.randomUUID()}.${IMAGE_EXTENSION[input.contentType]}`;
  const { data, error } = await getReferenceStorage().from(IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Could not prepare the upload. Please try again." };

  return { ok: true, path, token: data.token, signedUrl: data.signedUrl };
}

/** Records the cover path only after the object is confirmed to exist. */
export async function finalizeCollectionCoverUpload(input: {
  collectionId: string;
  path: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getAdminUser())) return { ok: false, error: "Not authorised." };
  if (!isCollectionCoverPath(input.path, input.collectionId)) {
    return { ok: false, error: "That image path is not valid for this collection." };
  }

  const prisma = getPrisma();
  const { data: info, error } = await getReferenceStorage().from(IMAGE_BUCKET).info(input.path);
  if (error || !info) return { ok: false, error: "The upload did not complete. Please try again." };
  if (!ALLOWED_IMAGE_TYPES.includes(info.contentType as string)) {
    return { ok: false, error: "Unsupported image type." };
  }

  const previous = await prisma.collections.findUnique({
    where: { id: input.collectionId },
    select: { cover_image_path: true },
  });

  await prisma.collections.update({
    where: { id: input.collectionId },
    data: { cover_image_path: input.path },
  });

  // Replace rather than accumulate: drop the object this studio uploaded before.
  if (
    previous?.cover_image_path &&
    isCollectionCoverPath(previous.cover_image_path, input.collectionId) &&
    previous.cover_image_path !== input.path
  ) {
    await getReferenceStorage().from(IMAGE_BUCKET).remove([previous.cover_image_path]);
  }

  revalidatePath(`/admin/collections/${input.collectionId}`);
  revalidatePath("/collections");
  return { ok: true };
}

/** Removes the cover object (when it is ours) and clears the column. */
export async function removeCollectionCoverAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");
  const id = text(formData, "id");

  const prisma = getPrisma();
  const collection = await prisma.collections.findUnique({
    where: { id },
    select: { cover_image_path: true },
  });

  if (collection?.cover_image_path && isCollectionCoverPath(collection.cover_image_path, id)) {
    await getReferenceStorage().from(IMAGE_BUCKET).remove([collection.cover_image_path]);
  }

  await prisma.collections.update({ where: { id }, data: { cover_image_path: null } });

  revalidatePath(`/admin/collections/${id}`);
  revalidatePath("/collections");
  redirect(`/admin/collections/${id}?saved=1`);
}
