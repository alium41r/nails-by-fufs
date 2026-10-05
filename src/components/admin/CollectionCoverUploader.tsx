"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { finalizeCollectionCoverUpload, prepareCollectionCoverUpload } from "@/app/admin/actions";
import { AdminButton } from "@/components/admin/ui/controls";

const ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/gif";

/**
 * Cover image upload for a collection: signed URL minted server-side by an
 * admin-only action, direct browser → Storage PUT, metadata recorded only after
 * the object is verified. Same guarantees as the product image uploader.
 */
export function CollectionCoverUploader({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleFile = async (file: File) => {
    setIsBusy(true);
    setError(null);
    setDone(false);

    try {
      const target = await prepareCollectionCoverUpload({
        collectionId,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!target.ok) {
        setError(target.error);
        return;
      }

      const put = await fetch(target.signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!put.ok) {
        setError("The upload failed. Please try again.");
        return;
      }

      const finalized = await finalizeCollectionCoverUpload({ collectionId, path: target.path });
      if (!finalized.ok) {
        setError(finalized.error);
        return;
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("The upload could not be completed. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      <AdminButton
        type="button"
        variant="primary"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
      >
        {isBusy ? "Uploading…" : "Upload cover"}
      </AdminButton>

      {done && (
        <p role="status" className="text-[13px] text-emerald-700 dark:text-emerald-400">
          Cover photo updated.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        PNG, JPG, WebP, HEIC or GIF, up to 10 MB. Uploading a new cover replaces the previous one.
      </p>
    </div>
  );
}
