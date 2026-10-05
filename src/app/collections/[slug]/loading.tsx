import { StorefrontRouteLoading } from "@/components/layout/StorefrontRouteLoading";

/**
 * Immediate paint target for this route.
 *
 * See `StorefrontRouteLoading` for why the fallback is minimal. This boundary is
 * also what allows `<Link>` prefetching to carry useful work for a dynamic
 * route: the router prefetches down to the nearest `loading.js`.
 */
export default function Loading() {
  return <StorefrontRouteLoading />;
}
