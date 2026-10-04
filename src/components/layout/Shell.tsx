import React from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";

interface ShellProps {
  children: React.ReactNode;
}

export async function Shell({ children }: ShellProps) {
  // The header search previews live catalogue sets on every route, so the
  // catalogue is loaded here and handed to the header. Callers that render the
  // catalogue themselves call getStorefrontCatalogue() too; it is request-cached
  // (react `cache`), so a page and the shell share a single read.
  const { products } = await getStorefrontCatalogue();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-150">
      <AnnouncementBar />
      <Header products={products} />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
