"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import type { CatalogueCollection, CatalogueProduct } from "@/lib/catalogue";
import { initStudioClient, studioStore } from "@/lib/studio/store";
import { useStudio } from "@/lib/studio/hooks";
import { StudioManagementProvider } from "@/lib/studio/management";
import { StudioToolbar } from "./StudioToolbar";
import { StudioPanel } from "./StudioPanel";

export interface StudioContextValue {
  products: CatalogueProduct[];
  collections: CatalogueCollection[];
  currentProduct?: CatalogueProduct;
  currentCollection?: CatalogueCollection;
}

const StudioCatalogueContext = createContext<StudioContextValue>({
  products: [],
  collections: [],
});

export function useStudioCatalogue() {
  return useContext(StudioCatalogueContext);
}

interface StudioProviderProps {
  children: React.ReactNode;
  products?: CatalogueProduct[];
  collections?: CatalogueCollection[];
  currentProduct?: CatalogueProduct;
  currentCollection?: CatalogueCollection;
}

export function StudioProvider({
  children,
  products = [],
  collections = [],
  currentProduct,
  currentCollection,
}: StudioProviderProps) {
  const { isActive, isPreviewMode } = useStudio();

  // Initialize store and detect ?studio=1 entry parameter
  useEffect(() => {
    initStudioClient();

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const studioParam = url.searchParams.get("studio");
      if (studioParam === "1" || studioParam === "true") {
        studioStore.setActive(true);

        // Clean up URL parameter cleanly without router push
        url.searchParams.delete("studio");
        const newUrl = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  // Sync data attribute for layout shifts (pushes body down for top toolbar)
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isActive && !isPreviewMode) {
        document.documentElement.setAttribute("data-studio-active", "true");
      } else {
        document.documentElement.removeAttribute("data-studio-active");
      }
    }

    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-studio-active");
      }
    };
  }, [isActive, isPreviewMode]);

  const contextValue = useMemo(
    () => ({
      products,
      collections,
      currentProduct,
      currentCollection,
    }),
    [products, collections, currentProduct, currentCollection]
  );

  return (
    <StudioCatalogueContext.Provider value={contextValue}>
      {/*
        Mounts the admin-only management projection. It fetches on mount, so the
        request only ever happens for a signed-in admin inside Studio Mode, and
        it is what the editors read authoritative is_active / featured / order and
        concurrency values from.
      */}
      <StudioManagementProvider>
        <StudioToolbar />
        {children}
        <StudioPanel />
      </StudioManagementProvider>
    </StudioCatalogueContext.Provider>
  );
}
