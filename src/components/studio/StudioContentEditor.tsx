"use client";

import React, { useState, useTransition } from "react";
import { ExternalLink, ImagePlus, Loader2, RotateCcw, Trash2, X } from "lucide-react";

import { resetContentDocumentAction, saveContentDocument } from "@/app/admin/content-actions";
import { CONTENT_KEYS, POLICY_SLUGS, policyKey } from "@/lib/site-content-schema";
import { fieldGroupsFor, type FieldSpec } from "./content-fields";
import {
  ContentField,
  ContentInput,
  ContentSelect,
  ContentStringList,
  ContentTextArea,
} from "./fields";
import { cn } from "@/lib/utils";

/**
 * The Studio Mode content editor.
 *
 * ## What this replaced, and why
 *
 * The previous version edited the document as raw JSON. It was accurate and could
 * never fall out of step with the schema — but it asked the owner to read and type
 * `{"headlineAccent": "made personal."}` in order to change three words on their
 * own homepage. That is developer tooling, and it is the single biggest reason the
 * admin felt like an internal tool rather than a shop tool.
 *
 * This renders a form: real labels, real inputs, grouped into the sections they
 * appear in on the page.
 *
 * ## How it stays safe without showing the schema
 *
 * Every save starts from the document as loaded and writes back the whole thing
 * with the edited fields applied. A field the form does not know about is
 * therefore passed through untouched rather than dropped, and the server parses
 * the result with the same rules the storefront reads it with. A mistyped value
 * falls back to the wording already there — a mistake cannot blank a section or
 * break the page.
 *
 * ## Why some fields are still "advanced"
 *
 * Repeating blocks (FAQ questions, policy sections, menu items, gallery tiles) are
 * lists of records. Adding and removing them is supported; editing them here is
 * deliberately plainer than the inline overlay on the page, which is the better
 * place to rewrite a paragraph.
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
    { key: CONTENT_KEYS.identity, label: "Site name and sharing", path: "/" },
    { key: CONTENT_KEYS.contact, label: "Contact details", path: "/contact" },
    { key: CONTENT_KEYS.currency, label: "Default currency", path: "/shop" },
    { key: CONTENT_KEYS.socials, label: "Social links", path: "/" },
    { key: CONTENT_KEYS.navMain, label: "Header menu", path: "/" },
    { key: CONTENT_KEYS.navMobile, label: "Mobile menu", path: "/" },
    { key: CONTENT_KEYS.navFooter, label: "Footer menu", path: "/" },
    { key: CONTENT_KEYS.newsletter, label: "Footer newsletter block", path: "/" },
    { key: CONTENT_KEYS.hero, label: "Homepage hero", path: "/" },
    { key: CONTENT_KEYS.featuredCollection, label: "Homepage featured collection", path: "/" },
    { key: CONTENT_KEYS.productPreview, label: "Homepage shop preview", path: "/" },
    { key: CONTENT_KEYS.customFeature, label: "Homepage bespoke feature", path: "/" },
    { key: CONTENT_KEYS.howItWorks, label: "Homepage process steps", path: "/" },
    { key: CONTENT_KEYS.gallery, label: "Homepage gallery", path: "/" },
    { key: CONTENT_KEYS.finalCta, label: "Homepage closing section", path: "/" },
    { key: CONTENT_KEYS.homeNewsletter, label: "Homepage release block", path: "/" },
    { key: CONTENT_KEYS.faq, label: "FAQ page", path: "/faq" },
    ...POLICY_SLUGS.map((slug) => ({
      key: policyKey(slug),
      label: policyTitle(slug),
      path: `/${slug}`,
    })),
  ];
}

/** "privacy-policy" → "Privacy policy". */
function policyTitle(slug: string): string {
  const words = slug.split("-");
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(" ");
}

/* -------------------------------------------------------------------------- */
/* Value paths                                                                 */
/* -------------------------------------------------------------------------- */

type Json = Record<string, unknown>;

/** Reads a dotted path out of a document. */
function readPath(source: unknown, path: string): unknown {
  let cursor: unknown = source;
  for (const segment of path.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/**
 * Returns a copy of `source` with `path` set.
 *
 * Walks object keys and array indices at any depth, so the same helper serves
 * `headline` (a top-level string), `primaryCta.label` (nested), `items.2.alt`
 * (an array element) and `sections.0.paragraphs.1` (an array inside an array).
 *
 * Immutable at every level: each container on the path is copied before it is
 * changed, so React state is never mutated in place — the reason this exists as a
 * helper rather than a series of spread operations at each call site.
 */
function writePath(source: Json, path: string, value: unknown): Json {
  const segments = path.split(".");

  const assign = (container: unknown, index: number): unknown => {
    const segment = segments[index];

    if (Array.isArray(container)) {
      const position = Number(segment);
      if (!Number.isInteger(position) || position < 0) return container;
      const copy = [...container];
      copy[position] =
        index === segments.length - 1 ? value : assign(copy[position], index + 1);
      return copy;
    }

    if (container === null || typeof container !== "object") return container;
    const record = container as Json;
    const copy: Json = { ...record };
    if (index === segments.length - 1) {
      copy[segment] = value;
      return copy;
    }
    copy[segment] = assign(record[segment], index + 1);
    return copy;
  };

  const result = assign(source, 0);
  return (result ?? {}) as Json;
}

/* -------------------------------------------------------------------------- */
/* The editor                                                                  */
/* -------------------------------------------------------------------------- */

export function StudioContentEditor({
  document,
  onSaved,
}: {
  document: StudioContentDocument;
  onSaved?: () => void;
}) {
  const [value, setValue] = useState<Json>(
    () => (document.value ?? {}) as Json,
  );
  /**
   * Which fields the owner has actually touched.
   *
   * Dirty is tracked by recording edits rather than by comparing the document to
   * its loaded form. A structural deep-compare would have to be order-insensitive
   * — `jsonb` does not preserve key order — and an order-sensitive one reports a
   * freshly-opened form as already changed. Recording edits has no such failure
   * and stays correct when the same document is edited twice in one session.
   */
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const groups = fieldGroupsFor(document.key);
  const dirty = touched.size > 0;

  const setField = (path: string, next: unknown) => {
    setValue((current) => writePath(current, path, next));
    setTouched((current) => new Set(current).add(path));
  };

  const discard = () => {
    setValue((document.value ?? {}) as Json);
    setTouched(new Set());
  };

  const save = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await saveContentDocument({ key: document.key, value });
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
        "Restore this section to the wording the site started with? Your current wording will be replaced.",
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
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] font-medium text-foreground">{document.label}</h2>
          <p className="text-xs text-muted-foreground">
            Changes go live as soon as you save.
          </p>
        </div>
        <a
          href={document.path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
          title={`Open ${document.path}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View page
        </a>
      </header>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-md border p-3 text-[13px] leading-relaxed",
            notice.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
          )}
        >
          {notice.message}
        </p>
      )}

      {groups ? (
        groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-4">
            <h3 className="border-b border-border/60 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {group.title}
            </h3>
            {group.fields.map((field) => (
              <FieldControl
                key={field.path}
                documentKey={document.key}
                field={field}
                value={value}
                setField={setField}
              />
            ))}
          </section>
        ))
      ) : (
        <p className="text-[13px] text-muted-foreground">
          This section has no editable fields yet.
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 mt-2 flex items-center gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-foreground px-4 text-[13px] font-medium text-background transition-opacity disabled:opacity-40"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={discard}
          className="h-10 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={reset}
          title="Restore the wording the site started with"
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore original
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* One field                                                                   */
/* -------------------------------------------------------------------------- */

function FieldControl({
  documentKey,
  field,
  value,
  setField,
}: {
  documentKey: string;
  field: FieldSpec;
  value: Json;
  setField: (path: string, next: unknown) => void;
}) {
  const current = readPath(value, field.path);
  const id = `studio-content-${field.path.replace(/\./g, "-")}`;

  switch (field.kind) {
    case "toggle":
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-3.5 transition-colors hover:bg-surface-subtle/50">
          <input
            type="checkbox"
            checked={current !== false}
            onChange={(event) => setField(field.path, event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">{field.label}</span>
            {field.hint && (
              <span className="text-xs leading-relaxed text-muted-foreground">{field.hint}</span>
            )}
          </span>
        </label>
      );

    case "longText":
      return (
        <ContentField label={field.label} hint={field.hint} htmlFor={id}>
          <ContentTextArea
            id={id}
            rows={3}
            value={typeof current === "string" ? current : ""}
            onChange={(event) => setField(field.path, event.target.value)}
          />
        </ContentField>
      );

    case "link": {
      // The stored shape is `{label, href}`. The label is only meaningful for a
      // button or a menu item, so a bare link (an announcement target, for
      // instance) shows just the destination.
      const wrapper = readPath(value, field.path.split(".").slice(0, -1).join("."));
      const hasLabel =
        wrapper !== null && typeof wrapper === "object" && "label" in (wrapper as Json);
      return (
        <ContentField label={field.label} hint={field.hint} htmlFor={id}>
          <ContentInput
            id={id}
            value={typeof current === "string" ? current : ""}
            placeholder={hasLabel ? "/shop" : "/shop or https://…"}
            onChange={(event) => setField(field.path, event.target.value)}
          />
        </ContentField>
      );
    }

    case "number":
      return (
        <ContentField label={field.label} hint={field.hint} htmlFor={id}>
          <ContentInput
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            value={typeof current === "number" ? current : ""}
            onChange={(event) =>
              setField(
                field.path,
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        </ContentField>
      );

    case "choice":
      return (
        <ContentField label={field.label} hint={field.hint} htmlFor={id}>
          <ContentSelect
            id={id}
            value={typeof current === "string" ? current : ""}
            onChange={(event) => setField(field.path, event.target.value)}
          >
            {field.choices?.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </ContentSelect>
        </ContentField>
      );

    case "list":
      return (
        <ContentField label={field.label} hint={field.hint}>
          <ContentStringList
            values={Array.isArray(current) ? (current as string[]) : []}
            onChange={(next) => setField(field.path, next)}
            addLabel={field.label}
          />
        </ContentField>
      );

    case "image":
      return (
        <ImageField
          documentKey={documentKey}
          label={field.label}
          hint={field.hint}
          path={field.path}
          current={typeof current === "string" ? current : null}
          setField={setField}
        />
      );

    case "records":
      return (
        <RecordsField
          documentKey={documentKey}
          field={field}
          current={current}
          setField={setField}
        />
      );

    case "text":
    default:
      return (
        <ContentField label={field.label} hint={field.hint} htmlFor={id}>
          <ContentInput
            id={id}
            value={typeof current === "string" ? current : ""}
            onChange={(event) => setField(field.path, event.target.value)}
          />
        </ContentField>
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Repeating blocks                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Descriptions of the repeating blocks, so each one can be edited as the thing it
 * is rather than as an anonymous object.
 *
 * Keys are the document key plus the array path, e.g. `page.faq.items`. When a
 * block is not described here it still renders — the shape is read from the data
 * and each field becomes a plain input — so a new repeating block in the schema
 * is editable immediately, just less prettily.
 */
/** The shapes an editorial tile can take, matching the placeholder ratios. */
const GALLERY_RATIOS = [
  { value: "portrait", label: "Tall (4:5)" },
  { value: "square", label: "Square (1:1)" },
  { value: "wide", label: "Wide (16:9)" },
  { value: "classic", label: "Classic (3:2)" },
  { value: "tall", label: "Very tall (9:16)" },
];

const RECORD_LABELS: Record<
  string,
  {
    title: string;
    singular: string;
    fields: {
      path: string;
      label: string;
      kind?: "text" | "longText" | "list" | "choice" | "toggle";
      choices?: { value: string; label: string }[];
    }[];
  }
> = {
  "page.faq.items": {
    title: "Questions",
    singular: "question",
    fields: [
      { path: "question", label: "Question" },
      { path: "answer", label: "Answer", kind: "longText" },
      { path: "category", label: "Category (the id it is filed under)" },
    ],
  },
  "home.howItWorks.steps": {
    title: "Steps",
    singular: "step",
    fields: [
      { path: "number", label: "Number" },
      { path: "title", label: "Title" },
      { path: "description", label: "Description", kind: "longText" },
    ],
  },
  // Menu items. Nav lists are keyed by a stable `key` the app generates; it is
  // deliberately not offered as an editable field, because changing it would
  // remount the item rather than update it.
  [CONTENT_KEYS.navMain]: {
    title: "Header menu items",
    singular: "item",
    fields: [
      { path: "label", label: "Text shown" },
      { path: "href", label: "Goes to" },
    ],
  },
  [CONTENT_KEYS.navMobile]: {
    title: "Mobile menu items",
    singular: "item",
    fields: [
      { path: "label", label: "Text shown" },
      { path: "href", label: "Goes to" },
    ],
  },
  [CONTENT_KEYS.navFooter]: {
    title: "Footer columns",
    singular: "column",
    fields: [{ path: "title", label: "Column heading" }],
  },
  [CONTENT_KEYS.socials]: {
    title: "Social links",
    singular: "link",
    fields: [
      { path: "label", label: "Name shown" },
      { path: "href", label: "Profile address" },
    ],
  },
  "home.gallery.items": {
    title: "Photos",
    singular: "photo",
    fields: [
      { path: "label", label: "Caption" },
      { path: "sublabel", label: "Small caption under it" },
      { path: "alt", label: "Photo description (for screen readers)" },
      { path: "ratio", label: "Shape", kind: "choice", choices: GALLERY_RATIOS },
    ],
  },
};

/**
 * Policy sections are the same three things every time.
 *
 * Declared separately from `RECORD_LABELS` because the lookup key is
 * `page.policy.<slug>.sections`, and all four policy pages share it.
 */
for (const slug of POLICY_SLUGS) {
  RECORD_LABELS[`${policyKey(slug)}.sections`] = {
    title: "Sections",
    singular: "section",
    fields: [
      { path: "heading", label: "Heading" },
      { path: "paragraphs", label: "Paragraphs", kind: "list" },
      { path: "bullets", label: "Bullet points", kind: "list" },
    ],
  };
}

/** The FAQ closing call to action reuses the same button shape. */
RECORD_LABELS["page.faq.categories"] = {
  title: "Categories",
  singular: "category",
  fields: [
    { path: "id", label: "Short id (matched by the questions above)" },
    { path: "label", label: "Name shown on the tab" },
  ],
};

function RecordsField({
  documentKey,
  field,
  current,
  setField,
}: {
  documentKey: string;
  field: FieldSpec;
  current: unknown;
  setField: (path: string, next: unknown) => void;
}) {
  const rows = Array.isArray(current) ? (current as Json[]) : [];
  // `${key}.${path}` with an empty path for whole-document arrays.
  const described = RECORD_LABELS[field.path ? `${documentKey}.${field.path}` : documentKey];

  /** Field list for a row: the description if there is one, else its own keys. */
  const rowFields: {
    path: string;
    label: string;
    kind?: "text" | "longText" | "list" | "choice" | "toggle";
    choices?: { value: string; label: string }[];
  }[] =
    described?.fields ??
    Object.keys(rows[0] ?? {})
      // A generated identity key is not something to edit.
      .filter((key) => key !== "key")
      .map((key) => ({ path: key, label: prettifyKey(key) }));

  const updateRow = (index: number, path: string, next: unknown) => {
    const copy = [...rows];
    copy[index] = writePath(copy[index] ?? {}, path, next);
    setField(field.path, copy);
  };

  const emptyRow = () => {
    const row: Json = {};
    for (const spec of rowFields) {
      row[spec.path] = spec.kind === "list" ? [] : "";
    }
    return row;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground">
          {described?.title ?? field.label}
          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
            {rows.length}
          </span>
        </span>
      </div>

      {rows.map((row, index) => (
        <details
          key={index}
          className="group overflow-hidden rounded-md border border-border/70 bg-background"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 transition-colors hover:bg-surface-subtle/50">
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              {summariseRow(row, described?.fields) ?? `Entry ${index + 1}`}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setField(
                  field.path,
                  rows.filter((_, position) => position !== index),
                );
              }}
              aria-label={`Remove ${described?.singular ?? "entry"} ${index + 1}`}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <span
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>

          <div className="flex flex-col gap-3 border-t border-border/60 p-3">
            {rowFields.map((spec) => {
              const rowValue = readPath(row, spec.path);
              const fieldId = `rec-${field.path}-${index}-${spec.path.replace(/\./g, "-")}`;
              if (spec.kind === "list") {
                return (
                  <ContentField key={spec.path} label={spec.label}>
                    <ContentStringList
                      values={Array.isArray(rowValue) ? (rowValue as string[]) : []}
                      onChange={(next) => updateRow(index, spec.path, next)}
                      addLabel={spec.label}
                    />
                  </ContentField>
                );
              }
              // A stored boolean is always a checkbox, described or not: asking
              // someone to type "true" into a text box is how a flag gets set to
              // the string "false" and silently stays on.
              if (spec.kind === "toggle" || typeof rowValue === "boolean") {
                return (
                  <label
                    key={spec.path}
                    className="flex cursor-pointer items-center gap-2.5 text-[13px] text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={rowValue === true}
                      onChange={(event) => updateRow(index, spec.path, event.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                    />
                    {spec.label}
                  </label>
                );
              }
              if (spec.kind === "choice") {
                return (
                  <ContentField key={spec.path} label={spec.label} htmlFor={fieldId}>
                    <ContentSelect
                      id={fieldId}
                      value={typeof rowValue === "string" ? rowValue : ""}
                      onChange={(event) => updateRow(index, spec.path, event.target.value)}
                    >
                      {spec.choices?.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </ContentSelect>
                  </ContentField>
                );
              }
              return (
                <ContentField key={spec.path} label={spec.label} htmlFor={fieldId}>
                  {spec.kind === "longText" ? (
                    <ContentTextArea
                      id={fieldId}
                      rows={3}
                      value={typeof rowValue === "string" ? rowValue : ""}
                      onChange={(event) => updateRow(index, spec.path, event.target.value)}
                    />
                  ) : (
                    <ContentInput
                      id={fieldId}
                      value={typeof rowValue === "string" ? rowValue : ""}
                      onChange={(event) => updateRow(index, spec.path, event.target.value)}
                    />
                  )}
                </ContentField>
              );
            })}
          </div>
        </details>
      ))}

      <button
        type="button"
        onClick={() => setField(field.path, [...rows, emptyRow()])}
        className="self-start rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
      >
        + Add {described?.singular ?? "entry"}
      </button>
    </div>
  );
}

/** "privacy-policy" style keys → "Privacy policy". */
function prettifyKey(key: string): string {
  const spaced = key.replace(/[_-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** A short, recognisable label for a collapsed row. */
function summariseRow(
  row: Json,
  fields?: { path: string }[],
): string | null {
  const candidates = fields?.map((entry) => entry.path) ?? ["question", "title", "label", "name", "text"];
  for (const path of candidates) {
    const value = readPath(row, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.length > 70 ? `${value.slice(0, 70)}…` : value;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Image field                                                                */
/* -------------------------------------------------------------------------- */

function ImageField({
  documentKey,
  label,
  hint,
  path,
  current,
  setField,
}: {
  documentKey: string;
  label: string;
  hint?: string;
  path: string;
  current: string | null;
  setField: (path: string, next: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `img-${path.replace(/\./g, "-")}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  return (
    <ContentField label={label} hint={hint}>
      <div className="flex items-start gap-3">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border/70 bg-surface-subtle">
          {current && base ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
            <img
              src={`${base}/storage/v1/object/public/site-assets/${current}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
              <ImagePlus className="h-5 w-5" />
            </span>
          )}
        </span>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-subtle"
            >
              {busy ? "Uploading…" : current ? "Replace" : "Upload"}
            </label>
            {current && (
              <button
                type="button"
                onClick={() => setField(path, null)}
                className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-rose-600 dark:hover:text-rose-400"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {current ? "Uploading a new photo replaces this one." : "Shown on the page instead of the empty frame."}
          </p>
          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/gif"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const { finalizeSiteImageUpload, prepareSiteImageUpload } = await import(
              "@/app/admin/content-actions"
            );
            const prepared = await prepareSiteImageUpload({
              key: documentKey,
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
              setError("The upload did not finish. Please try again.");
              return;
            }
            const finalized = await finalizeSiteImageUpload({
              key: documentKey,
              path: prepared.path,
              pathField: path,
            });
            if (!finalized.ok) {
              setError(finalized.error);
              return;
            }
            setField(path, prepared.path);
          } catch {
            setError("The upload did not finish. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </ContentField>
  );
}
