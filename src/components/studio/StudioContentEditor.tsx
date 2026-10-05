"use client";

import React, { useMemo, useState, useTransition } from "react";

import { resetContentDocumentAction, saveContentDocument } from "@/app/admin/content-actions";
import { CONTENT_KEYS, POLICY_SLUGS, policyKey } from "@/lib/site-content-schema";
import { Loader2, RotateCcw, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Studio Mode's content editor.
 *
 * ## Why this is a document editor rather than a set of bespoke forms
 *
 * The catalogue editors can be bespoke because there is one product shape and one
 * collection shape. Content is 17 documents with 17 different shapes, and the
 * shapes will keep changing as sections gain fields — a hand-written form per
 * document would be a maintenance cost proportional to the content model, and
 * would silently stop offering a field the moment one was added.
 *
 * So this edits the document as structured JSON, with the page it belongs to
 * linked beside it. That is honest about what the owner is doing, it can never
 * be out of date with the schema, and the *safety* is provided by the server: the
 * same parsers the storefront uses validate the document on save, so an invalid
 * shape is rejected with a message rather than stored, and unknown keys are
 * dropped. The guided, field-by-field editing for the surfaces that most need it
 * (the homepage hero, section headings, policy prose, the announcement bar) is
 * the inline overlay on the page itself, which is where those fields are actually
 * shown.
 *
 * ## What this deliberately cannot do
 *
 * Add a section, reorder page components, or introduce a key the code does not
 * render. `WRITABLE_CONTENT_KEYS` is a closed set and the parsers drop unknown
 * keys, so this cannot turn the storefront into a layout builder.
 */
export interface StudioContentDocument {
  key: string;
  label: string;
  /** The storefront path this document renders on, for the "view" link. */
  path: string;
  value: unknown;
}

/** Human labels and preview paths for every writable document. */
export function contentDocumentMeta(): { key: string; label: string; path: string }[] {
  return [
    { key: CONTENT_KEYS.announcement, label: "Announcement bar", path: "/" },
    { key: CONTENT_KEYS.identity, label: "Site identity & metadata", path: "/" },
    { key: CONTENT_KEYS.contact, label: "Contact details", path: "/contact" },
    { key: CONTENT_KEYS.currency, label: "Default currency", path: "/shop" },
    { key: CONTENT_KEYS.socials, label: "Social links", path: "/" },
    { key: CONTENT_KEYS.navMain, label: "Header navigation", path: "/" },
    { key: CONTENT_KEYS.navMobile, label: "Mobile menu navigation", path: "/" },
    { key: CONTENT_KEYS.navFooter, label: "Footer navigation", path: "/" },
    { key: CONTENT_KEYS.newsletter, label: "Footer release block", path: "/" },
    { key: CONTENT_KEYS.hero, label: "Homepage hero", path: "/" },
    { key: CONTENT_KEYS.featuredCollection, label: "Homepage featured collection", path: "/" },
    { key: CONTENT_KEYS.productPreview, label: "Homepage shop preview", path: "/" },
    { key: CONTENT_KEYS.customFeature, label: "Homepage bespoke feature", path: "/" },
    { key: CONTENT_KEYS.howItWorks, label: "Homepage process steps", path: "/" },
    { key: CONTENT_KEYS.gallery, label: "Homepage gallery", path: "/" },
    { key: CONTENT_KEYS.finalCta, label: "Homepage closing CTA", path: "/" },
    { key: CONTENT_KEYS.homeNewsletter, label: "Homepage release block", path: "/" },
    { key: CONTENT_KEYS.faq, label: "FAQ page", path: "/faq" },
    ...POLICY_SLUGS.map((slug) => ({
      key: policyKey(slug),
      label: `Policy: ${slug.replace(/-/g, " ")}`,
      path: `/${slug}`,
    })),
  ];
}

export function StudioContentEditor({
  document,
  onSaved,
}: {
  document: StudioContentDocument;
  onSaved?: () => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(document.value, null, 2));
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  /**
   * Local parse check before the round trip.
   *
   * Only catches malformed JSON — the server's parsers are the real validation,
   * because they know the document's schema. Checking here just avoids a request
   * that is certain to fail and gives an immediate message.
   */
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(text) as unknown };
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }
  }, [text]);

  const dirty = useMemo(
    () => JSON.stringify(parsed.ok ? parsed.value : null) !== JSON.stringify(document.value),
    [parsed, document.value],
  );

  const save = () => {
    if (!parsed.ok) return;
    setNotice(null);
    startTransition(async () => {
      const result = await saveContentDocument({ key: document.key, value: parsed.value });
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message });
        onSaved?.();
      } else {
        setNotice({ kind: "error", message: result.error });
      }
    });
  };

  const reset = () => {
    if (
      !window.confirm(
        "Restore this to the wording the site shipped with? Your current version will be replaced.",
      )
    ) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await resetContentDocumentAction({ key: document.key });
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message });
        onSaved?.();
      } else {
        setNotice({ kind: "error", message: result.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-accent">
            {document.label}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground truncate">
            {document.key}
          </span>
        </div>
        <a
          href={document.path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-accent"
          title={`Open ${document.path}`}
        >
          <ExternalLink className="h-3 w-3" />
          View
        </a>
      </div>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "text-[11px] p-2 border",
            notice.kind === "error"
              ? "border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
              : "border-accent/30 bg-accent-subtle text-accent",
          )}
        >
          {notice.message}
        </p>
      )}

      {!parsed.ok && (
        <p className="flex items-start gap-1.5 text-[11px] p-2 border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>Not valid JSON: {parsed.error}</span>
        </p>
      )}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={16}
        spellCheck={false}
        aria-label={`${document.label} content`}
        className="w-full p-3 bg-background border border-border text-[11px] font-mono leading-relaxed text-foreground rounded-xs resize-y"
      />

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Fields are checked on save: an unknown field is dropped and a mistyped value falls back to
        the original wording, so a mistake here cannot break the storefront. Wording and imagery can
        also be edited directly on the page.
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !parsed.ok || !dirty}
          onClick={save}
          className="inline-flex h-9 items-center gap-1.5 px-3 bg-foreground text-background text-[10px] uppercase tracking-wider font-mono disabled:opacity-40"
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          Save
        </button>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => setText(JSON.stringify(document.value, null, 2))}
          className="h-9 px-3 text-[10px] uppercase tracking-wider font-mono text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          Undo changes
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={reset}
          className="ml-auto inline-flex h-9 items-center gap-1.5 px-3 text-[10px] uppercase tracking-wider font-mono text-muted-foreground hover:text-accent disabled:opacity-40"
          title="Restore the wording the site shipped with"
        >
          <RotateCcw className="h-3 w-3" />
          Restore original
        </button>
      </div>
    </div>
  );
}
