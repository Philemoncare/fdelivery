# OmniMarket Database

## PostgreSQL Schema for Multi-Vendor Marketplace & Delivery Platform

### Quick Setup

```bash
# Prerequisites: PostgreSQL 16+ installed and running

# Create database and load schema + seed data
psql -U postgres -f database/setup.sql

# Or step-by-step:
psql -U postgres -f database/schema.sql
psql -U postgres -d omnimarket -f database/seed.sql
```

### Database Name
`omnimarket`

### Schema Overview

| Schema Object | Count | Description |
|---|---|---|
| Tables | 50+ | Core platform entities |
| Views | 4 | Aggregated dashboards |
| Functions | 3 | Automated triggers |
| Indexes | 35+ | Performance optimizations |
| Seed Data | 20+ | Demo records |

### Key Tables

**Users & Auth**
- `users` (7 roles: customer, vendor, rider, store-manager, vendor-staff, administrator, super-administrator)
- `roles`, `user_devices`, `user_sessions`, `otp_verifications`

**Marketplace**
- `vendors` — stores with business details, commission rates, metrics
- `products` — full catalog with variants, pricing, inventory
- `product_categories` — hierarchical product taxonomy
- `vendor_categories` — vendor/store type taxonomy

**Orders & Delivery**
- `orders` — complete lifecycle with status tracking
- `order_items` — line items per order
- `order_delivery_tracking` — GPS breadcrumbs per delivery
- `dispatch_riders` — rider profiles with live location and performance metrics

**Payments**
- `wallets` — digital wallets per user
- `wallet_transactions` — complete transaction history
- `withdrawals` — payout requests
- `payment_transactions` — gateway transaction records

**Engagement**
- `coupons` — discount codes with targeting rules
- `product_reviews` — verified purchase reviews with images
- `wishlists`, `favorite_vendors` — customer preferences
- `notifications` — multi-channel notification system
- `conversations` / `messages` — in-app messaging

**Admin**
- `admin_actions` — admin activity log
- `audit_logs` — immutable audit trail
- `platform_settings` — global key-value configuration
- `feature_flags` — feature toggle management
- `support_tickets` — customer support system

### Views

- `vendor_dashboard` — aggregated sales, orders, revenue per vendor
- `customer_dashboard` — active orders, wallet, wishlist, points
- `rider_dashboard` — earnings, deliveries, ratings, available jobs
- `admin_dashboard` — platform-wide KPIs (users, vendors, orders, revenue)

### Key Indexes

- Full-text search on product names/descriptions
- Spatial indexes on rider locations
- Composite indexes on order status + date for performance
- GIN indexes on JSONB columns and arrays

### Demo Accounts (from seed data)

| Email | Password | Role |
|---|---|---|
| customer@demo.com | demo123456 | Customer |
| vendor@demo.com | demo123456 | Vendor |
| rider@demo.com | demo123456 | Dispatch Rider |
| admin@demo.com | demo123456 | Administrator |
| super@demo.com | demo123456 | Super Administrator |

### Migration Workflow

```bash
# Create new migration
cp database/migrate_template.sql database/migrate_$(date +%Y%m%d)_description.sql

# Edit the migration file with your changes
# Run it:
psql -U postgres -d omnimarket -f database/migrate_YYYYMMDD_description.sql
```
