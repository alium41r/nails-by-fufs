import { Suspense } from "react";
import { Shell } from "@/components/layout/Shell";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { SearchContent } from "./search-content";

// Reflect the live catalogue instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const { products, collections } = await getStorefrontCatalogue();

  return (
    <StudioBoundary products={products} collections={collections}>
      <Shell>
        <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>
          <SearchContent products={products} />
        </Suspense>
      </Shell>
    </StudioBoundary>
  );
}
