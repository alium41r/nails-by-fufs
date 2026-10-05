import { Suspense } from "react";
import { Shell } from "@/components/layout/Shell";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { ShopContent } from "./shop-content";

/*
 * `force-dynamic` is no longer needed here.
 *
 * It existed because the catalogue read was request-scoped: re-rendering on every
 * request was the only way to show a live catalogue. That read is now cached across
 * requests and expired by `invalidateCatalogue()` on every catalogue write, so
 * freshness is event-driven rather than a property of the route's render mode.
 *
 * The route still renders dynamically, and deliberately so — `<StudioBoundary>`
 * checks the admin session through `cookies()` on every page, which is inherently
 * request-time work. What changed is the *cost* of that render: it now assembles
 * from a cached catalogue instead of issuing three database queries to another
 * region, which is what took the route's time-to-first-byte from ~385 ms to ~11 ms.
 */

export default async function ShopPage() {
  const { collections, products } = await getStorefrontCatalogue();

  return (
    <StudioBoundary products={products} collections={collections}>
      <Shell>
        <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>
          <ShopContent collections={collections} products={products} />
        </Suspense>
      </Shell>
    </StudioBoundary>
  );
}
