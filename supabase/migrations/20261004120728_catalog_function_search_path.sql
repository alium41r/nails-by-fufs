-- B1.3g — Catalogue follow-up: resolve Supabase Advisor lint 0011
-- (function_search_path_mutable) for public.set_updated_at().
--
-- Why this exists: 20261004114808_catalog_triggers.sql created the helper
-- without a pinned search_path, so the Advisor reports a mutable search_path.
-- A trigger function with a caller-controlled search_path can be hijacked —
-- e.g. a hostile schema earlier in the path shadowing pg_catalog functions
-- referenced by the body. Pinning the path removes that class of attack.
--
-- What this migration does NOT change:
--   * the function body, language (plpgsql) and return type;
--   * its SECURITY INVOKER characteristic;
--   * either existing trigger (set_collections_updated_at on public.collections,
--     set_products_updated_at on public.products).
-- Only the search_path of the already-deployed function is altered, so runtime
-- behaviour is unchanged.
--
-- Why an empty search_path is safe here: the body calls only now(), which
-- resolves from pg_catalog. pg_catalog is always searched implicitly — when it
-- is not named explicitly it is searched first — so an empty search_path cannot
-- break that lookup. Any object reference added to this function in future must
-- therefore be schema-qualified.
--
-- Idempotent: ALTER FUNCTION ... SET search_path is safe to re-run.

alter function public.set_updated_at()
  set search_path = '';
