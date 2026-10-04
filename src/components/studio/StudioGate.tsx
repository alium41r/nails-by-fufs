"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { CatalogueCollection, CatalogueProduct } from "@/lib/catalogue";

/**
 * Studio Mode is the only interactive part of the storefront a customer never
 * uses. Loading it lazily keeps the toolbar, editor drawer and their editors in
 * a separate chunk that is only fetched after the server has confirmed an admin
 * session — visitors download neither the code nor the request.
 *
 * `ssr: false` is required here: the entire Studio surface activates from a
 * client effect (session draft restore and the `?studio=1` entry parameter), so
 * the server never has meaningful Studio markup to render.
 */
const StudioProvider = dynamic(() => import("./StudioProvider").then((m) => m.StudioProvider), {
  ssr: false,
});

interface StudioGateProps {
  children: React.ReactNode;
  products?: CatalogueProduct[];
  collections?: CatalogueCollection[];
  currentProduct?: CatalogueProduct;
  currentCollection?: CatalogueCollection;
}

/**
 * Client half of the Studio Mode gate.
 *
 * `canEdit` is computed by the server through the `getAdminUser()` allowlist and
 * passed down as a prop, so this component cannot be tricked into enabling
 * Studio Mode from the browser. When it is false the children are returned with
 * zero wrapping, which is what every customer gets.
 */
export function StudioGate({
  canEdit,
  children,
  products,
  collections,
  currentProduct,
  currentCollection,
}: StudioGateProps & { canEdit: boolean }) {
  if (!canEdit) {
    return <>{children}</>;
  }

  return (
    <StudioProvider
      products={products}
      collections={collections}
      currentProduct={currentProduct}
      currentCollection={currentCollection}
    >
      {children}
    </StudioProvider>
  );
}
