"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import { parseCataloguePrice, parsePrice, PRICE_PLACEHOLDER } from "@/lib/studio/derive";
import { useStudio } from "@/lib/studio/hooks";
import { studioAdapter } from "@/lib/studio/adapter";
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
const FOCUS_FIELD_TARGETS: Record<string, string> = {
  length: "studio-length-group",
  active: "studio-field-active",
  featured: "studio-field-featured",
};

export function ProductEditor({ product, focusField, onClose }: ProductEditorProps) {
  const { state, patchProduct, resetProduct, markSaved, openImageManager } = useStudio();
  const draft = state.productDrafts[product.id] || {};

  /** Base catalogue price, parsed once, used to pre-fill and to revert. */
  const basePrice = parseCataloguePrice(product.price);
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
  const [isActive, setIsActive] = useState(draft.isActive ?? true);
  const [featured, setFeatured] = useState(draft.featured ?? false);

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

  // Synchronize changes to store
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    const parsed = parsePrice(priceStr, currency);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setIsSaving(false);
      setErrorMessage("A product needs a name before the draft can be saved.");
      return;
    }

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
        .map((s) => s.trim())
        .filter(Boolean),
      isActive,
      featured,
    };

    try {
      patchProduct(product.id, updatedDraft);
      // Adapter seam: local-only today, the B8A server actions replace it later.
      const result = await studioAdapter.saveProduct(product.id, updatedDraft);
      markSaved(product.id);
      showBanner(
        result.message ||
          "Draft kept in this browser session. Nothing has been published yet."
      );
    } catch (error) {
      setErrorMessage(
        `Saving the product draft failed: ${
          error instanceof Error ? error.message : "unexpected error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    resetProduct(product.id);
    setName(product.name);
    setDescriptor(product.descriptor);
    setDescription(product.description);
    setCurrency(basePrice.currency ?? "USD");
    setPriceStr(basePrice.amount);
    setShape(product.shape ?? "Almond");
    setLength(product.length ?? "Medium");
    setFinish(product.finish ?? "High Gloss");
    setTag(product.tag ?? "");
    setIncludedStr((product.included ?? []).join("\n"));
    setIsActive(true);
    setFeatured(false);
    setErrorMessage(null);
    showBanner("Reverted all local edits to catalogue original.", 3000);
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
