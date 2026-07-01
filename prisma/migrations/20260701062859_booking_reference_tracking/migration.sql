-- Human-friendly, trackable booking reference.
-- Add nullable first, backfill existing rows, then enforce NOT NULL + uniqueness
-- so the migration is safe on tables that already hold bookings.
ALTER TABLE "Booking" ADD COLUMN "reference" TEXT;

UPDATE "Booking"
SET "reference" = upper(substr(replace("id"::text, '-', ''), 1, 8))
WHERE "reference" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- ============================================================================
-- Public booking tracking.
--
-- A booking's `reference` is shared with the customer (their tracking number),
-- but `Booking` is RLS-locked, so an anonymous request cannot look it up to
-- discover the tenant. This SECURITY DEFINER function performs ONLY that narrow
-- resolution (mirroring resolve_store_by_slug); every subsequent query runs as
-- `app_user` under normal RLS. Input is upper-cased so lookups are case-insensitive.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_booking_by_reference(p_reference text)
RETURNS TABLE (booking_id uuid, tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, "tenantId" FROM "Booking" WHERE reference = upper(p_reference) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_booking_by_reference(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_booking_by_reference(text) TO app_user;
