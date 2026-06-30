-- ============================================================================
-- Public store resolution.
--
-- A store's `slug` is public (it's the booking URL), but `Store` is RLS-locked,
-- so an anonymous request cannot look it up to discover which tenant it belongs
-- to — a chicken-and-egg problem (you need the tenant to set the RLS context,
-- but you need a tenant-owned row to find the tenant).
--
-- This SECURITY DEFINER function performs ONLY that narrow resolution, running
-- with the function owner's privileges (which bypass RLS). It exposes nothing
-- beyond the store id + tenant id required to bootstrap a tenant-scoped request;
-- every subsequent query runs as `app_user` under normal RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_store_by_slug(p_slug text)
RETURNS TABLE (store_id uuid, tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, "tenantId" FROM "Store" WHERE slug = p_slug LIMIT 1;
$$;

-- Only the application role may call it; nobody else.
REVOKE ALL ON FUNCTION public.resolve_store_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_store_by_slug(text) TO app_user;
