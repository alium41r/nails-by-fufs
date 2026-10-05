import { StorefrontRouteLoading } from "@/components/layout/StorefrontRouteLoading";

/**
 * Fallback for the storefront home route.
 *
 * The home page is a sibling of the other storefront segments, so it needs its
 * own boundary at the root of the app directory. Nested segments override this
 * with their own `loading.tsx`.
 */
export default function Loading() {
  return <StorefrontRouteLoading />;
}
