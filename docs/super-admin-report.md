# OmniMarket Super Admin — Platform Control Center

Final engineering report for the Super Admin console upgrade: real backend-audited sessions,
account controls, filterable audit, and backup/restore, delivered through a command-center
information architecture.

Verification status at time of writing:

- API E2E suite (isolated throwaway DB, port 4099): **127/127 checks pass** (49 core + 34 settings-control-center + 44 RBAC governance)
- `tsc --noEmit` (lint/typecheck): **clean**
- `vite build` (production bundle): **succeeds** (2,741 modules; pre-existing >500 kB chunk warning, non-blocking)
- All destructive flows were verified against an isolated database and port; the live dev server and `omnimarket-db.json` were not exercised by destructive tests.

---

## Table of Contents

1. Scope & Guardrails
2. Architecture Overview
3. Routing & Navigation Map (web)
4. Command Center / Overview
5. Identity — Users
6. Identity — Roles & Permissions
7. Identity — Security Center
8. Identity — Sessions
9. Marketplace Governance — Approvals
10. Marketplace Governance — Account Controls
11. Platform Operations — Orders / Deliveries
12. Platform Operations — Payments & Gateways
13. Platform Operations — Notifications / Messaging
14. System — API Management
15. System — Database
16. System — Backup & Restore
17. System — Platform Settings
18. Audit & Compliance — Audit Logs
19. Audit & Compliance — Security Events
20. Super Admin Profile
21. Backend Enforcement Model (RBAC)
22. Audit Integrity & Coverage
23. Desktop UX
24. Mobile UX
25. API Surface (Super Admin-relevant)
26. Frontend Services & State
27. Dependencies
28. Environment Variables
29. Tests & Verification
30. Known Limitations & Next Steps

---

## 1. Scope & Guardrails

The work followed these non-negotiable constraints:

- Operate inside the existing single Super Admin console; no second app, no duplicate dashboards, no UI-only fakes.
- Every visible action performs a real backend operation (authenticated → authorized → audited) or is removed.
- No fabricated activity logs, system health, account info, audit results, or API metrics.
- Existing auth/RBAC/API/database/audit infrastructure is preserved and reused.
- Ordinary administrators can never escalate to Super Admin; the backend enforces all protected routes (URL access alone must not work).
- Audit is immutable (no edit/delete) and never stores secrets/keys/tokens/passwords.
- Restore requires a serious, explicit confirmation flow; no one-click destructive actions.
- Desktop gets dense tables/filters/panels; mobile gets stacked cards, drawer nav, collapsible filters, scroll-safe tables.

## 2. Architecture Overview

```
React SPA (Vite)  →  Express API (server.ts)  →  persisted JSON DB (omnimarket-db.json)
      │                    │                            │
      │  Bearer JWT        │  sessionId inside JWT      │  db.sessions[] (real, persisted)
      └─ AdminService ─────┴─ getAuthUserId() ──────────┴─ audit[] (immutable, capped 5000)
```

Key building blocks in `server.ts`:

| Component | Location | Role |
|---|---|---|
| `createSession()` | `server.ts:149` | Persists a real session record (device fingerprint from IP+UA, cap 50/user). |
| `getAuthUserId()` | `server.ts:175` | Validates JWT + revocation timestamp + suspension + **real session** (revoked/expired die); touches `lastActivityAt`. |
| `requireAuth` / `requireAdmin` / `requireSuperAdmin` | `server.ts:215/224/235` | 401/403 gatekeepers; set `req.currentUserId` / `req.currentUser`. |
| `logAudit()` | `server.ts:273` | Immutable audit row with actor, action, entity, result, meta; caps audit at 5,000. |
| `persistDb()` | `server.ts:707` | Auto-persist after every response (`res.json`/`res.send` intercept). |
| `db.sessions[]` | data | Real session store — the source of truth behind every token. |

## 3. Routing & Navigation Map (web)

### Super Admin routes (`src/router.tsx:347`)

All wrapped in `AuthGuard portal="admin" module="super-admin" roles={['super-administrator']}` + `ModuleGuard`, so URL access alone cannot bypass role checks.

| Route | Page | Backend data |
|---|---|---|
| `/super-admin/dashboard` | Command Center | `GET /api/admin/stats`, `GET /api/system/health`, `GET /api/audit/summary` |
| `/super-admin/admins` | Administrators | `GET /api/users`, `POST /api/users`, `DELETE /api/users/:id` |
| `/super-admin/users` | User Accounts | `GET /api/users`, `POST /api/admin/users/:id/account` |
| `/super-admin/roles` | Roles | RBAC constants (`ROLE_PERMISSIONS`) |
| `/super-admin/permissions` | Permissions | RBAC constants |
| `/super-admin/security` | Security Center | `GET /api/audit/summary`, `GET /api/auth/sessions/:me` |
| `/super-admin/security-events` | Security Events | `GET /api/audit/summary`, `GET /api/audit?limit=200` |
| `/super-admin/sessions` | Sessions (platform registry) | `GET /api/admin/sessions`, `DELETE /api/auth/sessions/:userId` |
| `/super-admin/restaurant-approvals` | Restaurant Approvals | `PATCH /api/vendors/:id` (approve/reject/verify) |
| `/super-admin/rider-approvals` | Rider Approvals | `PATCH /api/riders/:id` (approve/reject/verify) |
| `/super-admin/payment-gateways` | Payments & Gateways | `GET /api/payment-gateways`, `PATCH /api/payment-gateways/:id` |
| `/super-admin/notifications` | Notifications | `POST /api/announcements` |
| `/super-admin/system` | System Health | `GET /api/system/health` |
| `/super-admin/api` | API Management | `GET /api/system/health` (documentation + live status) |
| `/super-admin/database` | Database | Real record counts from `useApp()` |
| `/super-admin/backup` | Backup & Restore | `GET /api/system/backups`, `POST /api/system/backup`, `POST /api/system/restore` |
| `/super-admin/audit` | Audit Log | `GET /api/audit` (paged + filtered) |
| `/super-admin/settings` | Platform Settings | `GET/PUT /api/platform/settings` |
| `/super-admin/login` | Console login | `POST /api/auth/login`, `POST /api/auth/verify-otp` |

### Navigation structure (`src/components/super-admin/SuperAdminLayout.tsx`)

Grouped `PortalSection[]`:

- **COMMAND CENTER** — Overview, Platform Settings
- **IDENTITY & ACCESS** — User Accounts, Administrators, Roles, Permissions
- **GOVERNANCE** — Account Controls, Restaurant Approvals (pending badge), Rider Approvals (pending badge)
- **OPERATIONS** — Payments & Gateways, Notifications
- **SYSTEM** — System Health, API Management, Database, Backup & Restore
- **SECURITY AUDIT** — Security Center, Security Events, Sessions, Audit Logs
- **ACCOUNT** — Announcements

Mobile drawer exposes Overview / Users / Approvals / Audit / Settings.

## 4. Command Center / Overview

`src/pages/super-admin/dashboard.tsx` — rebuilt as an operational control center:

- Gradient hero with operator identity, role, and live sync status.
- **Platform status strip** from real `/system/health`: Core API, Database (records + persisted), Auth, Realtime, Payments, Notifications.
- **KPI grid** from real `/admin/stats`: revenue, restaurants, riders, users, orders, active sessions, pending approvals, suspended accounts.
- **Recent Activity** fed by real audit summary (latest events), never fabricated.
- **Pending Approvals** and alerts surfaced from stats.
- **Quick Actions** link to real consoles (approvals, audit, backup, security).

## 5. Identity — Users

- `/super-admin/users` lists the full directory from `GET /api/users` (admin+). Rows show role, verification, status, suspension.
- Actions (all server-enforced, audited):
  - Force Reset / Temp Password via `POST /api/auth/admin/*` (now also revoke sessions + set `tokensRevokedAt`).
  - Suspend / Reactivate via account-controls endpoint.
  - Revoke Sessions via `DELETE /api/auth/sessions/:userId`.
  - Verify via account-controls endpoint.
- `/super-admin/admins` manages administrator accounts: create (super-admin only, `POST /api/users`), delete (self-delete blocked).
- Detail view and pagination reuse existing admin-table conventions.

## 6. Identity — Roles & Permissions

Rebuilt as a live, backend-enforced governance console (`src/pages/super-admin/rbac.tsx`). `/super-admin/roles` and `/super-admin/permissions` no longer render a static decoration — every value comes from the server (`GET /api/roles`, `GET /api/permissions`) and every mutation lands on the backend before the UI updates.

- **Role model normalized at the definition level** (`src/lib/auth/types.ts`): the previous duplicate "RESTAURANT" columns came from `vendor` / `vendor-staff` / `store-manager` all sharing one label word. `ROLE_LABELS` now gives one unambiguous display name per role — **Customer / Restaurant / Restaurant Staff / Restaurant Manager / Rider / Administrator / Super Admin** — so the matrix has exactly 7 distinct role columns with no frontend de-duplication.
- **Single source of truth**: `ROLE_PERMISSIONS` (defaults) + `db.rolePermissions` (persisted overrides) → `effectiveRolePermissions()` feeds the matrix, the detail views, *and* `requirePermission()` middleware. The UI can never display a grant the backend does not enforce.
- **Permission registry**: `MANAGEMENT_PERMISSIONS` (33 server-enforced permissions) with `PERMISSION_META` (label, description, domain, risk) and `PERMISSION_DOMAINS`. The matrix groups rows by domain (Identity / Marketplace / Operations / Finance / System / Security) with search + domain filters.
- **Desktop**: full matrix — rows are permissions, columns are the 7 roles, cells show text-plus-icon **Yes / No** (+ toggle). Super Admin's column is locked (protected role).
- **Mobile**: role-selector drill-down (one role at a time, no horizontal overflow) with inline Grant/Revoke.
- **Every change goes through selection → review → confirmation → backend update → audit → refresh**: `RbacConfirmDialog` shows current/new state, a consequence sentence derived from `PERMISSION_META`, a risk badge, and a re-authentication password field (never stored in frontend state).
- **Roles page**: hierarchy cards with live user counts and management-permission counts; detail dialog shows account type, permission list with risk badges; a role-assignment flow (search → choose new role → review → confirm + re-auth) with a session-revocation warning.
- Straightforward deletes to `PATCH /api/users/:id` handle "update profile" flows — the RBAC-specific assignments use the dedicated `POST /api/users/:id/role` (see §21).

## 7. Identity — Security Center

`/super-admin/security` (`SuperAdminSecurityPage`):

- Real audit summary (total events, last 24h, top actions).
- **My live sessions** from `GET /api/auth/sessions/:me` with `isCurrent` marking and per-session revocation.
- Operator identity card and platform security posture (suspended count, audit volume) — all real data.

## 8. Identity — Sessions

Real session model (the core auth change):

- `db.sessions[]` records: `id`, `userId`, `deviceId`, `deviceName`, `platform`, `ipAddress`, `issuedAt`, `lastActivityAt`, `expiresAt`, `revokedAt`. Device fingerprint = hash(IP + User-Agent).
- Login (`verify-otp`) creates a session; access + refresh JWTs carry `sessionId`; refresh validates and preserves the session; `/auth/me` validates session + suspension + revocation.
- Logout revokes the current session and is audited (`POST /api/auth/logout`).
- `DELETE /api/auth/sessions/:userId` (super-admin) revokes all sessions + sets `tokensRevokedAt`, returns `revokedSessions` count, audited.
- `DELETE /api/auth/sessions/:userId/:sessionId` (owner/admin) revokes one real session.
- **Platform registry** `GET /api/admin/sessions` (requireAdmin): every live/expired/revoked session with name/email/role/device/IP/timestamps/state. Never exposes tokens.
- `/super-admin/sessions` adds search, state badges (Active / Revoked / Expired), and per-user "Terminate" (real revocation). Mobile Flutter repository uses only the per-user per-session DELETE path — compatible.

## 9. Marketplace Governance — Approvals

- `/super-admin/restaurant-approvals` — approve/reject/verify **real** vendor records (`PATCH /api/vendors/:id`).
- `/super-admin/rider-approvals` — approve/reject/verify **real** rider records (`PATCH /api/riders/:id`).
- Pending badges on nav are computed from real data.
- **Audit gap fixed**: these PATCH routes now fall back to the resolved `currentUser` when `req.currentUser` is absent, so every approval action is always audited.

## 10. Marketplace Governance — Account Controls

New endpoint `POST /api/admin/users/:id/account` (`requireSuperAdmin`, `server.ts:4277`) with sub-actions:

| Action | Effect | Audited | Notify |
|---|---|---|---|
| `suspend` | `isSuspended=true`, deactivate, revoke all sessions + tokens | `Admin suspended user` | Yes |
| `reactivate` | restore account | `Admin reactivated user` | Yes |
| `force-reset` | `mustChangePassword=true`, revoke all sessions + tokens | `Admin forced password reset` | Yes |
| `revoke-sessions` | revoke all sessions + tokens | `Admin revoked all user sessions` | Yes |
| `verify` | `isVerified` + email verified | `Admin verified account` | Yes |

Safety rules enforced server-side:

- Self-actions → **400** (a Super Admin cannot lock out their own console via this route).
- Destructive actions (`suspend`, `force-reset`, `revoke-sessions`) against a **fellow Super Admin** → **403** (Protected account).

## 11. Platform Operations — Orders / Deliveries

- Handled by the admin console (`/admin/orders`, `/admin/deliveries`, live operations) and the delivery engine from the prior milestone (package/pass bookings, receiver confirmation, order-linked conversations, post-completion ratings).
- `/super-admin/dashboard` surfaces real order volume/active orders from `/admin/stats`.
- Super Admin does not duplicate order management; it monitors through Command Center stats and audit.

## 12. Platform Operations — Payments & Gateways

- `/super-admin/payment-gateways` toggles/enables **real** gateway records (`GET/PATCH /api/payment-gateways`); each change is audited (`Payment method enabled/disabled`), every change requires re-auth, and enabling an unconfigured gateway is rejected (400). The GET view forces `enabled:false, operational:false` for unconfigured methods so stale flags can never fake operational status.
- Payments health is reflected in Command Center via `/system/health.payments` (count of `enabled && configured` gateways) — no fabricated "payment processing" claims.

## 13. Platform Operations — Notifications / Messaging

- `/super-admin/notifications` broadcasts a **real** announcement (`POST /api/announcements`): creates the record, `notifyUser` for every account, sends email via `emailService`, audits with recipient count.
- `notifyUser()` now honors `platformSettings.notificationsEnabled`: when disabled, routine notifications are suppressed, but security-critical paths pass `critical=true` (account suspension, admin password reset, force-reset, revoke-sessions) and are **never** silenced.
- Message/conversation endpoints remain as-is; the admin console's messaging modules already exist.

## 14. System — API Management

`/super-admin/api` (`SuperAdminApiPage`) — rewritten for accuracy:

- Groups the real HTTP surface: Control Center, Identity & Governance, Operations, System & Audit.
- Each endpoint shows its correct HTTP method (GET/POST/PATCH/PUT/DELETE) — no mislabeled `GET`.
- Live status strip (Core API / Database / Auth / Realtime) pulled from `/system/health`.
- Explicit note: protected routes return 401 without a valid token, 403 on insufficient role.

## 15. System — Database

`/super-admin/database` shows real record counts per entity collection (vendors, riders, orders, products, categories, coupons, reviews, transactions) from `useApp()` state — an accurate snapshot of actual persistence, not a claim.

## 16. System — Backup & Restore

Real snapshots stored in `db.backups[]` (capped at 5):

- `GET /api/system/backups` — list snapshots (id, createdAt, file, size, record counts, createdBy).
- `POST /api/system/backup` — writes a **full point-in-time copy** of every collection (users→platformSettings), records byte size + counts, sets `lastBackupAt`, audits `Database backup created`.
- `POST /api/system/restore` — requires `{ backupId, confirm: true }`. Missing `confirm` → **400** (one-click restore impossible). Restores every collection, removes the consumed snapshot, persists, audits `Database restored`.

UI: `/super-admin/backup` — snapshot history, run backup, and a restore dialog that requires typing the snapshot id + explicit confirm. All audited.

## 17. System — Platform Settings (Purposeful Control Center)

`/super-admin/settings` was rebuilt as a fully functional control layer. Every visible control maps to a real backend effect, requires staged confirmation (with password re-authentication for high-risk changes), is validated, persisted, and audited. No decorative/fake UI remains.

### Settings exposed (all real)

| Group | Control | Backend effect |
|---|---|---|
| Platform | Platform name | `platformSettings.name` (2–60 chars, sanitized) |
| Platform | Currency | `platformSettings.currency` (3-letter ISO code) |
| Platform | Online/Maintenance toggle | `maintenanceMode` — gates the whole `/api` surface with 503 |
| Registration | New customers / vendors / riders | `allowNewCustomers` / `allowNewVendors` / `allowNewRiders` — enforced in `POST /api/auth/register` (403) |
| Registration | Vendor / rider approval mode | `vendorApprovalMode` / `riderApprovalMode` (`auto`/`manual`) — drives `autoApprove` in registration: auto creates vendor/rider records `active`/`verified`, manual creates them `pending` |
| Orders & Delivery | Commission % | `commissionRate` (0–100, two decimals) |
| Orders & Delivery | Delivery fee | `deliveryFee` (≥ 0) |
| Payments | Per-gateway enable/disable | `PATCH /api/payment-gateways/:id`; enabling requires `configured:true` (else 400) |
| Communication | System notifications | `notificationsEnabled` — `notifyUser()` is suppressed when off (critical security alerts are never silenced) |
| Communication | Support email | `supportEmail` (email regex) |
| Communication | SMS sender id | `smsSenderId` (≤ 20 chars, sanitized) |
| Security | Enforcement posture (read-only) | Real RBAC + audit + session tracking; presented as status, not toggles |
| System | Health / DB / backups (read-only) | Real `/system/health`, DB persistence, backup snapshots + Manage link |

### Settings explicitly removed (were decorative)

- Any visual "enabled/configured/healthy" claim with no backend backing.
- Decorative icon blocks, repeated badges, and static swatches — replaced by functional status derived from the server.
- Unconfigured payment gateways no longer appear enabled: the GET view maps them to `enabled:false, operational:false` regardless of stale flags.

### Validation (server-side `validatePlatformSettings()`)

- `commissionRate` 0–100; `deliveryFee` ≥ 0; `name` 2–60 sanitized; `currency` 3-letter ISO; `supportEmail` regex; `smsSenderId` ≤ 20; booleans coerced. Invalid input → 400 with a field message; the UI restores the prior server value.

### Confirmation flows

- Single low-risk numeric fields (commission, delivery fee) → per-field Apply → confirm dialog → request.
- Grouped general edits (name, currency, support email, SMS sender id) stage as **unsaved changes** → "Review Changes" dialog (Current→New rows) → Save.
- High-risk toggles (maintenance, registration, approval modes, notifications, gateways) → staged confirm dialog showing Current→New consequence cards + risk badge → re-authentication → request.
- A route-level leave guard warns about unsaved grouped edits (Discard & Leave / Stay).
- No optimistic UI: controls stay on the server value until the confirmed request succeeds; failures restore visual state and toast the backend error.

### Re-authentication (high-risk changes)

- `POST /api/auth/verify-password` (requireAuth): verifies the operator's current password against the stored hash (sha256, with legacy plain fallback); returns 401 on mismatch with an audit `Re-authentication failed` (`result:'denied'`), 400 when missing.
- `PUT /api/platform/settings` (requireSuperAdmin): touching any of `maintenanceMode`, `allowNewCustomers`, `allowNewVendors`, `allowNewRiders`, `notificationsEnabled`, `vendorApprovalMode`, `riderApprovalMode` **requires `password`** — missing/wrong → 401 `{requiresPassword:true}` and a `Platform settings change denied` audit. Non-high-risk keys save without re-auth.
- `PATCH /api/payment-gateways/:id` (requireSuperAdmin): password required for every gateway change; failure audited `Payment gateway change denied`.
- The password is used once and never stored in frontend state.

### Audit events (all real, immutable)

`Platform settings updated` (with `{changed:{key:{from,to}}}` delta), `Platform settings change denied`, `Payment method enabled` / `Payment method disabled` (with `{name,before}`), `Payment gateway change denied`, `Re-authentication failed`.

### Operational truth wiring

- `GET /api/payment-gateways` maps every record to `{...g, enabled: g.configured ? !!g.enabled : false, operational: !!(g.configured && g.enabled)}`.
- `/api/system/health` derives `email`/`sms` status from env (`SMTP_HOST`/`SMTP_USER`, `TWILIO_ACCOUNT_SID`) and `payments.status` counts only `enabled && configured` gateways; notifications message reflects the real flag.

## 18. Audit & Compliance — Audit Logs

`GET /api/audit` (requireSuperAdmin) — server-paged and filtered:

- Filters: `action`, `entity`, `entityId`, `result`, `actorId`, `search` (free text over actor/action/id), `from`/`to` (date range), `limit` (cap 500), `offset`.
- Returns `{ total, limit, offset, items }` — no full-table shipping to the client.

`GET /api/audit/summary` (requireSuperAdmin) — aggregate: `total`, `last24h`, `byAction`, `byResult`, `byEntity`, `byDay`, `recent[25]`.

UI: `/super-admin/audit` — server-paged table with search, entity filter, result filter, date-range picker, and expandable detail rows (meta shown; never secrets).

## 19. Audit & Compliance — Security Events

`/super-admin/security-events` — real audit summary + the latest 200 audit rows filtered to security/auth-relevant actions (Login, Logout, session revocation, account controls, password resets, approvals), presented with device/ip/portal metadata. Backed 100% by `db.audit` — no generated events.

## 20. Super Admin Profile

- Operator identity shown in Command Center hero and Security Center.
- **My live sessions** with current-session marking and per-session terminate.
- Profile/settings mutation uses the existing authenticated user endpoints (`PATCH /api/users/:id`, password flows).

## 21. Backend Enforcement Model (RBAC)

- `getAuthUserId` enforces four layers per request: JWT validity → `tokensRevokedAt` (issued-before cutoff dies) → suspension lockout → **real session** (revoked or expired dies). `lastActivityAt` updates on every request.
- `requireAdmin` requires `administrator | super-administrator`; `requireSuperAdmin` requires exactly `super-administrator`. Both re-resolve from the DB (never trust token role alone).
- Suspended accounts cannot authenticate, refresh, or hold live sessions.
- Ordinary administrators hitting `/super-admin/*` or super-admin endpoints receive 401/403 even with a valid session.

### Granular permission enforcement (the matrix is the enforcement)

- `effectiveRolePermissions(role)` = persisted `db.rolePermissions[role]` (set via the console) falling back to `ROLE_PERMISSIONS`. Persisted, so grants survive a server restart.
- `requirePermission(...perms)` middleware requires at least one of the listed grants and is wired onto ~25 management endpoints: users CRUD + account controls, sessions, roles/permissions, restaurants/riders, orders/deliveries, announcements, payments + gateways, database/backups, health/API, reports, platform settings, security (`security:manage` on `/api/auth/admin/*`), and the audit surface.
- Handler-internal gates (no middleware) add the same checks to flattened admin paths: `GET /api/orders` (`orders:view`), `PATCH /api/orders/:id/status` (`orders:manage`), `POST /api/orders/:id/assign-rider` (`deliveries:assign`), `GET /api/vendors` (`restaurants:view`), `PATCH /api/vendors/:id` status/verification (`restaurants:approve`/`restaurants:suspend`), `GET /api/riders` (`riders:view`), `PATCH /api/riders/:id` (`riders:approve`), and customer self-service `POST /api/orders` (`customer:order`).
- Super Admin's role is immutable in the API: `PATCH /api/roles/super-administrator` → **400** (prevents lockout/escalation). Administrator is the only editable management role.
- `PATCH /api/roles/:id` (`roles:update` + super-admin + re-auth): only permissions present in `MANAGEMENT_PERMISSIONS` can be granted — invented grants are filtered out; each change is audited with added/removed lists.
- `POST /api/users/:id/role` (`roles:assign` + super-admin + re-auth): refuses self role change (400), updates `role` + `accountType` together (`ROLE_ACCOUNT_TYPES`), auto-creates the vendor/rider record when moving into those roles, revokes the target's sessions + sets `tokensRevokedAt` so the new role applies immediately, and audits `Role assigned` plus `Super Admin access granted/revoked` as appropriate.
- `PATCH /api/users/:id` is hardened: modifying an `administrator` / `super-administrator` target now requires a super-admin actor; role changes via the legacy PATCH require re-auth and apply account-type consistency.
- Re-authentication (`requireReAuth`) is required for all role/permission mutations and for sensitive user updates — one-time current-password check; missing/wrong password → **401** `requiresPassword` with an audited `RBAC change denied`.

## 22. Audit Integrity & Coverage

- Writes only via `logAudit()` (no update/delete endpoints); capped at 5,000 newest rows.
- Actions covered include: Login, Logout, Admin suspended/reactivated/verified/revoked/force-reset, Created/deleted admin accounts, Platform settings updated / change denied, Payment method enabled/disabled / change denied, Re-authentication failed, Announcement published, Database backup created / restored, rider/vendor approval and status changes, password resets, **Role permissions updated (with added/removed lists), Role assigned (from→to), Super Admin access granted/revoked, RBAC change denied (re-auth)**.
- Records carry `actorName`/`actorEmail`, `action`, `entity`, `entityId`, `result`, `meta`, `timestamp`. Meta deliberately excludes passwords, tokens, keys.
- Admin console `/admin/audit-log` adapted to the new paged `{ items }` shape.

## 23. Desktop UX

- Grouped sidebar navigation with section headers, active states, and pending-approval badges.
- Dense KPI grid, status strip, filterable tables with expandable rows.
- Modals for destructive flows (restore requires typed id + confirm).
- Restrained security-oriented accent palette (`from-rose-500 to-purple-700` hero), risk-colored badges (emerald/amber/rose), monospace endpoint/registry values.

## 24. Mobile UX

- Drawer navigation with the full grouped IA; mobile top-level items: Overview / Users / Approvals / Audit / Settings.
- Stacked stat cards, collapsible filters, horizontally scroll-safe tables, bottom action bars.
- The Platform Settings page is mobile-stacked and touch-friendly: single-column sections, full-width touch targets, and the exact same staged confirmations + re-auth prompts as desktop — no reduced confirmations on small screens.
- Flutter mobile app (in `mobile/`) remains compatible: its auth repository uses the per-user per-session DELETE path which the new session API preserves. Its settings repository only reads settings (`GET /platform/settings`); the `updateSettings` helper it defines would now need a `password` for high-risk keys if ever used to write them.

## 25. API Surface (Super Admin-relevant)

New/changed endpoints:

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/auth/verify-otp` | public | Login; creates real session; audited `Login` |
| `POST /api/auth/logout` | token | Revokes current session; audited `Logout` |
| `GET /api/auth/sessions/:userId` | owner/admin | Real session rows + `isCurrent` |
| `DELETE /api/auth/sessions/:userId` | super-admin | Revoke all + tokens; returns count; audited |
| `DELETE /api/auth/sessions/:userId/:sessionId` | owner/admin | Revoke one session |
| `GET /api/admin/sessions` | admin | Platform-wide session registry |
| `POST /api/admin/users/:id/account` | super-admin | suspend/reactivate/force-reset/revoke-sessions/verify |
| `GET /api/audit` | super-admin | Paged + filtered audit |
| `GET /api/audit/summary` | super-admin | Audit aggregates |
| `GET /api/system/backups` | super-admin | Snapshot list |
| `POST /api/system/backup` | super-admin | Create snapshot (cap 5) |
| `POST /api/system/restore` | super-admin | Restore (requires `confirm: true`) |
| `GET /api/system/health` | admin | + sessions/security/payments/notifications/email/sms |
| `GET /api/admin/stats` | admin | + pendingApprovals/activeSessions/admins/suspendedUsers/auditEvents |
| `POST /api/auth/verify-password` | token | Re-auth for high-risk changes; 401 on mismatch, audited denied |
| `PUT /api/platform/settings` | super-admin | Requires `password` for high-risk keys (401 `requiresPassword` otherwise) |
| `PATCH /api/payment-gateways/:id` | super-admin | Requires `password` on every change; enabling unconfigured gateway → 400 |
| `GET /api/roles` | admin+ (`roles:view`) | `{ roles[], userCounts{} }` — live effective permission sets per role |
| `GET /api/permissions` | admin+ (`permissions:view`) | Permission registry (`id`/`domain`/`risk`/`label`/`description`) |
| `PATCH /api/roles/:id` | super-admin (`roles:update`) | Reprovision a role's management permission set (needs `password`; super-admin role → 400) |
| `POST /api/users/:id/role` | super-admin (`roles:assign`) | Change a user's role (needs `password`; self → 400); creates vendor/rider record; revokes sessions |

Pre-existing endpoints referenced by these consoles: `/api/users` (CRUD admin+), `/api/auth/admin/*` (reset/temp/force), `/api/platform/settings`, `/api/payment-gateways`, `/api/announcements`, `/api/orders*`, `/api/riders/:id`, `/api/vendors/:id`.

## 26. Frontend Services & State

- `src/services/api.ts` — `AdminService`: `getAudit(params)` (paged), `getAuditSummary()`, `getBackups()`, `createBackup()`, `restoreBackup(id)` (`{backupId, confirm:true}`), `accountAction(userId, action, note?)`, `getSessions()` (registry), `getSystemHealth()`, `verifyPassword(password)`, `updatePlatformSettings(data, password?)`, `updatePaymentGateway(id, data, password?)` (password appended only when provided), **`getRoles()`, `getPermissions()`, `updateRolePermissions(roleId, permissions, password?)`, `assignRole(userId, role, password?)`**. Old `getBackup()` removed.
- `src/services/auth-api.ts` — `logout()` → `POST /auth/logout`.
- `src/lib/auth/auth-store.tsx` — `logout()` calls `AuthApiService.logout()` (fire-and-forget) before clearing the local tab session, so the server session is revoked.
- Pages live in `src/pages/super-admin/{dashboard,settings}.tsx`, `sections.tsx`, and **`rbac.tsx`** (the Roles & Permissions governance console — wired into `src/router.tsx` at `/super-admin/roles` and `/super-admin/permissions`); navigation in `src/components/super-admin/SuperAdminLayout.tsx`.

## 27. Dependencies

No new runtime dependencies were added for this work. Existing stack:

- Runtime: React 19, React Router 7, Express 4, jsonwebtoken, uuid, cors, dotenv, nodemailer, leaflet, framer-motion, lucide-react, recharts, radix-ui primitives, tailwindcss 4.
- Dev/tooling: TypeScript ~5.8, Vite 6, tsx, esbuild, concurrently.
- Mobile (Flutter) lives under `mobile/` with its own `pubspec.yaml`; untouched except for continued compatibility.

## 28. Environment Variables

`.env.example` (documented): `APP_URL`, `NODE_ENV`, `MAIL_ENABLED`, `MAIL_FROM_EMAIL`/`MAIL_FROM_NAME`, `SMTP_*`, optional `MAIL_INSPECTOR_URL`, `JWT_SECRET`, optional `DATABASE_URL` (Postgres target, `database/schema.sql`), payment keys (`PAYSTACK_SECRET_KEY`, `HUBTEL_*`), maps keys (`GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`), OAuth (`GOOGLE_*`, `APPLE_*`), SMS (`TWILIO_*`).

Server additions: `PORT` env override in `server.ts` (default 3999 preserved) — used by the E2E harness to isolate port 4099.

## 29. Tests & Verification

- **E2E harness**: `C:\Users\PC\AppData\Local\Temp\opencode\om-e2e\run.mjs` — seeds a throwaway DB copy, launches `node node_modules/tsx/dist/cli.mjs server.ts` with `PORT=4099` in a temp dir, runs **127 checks** (the 49 core checks; the 34 Settings Enforcement & Re-auth checks: validation rejections/acceptance; high-risk PUT without/wrong/correct password incl. denied audit; verify-password 200/401/400 matrix; maintenance gate blocking marketplace (503) while `/api/health` stays up and admin bypasses; registration blocked during maintenance; registration 403 when `allowNew*` disabled then 201 when re-enabled; vendor/rider auto-approval creating `active`/`verified` records; unconfigured gateways never presenting enabled + enabling them rejected; gateway re-auth; notifications off suppressing routine mail while critical suspension notices still deliver; administrator PUT → 403; and **44 RBAC governance checks**: unauthenticated 401 + non-management 403 on `/roles`, `/permissions`, `/roles/:id`, `/users/:id/role`; 7 roles with no duplicate labels; protected super-admin role; registry shape with domain/risk; administrator baseline lacks `roles:view`; role PATCH without/wrong password → 401 `requiresPassword` + audited `RBAC change denied`; super-admin role PATCH → 400; unknown role → 404; invented permissions filtered; live grant `roles:view` unblocks an admin API call then revoke re-blocks it (both audited); self role change → 400; assign customer→administrator revokes sessions and audits `Role assigned`; assign→super-admin audits `Super Admin access granted` then →rider creates a rider record then →customer audits `Super Admin access revoked`; server restart preserves the persisted `roles:view` grant). Server auto-killed; destructive flows never touch live data.
- `node node_modules/typescript/bin/tsc --noEmit` — clean.
- `node node_modules/vite/bin/vite.js build` — succeeds (pre-existing chunk-size warning only).

## 30. Known Limitations & Next Steps

- **Vite chunk-size warning** (3.4 MB main bundle) — pre-existing, non-blocking; address later with route-level code splitting.
- **Backup restore and admin actions must be run against the real server** — the isolated E2E validated behavior; the live DB (3999) was intentionally not mutated.
- Backup snapshots are stored inside the same DB file; a filesystem-level off-site copy is not yet implemented.
- Audit meta is contextual, not sanitized-field-whitelist driven; future work could add a field-level denylist to harden secrets exclusion further.
- Session registry is admin-visible by design; no per-IP geo/region enrichment is performed.
- OAuth/Google/Apple and SMS/Twilio remain disabled until credentials are provided; the Settings page reflects this as honest `email`/`sms` health from env, not "Healthy" claims.
- Re-authentication is a one-time current-password check verified against the stored hash; it is not an OTP/step-up MFA flow (the app has no MFA step-up endpoint today).
- The Super Admin role is intentionally immutable through the API (400) to guarantee no single request can strip the platform's RBAC powers; any future change to its permission set must be applied to `ROLE_PERMISSIONS` in code.
- `permissions:assign` is a companion grant to `roles:update` in the registry (both route through `PATCH /api/roles/:id`); a role granted one effectively gains the ability to maintain the matrix, so both are high-risk and re-auth-gated.
- Role assignment does not re-issue a token: the target's sessions are revoked so the new role applies on next login; any in-flight request from a prior session is rejected.
- Non-management roles (customer/vendor/rider/staff) are shown read-only in the matrix; their self-service permission sets are defaulted from `ROLE_PERMISSIONS` and not editable from the console by design.
- Unconfigured payment gateways cannot be enabled by design (server 400) until configuration data exists in the gateway record; the UI hides the reason behind the "Not Configured" badge.
- Settings PUT only audits the changed keys; a future enhancement could snapshot full before/after state for the grouped general fields.
- Postgres adapter is the documented production target (`DATABASE_URL` + `database/schema.sql`); the JSON file store remains the default.
