-- ============================================================
-- OMNIMARKET — Migration Template
-- Usage: psql -U postgres -d omnimarket -f migrate_YYYYMMDD_description.sql
-- ============================================================

BEGIN;

-- Example migration:
-- ALTER TABLE orders ADD COLUMN scheduled_delivery_at TIMESTAMPTZ;
-- CREATE INDEX idx_orders_scheduled ON orders(scheduled_delivery_at) WHERE scheduled_delivery_at IS NOT NULL;
-- UPDATE platform_settings SET value = '"1.5"' WHERE group_name = 'delivery' AND key = 'delivery_fee_per_km';

COMMIT;
