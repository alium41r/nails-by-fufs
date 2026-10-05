import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { DEFAULT_IDENTITY } from "@/lib/site-content-schema";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { CartProvider } from "@/providers/CartProvider";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Site-wide metadata fallback.
 *
 * Deliberately a plain `export const` rather than `generateMetadata()` reading the
 * owner's identity document, and that is a correctness decision rather than a
 * caching one: a layout that exports `generateMetadata` takes part in Next's
 * metadata *resolution*, while a static layout export does not. Converting this
 * to `generateMetadata` made every page inherit the site-wide title and
 * description, silently replacing each page's own `<title>` — a change no
 * customer asked for and one that would have hurt search results.
 *
 * So the site-wide values stay static here, and the values come from
 * `DEFAULT_IDENTITY` — the same object the `site.identity` document was seeded
 * from — which keeps the two from drifting. Per-page titles remain with their
 * page, and the homepage's own title stays content-driven in `src/app/page.tsx`,
 * where a page-level `generateMetadata` legitimately overrides this.
 */
export const metadata: Metadata = {
  title: DEFAULT_IDENTITY.metaTitle,
  description: DEFAULT_IDENTITY.metaDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${plusJakarta.variable} dark`}
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('nails-by-fufs-theme');if(s==='light'){document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}else{document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent-subtle">
        <ThemeProvider>
          <CartProvider>{children}</CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
