-- ============================================================
-- OMNIMARKET & DELIVERY PLATFORM — PostgreSQL Schema
-- Multi-Vendor Marketplace + Dispatch Delivery Ecosystem
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, slug, description) VALUES
    ('Customer', 'customer', 'End-user who shops from vendors'),
    ('Vendor', 'vendor', 'Store owner who sells products'),
    ('Dispatch Rider', 'rider', 'Delivery personnel who fulfills orders'),
    ('Store Manager', 'store-manager', 'Manages a vendor store'),
    ('Vendor Staff', 'vendor-staff', 'Staff member of a vendor store'),
    ('Administrator', 'administrator', 'Platform administrator'),
    ('Super Administrator', 'super-administrator', 'Full platform control');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    phone_country_code VARCHAR(5) DEFAULT '+1',
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url TEXT,
    cover_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- mobile, tablet, desktop
    platform VARCHAR(50), -- ios, android, web
    browser VARCHAR(100),
    ip_address INET,
    last_login_at TIMESTAMPTZ,
    is_trusted BOOLEAN DEFAULT FALSE,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES user_devices(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- login, registration, password_reset, email_verification, phone_verification
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ADDRESSES
-- ============================================================

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(2) UNIQUE NOT NULL,
    phone_code VARCHAR(5),
    currency_code VARCHAR(3),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50), -- home, work, other
    recipient_name VARCHAR(200),
    recipient_phone VARCHAR(50),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city_id UUID REFERENCES cities(id),
    state_id UUID REFERENCES states(id),
    country_id UUID REFERENCES countries(id),
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_default BOOLEAN DEFAULT FALSE,
    delivery_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. VENDORS & STORES
-- ============================================================

CREATE TABLE vendor_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image_url TEXT,
    parent_id UUID REFERENCES vendor_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES vendor_categories(id),
    business_name VARCHAR(200) NOT NULL,
    business_slug VARCHAR(200) UNIQUE NOT NULL,
    business_email VARCHAR(255),
    business_phone VARCHAR(50),
    business_address TEXT,
    business_registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    logo_url TEXT,
    banner_url TEXT,
    description TEXT,
    about TEXT,
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended, rejected
    verification_status VARCHAR(50) DEFAULT 'unverified', -- unverified, pending, verified, rejected
    verification_documents JSONB DEFAULT '[]',
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    is_open BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_top_rated BOOLEAN DEFAULT FALSE,
    minimum_order_amount DECIMAL(12,2) DEFAULT 0.00,
    delivery_fee DECIMAL(12,2) DEFAULT 0.00,
    free_delivery_threshold DECIMAL(12,2),
    average_delivery_time INTEGER, -- minutes
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_sales INTEGER DEFAULT 0,
    total_products INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    timezone VARCHAR(50) DEFAULT 'GMT',
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'staff', -- manager, staff, accountant
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    bank_name VARCHAR(200) NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    routing_number VARCHAR(50),
    swift_code VARCHAR(20),
    iban VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    break_start TIME,
    break_end TIME
);

-- ============================================================
-- 4. PRODUCTS & CATEGORIES
-- ============================================================

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE, -- NULL for platform-wide categories
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image_url TEXT,
    parent_id UUID REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    price DECIMAL(12,2) NOT NULL,
    compare_at_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    allow_backorder BOOLEAN DEFAULT FALSE,
    weight DECIMAL(10,2), -- kg
    length DECIMAL(10,2), -- cm
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    unit VARCHAR(50), -- piece, kg, liter, etc.
    is_virtual BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    is_flash_sale BOOLEAN DEFAULT FALSE,
    flash_sale_price DECIMAL(12,2),
    flash_sale_starts TIMESTAMPTZ,
    flash_sale_ends TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, archived
    visibility VARCHAR(50) DEFAULT 'visible', -- visible, hidden, searchable
    meta_title VARCHAR(255),
    meta_description TEXT,
    tags TEXT[],
    total_sales INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Size, Color, etc.
    values JSONB NOT NULL, -- [{value: "Small", price_modifier: 0, stock: 10}, ...]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE product_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_tag_mappings (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES product_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- ============================================================
-- 5. INVENTORY
-- ============================================================

CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason VARCHAR(100), -- sale, purchase, adjustment, return, damage
    reference_type VARCHAR(50), -- order, purchase_order, manual
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city_id UUID REFERENCES cities(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. DISPATCH RIDERS
-- ============================================================

CREATE TABLE rider_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- bike, scooter, car, van, truck
    name VARCHAR(100),
    icon VARCHAR(50),
    max_weight DECIMAL(10,2), -- kg
    max_distance DECIMAL(10,2), -- km
    base_fee DECIMAL(12,2),
    fee_per_km DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO rider_vehicles (type, name, icon, max_weight, base_fee, fee_per_km) VALUES
    ('bike', 'E-Bike', 'bike', 15, 2.00, 0.50),
    ('scooter', 'Vespa', 'bike', 30, 3.00, 0.75),
    ('car', 'Sedan', 'car', 100, 5.00, 1.00),
    ('van', 'Cargo Van', 'truck', 500, 8.00, 1.50);

CREATE TABLE dispatch_riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    vehicle_id UUID REFERENCES rider_vehicles(id),
    vehicle_number VARCHAR(50),
    driver_license_number VARCHAR(100),
    driver_license_expiry DATE,
    national_id VARCHAR(100),
    national_id_expiry DATE,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(50),
    is_online BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verification_documents JSONB DEFAULT '[]',
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_location_update TIMESTAMPTZ,
    available_radius DECIMAL(10,2) DEFAULT 10, -- km
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(15,2) DEFAULT 0.00,
    acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
    completion_rate DECIMAL(5,2) DEFAULT 100.00,
    total_distance_covered DECIMAL(10,2) DEFAULT 0.00, -- km
    average_delivery_time INTEGER, -- minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rider_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES dispatch_riders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- driver_license, national_id, insurance, vehicle_registration
    document_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    expires_at DATE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rider_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES dispatch_riders(id) ON DELETE CASCADE,
    order_id UUID,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- delivery_fee, tip, bonus, adjustment
    status VARCHAR(50) DEFAULT 'pending', -- pending, available, withdrawn
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rider_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES dispatch_riders(id) ON DELETE CASCADE,
    order_id UUID,
    user_id UUID REFERENCES users(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ORDERS
-- ============================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    vendor_id UUID REFERENCES vendors(id),
    rider_id UUID REFERENCES dispatch_riders(id),
    status VARCHAR(50) DEFAULT 'pending',
    -- Statuses: pending, confirmed, preparing, ready_for_pickup, picked_up,
    -- in_transit, delivered, cancelled, refunded, returned, failed
    payment_status VARCHAR(50) DEFAULT 'pending',
    -- pending, paid, failed, refunded, partially_refunded
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
    -- unfulfilled, partially_fulfilled, fulfilled

    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    coupon_id UUID,
    coupon_discount DECIMAL(12,2) DEFAULT 0.00,
    delivery_fee DECIMAL(12,2) DEFAULT 0.00,
    rider_tip DECIMAL(12,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    platform_fee DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    vendor_payout DECIMAL(12,2),
    platform_commission DECIMAL(12,2),

    currency VARCHAR(3) DEFAULT 'GHS',
    notes TEXT,
    admin_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,

    -- Delivery info
    delivery_address_id UUID REFERENCES addresses(id),
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    delivery_instructions TEXT,
    scheduled_delivery_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    estimated_delivery_minutes INTEGER,
    actual_delivery_minutes INTEGER,
    delivery_distance DECIMAL(10,2), -- km
    route_progress DECIMAL(5,2) DEFAULT 0.00,

    -- Payment
    payment_method VARCHAR(50),
    payment_gateway VARCHAR(50),
    payment_gateway_transaction_id VARCHAR(255),
    paid_at TIMESTAMPTZ,

    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    prepared_at TIMESTAMPTZ,
    in_transit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_image TEXT,
    variant_label VARCHAR(255),
    unit_price DECIMAL(12,2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_by_role VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_delivery_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES dispatch_riders(id),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    speed DECIMAL(10,2), -- km/h
    heading DECIMAL(5,2), -- degrees
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PAYMENTS & WALLETS
-- ============================================================

CREATE TABLE payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    config JSONB DEFAULT '{}',
    supported_currencies TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_gateways (name, slug) VALUES
    ('Stripe', 'stripe'),
    ('PayPal', 'paypal'),
    ('Flutterwave', 'flutterwave'),
    ('PayStack', 'paystack'),
    ('Apple Pay', 'apple-pay'),
    ('Google Pay', 'google-pay');

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0.00,
    pending_balance DECIMAL(15,2) DEFAULT 0.00,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    is_frozen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- credit, debit, refund
    category VARCHAR(50) NOT NULL,
    -- Categories: order_payment, order_refund, vendor_payout, rider_earning,
    -- withdrawal, top_up, commission, bonus, referral, adjustment, fee
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(15,2) NOT NULL,
    fee DECIMAL(12,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2) NOT NULL,
    bank_account_id UUID REFERENCES vendor_bank_accounts(id),
    payment_method VARCHAR(50), -- bank_transfer, paypal, mobile_money
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    user_id UUID REFERENCES users(id),
    gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed, refunded
    type VARCHAR(50) NOT NULL, -- payment, refund, partial_refund
    gateway_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. COUPONS & DISCOUNTS
-- ============================================================

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- percentage, fixed_amount, free_delivery
    value DECIMAL(12,2) NOT NULL,
    max_discount DECIMAL(12,2),
    min_purchase_amount DECIMAL(12,2),
    usage_limit INTEGER,
    usage_limit_per_user INTEGER DEFAULT 1,
    total_used INTEGER DEFAULT 0,
    vendor_id UUID REFERENCES vendors(id), -- NULL = platform-wide
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE, -- FALSE = targeted only
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    discount_amount DECIMAL(12,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupon_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- customer, vendor, category, product
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. REVIEWS & RATINGS
-- ============================================================

CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    review TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES product_reviews(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_helpfulness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (review_id, user_id)
);

-- ============================================================
-- 11. NOTIFICATIONS & MESSAGES
-- ============================================================

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL, -- order_confirmed, delivery_assigned, etc.
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    channels VARCHAR(50)[] DEFAULT '{in_app}', -- in_app, email, sms, push
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    reference_type VARCHAR(50), -- order, vendor, message, system
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    channel VARCHAR(50) DEFAULT 'in_app',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    order_updates BOOLEAN DEFAULT TRUE,
    delivery_updates BOOLEAN DEFAULT TRUE,
    promotional BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- customer_vendor, customer_rider, vendor_admin, etc.
    participant_ids UUID[] NOT NULL,
    order_id UUID REFERENCES orders(id),
    subject VARCHAR(255),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. FAVORITES & WISHLIST
-- ============================================================

CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT 'My Wishlist',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (wishlist_id, product_id)
);

CREATE TABLE favorite_vendors (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, vendor_id)
);

-- ============================================================
-- 13. ADMIN & AUDIT
-- ============================================================

CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- approve_vendor, suspend_user, update_settings, etc.
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. PLATFORM CONFIGURATION
-- ============================================================

CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_name VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_name, key)
);

INSERT INTO platform_settings (group_name, key, value, description) VALUES
    ('general', 'platform_name', '"OmniMarket Ghana"', 'Platform display name'),
    ('general', 'platform_currency', '"GHS"', 'Default currency'),
    ('general', 'platform_timezone', '"GMT"', 'Default timezone'),
    ('commission', 'default_commission_rate', '10', 'Default vendor commission percentage'),
    ('commission', 'commission_model', '"percentage"', 'Commission calculation model'),
    ('delivery', 'base_delivery_fee', '10.00', 'Base delivery fee'),
    ('delivery', 'free_delivery_threshold', '100.00', 'Free delivery order minimum'),
    ('delivery', 'delivery_fee_per_km', '2.00', 'Per-kilometer delivery charge'),
    ('security', 'max_login_attempts', '5', 'Max failed login attempts'),
    ('security', 'otp_expiry_minutes', '10', 'OTP code expiry time'),
    ('security', 'session_timeout_minutes', '1440', 'Session timeout (24 hours)'),
    ('security', 'require_email_verification', 'true', 'Require email verification on registration'),
    ('features', 'enable_vendor_registration', 'true', 'Allow new vendor registrations'),
    ('features', 'enable_rider_registration', 'true', 'Allow new rider registrations'),
    ('features', 'enable_multi_currency', 'false', 'Enable multi-currency support'),
    ('features', 'enable_flash_sales', 'true', 'Enable flash sale functionality'),
    ('features', 'enable_loyalty_points', 'true', 'Enable loyalty points system'),
    ('loyalty', 'points_per_dollar', '10', 'Loyalty points earned per dollar spent'),
    ('loyalty', 'dollar_per_point', '0.01', 'Dollar value per loyalty point'),
    ('tax', 'default_tax_rate', '0', 'Default tax rate percentage'),
    ('tax', 'tax_model', '"exclusive"', 'Tax calculation model');

-- ============================================================
-- 15. LOYALTY POINTS
-- ============================================================

CREATE TABLE loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance INTEGER DEFAULT 0,
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- earned, redeemed, expired, adjusted
    points INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. REPORTS & ANALYTICS
-- ============================================================

CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- sales, revenue, orders, users, vendors, riders, products
    config JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. ADDITIONAL TABLES FOR COMPLETENESS
-- ============================================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50), -- order_issue, payment, account, technical, other
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE support_ticket_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE site_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO email_templates (name, slug, subject, body, variables) VALUES
    ('Welcome Email', 'welcome', 'Welcome to {{platform_name}}!', '<h1>Welcome {{user_name}}!</h1><p>Thank you for joining {{platform_name}}.</p>', '{user_name,platform_name}'),
    ('Order Confirmation', 'order-confirmed', 'Order #{{order_number}} Confirmed', '<h1>Order Confirmed!</h1><p>Your order #{{order_number}} has been placed.</p>', '{order_number,customer_name,total_amount}'),
    ('Delivery Assigned', 'delivery-assigned', 'Delivery Assigned - Order #{{order_number}}', '<p>Rider {{rider_name}} has been assigned to your order.</p>', '{order_number,rider_name}'),
    ('Password Reset', 'password-reset', 'Reset Your Password', '<p>Use this code to reset your password: <strong>{{otp_code}}</strong></p>', '{otp_code}');

CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. FEATURE FLAGS
-- ============================================================

CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (name, key, description, is_enabled) VALUES
    ('Multi-Currency', 'multi_currency', 'Enable multi-currency support across the platform', false),
    ('Flash Sales', 'flash_sales', 'Enable flash sale promotions for vendors', true),
    ('Loyalty Program', 'loyalty_program', 'Enable customer loyalty points system', true),
    ('Vendor Subscription', 'vendor_subscription', 'Enable vendor subscription plans', false),
    ('AI Recommendations', 'ai_recommendations', 'Enable AI-powered product recommendations', true),
    ('Route Optimization', 'route_optimization', 'Enable AI route optimization for riders', true),
    ('Real-time Tracking', 'real_time_tracking', 'Enable real-time delivery tracking', true),
    ('Multi-language', 'multi_language', 'Enable multi-language support', false),
    ('Dark Mode', 'dark_mode', 'Enable dark mode UI', true),
    ('In-app Chat', 'in_app_chat', 'Enable in-app messaging between users', true);

-- ============================================================
-- 19. COMMISSION STRUCTURE
-- ============================================================

CREATE TABLE commission_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id),
    category_id UUID REFERENCES vendor_categories(id),
    rate DECIMAL(5,2) NOT NULL,
    type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed
    fixed_amount DECIMAL(12,2),
    is_default BOOLEAN DEFAULT FALSE,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 20. SUBSCRIPTION PLANS
-- ============================================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly', -- weekly, monthly, yearly
    features JSONB DEFAULT '[]',
    max_products INTEGER,
    max_orders INTEGER,
    commission_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired, trial
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(is_active, is_suspended);

CREATE INDEX idx_vendors_owner ON vendors(owner_id);
CREATE INDEX idx_vendors_category ON vendors(category_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_slug ON vendors(business_slug);
CREATE INDEX idx_vendors_location ON vendors USING GIN (tags);
CREATE INDEX idx_vendors_featured ON vendors(is_featured, is_top_rated);

CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_flash_sale ON products(is_flash_sale) WHERE is_flash_sale = true;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_products_tags ON products USING GIN (tags);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_rider ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participant_ids);

CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_rider_earnings_rider ON rider_earnings(rider_id, created_at DESC);

CREATE INDEX idx_dispatch_riders_online ON dispatch_riders(is_online, is_active) WHERE is_online = true;
CREATE INDEX idx_dispatch_riders_location ON dispatch_riders(current_latitude, current_longitude);

CREATE INDEX idx_product_reviews_product ON product_reviews(product_id, created_at DESC);
CREATE INDEX idx_vendor_reviews_vendor ON vendor_reviews(vendor_id, created_at DESC);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW vendor_dashboard AS
SELECT
    v.id AS vendor_id,
    v.business_name,
    v.business_slug,
    v.status,
    v.verification_status,
    v.is_open,
    v.rating,
    v.total_sales,
    v.total_orders,
    v.total_revenue,
    v.total_products,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') AS pending_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('confirmed', 'preparing')) AS active_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered' AND o.created_at >= NOW() - INTERVAL '30 days') AS monthly_orders,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'delivered' AND o.created_at >= NOW() - INTERVAL '30 days'), 0) AS monthly_revenue,
    COUNT(DISTINCT dr.id) AS assigned_riders
FROM vendors v
LEFT JOIN orders o ON o.vendor_id = v.id
LEFT JOIN dispatch_riders dr ON dr.id IN (
    SELECT DISTINCT rider_id FROM orders WHERE vendor_id = v.id AND rider_id IS NOT NULL
)
GROUP BY v.id;

CREATE VIEW customer_dashboard AS
SELECT
    u.id AS user_id,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('confirmed', 'preparing', 'in_transit')) AS active_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') AS completed_orders,
    COUNT(DISTINCT w.id) AS wishlist_items,
    COUNT(DISTINCT fv.vendor_id) AS favorite_vendors,
    COALESCE(wt.balance, 0) AS wallet_balance,
    COALESCE(lp.balance, 0) AS loyalty_points,
    COUNT(DISTINCT n.id) FILTER (WHERE n.is_read = false) AS unread_notifications
FROM users u
LEFT JOIN orders o ON o.customer_id = u.id
LEFT JOIN wishlist_items w ON w.wishlist_id IN (SELECT id FROM wishlists WHERE user_id = u.id)
LEFT JOIN favorite_vendors fv ON fv.user_id = u.id
LEFT JOIN wallets wt ON wt.user_id = u.id
LEFT JOIN loyalty_points lp ON lp.user_id = u.id
LEFT JOIN notifications n ON n.user_id = u.id AND n.is_read = false
WHERE u.role_id = (SELECT id FROM roles WHERE slug = 'customer')
GROUP BY u.id, wt.balance, lp.balance;

CREATE VIEW rider_dashboard AS
SELECT
    dr.id AS rider_id,
    u.first_name,
    u.last_name,
    dr.is_online,
    dr.rating,
    dr.total_deliveries,
    dr.total_earnings,
    dr.acceptance_rate,
    dr.completion_rate,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending' AND o.rider_id IS NULL) AS available_jobs,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'in_transit' AND o.rider_id = dr.id) AS active_deliveries,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered' AND o.rider_id = dr.id AND o.delivered_at >= NOW() - INTERVAL '7 days') AS weekly_deliveries,
    COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered' AND o.rider_id = dr.id AND o.delivered_at >= NOW() - INTERVAL '7 days'), 0) AS weekly_earnings,
    COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered' AND o.rider_id = dr.id AND o.delivered_at::date = CURRENT_DATE), 0) AS today_earnings
FROM dispatch_riders dr
JOIN users u ON u.id = dr.user_id
LEFT JOIN orders o ON o.rider_id = dr.id OR (o.status = 'pending' AND o.rider_id IS NULL)
GROUP BY dr.id, u.first_name, u.last_name;

CREATE VIEW admin_dashboard AS
SELECT
    (SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE slug = 'customer')) AS total_customers,
    (SELECT COUNT(*) FROM vendors) AS total_vendors,
    (SELECT COUNT(*) FROM vendors WHERE status = 'active') AS active_vendors,
    (SELECT COUNT(*) FROM vendors WHERE status = 'pending') AS pending_vendors,
    (SELECT COUNT(*) FROM dispatch_riders) AS total_riders,
    (SELECT COUNT(*) FROM dispatch_riders WHERE is_verified = true) AS verified_riders,
    (SELECT COUNT(*) FROM products WHERE status = 'active') AS active_products,
    (SELECT COUNT(*) FROM orders) AS total_orders,
    (SELECT COUNT(*) FROM orders WHERE status IN ('confirmed', 'preparing', 'in_transit')) AS active_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS completed_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered') AS total_revenue,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered' AND created_at >= NOW() - INTERVAL '30 days') AS monthly_revenue,
    (SELECT COALESCE(AVG(rating), 0) FROM vendors WHERE status = 'active') AS avg_vendor_rating,
    (SELECT COALESCE(AVG(rating), 0) FROM dispatch_riders) AS avg_rider_rating,
    (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') AS pending_withdrawals,
    (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') AS open_support_tickets;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_vendor_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'delivered' THEN
        UPDATE vendors SET
            total_orders = total_orders + 1,
            total_revenue = total_revenue + NEW.vendor_payout,
            updated_at = NOW()
        WHERE id = NEW.vendor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_stats
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_stats();

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products SET
        average_rating = (SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = NEW.product_id),
        total_reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id),
        updated_at = NOW()
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_rating
    AFTER INSERT OR UPDATE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('confirmed', 'preparing') AND OLD.status = 'pending' THEN
        UPDATE products SET
            stock_quantity = stock_quantity - oi.quantity,
            total_sales = total_sales + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND oi.product_id = products.id;

        INSERT INTO inventory_logs (product_id, quantity_change, quantity_before, quantity_after, reason, reference_type, reference_id)
        SELECT
            oi.product_id,
            -oi.quantity,
            p.stock_quantity + oi.quantity,
            p.stock_quantity,
            'sale',
            'order',
            NEW.id
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_order
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    WHEN (NEW.status IN ('confirmed', 'preparing') AND OLD.status = 'pending')
    EXECUTE FUNCTION update_inventory_on_order();

-- ============================================================
-- FINAL COMMENTS
-- ============================================================

COMMENT ON DATABASE omnimarket IS 'OmniMarket Multi-Vendor Marketplace & Delivery Platform Database';
COMMENT ON TABLE users IS 'All platform users — customers, vendors, riders, admins, staff';
COMMENT ON TABLE vendors IS 'Vendor/store profiles with business details and metrics';
COMMENT ON TABLE products IS 'Product catalog with pricing, inventory, and sales data';
COMMENT ON TABLE orders IS 'All orders with full status tracking and delivery info';
COMMENT ON TABLE dispatch_riders IS 'Rider profiles with delivery metrics and live location';
COMMENT ON TABLE wallets IS 'Digital wallets for all user types';
COMMENT ON TABLE platform_settings IS 'Global platform configuration key-value store';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance and debugging';
COMMENT ON VIEW vendor_dashboard IS 'Aggregated vendor performance metrics';
COMMENT ON VIEW admin_dashboard IS 'Platform-wide operational KPIs';
