-- ============================================================
-- OMNIMARKET — Database Setup Script
-- Run: psql -U postgres -f setup.sql
-- ============================================================

-- Create database
DROP DATABASE IF EXISTS omnimarket;
CREATE DATABASE omnimarket
    WITH ENCODING 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE template0;

-- Connect to it
\c omnimarket;

-- Run the full schema
\i schema.sql

-- Seed initial data
\i seed.sql

-- Verify setup
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) || ' tables created' AS tables_count FROM information_schema.tables WHERE table_schema = 'public';
