import { Suspense } from "react";
import { Shell } from "@/components/layout/Shell";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { ShopContent } from "./shop-content";

// Reflect the live catalogue instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const { collections, products } = await getStorefrontCatalogue();

  return (
    <Shell>
      <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>
        <ShopContent collections={collections} products={products} />
      </Suspense>
    </Shell>
  );
}
