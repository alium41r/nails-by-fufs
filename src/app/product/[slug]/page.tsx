import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductOptions } from "@/components/shop/ProductOptions";
import { ProductCard } from "@/components/shop/ProductCard";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { StudioProductText, StudioTagBadge } from "@/components/studio/StudioText";
import { ProductStudioStrip } from "@/components/studio/ProductStudioStrip";
import { StudioIncludedList } from "@/components/studio/StudioIncludedList";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { productBySlug, relatedProducts as getRelatedProducts } from "@/lib/catalogue";
import { Sparkles, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";

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

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { products } = await getStorefrontCatalogue();
  const product = productBySlug(products, slug);

  if (!product) {
    return {
      title: "Product Not Found — Nails by Fufs",
    };
  }

  return {
    title: `${product.name} — Nails by Fufs`,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const { products } = await getStorefrontCatalogue();
  const product = productBySlug(products, slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(products, product.slug, 4);

  return (
    <StudioBoundary products={products} currentProduct={product}>
      <Shell>
        <div className="py-8 sm:py-12 lg:py-16 bg-background">
          <Container size="wide">
            <div className="flex flex-col gap-12 sm:gap-16 lg:gap-24">
              {/* Breadcrumbs Navigation */}
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "Shop", href: "/shop" },
                  { label: product.collectionName, href: `/collections/${product.collectionSlug}` },
                  { label: product.name },
                ]}
              />

              {/* Main Editorial Split: Gallery Left (Col-7), Details Right (Col-5) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-start">
                {/* Left Column: Image Gallery */}
                <div className="lg:col-span-7">
                  <ProductGallery
                    images={product.images}
                    productName={product.name}
                    productId={product.id}
                  />
                </div>

                {/* Right Column: Product Information & Purchase Controls (Sticky on Desktop) */}
                <div className="lg:col-span-5 lg:sticky lg:top-28 flex flex-col gap-6">
                  {/* Header Metadata */}
                  <div className="flex flex-col gap-2 border-b border-border pb-6">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/collections/${product.collectionSlug}`}
                        className="eyebrow text-accent hover:underline"
                      >
                        {product.collectionName}
                      </Link>
                      <StudioTagBadge product={product} />
                    </div>

                    <StudioProductText
                      product={product}
                      field="name"
                      as="h1"
                      className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight"
                    />

                    <div className="flex items-baseline justify-between gap-4 pt-1">
                      <StudioProductText
                        product={product}
                        field="descriptor"
                        as="p"
                        className="text-xs sm:text-sm text-muted-foreground font-sans"
                      />
                      <StudioProductText
                        product={product}
                        field="price"
                        as="span"
                        className="font-mono text-lg text-foreground font-semibold"
                      />
                    </div>
                  </div>

                  {/* Studio Mode Quick Inspector Strip */}
                  <ProductStudioStrip product={product} />

                  {/* Concise Product Narrative */}
                  <StudioProductText
                    product={product}
                    field="description"
                    as="p"
                    className="text-sm text-muted-foreground leading-relaxed font-sans"
                  />

                  {/* Interactive Sizing, Length & Add to Bag Options */}
                  <ProductOptions product={product} />

                  {/* Product Care & Studio Guarantees */}
                  <div className="border-t border-border pt-6 flex flex-col gap-4 text-xs">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground uppercase tracking-wider text-[11px]">
                          Handcrafted by Fufs
                        </span>
                        <span className="text-muted-foreground">
                          Each set is individually painted, shaped, and inspected in our studio.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground uppercase tracking-wider text-[11px]">
                          Reusable Wear
                        </span>
                        <span className="text-muted-foreground">
                          Wear for special events with adhesive tabs or multiple days with nail glue.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground uppercase tracking-wider text-[11px]">
                          What&apos;s in the box
                        </span>
                        <StudioIncludedList product={product} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Products Section ("You Might Also Like") */}
              <div className="flex flex-col gap-8 pt-12 sm:pt-16 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="eyebrow text-accent">Studio Recommendations</span>
                    <h2 className="font-display font-light text-2xl sm:text-3xl text-foreground">
                      You Might Also Like
                    </h2>
                  </div>

                  <Link
                    href="/shop"
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-foreground hover:text-accent transition-colors"
                  >
                    <span>Explore All Sets</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {relatedProducts.map((rel) => (
                    <ProductCard key={rel.id} product={rel} />
                  ))}
                </div>

                <div className="sm:hidden text-center pt-2">
                  <Link
                    href="/shop"
                    className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-accent transition-colors py-3 w-full border border-border bg-surface-subtle/50 min-h-[44px]"
                  >
                    <span>Explore All Sets</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </Shell>
    </StudioBoundary>
  );
}
