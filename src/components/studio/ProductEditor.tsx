"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import type { StudioProductManagement } from "@/lib/admin/studio-management";
import { parsePrice, PRICE_PLACEHOLDER } from "@/lib/studio/derive";
import { useStudio } from "@/lib/studio/hooks";
import { useStudioManagement } from "@/lib/studio/management";
import type { ProductDraft } from "@/lib/studio/types";
import {
  StudioField,
  StudioInput,
  StudioSelect,
  StudioSwitch,
  StudioTextArea,
} from "./fields";
import { Check, RotateCcw, AlertTriangle, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductEditorProps {
  /**
   * The authoritative management record. Every field the editor shows comes from
   * here, which is the only source carrying the real `is_active`, `featured`,
   * display order and minor-unit price.
   */
  management: StudioProductManagement;
  /** The same record projected into the customer-facing shape, so a draft can be
   *  merged onto it exactly as the storefront renders it. */
  product: CatalogueProduct;
  focusField?: string;
  onClose: () => void;
}

const SHAPE_SUGGESTIONS = ["Almond", "Coffin", "Square", "Stiletto", "Oval", "Squoval"];
const FINISH_SUGGESTIONS = ["High Gloss", "Velvet Matte", "Cat Eye Gloss", "Satin Pearl", "Chrome Mirror"];
const TAG_SUGGESTIONS = ["New", "Bestseller", "Studio Edit", "Limited Edition", "Archived"];

/**
 * Requested focus targets that are not simple `id` lookups.
 *
 * The quick chips on the product page ask for targets like `length`, `active`
 * and `featured`, which have no input of their own, so they are mapped to the
 * element that actually owns the control.
 */
/**
 * Reads the display-order field. Empty means "no explicit order", which the
 * server stores as NULL; anything else must be a whole number.
 */
function parseDisplayOrderInput(value: number | string): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

const FOCUS_FIELD_TARGETS: Record<string, string> = {
  length: "studio-length-group",
  active: "studio-field-active",
  featured: "studio-field-featured",
};

export function ProductEditor({ management, product, focusField, onClose }: ProductEditorProps) {
  const { state, patchProduct, openImageManager } = useStudio();
  const { saveProduct, rebaseProduct } = useStudioManagement();
  const draft = state.productDrafts[product.id] || {};

  /**
   * The saved values, in minor units. Taken from the management record rather
   * than parsed back out of a formatted price string, so pre-filling and
   * reverting cannot lose precision or invent a currency.
   */
  const basePrice = {
    priceMinor: management.priceMinor,
    currency: management.currency,
    amount: management.priceMinor === null ? "" : (management.priceMinor / 100).toFixed(2),
  };
  const initialCurrency = draft.currency ?? basePrice.currency ?? "USD";
  const initialPriceStr =
    draft.priceMinor !== undefined
      ? draft.priceMinor === null
        ? ""
        : (draft.priceMinor / 100).toFixed(2)
      : basePrice.amount;

  // Form states initialized from draft or base product
  const [name, setName] = useState(draft.name ?? product.name);
  const [descriptor, setDescriptor] = useState(draft.descriptor ?? product.descriptor);
  const [description, setDescription] = useState(draft.description ?? product.description);
  const [currency, setCurrency] = useState(initialCurrency);
  const [priceStr, setPriceStr] = useState(initialPriceStr);
  const [shape, setShape] = useState(draft.shape ?? product.shape ?? "Almond");
  const [length, setLength] = useState<"Short" | "Medium" | "Long">(
    draft.length ?? product.length ?? "Medium"
  );
  const [finish, setFinish] = useState(draft.finish ?? product.finish ?? "High Gloss");
  const [tag, setTag] = useState(draft.tag ?? product.tag ?? "");
  const [includedStr, setIncludedStr] = useState(
    (draft.included ?? product.included ?? []).join("\n")
  );
  const [isActive, setIsActive] = useState(draft.isActive ?? management.isActive);
  const [featured, setFeatured] = useState(draft.featured ?? management.featured);
  const [displayOrder, setDisplayOrder] = useState<number | string>(
    draft.displayOrder ?? management.displayOrder ?? "",
  );

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const showBanner = (message: string, ms = 4000) => {
    setSavedBanner(message);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setSavedBanner(null), ms);
  };

  // Move focus to the field a Studio edit chip asked for.
  useEffect(() => {
    if (!focusField) return;
    const targetId = FOCUS_FIELD_TARGETS[focusField] ?? `studio-field-${focusField}`;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: "nearest" });
  }, [focusField]);

  /**
   * Persists through the management provider.
   *
   * The provider owns what happens next: on success it adopts the server's
   * projection and clears this draft, so the storefront switches from the local
   * overlay to database values; on failure or a concurrent change it keeps the
   * draft so nothing the owner typed is lost.
   */
  const handleSaveDraft = async () => {
    const trimmedName = name.trim();
    setErrorMessage(null);

    if (!trimmedName) {
      setErrorMessage("A product needs a name before it can be saved.");
      return;
    }

    const parsed = parsePrice(priceStr, currency);
    const updatedDraft: ProductDraft = {
      name: trimmedName,
      descriptor: descriptor.trim(),
      description: description.trim(),
      priceMinor: parsed.priceMinor,
      currency: parsed.currency,
      shape: shape.trim(),
      length,
      finish: finish.trim(),
      tag: tag.trim(),
      included: includedStr
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      isActive,
      featured,
      displayOrder: parseDisplayOrderInput(displayOrder),
    };

    setIsSaving(true);
    // Optimistic local overlay first, so the storefront behind the drawer
    // reflects the edit while the request is in flight.
    patchProduct(product.id, updatedDraft);

    try {
      const result = await saveProduct(product.id, updatedDraft);

      if (result.success) {
        showBanner("Saved. The storefront now shows the published values.");
        return;
      }

      setErrorMessage(result.message ?? "The product could not be saved.");
      if (result.conflict) {
        // Keep the draft, but re-read the fields so the owner can see what the
        // record looks like now and retry deliberately.
        syncFormFromServer();
      }
    } finally {
      setIsSaving(false);
    }
  };

  /** Re-reads every field from the current authoritative record. */
  const syncFormFromServer = () => {
    setName(management.name);
    setDescriptor(management.descriptor);
    setDescription(management.description);
    setCurrency(management.currency ?? "USD");
    setPriceStr(management.priceMinor === null ? "" : (management.priceMinor / 100).toFixed(2));
    setShape(management.shape);
    setLength(management.defaultLength);
    setFinish(management.finish);
    setTag(management.tag ?? "");
    setIncludedStr(management.included.join("\n"));
    setIsActive(management.isActive);
    setFeatured(management.featured);
    setDisplayOrder(management.displayOrder ?? "");
  };

  /**
   * Discards local edits.
   *
   * The draft is cleared first so the editor is no longer the source of the
   * values, then the form is refilled from the management record — which is the
   * latest state the server reported, including anything another tab changed.
   */
  const handleRevert = () => {
    rebaseProduct(product.id);
    syncFormFromServer();
    setErrorMessage(null);
    showBanner("Reverted to the saved catalogue values.", 3000);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      {/* Editorial Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="eyebrow text-accent">Product Editor</span>
          <h2 className="font-display text-xl text-foreground font-normal line-clamp-1">
            {name || product.name}
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            ID: {product.id.slice(0, 8)}... • Slug: {product.slug}
          </span>
        </div>

        <button
          type="button"
          onClick={() => openImageManager(product.id)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider bg-surface-subtle text-foreground border border-border hover:border-accent transition-colors rounded-xs cursor-pointer shrink-0"
        >
          <Images className="w-3.5 h-3.5 text-accent" />
          <span>Photos</span>
        </button>
      </div>

      {savedBanner && (
        <div className="p-3 bg-emerald-950/20 dark:bg-emerald-950/50 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in-50 rounded-xs">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-3 bg-rose-500/10 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 rounded-xs"
        >
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="flex flex-col gap-4">
        {/* Name */}
        <StudioField label="Product Name" htmlFor="studio-field-name">
          <StudioInput
            id="studio-field-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Noir Velvet"
          />
        </StudioField>

        {/* Descriptor */}
        <StudioField label="Descriptor / Subtitle" htmlFor="studio-field-descriptor" hint="Displayed under title">
          <StudioInput
            id="studio-field-descriptor"
            value={descriptor}
            onChange={(e) => setDescriptor(e.target.value)}
            placeholder="e.g. Handcrafted Deep Berry Velvet Matte Press-On Set"
          />
        </StudioField>

        {/* Price & Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <StudioField label="Currency" htmlFor="studio-field-currency">
              <StudioSelect
                id="studio-field-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="CAD">CAD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AUD">AUD ($)</option>
              </StudioSelect>
            </StudioField>
          </div>

          <div className="col-span-2">
            <StudioField label="Price" htmlFor="studio-field-price" hint={!priceStr ? "Leave empty for $XX" : ""}>
              <div className="relative">
                <StudioInput
                  id="studio-field-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  placeholder="e.g. 48.00"
                />
              </div>
            </StudioField>
          </div>
        </div>

        {!priceStr && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-400/30 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-2 rounded-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Unpriced items will display {PRICE_PLACEHOLDER} on the storefront.</span>
          </div>
        )}

        {/* Description */}
        <StudioField label="Description Narrative" htmlFor="studio-field-description">
          <StudioTextArea
            id="studio-field-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the set, style, and mood..."
          />
        </StudioField>

        {/* Shape & Length */}
        <div className="grid grid-cols-2 gap-3">
          <StudioField label="Nail Shape" htmlFor="studio-field-shape">
            <StudioInput
              id="studio-field-shape"
              list="shape-datalist"
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              placeholder="e.g. Almond"
            />
            <datalist id="shape-datalist">
              {SHAPE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </StudioField>

          <StudioField label="Default Length" htmlFor="studio-length-group">
            <div
              id="studio-length-group"
              tabIndex={-1}
              role="group"
              aria-label="Default length"
              className="grid grid-cols-3 gap-1 pt-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {(["Short", "Medium", "Long"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={length === l}
                  onClick={() => setLength(l)}
                  className={cn(
                    "h-9 text-xs font-mono rounded-xs border transition-colors cursor-pointer",
                    length === l
                      ? "bg-accent text-accent-foreground border-accent font-semibold"
                      : "bg-background border-border text-foreground hover:border-foreground/40"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </StudioField>
        </div>

        {/* Finish & Tag */}
        <div className="grid grid-cols-2 gap-3">
          <StudioField label="Finish" htmlFor="studio-field-finish">
            <StudioInput
              id="studio-field-finish"
              list="finish-datalist"
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              placeholder="e.g. High Gloss"
            />
            <datalist id="finish-datalist">
              {FINISH_SUGGESTIONS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </StudioField>

          <StudioField label="Product Tag" htmlFor="studio-field-tag" hint="Optional badge">
            <StudioInput
              id="studio-field-tag"
              list="tag-datalist"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. New"
            />
            <datalist id="tag-datalist">
              {TAG_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </StudioField>
        </div>

        {/* What's In The Box */}
        <StudioField
          label="Included in the Box"
          htmlFor="studio-field-included"
          hint="One guarantee or item per line"
        >
          <StudioTextArea
            id="studio-field-included"
            rows={4}
            value={includedStr}
            onChange={(e) => setIncludedStr(e.target.value)}
            placeholder="10 Handcrafted press-on nails&#10;Full application prep kit&#10;Custom storage gift case"
          />
        </StudioField>

        {/* Display order */}
        <StudioField
          label="Display Order"
          htmlFor="studio-field-display-order"
          hint="Lower shows first · leave empty for no explicit order"
        >
          <StudioInput
            id="studio-field-display-order"
            type="number"
            step="1"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            placeholder="e.g. 1"
          />
        </StudioField>

        {/* Visibility & Featured */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <StudioSwitch
            id="studio-field-active"
            label="Active Catalogue Status"
            description="Inactive items are hidden from public customer browsing."
            checked={isActive}
            onChange={setIsActive}
          />
          <StudioSwitch
            id="studio-field-featured"
            label="Featured Product"
            description="Prioritizes this set in home and studio highlights."
            checked={featured}
            onChange={setFeatured}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-2 sticky bottom-0 bg-surface py-2">
        <button
          type="button"
          onClick={handleRevert}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Revert</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-foreground text-background text-xs font-mono uppercase tracking-[0.16em] rounded-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
