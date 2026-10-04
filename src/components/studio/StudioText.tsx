"use client";

import React from "react";
import type { CatalogueCollection, CatalogueProduct } from "@/lib/catalogue";
import { useStudio, useStudioCollection, useStudioProduct } from "@/lib/studio/hooks";
import { StudioEditable } from "./StudioEditable";

type ProductTextField = "name" | "descriptor" | "description" | "price" | "shape" | "finish" | "tag";
type CollectionTextField = "title" | "subtitle" | "description" | "tag";

interface StudioProductTextProps {
  product: CatalogueProduct;
  field: ProductTextField;
  editable?: boolean;
  as?: "div" | "span" | "p" | "h1" | "h2" | "h3";
  inline?: boolean;
  className?: string;
  fallback?: string;
}

interface StudioCollectionTextProps {
  collection: CatalogueCollection;
  field: CollectionTextField;
  editable?: boolean;
  as?: "div" | "span" | "p" | "h1" | "h2" | "h3";
  inline?: boolean;
  className?: string;
  fallback?: string;
}

export function StudioProductText({
  product,
  field,
  editable = true,
  as: Component = "span",
  inline = true,
  className,
  fallback = "",
}: StudioProductTextProps) {
  const merged = useStudioProduct(product);
  const textValue = (merged[field] as string | undefined) || fallback;

  if (!editable) {
    return <Component className={className}>{textValue}</Component>;
  }

  return (
    <StudioEditable
      entityType="product"
      id={product.id}
      field={field}
      as={Component}
      inline={inline}
      className={className}
    >
      {textValue}
    </StudioEditable>
  );
}

export function StudioCollectionText({
  collection,
  field,
  editable = true,
  as: Component = "span",
  inline = true,
  className,
  fallback = "",
}: StudioCollectionTextProps) {
  const merged = useStudioCollection(collection);
  const textValue = (merged[field] as string | undefined) || fallback;

  if (!editable) {
    return <Component className={className}>{textValue}</Component>;
  }

  return (
    <StudioEditable
      entityType="collection"
      id={collection.slug}
      field={field}
      as={Component}
      inline={inline}
      className={className}
    >
      {textValue}
    </StudioEditable>
  );
}

export function StudioTagBadge({
  product,
  className,
}: {
  product: CatalogueProduct;
  className?: string;
}) {
  const merged = useStudioProduct(product);
  const { isEditing, openProductEditor } = useStudio();

  if (merged.tag) {
    return (
      <StudioEditable
        entityType="product"
        id={product.id}
        field="tag"
        label="Tag"
        inline
        className={className}
      >
        <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-surface-subtle text-foreground border border-border font-mono">
          {merged.tag}
        </span>
      </StudioEditable>
    );
  }

  if (isEditing) {
    return (
      <button
        type="button"
        onClick={() => openProductEditor(product.id, "tag")}
        className="text-[9px] uppercase tracking-wider px-2 py-0.5 border border-dashed border-accent/60 text-accent font-mono hover:bg-accent/5 transition-colors rounded-xs cursor-pointer"
        title="Add badge tag"
      >
        + Add Tag
      </button>
    );
  }

  return null;
}

