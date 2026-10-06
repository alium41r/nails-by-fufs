"use client";

import React, { useRef, useState } from "react";

import { useStudio } from "@/lib/studio/hooks";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Upload / replace / remove control for an owner-managed storefront image slot.
 *
 * ## Why this is a control and not a wrapper
 *
 * The eight homepage image slots are positioned by the layouts around them — the
 * hero's is inside a `max-w-md lg:max-w-none` column, the gallery's are grid
 * cells with their own aspect ratio. Wrapping a slot in an extra element to hang
 * an affordance on it would change that layout, so the affordance is instead
 * rendered *inside* the existing frame as an absolutely-positioned overlay. The
 * slot's own markup is untouched.
 *
 * ## Visibility
 *
 * Renders `null` unless Studio Mode is active and not in preview, so a customer
 * never receives the control, the handler or any trace of it.
 *
 * Uploads follow the same pattern as product photography: a short-lived signed
 * upload URL is minted server-side for a server-chosen path, the browser PUTs
 * the file straight to Storage, and only then is the object confirmed and the
 * content document updated. The browser never chooses a path.
 */
export interface StudioImageSlotProps {
  /** The `site_content` key that owns this slot. */
  contentKey: string;
  /** Field prefix inside that document, e.g. `imagePath`. */
  pathField?: string;
  /** Human label used on the control and in errors. */
  label: string;
  className?: string;
}

export function StudioImageControl({
  contentKey,
  pathField = "imagePath",
  label,
  className,
}: StudioImageSlotProps) {
  const { isEditing } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isEditing) return null;

  const upload = async (file: File, mode: "set" | "clear") => {
    setBusy(true);
    setError(null);
    try {
      const { prepareSiteImageUpload, finalizeSiteImageUpload, clearSiteImage } = await import(
        "@/app/admin/content-actions"
      );

      if (mode === "clear") {
        const result = await clearSiteImage({ key: contentKey, pathField });
        if (!result.ok) setError(result.error ?? "That could not be removed.");
        else window.location.reload();
        return;
      }

      const prepared = await prepareSiteImageUpload({
        key: contentKey,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }

      const put = await fetch(prepared.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!put.ok) {
        setError("The upload did not complete. Please try again.");
        return;
      }

      const finalized = await finalizeSiteImageUpload({
        key: contentKey,
        pathField,
        path: prepared.path,
      });
      if (!finalized.ok) {
        setError(finalized.error);
        return;
      }

      // A content document change is a server render (the image path is read on
      // the server), so the page is refreshed rather than patched locally. That
      // also keeps Studio Mode's draft model — which exists for catalogue fields
      // — from having to mirror image state it does not own.
      window.location.reload();
    } catch {
      setError("The upload did not complete. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "absolute right-2 top-2 z-30 flex items-center gap-1.5",
        // `hover-reveal` keeps this visible on touch devices, where the
        // `group-hover` that reveals it can never fire — see globals.css.
        "hover-reveal opacity-0 transition-opacity duration-150 group-hover/studio-image:opacity-100",
        "focus-within:opacity-100",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file, "set");
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="touch-target inline-flex items-center justify-center gap-1 rounded-xs border border-stone-800 bg-stone-950/90 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-stone-100 shadow-xs hover:bg-stone-900 disabled:opacity-60 cursor-pointer"
        title={`Upload ${label}`}
      >
        {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ImagePlus className="h-2.5 w-2.5 text-accent" />}
        <span>{busy ? "Uploading" : "Image"}</span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void upload(new File([], "clear"), "clear")}
        className="touch-target inline-flex items-center justify-center rounded-xs border border-stone-800 bg-stone-950/90 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-stone-300 shadow-xs hover:text-rose-300 disabled:opacity-60 cursor-pointer"
        title={`Remove ${label}`}
      >
        Clear
      </button>
      {error && (
        <span
          role="status"
          className="rounded-xs border border-rose-800/60 bg-rose-950/90 px-2 py-1 text-[9px] font-mono text-rose-200"
        >
          {error}
        </span>
      )}
    </div>
  );
}
