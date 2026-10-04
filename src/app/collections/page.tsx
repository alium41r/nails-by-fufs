import React from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { StudioCardFrame } from "@/components/studio/StudioCardFrame";
import { StudioCollectionText } from "@/components/studio/StudioText";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { productsInCollection } from "@/lib/catalogue";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles } from "lucide-react";

// Reflect the live catalogue instead of a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const { collections, products } = await getStorefrontCatalogue();

  const featuredCollection =
    collections.find((c) => c.featured && c.slug === "core-edit") || collections[0];

  if (!featuredCollection) {
    return (
      <Shell>
        <div className="py-16 sm:py-24 text-center text-sm text-muted-foreground">
          No collections are published yet.
        </div>
      </Shell>
    );
  }

  const secondaryCollections = collections.filter((c) => c.slug !== featuredCollection.slug);

  return (
    <StudioBoundary collections={collections} products={products}>
      <Shell>
        <div className="py-12 sm:py-16 lg:py-20 bg-background">
          <Container size="wide">
            <div className="flex flex-col gap-12 sm:gap-16 lg:gap-24">
              {/* Page Header */}
              <div className="flex flex-col gap-3 max-w-xl">
                <span className="eyebrow text-accent tracking-[0.2em]">Curated Series</span>
                <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                  Collections
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md">
                  Seasonal edits and focused design series created by independent nail artist Fufs.
                </p>
              </div>

              {/* Featured Hero Collection (Lookbook Banner Treatment) */}
              <StudioCardFrame
                entityType="collection"
                id={featuredCollection.slug}
                name={featuredCollection.title}
                isMissingImage={!featuredCollection.coverImageUrl}
                featured={featuredCollection.featured}
              >
                <div className="relative border-y border-border py-8 sm:py-12 bg-surface-subtle/20 w-full">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div className="flex flex-col gap-2 max-w-xl">
                        <StudioCollectionText
                          collection={featuredCollection}
                          field="tag"
                          fallback="Featured Series"
                          as="span"
                          className="eyebrow text-accent"
                        />
                        <StudioCollectionText
                          collection={featuredCollection}
                          field="title"
                          as="h2"
                          className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight"
                        />
                        <StudioCollectionText
                          collection={featuredCollection}
                          field="subtitle"
                          as="p"
                          className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-mono"
                        />
                      </div>
                      <StudioCollectionText
                        collection={featuredCollection}
                        field="description"
                        as="p"
                        className="text-sm text-muted-foreground max-w-md leading-relaxed font-sans"
                      />
                    </div>

                    {/* Large Lookbook Visual */}
                    <Link
                      href={`/collections/${featuredCollection.slug}`}
                      className="group block relative w-full overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <ImagePlaceholder
                        ratio="wide"
                        src={featuredCollection.coverImageUrl}
                        label={featuredCollection.imagePlaceholder.label}
                        sublabel={featuredCollection.imagePlaceholder.sublabel}
                        interactive
                        className="w-full max-h-[520px] shadow-xs"
                      />

                      <div className="flex items-center justify-between pt-4 px-1">
                        <span className="text-xs uppercase tracking-[0.18em] font-medium text-foreground group-hover:text-accent transition-colors">
                          Explore {featuredCollection.title}
                        </span>
                        <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {productsInCollection(products, featuredCollection.slug).length} Sets
                          </span>
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </StudioCardFrame>

              {/* Secondary Collections: Asymmetrical 2-Column Lookbook Rhythm */}
              <div className="flex flex-col gap-8">
                <div className="border-b border-border pb-3">
                  <span className="eyebrow text-accent">Seasonal & Studio Releases</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  {secondaryCollections.map((col, idx) => {
                    const colSpan = idx % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5";
                    const imageRatio = idx % 2 === 0 ? "classic" : "portrait";
                    const productCount = productsInCollection(products, col.slug).length;

                    return (
                      <div key={col.slug} className={colSpan}>
                        <StudioCardFrame
                          entityType="collection"
                          id={col.slug}
                          name={col.title}
                          isMissingImage={!col.coverImageUrl}
                          featured={col.featured}
                        >
                          <Link
                            href={`/collections/${col.slug}`}
                            className="group flex flex-col gap-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent w-full"
                          >
                            <div className="relative w-full overflow-hidden bg-surface-subtle">
                              <ImagePlaceholder
                                ratio={imageRatio}
                                src={col.coverImageUrl}
                                label={col.imagePlaceholder.label}
                                sublabel={col.imagePlaceholder.sublabel}
                                interactive
                                className="w-full shadow-xs"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="eyebrow text-accent">{col.tag || "Studio Series"}</span>
                                <span className="text-[11px] font-mono text-muted-foreground">{productCount} Sets</span>
                              </div>

                              <StudioCollectionText
                                collection={col}
                                field="title"
                                as="h3"
                                className="font-display text-2xl sm:text-3xl text-foreground font-light tracking-wide group-hover:text-accent transition-colors"
                              />

                              <StudioCollectionText
                                collection={col}
                                field="description"
                                as="p"
                                className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans line-clamp-2"
                              />

                              <div className="inline-flex items-center gap-1.5 text-accent text-xs pt-1">
                                <span className="uppercase tracking-[0.14em]">View Collection</span>
                                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                              </div>
                            </div>
                          </Link>
                        </StudioCardFrame>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bespoke Custom Orders Prompt */}
              <div className="p-8 sm:p-12 border border-border bg-surface-subtle/30 text-center flex flex-col items-center gap-5 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="eyebrow text-accent">Bespoke Inquiries</span>
                </div>
                <h3 className="font-display font-light text-2xl sm:text-4xl text-foreground">
                  Commission a Unique Design
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Looking for a personalized colorway, matching bridal set, or one-of-a-kind art? Work directly with Fufs to bring your concept to life.
                </p>
                <div className="pt-2">
                  <Button href="/custom" variant="primary" size="md">
                    Request Custom Orders
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </Shell>
    </StudioBoundary>
  );
}
