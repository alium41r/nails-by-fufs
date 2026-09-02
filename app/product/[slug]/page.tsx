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
import { products, getProductBySlug, getRelatedProducts } from "@/data/products";
import { Sparkles, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

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
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product.slug, 4);

  return (
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
                    {product.tag && (
                      <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-surface-subtle text-foreground border border-border font-mono">
                        {product.tag}
                      </span>
                    )}
                  </div>

                  <h1 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight">
                    {product.name}
                  </h1>

                  <div className="flex items-baseline justify-between gap-4 pt-1">
                    <p className="text-xs sm:text-sm text-muted-foreground font-sans">
                      {product.descriptor}
                    </p>
                    <span className="font-mono text-lg text-foreground font-semibold">
                      {product.price}
                    </span>
                  </div>
                </div>

                {/* Concise Product Narrative */}
                <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                  {product.description}
                </p>

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
                      <ul className="text-muted-foreground list-disc list-inside space-y-0.5 pt-1">
                        {product.included.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
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
  );
}
