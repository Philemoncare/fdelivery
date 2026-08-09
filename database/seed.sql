-- ============================================================
-- OMNIMARKET — Seed Data (Production-Ready)
-- Contains only essential platform configuration.
-- No demo users, vendors, or riders.
-- ============================================================

-- Countries
INSERT INTO countries (id, name, code, phone_code, currency_code) VALUES
    (uuid_generate_v4(), 'Ghana', 'GH', '+233', 'GHS'),
    (uuid_generate_v4(), 'Nigeria', 'NG', '+234', 'NGN'),
    (uuid_generate_v4(), 'United States', 'US', '+1', 'USD');

-- States / Regions (Ghana)
DO $$
DECLARE
    ghana_id UUID;
BEGIN
    SELECT id INTO ghana_id FROM countries WHERE code = 'GH';
    INSERT INTO states (id, country_id, name, code) VALUES
        (uuid_generate_v4(), ghana_id, 'Greater Accra', 'GA'),
        (uuid_generate_v4(), ghana_id, 'Ashanti', 'AS'),
        (uuid_generate_v4(), ghana_id, 'Western', 'WR');
END $$;

-- Cities (Ghana)
DO $$
DECLARE
    accra_id UUID;
    kumasi_id UUID;
    takoradi_id UUID;
BEGIN
    SELECT id INTO accra_id FROM states WHERE name = 'Greater Accra';
    SELECT id INTO kumasi_id FROM states WHERE name = 'Ashanti';
    SELECT id INTO takoradi_id FROM states WHERE name = 'Western';

    INSERT INTO cities (id, state_id, name, latitude, longitude) VALUES
        (uuid_generate_v4(), accra_id, 'Accra', 5.6037, -0.1870),
        (uuid_generate_v4(), kumasi_id, 'Kumasi', 6.6666, -1.6163),
        (uuid_generate_v4(), takoradi_id, 'Takoradi', 4.8917, -1.7583);
END $$;

-- Vendor Categories
INSERT INTO vendor_categories (id, name, slug, description, icon, sort_order) VALUES
    (uuid_generate_v4(), 'Local Dishes', 'local-dishes', 'Authentic Ghanaian meals', 'utensils', 1),
    (uuid_generate_v4(), 'Continental', 'continental', 'International cuisine', 'globe', 2),
    (uuid_generate_v4(), 'Fast Food', 'fast-food', 'Burgers, pizza, and quick bites', 'zap', 3),
    (uuid_generate_v4(), 'Groceries', 'groceries', 'Fresh market produce and essentials', 'shopping-cart', 4),
    (uuid_generate_v4(), 'Pharmacy', 'pharmacy', 'Medicines and health products', 'heart', 5);

-- Payment Gateways
UPDATE payment_gateways SET is_active = true WHERE slug IN ('paystack', 'flutterwave');

-- Seed complete
SELECT 'Essential platform seed data loaded successfully!' AS status;
