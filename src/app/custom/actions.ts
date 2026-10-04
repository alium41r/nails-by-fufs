"use server";

import {
  ALLOWED_REFERENCE_TYPES,
  MAX_REFERENCE_BYTES,
  buildReferencePath,
  isReferencePathInScope,
  isValidSubmissionToken,
  validateCustomOrderInput,
  validateReferenceFiles,
  type AllowedReferenceType,
} from "@/lib/custom-order-validation";
import { getPrisma } from "@/lib/prisma/db";
import { getReferenceStorage, REFERENCE_BUCKET } from "@/lib/supabase/admin";

/**
 * Server actions for the custom-order flow.
 *
 * Trust model: every value from the browser is untrusted. Field values are
 * validated here (not only in the form), upload targets are chosen by the
 * server, and at submit time the server links *only* attachment rows it
 * previously created for the same submission token after confirming the object
 * really exists in the private bucket with an allowed type and size. The client
 * never names a path it wants linked, so arbitrary-path access is impossible.
 *
 * Storage bodies never pass through the server: the browser uploads straight to
 * Storage with a short-lived signed URL.
 */

export interface ReferenceUploadTarget {
  path: string;
  token: string;
  signedUrl: string;
}

export type PrepareReferenceUploadsResult =
  | { ok: true; submissionToken: string; targets: ReferenceUploadTarget[] }
  | { ok: false; error: string };

/**
 * Mints one upload target per supplied file. The submission token scopes every
 * object path, and the object names are server-generated UUIDs, so paths are
 * unpredictable and can never collide or overwrite.
 */
export async function prepareReferenceUploads(
  rawFiles: unknown,
): Promise<PrepareReferenceUploadsResult> {
  const parsed = validateReferenceFiles(rawFiles);
  if (!parsed.ok) {
    return { ok: false, error: Object.values(parsed.errors)[0] ?? "Those files cannot be accepted." };
  }
  if (parsed.data.length === 0) {
    return { ok: false, error: "No reference images were provided." };
  }

  const prisma = getPrisma();
  const storage = getReferenceStorage();
  const submissionToken = crypto.randomUUID();

  try {
    const targets: ReferenceUploadTarget[] = [];

    for (const [index, file] of parsed.data.entries()) {
      const path = buildReferencePath(submissionToken, crypto.randomUUID(), file.contentType);
      const { data, error } = await storage
        .from(REFERENCE_BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data) {
        throw new Error(error?.message ?? "Storage refused to create a signed upload URL.");
      }

      // Record the authorised target first: the submit step only ever links rows
      // that exist here, so an unrecorded path can never be attached.
      await prisma.custom_order_attachments.create({
        data: {
          submission_token: submissionToken,
          storage_path: path,
          original_filename: file.filename,
          content_type: file.contentType,
          size_bytes: BigInt(file.sizeBytes),
          sort_order: index,
        },
      });

      targets.push({ path, token: data.token, signedUrl: data.signedUrl });
    }

    return { ok: true, submissionToken, targets };
  } catch {
    // Nothing reached Storage, so drop this attempt's metadata rather than
    // leaving orphan rows behind for a submission that was never prepared.
    await discardPreparedUploads(submissionToken);
    return {
      ok: false,
      error: "We could not prepare the reference upload right now. Please try again.",
    };
  }
}

export type SubmitCustomOrderResult =
  | { ok: true; requestId: string; referenceCount: number }
  | { ok: false; errors: Record<string, string> };

/**
 * Validates and stores one custom request, then links whichever of the
 * submission's uploaded references actually landed.
 *
 * Idempotent: the submission token is UNIQUE, so a retry (double click, network
 * retry, or a lost response) resolves to the same request row rather than
 * creating a duplicate.
 */
export async function submitCustomOrderRequest(
  raw: unknown,
): Promise<SubmitCustomOrderResult> {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  // A submission with no references has no upload token yet; mint one here.
  const rawToken = input.submissionToken;
  const providedToken =
    rawToken === undefined || rawToken === null || rawToken === "" ? null : rawToken;
  if (providedToken !== null && !isValidSubmissionToken(providedToken)) {
    return { ok: false, errors: { form: "This request could not be identified. Please reload and try again." } };
  }
  const submissionToken: string = providedToken ?? crypto.randomUUID();

  const parsed = validateCustomOrderInput(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const data = parsed.data;

  const prisma = getPrisma();

  try {
    const existing = await prisma.custom_order_requests.findUnique({
      where: { submission_token: submissionToken },
    });

    const request =
      existing ??
      (await prisma.custom_order_requests.create({
        data: {
          submission_token: submissionToken,
          name: data.name,
          email: data.email,
          instagram: data.instagram,
          shape: data.shape,
          length: data.length,
          sizing_preference: data.sizingPreference,
          standard_size: data.standardSize,
          custom_measurements: data.customMeasurements,
          color_palette: data.colorPalette,
          concept_description: data.conceptDescription,
          event_date: data.eventDate,
          budget_guidance: data.budgetGuidance,
          additional_notes: data.additionalNotes,
        },
      }));

    // Only rows this server created for this token, and still unlinked.
    const candidates = await prisma.custom_order_attachments.findMany({
      where: { submission_token: submissionToken, request_id: null },
      orderBy: { sort_order: "asc" },
    });

    if (candidates.length > 0) {
      const storage = getReferenceStorage();
      const verifiedPaths: string[] = [];

      for (const candidate of candidates) {
        // Re-check scope even though the row came from our own table.
        if (!isReferencePathInScope(candidate.storage_path, submissionToken)) continue;

        const { data: info, error } = await storage
          .from(REFERENCE_BUCKET)
          .info(candidate.storage_path);

        // No object (upload failed or was never attempted) => leave it unlinked
        // as an orphan; the submission still succeeds without that reference.
        if (error || !info) continue;
        if (!ALLOWED_REFERENCE_TYPES.includes(info.contentType as AllowedReferenceType)) continue;

        const actualSize = info.size ?? 0;
        if (actualSize <= 0 || actualSize > MAX_REFERENCE_BYTES) continue;

        // Keep the recorded metadata truthful rather than trusting the client's
        // declared size/type.
        if (actualSize !== Number(candidate.size_bytes) || info.contentType !== candidate.content_type) {
          await prisma.custom_order_attachments.update({
            where: { id: candidate.id },
            data: {
              size_bytes: BigInt(actualSize),
              content_type: info.contentType,
            },
          });
        }

        verifiedPaths.push(candidate.storage_path);
      }

      if (verifiedPaths.length > 0) {
        await prisma.custom_order_attachments.updateMany({
          where: { storage_path: { in: verifiedPaths }, request_id: null },
          data: { request_id: request.id },
        });
      }
    }

    const referenceCount = await prisma.custom_order_attachments.count({
      where: { request_id: request.id },
    });

    return { ok: true, requestId: request.id, referenceCount };
  } catch {
    return {
      ok: false,
      errors: {
        form: "We could not save your request just now. Your details are still here — please try again.",
      },
    };
  }
}

/**
 * Removes this attempt's metadata rows and any objects that did land (used when
 * preparing an upload set fails part-way). Only ever touches rows scoped to the
 * given token.
 */
async function discardPreparedUploads(submissionToken: string): Promise<void> {
  try {
    const prisma = getPrisma();
    const rows = await prisma.custom_order_attachments.findMany({
      where: { submission_token: submissionToken, request_id: null },
      select: { storage_path: true },
    });

    const inScope = rows
      .map((row) => row.storage_path)
      .filter((path) => isReferencePathInScope(path, submissionToken));

    if (inScope.length > 0) {
      await getReferenceStorage().from(REFERENCE_BUCKET).remove(inScope);
    }

    await prisma.custom_order_attachments.deleteMany({
      where: { submission_token: submissionToken, request_id: null },
    });
  } catch {
    // Best effort: the documented orphan cleanup covers anything left behind.
  }
}
