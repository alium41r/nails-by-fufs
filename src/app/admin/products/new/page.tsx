import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { AdminPageHeader } from "@/components/admin/ui/primitives";
import { CatalogueCreateProduct } from "@/components/admin/catalogue/CatalogueCreate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New product — Studio Control Center",
  robots: { index: false, follow: false },
};

/**
 * Creating a product, as its own page.
 *
 * The same form the catalogue toolbar reveals, given a real URL so it can be
 * linked from the overview, bookmarked, and reached by the `Add product` button
 * without first visiting the catalogue. A static segment beats the dynamic
 * `[id]` route, so `/admin/products/new` never reaches the product loader.
 *
 * It asks for almost nothing on purpose: a name and (optionally) a collection.
 * Everything else belongs on the product's own screen, where there is room to
 * explain it — and the row is created **unpublished**, so a half-filled draft can
 * never appear on the storefront.
 */
export default async function NewProductPage() {
  await requireAdmin("/admin/products/new");

  const collections = await getPrisma().collections.findMany({
    where: { archived_at: null },
    orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    select: { id: true, title: true },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <AdminPageHeader
        back={{ href: "/admin/catalogue", label: "Catalogue" }}
        title="Add a product"
        description="Give the set a name to start. You can fill in the rest — photos, price, description — on the next screen."
      />
      <CatalogueCreateProduct collections={collections} />
    </div>
  );
}
