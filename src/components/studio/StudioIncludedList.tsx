"use client";

import React from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useStudioProduct } from "@/lib/studio/hooks";
import { StudioEditable } from "./StudioEditable";

interface StudioIncludedListProps {
  product: CatalogueProduct;
}

export function StudioIncludedList({ product }: StudioIncludedListProps) {
  const merged = useStudioProduct(product);

  return (
    <StudioEditable
      entityType="product"
      id={product.id}
      field="included"
      label="Box Contents"
      as="div"
      className="w-full"
    >
      <ul className="text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
        {merged.included.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </StudioEditable>
  );
}
