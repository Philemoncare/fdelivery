# OmniMarket Mobile (Flutter)

Official OmniMarket Ghana mobile app. It is a **thin client of the existing OmniMarket
Express backend** (`server.ts` in the repo root). There is **no mock backend, no demo
users, no fake orders, and no hardcoded restaurant/rider data** anywhere in this app.

Every screen loads its data from the real HTTP API and realtime events arrive over the
backend's existing Server-Sent Events endpoint.

## Requirements

- Flutter SDK (3.3+). This project was authored without a local Flutter toolchain, so
  platform folders are generated on your machine.
- The OmniMarket backend running on port **3999**:
  - `npm install` (or `bun install`) in the repo root
  - `npm run server` (runs `tsx watch server.ts`)

## Bootstrap (one time)

From inside this `mobile/` directory:

```bash
# 1. Generate the android/ios/ platform folders. Existing lib/ and pubspec.yaml
#    are NOT overwritten by this command.
flutter create --platforms=android,ios .

# 2. Resolve dependencies
flutter pub get

# 3. Confirm the backend is reachable, then run
flutter run
```

### Android emulator networking

The backend runs on your host at `127.0.0.1:3999`. Android emulators reach the host via
`10.0.2.2`, so the default API base URL is:

- Android: `http://10.0.2.2:3999/api`
- iOS simulator / desktop: `http://127.0.0.1:3999/api`

You can override per-run:

```bash
flutter run --dart-define=OMNIMARKET_API_BASE_URL=http://10.0.2.2:3999/api
```

> Real Android devices need the host machine's LAN IP and the backend CORS/`HOST`
> handling; that is a deployment concern, not a code mock.

### Local HTTP (cleartext) on emulators

The dev backend speaks plain HTTP. Android 9+ and iOS block cleartext by default,
so after running `flutter create .`:

- **Android**: in `android/app/src/main/AndroidManifest.xml`, on the `<application>`
  tag add `android:usesCleartextTraffic="true"` (dev only), or better ship a
  `network_security_config.xml` that allows cleartext only for `10.0.2.2` /
  `127.0.0.1`.
- **iOS**: in `ios/Runner/Info.plist` add
  `NSAppTransportSecurity > NSAllowsLocalNetworking = true`.

## Google Maps Platform setup (Prompt 3)

> **SECURITY — read first.** Never paste a Google API key into Dart source, the
> manifest, logs, or Git. The key used in this project's earlier discussion was
> exposed in a transcript: **revoke it in Google Cloud Console now** and create
> a fresh, restricted key.

### 1. Google Cloud Console

- Create/revoke keys under **APIs & Services → Credentials**.
- Enable **only** the services OmniMarket actually uses:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Geocoding API
  - Directions API
  - Places API only if address search is later wired (currently not required)
- Create **restricted** API keys:
  - **Android key**: restricted to the app's package name + signing
    SHA-1 **and** SHA-256 fingerprint.
  - **iOS key**: restricted to the iOS bundle identifier.
  - Keep server-side Google credentials (e.g. a service-account key for any
    backend Google calls) completely separate — never bundle one in the app.
- Keep a separate billing environment/quota per key so abuse is contained.

### 2. Injecting the key (never committed)

The Dart-side Directions/Geocoding/REST calls read the key at build time:

```bash
flutter run --dart-define=OMNIMARKET_GOOGLE_MAPS_API_KEY=AIza...YOUR_RESTRICTED_KEY
```

For the native map tile rendering you also configure the key per platform
(below). Do **not** commit these values; use a git-ignored local file or an env
var in your CI/build machine.

### 3. Android (`after flutter create .`)

`android/app/src/main/AndroidManifest.xml` — add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<!-- Only if background location is ever required for active deliveries -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

Inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="${MAPS_API_KEY}" />
```

`android/app/build.gradle.kts` — inject the key from a git-ignored
`android/local.properties` (never commit it):

```kotlin
android {
    defaultConfig {
        // Read MAPS_API_KEY from local.properties (git-ignored).
        val mapsKey = (rootProject.file("local.properties")
            .takeIf { it.exists() }
            ?.reader()
            ?.use { it.readText() }
            ?.split("\n")
            ?.firstOrNull { it.startsWith("MAPS_API_KEY=") }
            ?.substringAfter("MAPS_API_KEY=")) ?: ""
        manifestPlaceholders["MAPS_API_KEY"] = mapsKey
    }
}
```

Add `android/local.properties` to `.gitignore` (already covered below).

### 4. iOS (`after flutter create .`)

`ios/Runner/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>OmniMarket uses your location to show nearby restaurants and track your delivery.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Your rider needs background location only while actively delivering an order.</string>
<key>GMSApiKey</key>
<string>$(GOOGLE_MAPS_API_KEY)</string>
```

Set `GOOGLE_MAPS_API_KEY` via an `xcconfig` build setting that is **not**
committed (e.g. `ios/Flutter/Debug.xcconfig` override on the machine that
builds). If background location is used, enable the **Location updates**
capability for the Runner target.

### 5. Service-area configuration

The client-side service-area defaults (Takoradi + 30 km) are configurable per
build and never gate a backend operation:

```bash
--dart-define=OMNIMARKET_SERVICE_CENTER_LAT=4.8920 \
--dart-define=OMNIMARKET_SERVICE_CENTER_LNG=-1.7580 \
--dart-define=OMNIMARKET_SERVICE_RADIUS_KM=30.0
```

The backend/platform settings remain the source of truth for delivery fees and
zones; these defines only power the "outside service area" warning at address
selection and map-tap validation.

## Location & delivery pipeline (Prompt 3)

```
Device GPS → LocationService → RiderLocationController (throttled by distance/time)
  → POST /api/riders/:id/location (owner/admin only)
  → backend broadcasts `rider_location` SSE → authorized customer
  → DeliveryTracker → Google Map (rider marker, real route, real ETA)
```

Ground rules implemented in `lib/core/location` + `lib/core/maps`:

- Rider location is **only** sent while the rider has an active delivery
  (`picked_up` / `in_transit` / `arriving`) and only to the order's customer.
- Updates are throttled by distance (≥20 m) and time (≥15 s); GPS stops when
  there is no active delivery (battery management).
- Network loss shows "Connection interrupted. Trying to reconnect..." and
  buffers safe location points to flush on reconnect.
- ETA/distance come from the Google Directions API using real coordinates.
  When no route is available the UI shows **"ETA unavailable"** — never an
  invented number.
- Delivery stage transitions happen **only** via `PATCH /api/orders/:id/status`
  (vendor/rider/admin ownership is enforced by the backend).
- Customer tracking requires a real owned order (`GET /api/orders/:id` returns
  403 otherwise) and only renders markers the caller is authorized to see.
- Customer tracking never runs for a user with no order, and stops as soon as
  the order is delivered/completed/cancelled.

### Known backend data limits (honest, not mocked)

- `publicVendor` strips `latitude`/`longitude`; restaurant coordinates are
  returned to owners/admins only. A customer's order therefore may carry no
  `vendorLat`/`vendorLng`, and the tracking map shows the restaurant marker
  only when the order actually has coordinates.
- The backend stores `estimatedDeliveryTime` as a static string; the app
  ignores it and displays Google-routed ETA or "ETA unavailable" instead.
- The backend rider status API persists only `ONLINE`/`OFFLINE`. `ON_DELIVERY`
  is a derived client-side state from the rider's active order; it is never
  sent as a fake status.

## Auth flow (real backend)

1. `POST /api/auth/login` with email-or-phone + password.
   - Admin accounts only: enable the **Admin sign-in** toggle so the `portal: "admin"`
     flag is sent (otherwise the backend rejects non-admins on the admin portal).
2. Backend always replies `requiresOtp: true` and emails a 6-digit code
   (`123456` is the documented dev/demo code).
3. `POST /api/auth/verify-otp` exchanges the code for `{ accessToken, refreshToken }`.
4. Tokens live in `flutter_secure_storage`. The app restores the session on cold start
   via `GET /api/auth/me`, refreshing the access token automatically when needed.
5. The backend's `role` decides which shell loads: customer, vendor, rider, admin, super-admin.

## Testing

```bash
flutter test                      # unit tests (models, client, validators)
flutter test integration_test     # end-to-end against the LIVE backend
```

`integration_test/app_integration_test.dart` performs the real 5-role flow: customer
register → login → OTP (`123456`) → `GET /api/auth/me` → correct role shell; then the
same assertion path for vendor, rider, admin and super-admin accounts.

## Architecture

```
lib/
  core/          config (EnvConfig, GoogleMapsConfig, ApiConfig), constants,
                 network (ApiClient/AuthInterceptor), secure storage,
                 realtime (SSE), theme, router, utils,
                 location (LocationService, LocationPermissionService,
                           LocationPoint, rider availability/haversine),
                 maps (GoogleMapService, MapViewController, markers, routes,
                       Directions/Geocoding client, delivery stage map)
  data/          models (mirror backend JSON exactly) + repositories (one per role)
  application/   ChangeNotifier controllers (auth/session, DeliveryTracker,
                 RiderLocationController)
  presentation/  auth screens + role shells + shared widgets +
                 features/customer/delivery_tracking,
                 features/rider/active_delivery,
                 features/vendor/restaurant_location,
                 features/admin/delivery_monitoring
```

State management is plain `ChangeNotifier` + `ListenableBuilder` from the Flutter SDK
(no third-party state package). The prompt-1 architecture statement is not present in
this repository; swap controllers for Riverpod/Bloc later if required — the repository
and model layers are package-agnostic.

## Prompt 3 success checklist

- [ ] Google Maps renders on Android with a **restricted** key (package + SHA-1/SHA-256).
- [ ] No secret credentials committed: key comes from `--dart-define` /
      `local.properties` / xcconfig only.
- [ ] Customer addresses use real device/map coordinates (backend `latitude`/
      `longitude` on `deliveryAddress`).
- [ ] Restaurant coordinates come from the real vendor record (owner/admin view).
- [ ] Rider GPS uses the actual device location and reaches the backend.
- [ ] Authorized customers receive real-time `rider_location` updates over the
      existing SSE channel.
- [ ] Selected riders are respected (backend `assign-rider`); unselected orders
      follow the backend assignment workflow.
- [ ] Distance/ETA computed from real coordinates/routes; otherwise "unavailable".
- [ ] Tracking stops after delivery; unauthorized access blocked by the backend.
- [ ] Location permissions handled once, with honest denied/denied-forever/settings states.
- [ ] No fake coordinates, no mock riders, no static ETA, no hardcoded restaurant points.

## Role → shell mapping

| role                 | shell                          |
| -------------------- | ------------------------------ |
| customer             | customer home (real catalog)   |
| vendor               | vendor dashboard (real stats)  |
| rider                | rider dashboard (real list)    |
| administrator        | admin dashboard (real stats)   |
| super-administrator  | super-admin dashboard          |
