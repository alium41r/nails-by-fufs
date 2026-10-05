import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductCard } from "@/components/shop/ProductCard";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { StudioCollectionText } from "@/components/studio/StudioText";
import { CollectionCoverVisual } from "@/components/studio/CollectionCoverVisual";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { collectionBySlug, productsInCollection } from "@/lib/catalogue";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

interface CollectionDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CollectionDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { collections } = await getStorefrontCatalogue();
  const collection = collectionBySlug(collections, slug);

  if (!collection) {
    return {
      title: "Collection Not Found — Nails by Fufs",
    };
  }

  return {
    title: `${collection.title} — Nails by Fufs`,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const { slug } = await params;
  const { collections, products } = await getStorefrontCatalogue();
  const collection = collectionBySlug(collections, slug);

  if (!collection) {
    notFound();
  }

  const collectionProducts = productsInCollection(products, collection.slug);
  const otherCollections = collections.filter((c) => c.slug !== collection.slug);

  return (
    <StudioBoundary
      collections={collections}
      products={products}
      currentCollection={collection}
    >
      <Shell>
        <div className="py-10 sm:py-14 lg:py-18 bg-background">
          <Container size="wide">
            <div className="flex flex-col gap-10 sm:gap-14 lg:gap-20">
              {/* Breadcrumb & Navigation Header */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <Breadcrumbs
                    items={[
                      { label: "Home", href: "/" },
                      { label: "Collections", href: "/collections" },
                      { label: collection.title },
                    ]}
                  />

                  <Link
                    href="/collections"
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>All Collections</span>
                  </Link>
                </div>

                {/* Title & Introduction */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                  <div className="flex flex-col gap-2 max-w-xl">
                    <StudioCollectionText
                      collection={collection}
                      field="tag"
                      fallback="Collection"
                      as="span"
                      className="eyebrow text-accent"
                    />
                    <StudioCollectionText
                      collection={collection}
                      field="title"
                      as="h1"
                      className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance"
                    />
                    <StudioCollectionText
                      collection={collection}
                      field="subtitle"
                      as="p"
                      className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-mono"
                    />
                  </div>
                  <StudioCollectionText
                    collection={collection}
                    field="description"
                    as="p"
                    className="text-sm text-muted-foreground max-w-md leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* Editorial Lookbook Visual */}
              <CollectionCoverVisual collection={collection} />

              {/* Collection Product Grid */}
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="eyebrow text-accent">Selected Sets in {collection.title}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {collectionProducts.length} {collectionProducts.length === 1 ? "Set" : "Sets"}
                  </span>
                </div>

                {collectionProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                    {collectionProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    Sets for this series are currently in the studio archive.
                  </div>
                )}
              </div>

              {/* Other Collections Carousel / Navigation */}
              {otherCollections.length > 0 && (
                <div className="flex flex-col gap-6 pt-10 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-accent">Explore Other Edits</span>
                    <Link
                      href="/collections"
                      className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-foreground hover:text-accent transition-colors"
                    >
                      <span>View All Collections</span>
                      <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {otherCollections.map((other) => (
                      <Link
                        key={other.slug}
                        href={`/collections/${other.slug}`}
                        className="group p-6 border border-border bg-surface hover:border-foreground/40 transition-all flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        <div className="flex items-center justify-between">
                          <span className="eyebrow text-accent">{other.tag || "Series"}</span>
                          <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
                        </div>
                        <h3 className="font-display text-2xl text-foreground font-light group-hover:text-accent transition-colors">
                          {other.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed font-sans line-clamp-2">
                          {other.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Container>
        </div>
      </Shell>
    </StudioBoundary>
  );
}
