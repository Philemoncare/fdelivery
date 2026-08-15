# OmniMarket Ghana

OmniMarket is a multi-vendor food delivery marketplace for Takoradi, Ghana. It includes customer ordering, restaurant operations, dispatch-rider workflows, and administrative portals.

## Local development

Prerequisites: Node.js 20+.

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
2. Install dependencies with `npm install`.
3. Run `npm run dev` to start the API and web client together.

The web client runs on port `3000` and proxies `/api` calls to the Express API on port `3999`.

## Validation

Run `npm run lint` for the TypeScript check and `npm run build` for a production web build.

## Data and production readiness

The running API currently persists development data in `omnimarket-db.json`. PostgreSQL schema and seed scripts are available under `database/`, but production deployment needs a database-backed API adapter, managed payments, and environment-specific operational configuration before launch.
