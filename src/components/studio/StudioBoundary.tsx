import React from "react";
import { getAdminUser } from "@/lib/admin/auth";
import { StudioGate } from "./StudioGate";
import type { CatalogueCollection, CatalogueProduct } from "@/lib/catalogue";

interface StudioBoundaryProps {
  children: React.ReactNode;
  products?: CatalogueProduct[];
  collections?: CatalogueCollection[];
  currentProduct?: CatalogueProduct;
  currentCollection?: CatalogueCollection;
}

/**
 * Server-side authorization gate for Studio Mode.
 *
 * This is the only place Studio Mode is switched on, and it does so from a
 * server component: `getAdminUser()` re-checks the Supabase session against the
 * `ADMIN_EMAILS` / admin-user allowlist on every request. A visitor who appends
 * `?studio=1` to a URL therefore gains nothing — that flag is read inside the
 * Studio client code, which is never downloaded for them.
 *
 * For regular visitors and customers the children are returned completely
 * untouched: no wrapper element, no client Studio chunk.
 *
 * For signed-in admins the admin-only surface is mounted lazily through
 * `StudioGate`, so the toolbar, drawer and editors arrive in their own chunk.
 */
export async function StudioBoundary({
  children,
  products,
  collections,
  currentProduct,
  currentCollection,
}: StudioBoundaryProps) {
  const user = await getAdminUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <StudioGate
      canEdit
      products={products}
      collections={collections}
      currentProduct={currentProduct}
      currentCollection={currentCollection}
    >
      {children}
    </StudioGate>
  );
}
