import { notFound } from "next/navigation";

import { DesignSystemView } from "./design-system-view";

/**
 * Internal design-system reference.
 *
 * This page exists for development: it renders every token and primitive so a
 * change to the visual language can be reviewed in one place. It is not part of
 * the storefront, is linked from nowhere, and serves no purpose to a customer —
 * so it is not published. In a production build the route does not exist.
 *
 * Removing it from production is preferable to leaving it up and unlinked: an
 * unlinked page is still crawlable, still ships more surface than the shop needs,
 * and would silently become public the moment anything linked to it.
 *
 * `npm run dev` renders it as before.
 */
export const dynamic = "force-static";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignSystemView />;
}
