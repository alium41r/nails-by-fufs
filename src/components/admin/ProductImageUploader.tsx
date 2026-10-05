"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { finalizeProductImageUpload, prepareProductImageUpload } from "@/app/admin/actions";
import { AdminButton } from "@/components/admin/ui/controls";

const ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/gif";

/**
 * Uploads product images straight to Storage with short-lived signed URLs minted
 * by an admin-only action. The image body never passes through the server, the
 * browser never chooses the object path, and the metadata row is only created
 * after `finalizeProductImageUpload` has confirmed the object exists.
 */
export function ProductImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(0);

  const handleFiles = async (files: FileList) => {
    setIsBusy(true);
    setError(null);
    setUploaded(0);

    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const target = await prepareProductImageUpload({
          productId,
          contentType: file.type,
          sizeBytes: file.size,
        });
        if (!target.ok) {
          setError(target.error);
          break;
        }

        const put = await fetch(target.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type, "x-upsert": "false" },
          body: file,
        });
        if (!put.ok) {
          setError(`The upload failed for ${file.name}.`);
          continue;
        }

        const finalized = await finalizeProductImageUpload({ productId, path: target.path });
        if (!finalized.ok) {
          setError(finalized.error);
          continue;
        }
        count += 1;
      }

      setUploaded(count);
      router.refresh();
    } catch {
      setError("The upload could not be completed. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            void handleFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton
          type="button"
          variant="primary"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {isBusy ? "Uploading…" : "Add photos"}
        </AdminButton>

        <p className="text-xs text-muted-foreground">
          PNG, JPG, WebP, HEIC or GIF, up to 10 MB each. The first photo becomes the main one.
        </p>
      </div>

      {uploaded > 0 && (
        <p role="status" className="text-[13px] text-emerald-700 dark:text-emerald-400">
          {uploaded} photo{uploaded === 1 ? "" : "s"} uploaded.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
