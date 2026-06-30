-- ============================================================================
-- Prevent double-booking at the database layer.
--
-- An exclusion constraint guarantees that no two *active* bookings for the same
-- staff member can have overlapping time ranges — enforced atomically by
-- Postgres, so it is correct even under concurrent requests racing for the same
-- slot. tsrange defaults to '[)' (end-exclusive), so back-to-back bookings
-- (10:00-11:00 then 11:00-12:00) are allowed.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "staffId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));
