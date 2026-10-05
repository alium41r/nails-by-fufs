"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { invalidateCatalogue } from "@/lib/catalogue-cache";
import { getAdminUser } from "@/lib/admin/auth";
import {
  MAX_TAG_LENGTH,
  describeCollectionWriteError,
  describeProductWriteError,
  errorMessage,
  optionalText,
  parseDisplayOrder,
  parseIncluded,
  parsePricePair,
  text,
  toCollectionCore,
  toProductCore,
  validateCollectionCore,
  validateProductCore,
} from "@/lib/admin/catalogue-validation";
import {
  CUSTOM_ORDER_STATUS_LABELS,
  APPOINTMENT_STATUS_LABELS,
  canTransitionAppointment,
  canTransitionCustomOrder,
  describeSlot,
  findSlotConflicts,
  isAppointmentStatus,
  isCustomOrderStatus,
  normalizeAdminNote,
} from "@/lib/admin/lifecycle";
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
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Field rules, slug/currency patterns and price parsing live in
 * `@/lib/admin/catalogue-validation` so the admin forms and Studio Mode share
 * exactly one implementation. Only the delivery of the outcome differs: these
 * actions redirect with an `error`/`saved` parameter, Studio returns a result.
 */

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export async function updateProductAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const raw = {
    slug: text(formData, "slug"),
    name: text(formData, "name"),
    descriptor: text(formData, "descriptor"),
    description: text(formData, "description"),
    shape: text(formData, "shape"),
    defaultLength: text(formData, "default_length"),
    finish: text(formData, "finish"),
    tag: optionalText(formData, "tag", MAX_TAG_LENGTH),
    displayOrder: parseDisplayOrder(text(formData, "display_order")),
    included: parseIncluded(text(formData, "included")),
  };

  const errors = validateProductCore(raw);
  if (errors.length > 0) {
    redirect(`/admin/products/${id}?error=${encodeURIComponent(errors.join(" "))}`);
  }

  const core = toProductCore(raw);

  try {
    await getPrisma().products.update({
      where: { id },
      data: {
        name: core.name,
        slug: core.slug,
        descriptor: core.descriptor,
        description: core.description,
        shape: core.shape,
        default_length: core.defaultLength,
        finish: core.finish,
        tag: core.tag,
        display_order: core.displayOrder,
        included: core.included,
      },
    });
  } catch (error) {
    redirect(
      `/admin/products/${id}?error=${encodeURIComponent(describeProductWriteError(errorMessage(error)))}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}`);
  // Clears the cached catalogue and every storefront path that renders it.
  invalidateCatalogue();
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
  const parsed = parsePricePair(text(formData, "price"), text(formData, "currency"));

  if (!parsed.ok) {
    redirect(`/admin/products/${id}?error=${encodeURIComponent(parsed.error)}`);
  }

  try {
    await getPrisma().products.update({
      where: { id },
      data: { price_minor: parsed.priceMinor, currency: parsed.currency },
    });
  } catch {
    redirect(`/admin/products/${id}?error=${encodeURIComponent("The price could not be saved.")}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}`);
  invalidateCatalogue();
  redirect(`/admin/products/${id}?saved=1`);
}

/** Visibility flags and display order. Deactivate rather than delete. */
export async function updateProductVisibilityAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const isActive = formData.get("is_active") === "on";
  const featured = formData.get("featured") === "on";
  const displayOrder = parseDisplayOrder(text(formData, "display_order"));

  if (displayOrder === "invalid") {
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
  invalidateCatalogue();
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
  invalidateCatalogue();
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
  invalidateCatalogue();
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function updateProductImageAltAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");
  const productId = text(formData, "product_id");
  const imageId = text(formData, "image_id");
  const altText = text(formData, "alt_text").slice(0, 300);

  await getPrisma().product_images.update({ where: { id: imageId }, data: { alt_text: altText } });
  revalidatePath(`/admin/products/${productId}`);
  invalidateCatalogue();
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
  invalidateCatalogue();
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
  invalidateCatalogue();
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
  const raw = {
    slug: text(formData, "slug"),
    title: text(formData, "title"),
    subtitle: text(formData, "subtitle"),
    description: text(formData, "description"),
    tag: optionalText(formData, "tag", MAX_TAG_LENGTH),
    displayOrder: parseDisplayOrder(text(formData, "display_order")),
  };

  const errors = validateCollectionCore(raw);
  if (errors.length > 0) {
    redirect(`/admin/collections/${id}?error=${encodeURIComponent(errors.join(" "))}`);
  }

  const core = toCollectionCore(raw);

  try {
    await getPrisma().collections.update({
      where: { id },
      data: {
        slug: core.slug,
        title: core.title,
        subtitle: core.subtitle,
        description: core.description,
        tag: core.tag,
        is_active: formData.get("is_active") === "on",
        featured: formData.get("featured") === "on",
        display_order: core.displayOrder,
      },
    });
  } catch (error) {
    redirect(
      `/admin/collections/${id}?error=${encodeURIComponent(
        describeCollectionWriteError(errorMessage(error)),
      )}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/collections/${id}`);
  invalidateCatalogue();
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
  invalidateCatalogue();
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
  invalidateCatalogue();
  redirect(`/admin/collections/${id}?saved=1`);
}

/* -------------------------------------------------------------------------- */
/* Studio operations — custom orders                                          */
/* -------------------------------------------------------------------------- */

const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

/**
 * Admin-managed lifecycle only. Every original submitted field is left exactly
 * as the customer sent it; the studio changes the review state and may keep an
 * internal note. No customer notification is sent from here.
 */
export async function updateCustomOrderStatusAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const next = text(formData, "status");
  const note = normalizeAdminNote(formData.get("admin_note"));

  const prisma = getPrisma();
  const request = await prisma.custom_order_requests.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!request) {
    redirect(`/admin/custom-orders?error=${encodeURIComponent("That request no longer exists.")}`);
  }

  if (!isCustomOrderStatus(next) || !canTransitionCustomOrder(request.status, next)) {
    const from = isCustomOrderStatus(request.status)
      ? CUSTOM_ORDER_STATUS_LABELS[request.status]
      : request.status;
    redirect(
      `/admin/custom-orders/${id}?error=${encodeURIComponent(`A request that is "${from}" cannot be moved to that state.`)}`,
    );
  }

  try {
    await prisma.custom_order_requests.update({
      where: { id },
      data: { status: next, status_updated_at: new Date(), admin_note: note },
    });
  } catch {
    redirect(`/admin/custom-orders/${id}?error=${encodeURIComponent("The status could not be saved.")}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/custom-orders");
  revalidatePath(`/admin/custom-orders/${id}`);
  redirect(`/admin/custom-orders/${id}?saved=1`);
}

/* -------------------------------------------------------------------------- */
/* Studio operations — appointments                                           */
/* -------------------------------------------------------------------------- */

/**
 * Confirm or decline an appointment request.
 *
 * Confirming runs a conflict check first: if another CONFIRMED appointment
 * already occupies the same requested date and time, the request is NOT
 * confirmed and the admin is told to resolve the clash. The partial unique index
 * `appointment_requests_confirmed_slot_key` enforces the same rule if two admins
 * race, and that violation is reported as a conflict rather than a crash.
 */
export async function updateAppointmentStatusAction(formData: FormData) {
  if (!(await assertAdmin())) redirect("/admin/login?error=not_admin");

  const id = text(formData, "id");
  const next = text(formData, "status");
  const note = normalizeAdminNote(formData.get("admin_note"));

  const prisma = getPrisma();
  const request = await prisma.appointment_requests.findUnique({
    where: { id },
    select: { status: true, preferred_date: true, preferred_time: true },
  });
  if (!request) {
    redirect(`/admin/appointments?error=${encodeURIComponent("That request no longer exists.")}`);
  }

  if (!isAppointmentStatus(next) || !canTransitionAppointment(request.status, next)) {
    const from = isAppointmentStatus(request.status)
      ? APPOINTMENT_STATUS_LABELS[request.status]
      : request.status;
    redirect(
      `/admin/appointments/${id}?error=${encodeURIComponent(`A request that is "${from}" cannot be moved to that state.`)}`,
    );
  }

  const date = isoDate(request.preferred_date);
  const time = request.preferred_time;

  if (next === "confirmed") {
    // Narrow, targeted lookup: same requested date and time, already confirmed.
    const sameSlot = await prisma.appointment_requests.findMany({
      where: { status: "confirmed", preferred_date: request.preferred_date, preferred_time: time },
      select: { id: true, preferred_date: true, preferred_time: true, status: true, name: true },
    });

    const conflicts = findSlotConflicts(
      sameSlot.map((row) => ({
        id: row.id,
        preferred_date: isoDate(row.preferred_date),
        preferred_time: row.preferred_time,
        status: row.status,
        name: row.name,
      })),
      { id, preferred_date: date, preferred_time: time },
    );

    if (conflicts.length > 0) {
      redirect(
        `/admin/appointments/${id}?error=${encodeURIComponent(
          `Another confirmed appointment already holds ${describeSlot(date, time)} (${conflicts[0].name}). Resolve that one first — this request was NOT confirmed.`,
        )}`,
      );
    }
  }

  try {
    await prisma.appointment_requests.update({
      where: { id },
      data: { status: next, status_updated_at: new Date(), admin_note: note },
    });
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? "");
    if (message.includes("appointment_requests_confirmed_slot_key") || message.includes("unique")) {
      redirect(
        `/admin/appointments/${id}?error=${encodeURIComponent(
          `That slot was confirmed by someone else a moment ago. ${describeSlot(date, time)} now has two confirmed appointments — resolve the clash.`,
        )}`,
      );
    }
    redirect(`/admin/appointments/${id}?error=${encodeURIComponent("The status could not be saved.")}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  redirect(`/admin/appointments/${id}?saved=1`);
}
