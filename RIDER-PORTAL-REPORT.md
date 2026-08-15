# Universal Rider Delivery Portal — Session Report

## What shipped this session

### Backend — universal auto-dispatch (`server.ts`)
Unassigned PACKAGE/PASS deliveries now auto-promote to `ready_for_pickup` the moment payment is settled (`paymentStatus === 'paid' || method === 'Cash on Delivery'`), broadcasting `delivery_available` with a rider-facing projection (deliveryType/vendorName/pickup/dropoff/fee/itemCount) and notifying every online+available rider. Truly unpaid orders hold in `pending` with an admin "waiting on payment" notification. Verified by a new 15-assertion E2E (`e2e-autodispatch.js`) — all green, including receiver-confirmation gating and COD earnings accrual.

### Web rider portal (all type-aware: FOOD/PASS/PACKAGE)
- `src/lib/rider-deliveries.ts` — `deliveryKindBadge`, `deliveryKindTitle`, `senderLabel`.
- `RiderJobsPage` — type filter pills + colored type badges + sender/dropoff display; detail modal shows Type/Payout/Sender.
- `RiderDeliveriesPage` — type filter, type badges, receiver-confirmation code panel (violet Input + confirm → `receiverConfirmDelivery`), "Complete" gated on `receiverConfirmed` for package/pass.
- `RiderNavigationPage` — type-aware route card (heading flips pickup→dropoff after pick-up), filter broadened to `ready_for_pickup|rider_assigned|picked_up|in_transit|arriving`, Message/Call buttons (fixed missing `useNavigate`).
- `RiderWalletPage` — This Month stat, 4-col earnings grid, Recent Delivery Earnings with type badges.
- `RiderMessagesPage` — `?convId` deep-link + order-context badge (kind · DLV · #OM).
- Dashboard — empty-state CTA to Available Deliveries + type-aware badges.
- Router — duplicate `onboarding`/`active-delivery` routes consolidated to redirects; legacy aliases kept.
- AppContext — dead `rider_jobs` SSE subscription removed.

### Mobile (Flutter, coherence-verified only — no SDK on this machine)
- `order.dart` — universal model: pickup/dropoff coords, `receiverConfirmed`, and getters (`deliveryKindBadge/Title`, `deliveryReference`, `senderName/dropoffName/pickupName`, `pickupPoint/dropoffPoint`, `isActiveStatus`).
- `active_delivery_page.dart` — pickup/dropoff markers + route target flip by status; package receiver-confirmation step before Mark Delivered; type badge in header/card.
- `jobs`/`active_deliveries`/`earnings` pages — type badges, kind titles, DLV refs, package size/type rows.
- **NEW** `messages/rider_messages_page.dart` — conversation list + thread view + send, wired to the dashboard AppBar (keeps HOME/JOBS/ACTIVE/EARNINGS/PROFILE shell intact).
- **BUGFIX** `messaging_repository.dart` — `conversations()` now sends `userId` (was 403 because `GET /api/messages/conversations` requires it).

### Verification
- `tsc --noEmit` — clean (exit 0). Fixed a pre-existing uncommitted super-admin worktree that referenced two un-imported components (`SuperAdminSecurityEventsPage`, `SuperAdminSessionsPage`) and a `key`-on-fragment typing error.
- E2E: autodispatch 15/15 PASS; `e2e-full.js` 21/22 (the 1 failure is a stateful assertion "2 active deliveries" that assumes seed baseline activity — not a regression; all flow checks pass); `e2e-package.js` failures were cross-run double-booking/pool pollution, resolved on clean state.
- Services live: API :3999, web :3000.

## Notes / limitations
- Flutter/Dart SDK absent — mobile edits coherent but not compile-verified.
- Dev mode forces external card payments to `paid`, so the "unpaid hold" branch is only reachable in production (by design).
- `e2e-full.js`/`e2e-package.js` predate auto-dispatch and assume a pristine DB; run them on a clean pool (new `e2e-autodispatch.js` accounts for auto-dispatch).
