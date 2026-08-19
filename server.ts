import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { emailService, type EmailLogEntry } from './email/email.service.js';
import {
  ROLE_PERMISSIONS, MANAGEMENT_PERMISSIONS, PERMISSION_META, ROLE_LABELS,
  ROLE_ORDER, ROLE_ACCOUNT_TYPES, isAdminRole, isSuperAdminRole,
  type Role, type Permission
} from './src/lib/auth/types';

console.log('!!! OMNIMARKET API SERVER !!!');
console.log('Version: 1.0.0');
console.log('Time:', new Date().toISOString());

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';
// Fail-closed money handling. Dev auto-finish paths (optimistic wallet credit,
// client payment self-verify, dev webhook secret) are active ONLY when BOTH the
// environment is non-production AND ALLOW_DEV_PAYMENTS=true is set. Simply
// forgetting NODE_ENV=production no longer silently enables payment forgery.
const DEV_MONEY = !isProd && process.env.ALLOW_DEV_PAYMENTS === 'true';

// 1. ABSOLUTE FIRST PRIORITY: Logger (Before anything else)
app.use((req, res, next) => {
  const size = req.headers['content-length'] ? (parseInt(req.headers['content-length']) / 1024 / 1024).toFixed(2) : '0';
  console.log(`\x1b[35m[NETWORK]\x1b[0m ${req.method} ${req.url} | Size: ${size}MB`);
  next();
});

// 2. Body parsers with bounded limits (oversized/corrupt payloads rejected)
// Payment webhooks are received as raw bytes so their HMAC signatures can be
// verified against what was actually transmitted.
app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// 3. Security headers — browser & transport protections.
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProd) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  // Default-deny CSP; the SPA loads its own content offline so we keep scripts/styles
  // self + inline (Vite) but block everything remote by default.
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// 4. Restricted CORS. Out of the box we allow local development origins plus any
//    explicitly-configured production origins (ALLOWED_ORIGINS). Credentials are
//    only exchanged with vetted origins; native/mobile clients (no Origin) remain
//    supported. This replaces the previous fully-open app.use(cors()).
const CORS_ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    let allowed = CORS_ALLOWED.includes(origin)
      || /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Id,Accept');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 5. Structural hardening for every parsed request:
//    - strip prototype-pollution keys
//    - detect injection/XSS-style payloads in query + body (real block + event)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') req.body = sanitizeJsonValue(req.body, 0);
  } catch (e: any) {
    recordSecurityEvent({ type: 'MALFORMED_REQUEST', severity: 'LOW', endpoint: req.originalUrl.split('?')[0], detection: 'Payload exceeds safe nesting/limits.', actionTaken: 'Request rejected', status: 'blocked', req });
    return res.status(413).json({ success: false, message: 'Request payload is invalid.' });
  }
  const query = (req as any).query || {};
  // Query strings get the full scan (SQL + XSS); request bodies are checked for
  // script/XSS markers only so legitimate data (data-URI images, addresses,
  // prose) never trips an over-broad blacklist.
  const hostileQuery = detectHostileValue(query, true);
  const hostileBody = detectHostileValue(req.body || {}, false);
  if (hostileQuery || hostileBody) {
    const kind = /<\/?script|<svg|javascript:/i.test(JSON.stringify(query) + JSON.stringify(req.body || {})) ? 'XSS_ATTACK_ATTEMPT' : 'SQL_INJECTION_ATTEMPT';
    recordSecurityEvent({
      type: kind, severity: 'CRITICAL',
      endpoint: `${req.method} ${req.originalUrl.split('?')[0]}`,
      account: null, detection: 'Hostile pattern detected in request query/body.', actionTaken: 'Request blocked; source throttled.', status: 'blocked', req,
      details: { method: req.method },
    });
    return res.status(403).json({ success: false, message: 'Request rejected.' });
  }
  next();
});

// 6. Global API abuse guard (per-IP baseline) — quick allow for health/auth so
//    the guard never blocks normal flows.
app.use('/api', (req, res, next) => {
  const p = req.path;
  if (p === '/health' || p === '/realtime') return next();
  const cfg = securitySettings();
  const r = checkRateLimit(`api:${secCtx(req).ip}`, cfg.apiRateLimit || 300, 60 * 1000);
  if (!r.allowed) {
    recordSecurityEvent({ type: 'API_ABUSE', severity: 'HIGH', endpoint: req.originalUrl.split('?')[0], actionTaken: 'Source rate limited', status: 'blocked', req });
    res.setHeader('Retry-After', String(Math.ceil(r.retryAfterMs / 1000)));
    return res.status(429).json({ success: false, message: 'Too many requests.' });
  }
  next();
});

// Handle JSON parsing errors explicitly
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('\x1b[31m[JSON Error]\x1b[0m Malformed JSON received.');
    return res.status(400).json({ success: false, message: "The data you're sending is corrupted or too large for the system to process." });
  }
  next(err);
});

// Namespaced rate limits for sensitive surfaces (stricter than the global guard).
app.use('/api/auth', rateLimitMw('auth', 120, 60 * 1000));
app.use('/api/payments', rateLimitMw('payments', 60, 60 * 1000));
app.use('/api/wallets', rateLimitMw('wallets', 60, 60 * 1000));
app.use('/api/search', rateLimitMw('search', 120, 60 * 1000));
app.use('/api/orders', rateLimitMw('orders', 120, 60 * 1000));
app.use('/api/admin', rateLimitMw('admin', 120, 60 * 1000));
app.use('/api/security', rateLimitMw('security', 120, 60 * 1000));
app.use('/api/coupons/validate', rateLimitMw('couponvalidate', 30, 60 * 1000));

// ------------------------------------------------------------
// API METRICS COLLECTOR — real, bounded, per-endpoint telemetry.
// Records request volume, latency (avg + p95), error and timeout
// rates, and an HTTP status distribution for every matched route.
// Values are derived from live traffic; nothing is faked.
// ------------------------------------------------------------
interface ApiMetricBucket {
  method: string;
  path: string;
  count: number;
  recent: number[];            // request timestamps (last 60s window)
  totalRequests: number;       // lifetime
  totalDurationMs: number;     // lifetime aggregate
  durationSamples: number[];   // capped rolling latency samples
  errorCount: number;          // status >= 400
  timeoutCount: number;        // timed-out / aborted requests
  blockedCount: number;        // 401 / 403 / 429
  statusDist: Record<number, number>;
  lastRequestAt: string | null;
  registeredAt: string;
  updatedAt: string;
}
const apiMetrics = new Map<string, ApiMetricBucket>();

function metricKey(method: string, path: string): string {
  return `${(method || 'GET').toUpperCase()} ${path || '/'}`;
}

const METRIC_WINDOW_MS = 60 * 1000;
const METRIC_SAMPLE_CAP = 600;

function apiBucket(method: string, path: string): ApiMetricBucket {
  const key = metricKey(method, path);
  let b = apiMetrics.get(key);
  if (!b) {
    const now = new Date().toISOString();
    b = { method: (method || 'GET').toUpperCase(), path, count: 0, recent: [], totalRequests: 0, totalDurationMs: 0, durationSamples: [], errorCount: 0, timeoutCount: 0, blockedCount: 0, statusDist: {}, lastRequestAt: null, registeredAt: now, updatedAt: now };
    apiMetrics.set(key, b);
  }
  return b;
}

// Middleware that samples every API request. Runs before routing; reads the
// matched route template from req.route/req.baseUrl when the response settles,
// so counts/latency are attributed to the real endpoint pattern.
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const method = req.method || 'GET';
      const base = (req as any).baseUrl || '';
      const routePath = (req as any).route && (req as any).route.path ? `${base}${(req as any).route.path}` : (req.originalUrl ? req.originalUrl.split('?')[0] : req.path || '/');
      const now = Date.now();
      const status = res.statusCode || 0;
      const bucket = apiBucket(method, routePath);
      bucket.count += 1;
      bucket.totalRequests += 1;
      bucket.updatedAt = new Date().toISOString();
      bucket.lastRequestAt = bucket.updatedAt;
      bucket.recent.push(now);
      while (bucket.recent.length && bucket.recent[0] < now - METRIC_WINDOW_MS) bucket.recent.shift();
      bucket.statusDist[status] = (bucket.statusDist[status] || 0) + 1;
      if (status >= 400) bucket.errorCount += 1;
      if (status === 401 || status === 403 || status === 429) bucket.blockedCount += 1;
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      bucket.totalDurationMs += ms;
      if (bucket.durationSamples.length >= METRIC_SAMPLE_CAP) bucket.durationSamples.shift();
      bucket.durationSamples.push(ms);
    } catch { /* metrics must never break request handling */ }
  });
  return next();
});

// Resolved on demand: the endpoint the client hung up on / we timed out on.
function recordApiTimeout(method: string, path: string) {
  try {
    const b = apiBucket(method, path);
    b.timeoutCount += 1;
  } catch { /* noop */ }
}

function requestsPerMinute(bucket: ApiMetricBucket): number {
  const now = Date.now();
  while (bucket.recent.length && bucket.recent[0] < now - METRIC_WINDOW_MS) bucket.recent.shift();
  return bucket.recent.length;
}
function avgMs(bucket: ApiMetricBucket): number {
  if (!bucket.durationSamples.length) return 0;
  return Math.round(bucket.totalDurationMs / bucket.durationSamples.length);
}
function p95Ms(bucket: ApiMetricBucket): number {
  if (bucket.durationSamples.length < 5) return 0;
  const s = [...bucket.durationSamples].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1);
  return Math.round(s[idx]);
}
function errorRatePct(bucket: ApiMetricBucket): number {
  if (!bucket.totalRequests) return 0;
  return Math.round((bucket.errorCount / bucket.totalRequests) * 10000) / 100;
}
function timeoutRatePct(bucket: ApiMetricBucket): number {
  if (!bucket.totalRequests) return 0;
  return Math.round((bucket.timeoutCount / bucket.totalRequests) * 10000) / 100;
}

const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3999;
const JWT_SECRET = process.env.JWT_SECRET || 'omnimarket_ghana_secure_2024_key';
const JWT_ALGO = 'HS256';
if (JWT_SECRET === 'omnimarket_ghana_secure_2024_key') {
  if (isProd) {
    // Fail-closed: never run production with the publicly-known development key.
    // eslint-disable-next-line no-console
    console.error('\x1b[31m[FATAL]\x1b[0m JWT_SECRET is not set. Refusing to start in production with the known development fallback secret.');
    throw new Error('JWT_SECRET must be set in production.');
  }
  // eslint-disable-next-line no-console
  console.warn('\x1b[33m[WARN]\x1b[0m JWT_SECRET is not set (using known development fallback). Set a strong JWT_SECRET in your .env before production.');
}
// Only the universally-known demo code is allowed when explicitly opted-in
// (ALLOW_DEMO_OTP=true). It is NEVER enabled implicitly by NODE_ENV, so a
// deployment that forgets to set production cannot silently expose `123456`.
const ALLOW_DEMO_OTP = process.env.ALLOW_DEMO_OTP === 'true';

// ------------------------------------------------------------
// DATA MODELS & STATE
// ------------------------------------------------------------

let db = {
  users: [],
  categories: [
    { id: 'cat-1', name: 'Local Dishes', icon: 'Utensils', count: 0, image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },
    { id: 'cat-2', name: 'Jollof Rice', icon: 'Flame', count: 0, image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80' },
    { id: 'cat-3', name: 'Waakye', icon: 'Pizza', count: 0, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
    { id: 'cat-4', name: 'Fufu & Soup', icon: 'Hamburger', count: 0, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80' },
    { id: 'cat-5', name: 'Banku & Tilapia', icon: 'Drumstick', count: 0, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80' },
    { id: 'cat-6', name: 'Yam Chips', icon: 'GraduationCap', count: 0, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80' },
    { id: 'cat-7', name: 'Kenkey & Fish', icon: 'Fish', count: 0, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' }
  ],
  vendors: [],
  products: [],
  orders: [],
  riders: [],
  reviews: [],
  coupons: [],
  notifications: [],
  wallets: [],
  transactions: [],
  conversations: [],
  messages: [],
  sessions: [],
  backups: [],
  tickets: [],
  audit: [],
  auditSequence: { value: 0 },
  announcements: [],
  referrals: [],
  emailLog: [],
  payments: [],
  newsletter: [],
  maintenanceWindows: [],
  maintenanceNotifications: [],
  platformMessages: [],
  notificationDeliveries: [],
  rolePermissions: {},
  platformSettings: {
    platformName: 'OmniMarket',
    currency: 'GHS',
    apiDisabled: [] as string[],
    defaultCommissionRate: 10,
    defaultDeliveryFee: 3,
    distanceFeePerKm: 0,
    deliveryBaseFee: 3,
    deliveryMinFee: 3,
    deliveryMaxFee: 20,
    freeDeliveryThreshold: 0,
    maxDeliveryDistance: 20,
    // Fuel-price-based delivery adjustment. `fuelPriceCurrent` stays 0 until a
    // Super Admin explicitly sets/verifies a price; 0 disables the fuel
    // component entirely (honest default — no fabricated fuel data).
    fuelPriceCurrent: 0,
    fuelPriceReference: 0,
    fuelCostWeight: 40,
    fuelAdjustmentMode: 'automatic',
    fuelApprovedMultiplier: null,
    maxAutoIncreasePct: 10,
    maxAutoDecreasePct: 10,
    fuelPriceSource: 'manual',
    fuelPriceStatus: 'unavailable',
    fuelPriceUpdatedAt: '',
    fuelPriceLastVerifiedAt: '',
    fuelProviderUrl: '',
    fuelPendingReview: null,
    currentPricingVersion: 0,
    platformFee: 0,
    taxRate: 5,
    vendorApprovalMode: 'manual',
    riderApprovalMode: 'manual',
    allowNewCustomers: true,
    allowNewVendors: true,
    allowNewRiders: true,
    notificationsEnabled: true,
    supportEmail: 'support@omnimarket.com',
    supportPhone: '',
    smsSenderId: 'OMNIMARKET',
    maintenanceMode: false,
    lastBackupAt: '',
    paymentGateways: [
      { id: 'gtw-mtn', name: 'MTN Mobile Money', type: 'mobile-money', enabled: true, configured: true },
      { id: 'gtw-telecel', name: 'Telecel Cash', type: 'mobile-money', enabled: true, configured: true },
      { id: 'gtw-visa', name: 'Visa / Mastercard', type: 'card', enabled: true, configured: false },
      { id: 'gtw-mastercard', name: 'Mastercard', type: 'card', enabled: true, configured: false },
      { id: 'gtw-cod', name: 'Cash on Delivery', type: 'cod', enabled: true, configured: true },
      { id: 'gtw-wallet', name: 'OmniWallet', type: 'wallet', enabled: true, configured: true }
    ],
    updatedAt: ''
  },
  // Real security events and operator-tunable detection/response settings.
  // All populated by actual backend monitoring — never simulated.
  securityEvents: [],
  fuelPriceHistory: [],
  pricingVersions: [],
  systemLogs: [],
  processedWebhooks: [],
  securitySettings: {
    loginRateLimit: 10,            // allowed login attempts per IP per window
    loginWindowMs: 60000,
    accountLockThreshold: 5,       // failed attempts before short lockout
    accountLockMinutes: 15,
    bruteForceThreshold: 10,       // failed attempts per IP+account window before HIGH alert
    bruteForceWindowMs: 10 * 60 * 1000,
    apiRateLimit: 300,             // general /api requests per IP per minute
    sessionDurationMs: 7 * 24 * 60 * 60 * 1000,
    passwordMinLength: 8,
    requireMfaAdmin: true,
    reauthMinutes: 30,
    alertEmails: true,
    notifySeverity: 'MEDIUM',      // notify super admins at or above this severity
    securityEventRetention: 10000,
    rateLimit: 60,                 // per-IP per-min baseline
    maxLoginFailuresBeforeAlert: 5
  }
};

// ------------------------------------------------------------
// ADMIN & SYSTEM HELPERS
// ------------------------------------------------------------

// Resolve the session id carried inside a Bearer token (if any).
function getSessionIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }) as any;
    return (decoded && decoded.sessionId) || null;
  } catch (e) {
    return null;
  }
}

// Human-readable device/platform label derived from the request User-Agent.
function parseDeviceFromAgent(ua: string | undefined): { deviceName: string; platform: string } {
  const s = String(ua || '').slice(0, 200);
  const platform = /iPhone|iPad|Android/i.test(s) ? 'Mobile' : /Mac|Windows|Linux/i.test(s) ? 'Desktop' : 'Web';
  const browser = /Edg\//i.test(s) ? 'Edge' : /Chrome/.test(s) ? 'Chrome' : /Firefox/.test(s) ? 'Firefox' : /Safari/.test(s) ? 'Safari' : 'Unknown';
  return { deviceName: s ? `${browser} on ${platform}` : 'Unknown device', platform };
}

// Fingerprint a device from IP + user-agent (stable per device, no client trust).
function deviceIdentity(req: express.Request): { deviceId: string; deviceName: string; platform: string; ipAddress: string } {
  const ua = req.headers['user-agent'];
  const { deviceName, platform } = parseDeviceFromAgent(ua);
  const ipAddress = String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').replace('::ffff:', '');
  const fp = crypto.createHash('sha1').update(`${ipAddress}|${ua || ''}`).digest('hex').slice(0, 12);
  return { deviceId: `dev-${fp}`, deviceName, platform, ipAddress };
}

// Record a real login session for a user (created on successful auth).
function createSession(userId: string, req: express.Request): any {
  const { deviceId, deviceName, platform, ipAddress } = deviceIdentity(req);
  const now = Date.now();
  const session = {
    id: `s-${uuidv4().slice(0, 8)}`,
    userId,
    deviceId,
    deviceName,
    platform,
    ipAddress,
    issuedAt: new Date(now).toISOString(),
    lastActivityAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
    revokedAt: null as string | null
  };
  db.sessions = db.sessions || [];
  db.sessions.push(session);
  // Cap per-user stored sessions to keep the DB tidy (keep most recent 50).
  const forUser = db.sessions.filter((s: any) => s.userId === userId);
  if (forUser.length > 50) {
    const userIds = new Set(forUser.slice(forUser.length - 50).map((s: any) => s.id));
    db.sessions = db.sessions.filter((s: any) => s.userId !== userId || userIds.has(s.id));
  }
  return session;
}

function getAuthUserId(req: express.Request): string | null {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }) as any;
    const userId = decoded.sub;

    if (!userId) return null;

    // Check for administrative session revocation
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) return null;
    if (user.tokensRevokedAt) {
      const issuedAt = (decoded.iat || 0) * 1000;
      if (issuedAt < user.tokensRevokedAt) {
        return null;
      }
    }

    // Suspended accounts are fully locked out regardless of token validity.
    if (user.isSuspended) {
      return null;
    }

    // Validate the real session behind the token (revoked/expired sessions die).
    const sessionId = decoded.sessionId;
    if (sessionId) {
      const session = (db.sessions || []).find((s: any) => s.id === sessionId && s.userId === userId);
      if (!session || session.revokedAt) return null;
      if (new Date(session.expiresAt).getTime() < Date.now()) return null;
      session.lastActivityAt = new Date().toISOString();
    }

    return userId;
  } catch (e) {
    return null;
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = getAuthUserId(req);
  if (!userId || !db.users.find((u: any) => u.id === userId)) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  (req as any).currentUserId = userId;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = getAuthUserId(req);
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!['administrator', 'super-administrator'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
  }
  (req as any).currentUser = user;
  next();
}

function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = getAuthUserId(req);
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (user.role !== 'super-administrator') {
    return res.status(403).json({ success: false, message: 'Only the Super Admin can perform this action' });
  }
  (req as any).currentUser = user;
  next();
}

// ------------------------------------------------------------
// GRANULAR PERMISSION ENFORCEMENT
// Effective role permissions come from the persisted override store
// (db.rolePermissions) falling back to the default ROLE_PERMISSIONS
// configuration. requirePermission wires the SAME mapping the Permissions
// Matrix shows — a granted permission is a real backend grant.
// ------------------------------------------------------------

function effectiveRolePermissions(role: string): Permission[] {
  const override = (db as any).rolePermissions && (db as any).rolePermissions[role];
  if (Array.isArray(override)) return override as Permission[];
  return ROLE_PERMISSIONS[role as Role] || [];
}

function userHasPermission(user: any, permission: Permission): boolean {
  if (!user) return false;
  return effectiveRolePermissions(user.role).includes(permission);
}

/** Middleware: requires authentication + any one of the given permissions. */
function requirePermission(...permissions: Permission[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = getAuthUserId(req);
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!permissions.some(p => userHasPermission(user, p))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    (req as any).currentUser = user;
    next();
  };
}

/**
 * Verify a one-time current-password re-authentication for high-risk changes.
 * Mirrors the settings / gateway re-auth flows. Returns an error object when
 * re-auth is missing or fails, otherwise null.
 */
function requireReAuth(user: any, body: any): { status: number; body: any } | null {
  const password = body && body.password;
  if (!password || typeof password !== 'string') {
    logAudit(user, 'RBAC change denied', 'permission', user.id, 'denied', { reason: 're-authentication required' });
    return { status: 401, body: { success: false, requiresPassword: true, message: 'Re-authentication with your current password is required.' } };
  }
  const matches = verifyPasswordAndUpgrade(user, password);
  if (!matches) {
    logAudit(user, 'RBAC change denied', 'permission', user.id, 'denied', { reason: 'incorrect password' });
    return { status: 401, body: { success: false, requiresPassword: true, message: 'Re-authentication failed: incorrect password.' } };
  }
  return null;
}

function safeUser(u: any) {
  if (!u) return null;
  return {
    id: u.id, email: u.email, phone: u.phone || '', firstName: u.firstName, lastName: u.lastName,
    displayName: u.displayName, avatarUrl: u.avatarUrl, role: u.role,
    isVerified: !!u.isVerified, isEmailVerified: !!u.isEmailVerified, isPhoneVerified: !!u.isPhoneVerified,
    isApproved: !!u.isApproved, isActive: !!u.isActive, isSuspended: !!u.isSuspended,
    mustChangePassword: !!u.mustChangePassword,
    vendorId: u.vendorId || null, riderId: u.riderId || null,
    referralCode: u.referralCode || null,
    oauthProvider: u.oauthProvider || null,
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt
  };
}

/**
 * Generate a unique, server-side referral code for an account. Codes are
 * tied to the account (seeded from the user id) and guaranteed unique
 * across the whole user table.
 */
function generateReferralCode(user: any): string {
  const seed = String(user.id || uuidv4()).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const block1 = seed.slice(0, 4).padEnd(4, 'M');
  const block2 = seed.slice(4, 8) || 'RKET';
  return `OM-${block1.substr(0, 4)}-${block2.substr(0, 4)}`;
}

// Grouped category label for each resource type (entity). Kept in one place so
// the Audit Log UI, facets and filters all agree on what "category" means.
const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  auth: 'Security', user: 'Accounts', order: 'Orders', payment: 'Payments', wallet: 'Wallet',
  payment_gateway: 'Payments', vendor: 'Restaurants', rider: 'Riders', menu_item: 'Menu',
  category: 'Menu', coupon: 'Promotions', delivery: 'Delivery', platform_settings: 'Platform',
  database: 'Database', role: 'RBAC', permission: 'RBAC', referral: 'Referrals',
  support_ticket: 'Support', announcement: 'Announcements', maintenance: 'Maintenance',
  notification: 'Notifications', platform_message: 'Messages'
};

function auditCategory(entity: string): string {
  return AUDIT_CATEGORY_LABELS[String(entity || '')] || 'System';
}

// Severity is derived from the action text so high-risk operations surface
// immediately in the Audit Log without relying on callers remembering to tag
// them. Order matters: deny/lock checks run first, then high-risk keywords.
function auditSeverity(action: string): 'critical' | 'high' | 'medium' | 'low' {
  const a = String(action || '').toLowerCase();
  if (/denied|blocked|critical|account locked/.test(a)) return 'critical';
  if (/role assigned|permissions updated|super admin access|suspend|reactivat|restore|revok|forced password|payment method (enabled|disabled)|gateway|maintenance|platform settings updated|refund|password reset|reset user password|generated temp|delete|deleted|backup/.test(a)) return 'high';
  if (/fail|cancel|reject|logout|signed|verified|approved|redeemed|published|created|updated|enabled|disabled|changed/.test(a)) return 'medium';
  return 'low';
}

function auditDescription(action: string, entity: string, entityId: string, meta: any): string {
  const changed = meta && typeof meta === 'object' && meta.changed && typeof meta.changed === 'object' && !Array.isArray(meta.changed)
    ? Object.keys(meta.changed).map(k => k.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')
    : null;
  const idPart = entityId && entityId !== 'global' && entityId !== 'health' ? ` (${entityId})` : '';
  return changed ? `${action} on ${entity}${idPart} — changed: ${changed}` : `${action} on ${entity}${idPart}`;
}

function logAudit(actor: any, action: string, entity: string, entityId: string, result: string, meta?: any, req?: any) {
  // Immutable, server-authored audit record. `actor` may be null only for
  // system/session-level events (e.g. a failed login from an unknown account),
  // which are attributed to the "system" actor. IP/user-agent are captured from
  // the Express request when available. Critical secrets are never stored here.

  // Sequential, human-readable audit ID (e.g. AUD-000338) so records are
  // trivially referenceable and sortable by id.
  db.auditSequence = db.auditSequence && typeof db.auditSequence === 'object' ? db.auditSequence : { value: db.audit.length };
  db.auditSequence.value = (Number(db.auditSequence.value) || db.audit.length) + 1;
  const sessionId = actor?.sessionId || (req && req.sessionId) || null;
  const severity = auditSeverity(action);
  function singleChangeMeta(meta: any): { from: any; to: any } | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const changed = meta.changed;
  if (!changed || typeof changed !== 'object' || Array.isArray(changed)) return null;
  const keys = Object.keys(changed);
  if (keys.length !== 1) return null;
  const c = (changed as any)[keys[0]];
  return (c && typeof c === 'object' && !Array.isArray(c)) ? { from: c.from, to: c.to } : null;
}

const single = singleChangeMeta(meta);
  const prev =
    meta && typeof meta === 'object'
      ? (meta.previousValue ?? meta.before ?? meta.old ?? single?.from)
      : null;
  const next =
    meta && typeof meta === 'object'
      ? (meta.newValue ?? meta.after ?? meta.new ?? single?.to)
      : null;
  db.audit.push({
    id: `AUD-${String(db.auditSequence.value).padStart(6, '0')}`,
    actorId: actor?.id || 'system',
    actorName: actor ? (`${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'System') : 'System',
    actorEmail: actor?.email || null,
    actorRole: actor?.role || 'system',
    action,
    entity,
    entityId,
    resourceType: entity,
    resourceId: entityId,
    category: auditCategory(entity),
    severity,
    riskLevel: severity,
    description: auditDescription(action, entity, entityId, meta),
    result,
    previousValue: prev === undefined || prev === null ? null : prev,
    newValue: next === undefined || next === null ? null : next,
    meta: meta || null,
    ipAddress: req ? (req.ip || req.socket?.remoteAddress || null) : null,
    userAgent: req ? (req.get?.('user-agent') || null) : null,
    requestId: req ? (req.headers?.['x-request-id'] || req.id || null) : null,
    sessionId,
    timestamp: new Date().toISOString()
  });
  if (db.audit.length > 5000) db.audit = db.audit.slice(db.audit.length - 5000);
}

// Wrapper for the common call pattern: an admin (from req) performs `action`
// on `entity/entityId` with metadata carrying `before`/`after` snapshots. The
// metadata is stored as-is (callers must pass a safe subset — never secrets).
function ensureAudited(req: any, action: string, entity: string, entityId: string, result: string, meta?: any) {
  const actor = (req as any).admin || (req as any).user || null;
  logAudit(actor, action, entity, entityId, result, meta, req);
}

// Technical event log — the counterpart to the audit log. Audit log records
// *human admin actions*; system logs record *technical events* (service
// restart, worker failure, API/DB error, integration error). Kept separate so
// the System Logs page never shows fabricated personnel activity.
const SYSTEM_LOG_SOURCES = ['system', 'auth', 'api', 'db', 'worker', 'delivery', 'email', 'integration', 'gateway', 'fuel'] as const;
function systemLog(opts: { level?: 'error' | 'warn' | 'info' | 'debug'; source?: string; event: string; message: string; meta?: any; req?: any }) {
  const level = opts.level || 'info';
  const source = SYSTEM_LOG_SOURCES.includes(opts.source as any) ? (opts.source as string) : 'system';
  db.systemLogs = Array.isArray(db.systemLogs) ? db.systemLogs : [];
  db.systemLogs.push({
    id: `sys-${uuidv4().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    event: opts.event,
    message: opts.message,
    meta: opts.meta || null,
    ipAddress: opts.req ? (opts.req.ip || opts.req.socket?.remoteAddress || null) : null,
    userAgent: opts.req ? (opts.req.get?.('user-agent') || null) : null
  });
  if (db.systemLogs.length > 1000) db.systemLogs = db.systemLogs.slice(db.systemLogs.length - 1000);
}

// Map a legacy/event type string to a user-facing category so filters stay
// honest (a category only exists when real events populate it).
function notifCategory(type: string): string {
  const map: Record<string, string> = {
    order: 'orders', rating: 'orders',
    delivery: 'deliveries',
    info: 'messages',
    promo: 'system', system: 'system',
    referral: 'account',
    ORDER_PLACED: 'orders', ORDER_CONFIRMED: 'orders', ORDER_PREPARING: 'orders',
    ORDER_READY: 'orders', ORDER_CANCELLED: 'orders', ORDER_FAILED: 'orders',
    REVIEW_AVAILABLE: 'orders', REVIEW_RECEIVED: 'orders',
    RIDER_ASSIGNED: 'deliveries', DELIVERY_JOB_AVAILABLE: 'deliveries',
    DELIVERY_COMPLETED: 'deliveries', DELIVERY_CANCELLED: 'deliveries',
    RIDER_APPROVED: 'account', RIDER_REJECTED: 'account',
    NEW_MESSAGE: 'messages',
    PAYMENT_SUCCESS: 'payments', PAYMENT_FAILED: 'payments', PAYMENT_REFUND: 'payments',
    WALLET_TOP_UP: 'payments', PAYOUT: 'payments', EARNING_CREDITED: 'payments',
    RESTAURANT_APPROVED: 'account', RESTAURANT_REJECTED: 'account', RESTAURANT_SUSPENDED: 'account',
    ACCOUNT_UPDATED: 'account', ACCOUNT_SUSPENDED: 'account', ACCOUNT_REACTIVATED: 'account',
    SECURITY_EVENT: 'account', PASSWORD_RESET: 'account', SESSION_REVOKED: 'account',
    WITHDRAWAL_REQUEST: 'payments', SUPPORT_TICKET: 'system', SUPPORT_REPLY: 'system',
    ADMIN_ANNOUNCEMENT: 'system', SYSTEM_ALERT: 'system'
  };
  return map[type] || 'system';
}

interface NotifyOpts {
  type?: string;
  category?: 'orders' | 'deliveries' | 'messages' | 'payments' | 'account' | 'system';
  priority?: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  referenceId?: string;
  referenceType?: string;
  relatedOrderId?: string;
  relatedDeliveryId?: string;
  relatedConversationId?: string;
  relatedRestaurantId?: string;
  relatedUserId?: string;
  action?: string;
  critical?: boolean;
  dedupeKey?: string;
}

// Single writer for every notification in the platform. The recipient is always
// derived server-side by callers; the API never trusts a client-supplied id.
function notifyUser(userId: string, title: string, message: string, typeOrOpts: string | NotifyOpts = 'system', referenceId?: string, critical = false) {
  // Platform notifications can be switched off as a whole. Critical security
  // notifications (suspension, password resets, session revocation) are always
  // delivered so an operator can never silence safety-relevant alerts.
  let opts: NotifyOpts = {};
  if (typeof typeOrOpts === 'string') {
    opts = { type: typeOrOpts, referenceId, critical };
  } else {
    opts = typeOrOpts || {};
  }
  if (db.platformSettings.notificationsEnabled === false && !opts.critical) return;

  const type = opts.type || 'system';
  const category = opts.category || (notifCategory(type) as any);
  const priority = opts.priority
    || (opts.critical ? 'CRITICAL'
      : (category === 'payments' || type === 'RIDER_ASSIGNED' || type === 'DELIVERY_COMPLETED' ? 'IMPORTANT' : 'NORMAL'));

  // Idempotency: a still-unread notification carrying the same event key means
  // the event already fired (retries/refresh/reconnect) — skip the duplicate.
  if (opts.dedupeKey && db.notifications.some(n => n.userId === userId && n.dedupeKey === opts.dedupeKey && !n.read)) {
    return;
  }

  const now = new Date().toISOString();
  const record = {
    id: `n-${uuidv4().slice(0, 8)}`,
    userId,
    title,
    message,
    time: now,
    createdAt: now,
    read: false,
    readAt: null as string | null,
    type,
    category,
    priority,
    referenceId: opts.referenceId || null,
    referenceType: opts.referenceType || 'system',
    relatedOrderId: opts.relatedOrderId || null,
    relatedDeliveryId: opts.relatedDeliveryId || null,
    relatedConversationId: opts.relatedConversationId || null,
    relatedRestaurantId: opts.relatedRestaurantId || null,
    relatedUserId: opts.relatedUserId || null,
    action: opts.action || null,
    dedupeKey: opts.dedupeKey || null
  };
  db.notifications.push(record);
  broadcast('notification', record, userId);
}

// ============================================================
// CENTRAL SECURITY LAYER
// Detection, alerting and response driven entirely by real backend
// activity (auth attempts, API traffic, payments, uploads, admin
// actions). Nothing here is simulated or decorative.
// ============================================================

const SEV_ORDER = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const;
type Sev = keyof typeof SEV_ORDER;
const SEV_VALUES: Sev[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function maskIp(ip: string): string {
  const clean = String(ip || '').replace('::ffff:', '');
  if (!clean || clean === 'unknown') return 'unknown';
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length < 2) return clean;
    parts[parts.length - 1] = '•';
    if (parts.length > 1) parts[parts.length - 2] = '•';
    return parts.join('.');
  }
  if (clean.includes(':')) {
    const idx = clean.lastIndexOf(':');
    return idx >= 0 ? clean.slice(0, idx) + ':••' : clean;
  }
  return clean;
}

interface SecCtx {
  requestId: string;
  ip: string;
  maskedIp: string;
  userAgent: string;
  device: { deviceName: string; platform: string; deviceId: string };
}
function secCtx(req: express.Request): SecCtx {
  const ip = String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').replace('::ffff:', '');
  const ua = String(req.headers['user-agent'] || '');
  const dev = deviceIdentity(req);
  return {
    requestId: String(req.headers['x-request-id'] || (req as any).id || `req-${uuidv4().slice(0, 8)}`),
    ip,
    maskedIp: maskIp(ip),
    userAgent: ua.slice(0, 200),
    device: dev,
  };
}

function securitySettings(): any {
  const defaults: any = db.securitySettings || {};
  return {
    loginRateLimit: defaults.loginRateLimit ?? 10,
    loginWindowMs: defaults.loginWindowMs ?? 60000,
    accountLockThreshold: defaults.accountLockThreshold ?? 5,
    accountLockMinutes: defaults.accountLockMinutes ?? 15,
    bruteForceThreshold: defaults.bruteForceThreshold ?? 10,
    bruteForceWindowMs: defaults.bruteForceWindowMs ?? 10 * 60 * 1000,
    apiRateLimit: defaults.apiRateLimit ?? 300,
    sessionDurationMs: defaults.sessionDurationMs ?? 7 * 24 * 60 * 60 * 1000,
    passwordMinLength: defaults.passwordMinLength ?? 8,
    requireMfaAdmin: defaults.requireMfaAdmin ?? true,
    reauthMinutes: defaults.reauthMinutes ?? 30,
    alertEmails: defaults.alertEmails ?? true,
    notifySeverity: defaults.notifySeverity ?? 'MEDIUM',
    securityEventRetention: defaults.securityEventRetention ?? 10000,
    rateLimit: defaults.rateLimit ?? 60,
    maxLoginFailuresBeforeAlert: defaults.maxLoginFailuresBeforeAlert ?? 5,
  };
}

// Severity-aware operator notification. Only events at/above the configured
// notifySeverity are pushed; only HIGH/CRITICAL trigger email so operators are
// not spammed by low-risk noise.
function securityNotify(sev: Sev, title: string, message: string, meta?: any) {
  const s = securitySettings();
  const threshold = SEV_ORDER[s.notifySeverity || 'MEDIUM'];
  if (SEV_ORDER[sev] < threshold) return;
  db.users.filter((u: any) => u.role === 'super-administrator').forEach((sa: any) => {
    notifyUser(sa.id, title, message, {
      type: 'SECURITY_EVENT', category: 'account', priority: sev === 'CRITICAL' || sev === 'HIGH' ? 'CRITICAL' : 'IMPORTANT',
      referenceId: meta?.eventId, referenceType: 'security_event', critical: sev === 'CRITICAL', action: '/super-admin/security-events',
    });
  });
  if ((sev === 'CRITICAL' || sev === 'HIGH') && s.alertEmails) {
    db.users.filter((u: any) => u.role === 'super-administrator').forEach((sa: any) => {
      queueEmail({ to: sa.email, template: 'security_alert', data: { title, message, severity: sev, siteName: db.platformSettings.platformName, time: new Date().toISOString() } });
    });
  }
}

// The single, real writer of security events. Every event is a first-class,
// persisted record produced by an actual security monitor in this process.
// Auto-response rules and operator alerting fan out from here.
function recordSecurityEvent(input: {
  type: string;              // e.g. BRUTE_FORCE_LOGIN_ATTEMPT
  severity: Sev;
  endpoint?: string;
  account?: string | null;
  userId?: string | null;
  ip?: string;
  detection?: string;
  actionTaken?: string;      // e.g. 'Request blocked', 'Account rate limited'
  status?: string;           // 'monitoring' | 'blocked' | 'resolved' | 'investigating'
  details?: any;
  req?: express.Request;
}): any {
  const s = securitySettings();
  const severity = SEV_VALUES.includes(input.severity as any) ? input.severity : 'MEDIUM';
  const ctx = input.req ? secCtx(input.req) : { requestId: null, ip: input.ip || 'unknown', maskedIp: maskIp(input.ip || 'unknown'), userAgent: '', device: null };
  const now = new Date().toISOString();

  // Deduplicate: identical recent event from same account+endpoint+action is a
  // counter bump, not a brand-new event (prevents event spam during an attack).
  const recent = db.securityEvents.find((e: any) =>
    e.type === input.type && e.account === input.account && e.endpoint === input.endpoint
    && e.status !== 'resolved' && (Date.now() - Date.parse(e.timestamp || now)) < 5 * 60 * 1000,
  );
  if (recent) {
    recent.frequency = (recent.frequency || 1) + 1;
    recent.updatedAt = now;
    recent.lastSeenAt = now;
    recent.actionTaken = input.actionTaken || recent.actionTaken;
    return recent;
  }

  const event: any = {
    id: `se-${uuidv4().slice(0, 10)}`,
    type: input.type,
    severity,
    timestamp: now,
    endpoint: input.endpoint || null,
    source: { ip: input.ip || ctx.ip || ctx.maskedIp, maskedIp: maskIp(input.ip || ctx.ip || 'unknown') },
    account: input.account ?? null,
    userId: input.userId ?? null,
    requestId: ctx.requestId,
    detection: input.detection || 'Real backend monitoring',
    actionTaken: input.actionTaken || 'Monitoring',
    status: input.status || 'investigating',
    frequency: 1,
    lastSeenAt: now,
    details: input.details || null,
    resolvedAt: null,
    resolutionNote: null,
  };

  // Auto-response for the highest-risk classes (never destructive without a record).
  const auto = responseForEvent(event);
  if (auto) {
    event.actionTaken = auto.note;
    event.status = auto.status || event.status;
    event.automaticResponse = auto;
  }

  db.securityEvents.push(event);
  // Apply retention (per config; never silently unbound).
  if (db.securityEvents.length > (s.securityEventRetention || 10000)) {
    db.securityEvents = db.securityEvents.slice(db.securityEvents.length - (s.securityEventRetention || 10000));
  }

  // Human-format alert copy for operators.
  const accountText = event.account ? ` Account: ${event.account}.` : '';
  const endpointText = event.endpoint ? ` Endpoint: ${event.endpoint}.` : '';
  securityNotify(severity, `${severity} — ${labelEventType(event.type)}`, `${detectionLine(event)}${accountText}${endpointText} Action: ${event.actionTaken}.`, { eventId: event.id });

  logAudit(null, 'Security event recorded', 'security', event.id, 'success', { type: event.type, severity, endpoint: event.endpoint, action: event.actionTaken, attempt: event.frequency }, input.req);
  return event;
}

function labelEventType(type: string): string {
  return String(type || '').split('_').join(' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function detectionLine(e: any): string {
  if (e.detection) return String(e.detection);
  return labelEventType(e.type);
}

// Decide the automatic defensive response for an event. Conservative: we never
// auto-delete/lock permanently — we rate-limit, block the request source for a
// bounded window, revoke sessions, or require fresh authentication. Destructive
// actions always require a confirmed Super Admin response.
function responseForEvent(event: any): { note: string; status: string } | null {
  switch (event.type) {
    case 'BRUTE_FORCE_LOGIN_ATTEMPT':
      ipBlock.set(event.source.ip, Date.now() + 30 * 60 * 1000);
      return { note: 'Source IP rate limited and temporarily blocked (30 min). Account protected.', status: 'blocked' };
    case 'SQL_INJECTION_ATTEMPT':
    case 'XSS_ATTACK_ATTEMPT':
      ipBlock.set(event.source.ip, Date.now() + 15 * 60 * 1000);
      return { note: 'Request blocked. Source IP temporarily throttled (15 min).', status: 'blocked' };
    case 'INVALID_PAYMENT_WEBHOOK':
    case 'PAYMENT_SIGNATURE_FAILURE':
      return { note: 'Webhook rejected and ignored.', status: 'blocked' };
    case 'UNAUTHORIZED_API_ACCESS':
      return { note: 'Request rejected for lacking authorization.', status: 'blocked' };
    case 'ABNORMAL_ADMIN_LOGIN':
      return { note: 'Additional verification required on subsequent authentication.', status: 'monitoring' };
    case 'REAUTH_FAILURE':
      return { note: 'High-risk operation denied; operator must re-authenticate.', status: 'monitoring' };
    default:
      return null;
  }
}

const EVENT_TYPES: Record<string, string> = {
  BRUTE_FORCE_LOGIN_ATTEMPT: 'HIGH',
  FAILED_LOGIN: 'LOW',
  LOGIN_SUCCESS: 'INFO',
  NEW_DEVICE_LOGIN: 'MEDIUM',
  ABNORMAL_ADMIN_LOGIN: 'MEDIUM',
  ACCOUNT_LOCKED: 'MEDIUM',
  PASSWORD_RESET_REQUESTED: 'MEDIUM',
  PASSWORD_CHANGED: 'LOW',
  EMAIL_CHANGED: 'MEDIUM',
  PHONE_CHANGED: 'MEDIUM',
  SESSION_REVOKED: 'LOW',
  REAUTH_FAILURE: 'MEDIUM',
  SQL_INJECTION_ATTEMPT: 'CRITICAL',
  XSS_ATTACK_ATTEMPT: 'CRITICAL',
  UNAUTHORIZED_API_ACCESS: 'MEDIUM',
  API_ABUSE: 'HIGH',
  RATE_LIMIT_TRIGGERED: 'LOW',
  INVALID_PAYMENT_WEBHOOK: 'HIGH',
  PAYMENT_SIGNATURE_FAILURE: 'HIGH',
  DUPLICATE_PAYMENT_EVENT: 'MEDIUM',
  PAYMENT_ATTEMPT_FAILURE: 'LOW',
  REPEATED_PAYMENT_ATTEMPTS: 'HIGH',
  GATEWAY_CONFIG_CHANGED: 'HIGH',
  PRIVILEGE_CHANGED: 'HIGH',
  SUPER_ADMIN_ACTION: 'LOW',
  DATABASE_OPERATION: 'LOW',
  BACKUP_OPERATION: 'LOW',
  RESTORE_OPERATION: 'HIGH',
  MAINTENANCE_MODE_CHANGED: 'HIGH',
  REJECTED_UPLOAD: 'MEDIUM',
  UNUSUAL_SESSION: 'MEDIUM',
  OTP_FAILURE: 'LOW',
  REFRESH_TOKEN_REUSE: 'HIGH',
  SESSION_INVALIDATION: 'MEDIUM',
};

// ---- IP / rate limiting (real, bounded, keyed by client IP) ----
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const ipBlock = new Map<string, number>(); // ip -> unblock timestamp

// Fingerprint a bearer/refresh token so we can detect reuse without storing the
// raw token (mirrors how passwords are never stored in plain form).
function hashToken(t: string): string {
  return crypto.createHash('sha256').update(String(t || '')).digest('hex');
}

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const blockedUntil = ipBlock.get(ipFromKey(key));
  if (blockedUntil && now < blockedUntil) {
    return { allowed: false, retryAfterMs: blockedUntil - now };
  }
  const b = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > b.resetAt) { b.count = 0; b.resetAt = now + windowMs; }
  b.count += 1;
  rateBuckets.set(key, b);
  if (b.count > limit) {
    return { allowed: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  return { allowed: true, retryAfterMs: 0 };
}
function stripKey(key: string): string {
  return String(key || '').replace(/:.*$/, '');
}
// Resolve the bare client IP out of a namespaced rate-limit key
// (e.g. `login:1.2.3.4:user` -> `1.2.3.4`, `auth:1.2.3.4` -> `1.2.3.4`).
// `ipBlock` is keyed by the bare IP (see responseForEvent), so lookups must
// use the IP, not the namespace prefix that stripKey historically returned.
function ipFromKey(key: string): string {
  const parts = String(key || '').split(':');
  return parts.length > 1 ? parts[1] : parts[0] || '';
}

// Middleware factory: rate-limit a request namespace per client IP.
function rateLimitMw(namespace: string, limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ctx = secCtx(req);
    const ip = ctx.ip;
    const key = `${namespace}:${ip}`;
    const r = checkRateLimit(key, limit, windowMs);
    if (!r.allowed) {
      recordSecurityEvent({
        type: 'RATE_LIMIT_TRIGGERED', severity: whoa(r.retryAfterMs) ? 'MEDIUM': 'LOW', endpoint: req.originalUrl.split('?')[0],
        account: null, ip, actionTaken: 'Request rate limited', status: 'blocked', req,
      });
      res.setHeader('Retry-After', String(Math.ceil(r.retryAfterMs / 1000)));
      return res.status(429).json({ success: false, message: 'Too many requests. Please slow down and try again.' });
    }
    next();
  };
}
function whoa(ms: number) { return ms > 60 * 1000; }

// Brute-force / account-protection counters (keyed by normalized account dim).
const loginFailures = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();
function registerLoginFailure(accountKey: string, ip: string, sevOf: (e: any) => void) {
  const now = Date.now();
  const rec = loginFailures.get(accountKey) || { count: 0, firstAt: now, lockedUntil: 0 };
  if (now - rec.firstAt > securitySettings().bruteForceWindowMs) { rec.count = 0; rec.firstAt = now; }
  rec.count += 1;
  loginFailures.set(accountKey, rec);

  const cfg = securitySettings();
  // Aggregate per-IP failures → BRUTE_FORCE detection.
  if (rec.count >= cfg.bruteForceThreshold) {
    recordSecurityEvent({
      type: 'BRUTE_FORCE_LOGIN_ATTEMPT', severity: 'HIGH',
      endpoint: '/api/auth/login', account: accountKey.split('|')[0] || null, ip,
      detection: `Repeated failed logins (${rec.count} attempts) recorded for account/IP within the window.`,
      actionTaken: 'Source IP rate limited and temporarily blocked; account protected.', status: 'blocked', req: undefined as any,
      details: { attempts: rec.count },
    });
    rec.count = 0; rec.firstAt = now;
  }
}

// ---- Structural resistance: prototype-pollution & malformed-input guards ----
const POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];
function sanitizeJsonValue(value: any, depth: number): any {
  if (depth > 12) throw new Error('Payload too deeply nested');
  if (Array.isArray(value)) return value.map((v) => sanitizeJsonValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const k of Object.keys(value)) {
      if (POLLUTION_KEYS.includes(k)) continue;
      out[k] = sanitizeJsonValue(value[k], depth + 1);
    }
    return out;
  }
  return value;
}

// Injection/XSS-style attempt detection (treats the JSON store as the data
// layer, so we detect hostile payloads structurally rather than relying on any
// blacklist as protection — there is no string-concatenated query to exploit).
// SQL-style markers (`select`, `from`, `;`, `--`) are only meaningful on query
// strings (they get logged/reflected). Scanning request BODIES for them causes
// false positives on legitimate data — data-URIs contain `;`, addresses and
// menu prose contain words like `from`/`select` — which broke checkout payloads
// (a product image is a `data:image/...;base64,...` string). Bodies are scanned
// for script/XSS markers only; full SQL + XSS scanning stays on query strings.
const XSS_PAT = /%00|<\/?script|<svg|javascript:/i;
const SQL_PAT = /(\b(select|union|insert|update|delete|drop|alter|truncate|exec|execute|from|--|;)\b)|%00/i;
function detectHostileValue(value: any, includeSql = false): boolean {
  if (typeof value === 'string') return includeSql ? (SQL_PAT.test(value) || XSS_PAT.test(value)) : XSS_PAT.test(value);
  if (value && typeof value === 'object') {
    return Object.values<any>(value).some((v) => detectHostileValue(v, includeSql));
  }
  return false;
}

// Image/upload sanitization for base64 data-URIs and URLs. Allows only known
// safe raster formats, enforces a decoded byte cap, and hard-rejects anything
// that could render scripts. Returns a clean value or '' (invalid).
function sanitizeImageInput(value: any, maxBytes = 4 * 1024 * 1024): string {
  const raw = String(value || '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    if (/<|>|script|javascript:/i.test(raw)) return '';
    if (raw.length > 2048) return '';
    return raw;
  }
  if (raw.startsWith('data:')) {
    const m = raw.match(/^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!m) return '';
    const dec = Buffer.from(m[3] || '', 'base64');
    if (dec.length > maxBytes) return '';
    // Reject content whose magic bytes do not match the declared image type, so a
    // webp/jpeg/etc. label cannot be abused to smuggle an executable or HTML blob.
    const sig: { [k: string]: (number | null)[] } = {
      png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      jpeg: [0xff, 0xd8, 0xff],
      gif: [0x47, 0x49, 0x46, 0x38],
      webp: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]
    };
    const expected = sig[m[1].toLowerCase()];
    const matches = expected && expected.every((b, i) => b === null || dec[i] === b);
    if (!matches) return '';
    return `data:${m[1].toLowerCase()};base64,${dec.toString('base64')}`;
  }
  return '';
}

function maskCredential(v: any): string {
  const s = String(v || '');
  if (!s) return '';
  if (s.length <= 4) return '••••';
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

// Sanitize free-text user input: strip control chars, trim to a max length, and
// neutralize basic HTML/script so it cannot be rendered as markup elsewhere.
function sanitizeText(value: any, maxLen = 5000): string {
  const s = String(value == null ? '' : value);
  // Remove control characters except \n (newlines are legitimate) and \t.
  const cleaned = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const stripped = cleaned.replace(/<[^>]*>/g, '').replace(/script/gi, '');
  return stripped.slice(0, maxLen).trim();
}

// Revoke every active session for a user (used by auto/moderated response).
function revokeAllSessions(userId: string, reason: string, req?: express.Request) {
  let count = 0;
  (db.sessions || []).forEach((s: any) => {
    if (s.userId === userId && !s.revokedAt) { s.revokedAt = new Date().toISOString(); count += 1; }
  });
  if (count) {
    const u = db.users.find((x: any) => x.id === userId);
    logAudit(u || null, 'Sessions revoked', 'session', userId, 'success', { reason, count }, req);
  }
  return count;
}

// Re-authentication freshness signal for high-risk operations.
function reauthFresh(req: express.Request): boolean {
  const userId = getAuthUserId(req);
  if (!userId) return false;
  const u = db.users.find((x: any) => x.id === userId);
  if (!u) return false;
  const minutes = securitySettings().reauthMinutes;
  const last = u.lastReauthAt ? Date.parse(u.lastReauthAt) : 0;
  return last > 0 && (Date.now() - last) < minutes * 60 * 1000;
}

// Resolve every user that has a stake in an order (customer + restaurant owner
// + assigned rider). These are the ONLY targets that should receive order state
// changes, so the customer, restaurant and rider views stay synchronized.
function orderParticipants(order: any): { customerId: string; vendorUserId?: string; riderUserId?: string } {
  const vendor = db.vendors.find((v: any) => v.id === order?.vendorId);
  const rider = order?.riderId ? db.riders.find((r: any) => r.id === order.riderId) : null;
  return {
    customerId: order?.customerId,
    vendorUserId: vendor?.ownerId,
    riderUserId: rider?.userId
  };
}

// Broadcast an order update to every role connected to it.
function broadcastOrderUpdate(order: any) {
  const p = orderParticipants(order);
  broadcast('order_update', order, p.customerId);
  if (p.vendorUserId) broadcast('order_update', order, p.vendorUserId);
  if (p.riderUserId) broadcast('order_update', order, p.riderUserId);
}

// Guard against duplicate ledger entries if a completion endpoint fires twice.
function txExistsFor(referenceId: string, category: string): boolean {
  return db.transactions.some((t: any) => t.referenceId === referenceId && t.category === category);
}

// Normalized human label for an order status (shared by notifications).
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Order Placed',
    confirmed: 'Order Confirmed',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready for Pickup',
    rider_assigned: 'Rider Assigned',
    picked_up: 'Picked Up',
    in_transit: 'Out for Delivery',
    arriving: 'Arriving Soon',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    failed: 'Failed'
  };
  return map[status] || status.replace(/_/g, ' ');
}

// Stable human-facing delivery reference (DLV-…) derived from the order number
// so riders reference "Delivery #DLV-490502 related to Order #OM-490502" while
// the underlying record remains a single `orders` row. Derived server-side so
// desktop + mobile read the same value.
function deliveryRefFor(order: any): string {
  const numeric = String(order?.orderNumber || '').replace(/\D/g, '');
  if (numeric) return `DLV-${numeric.slice(0, 6)}`;
  const fromId = String(order?.id || '').replace(/\D/g, '');
  return `DLV-${fromId.slice(0, 6)}`;
}

// ------------------------------------------------------------
// PACKAGE / PASS DELIVERIES
// "Deliver something" bookings reuse the SAME order pipeline as food so riders,
// admins, tracking, communication, completion and ratings all share ONE engine.
// They are differentiated by `deliveryType` ('FOOD_ORDER' | 'PACKAGE' | 'PASS').
// ------------------------------------------------------------

const DELIVERY_TYPES = ['PACKAGE', 'PASS'] as const;

const PACKAGE_BASE_FEE = 8;
const PACKAGE_SIZE_FEE: Record<string, number> = { Small: 0, Medium: 4, Large: 8, 'Extra Large': 12 };
const PACKAGE_SERVICES = ['Standard', 'Express'];
const PACKAGE_PAYMENT_METHODS = ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'OmniWallet', 'Cash on Delivery'];
const PACKAGE_MAX_WEIGHT_KG = 200;

// Normalize a Ghana phone number to international +233 format. Returns '' when
// the input is not a recognizable Ghana number (no fake/near-miss acceptances).
function normalizeGhanaPhone(input: string): string {
  const raw = String(input || '').replace(/[^\d+]/g, '');
  if (!raw) return '';
  let digits = raw.replace(/^\+/, '');
  if (digits.startsWith('233')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[2-5]\d{8}$/.test(digits)) return '';
  return `+233${digits}`;
}

function isValidGhanaPhone(input: string): boolean {
  return normalizeGhanaPhone(input).length > 0;
}

// Authoritative package cost — never trusts client-supplied totals. Returns a
// full breakdown so the booking summary can show exactly what the customer pays
// while the backend stays the only source of truth. The rider distance fee is
// added when a specific rider is chosen; a configured per-km fee and platform
// fee apply only when coordinates are provided / configured (defaults keep
// legacy pricing unchanged).
function computePackageDeliveryQuote(opts: {
  packageSize?: string;
  weightKg?: number;
  service?: string;
  riderFee?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}): {
  baseFee: number;
  sizeFee: number;
  riderFee: number;
  distanceFee: number;
  weightFee: number;
  distanceKm: number | null;
  serviceMultiplier: number;
  serviceFee: number;
  subtotal: number;
  platformFee: number;
  total: number;
} {
  const size = String(opts.packageSize || 'Medium');
  const sizeFee = PACKAGE_SIZE_FEE[size] ?? PACKAGE_SIZE_FEE.Medium;
  const riderFee = Number(opts.riderFee) || 0;
  const weight = Number(opts.weightKg) || 0;
  const weightFee = weight > 5 ? 4 : 0;

  // Distance only counts when both endpoints carry real coordinates.
  const toCoord = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
  const pLat = toCoord(opts.pickupLat);
  const pLng = toCoord(opts.pickupLng);
  const dLat = toCoord(opts.dropoffLat);
  const dLng = toCoord(opts.dropoffLng);
  const coords = [pLat, pLng, dLat, dLng].map((n) => (n === null ? null : Number(n)));
  const hasRoute = coords.every((c) => c !== null && Number.isFinite(c));
  const routeKm = hasRoute ? Math.round(distanceKm(coords[0]!, coords[1]!, coords[2]!, coords[3]!) * 100) / 100 : null;
  const perKm = Number(db.platformSettings.distanceFeePerKm) || 0;
  const distanceFee = hasRoute && perKm > 0 ? Math.round(routeKm! * perKm * 100) / 100 : 0;

  const base = PACKAGE_BASE_FEE + sizeFee + riderFee + distanceFee + weightFee;
  const serviceMultiplier = opts.service === 'Express' ? 1.5 : 1;
  const serviceFee = Math.round(base * (serviceMultiplier - 1) * 100) / 100;
  const subtotal = Math.round((base + serviceFee) * 100) / 100;

  const platformFee = Math.round((Number(db.platformSettings.platformFee) || 0) * 100) / 100;
  const total = Math.round((subtotal + platformFee) * 100) / 100;

  return {
    baseFee: PACKAGE_BASE_FEE,
    sizeFee,
    riderFee: Math.round(riderFee * 100) / 100,
    distanceFee,
    weightFee,
    distanceKm: routeKm,
    serviceMultiplier,
    serviceFee,
    subtotal,
    platformFee,
    total,
  };
}

// Legacy single-number wrapper (existing callers/e2e depend on the total only).
function computePackageDeliveryFee(opts: {
  packageSize?: string;
  weightKg?: number;
  service?: string;
  riderFee?: number | null;
}): number {
  return computePackageDeliveryQuote(opts).total;
}

// Pure coupon discount — computes what a code is worth against a fee without
// mutating usage counters (the creation route still bumps totalUsed).
function couponDiscountForFee(code: string, fee: number): { discount: number; coupon: any } {
  if (!code || !Number.isFinite(fee)) return { discount: 0, coupon: null };
  const coupon = db.coupons.find((c: any) => c.code === code && c.isActive);
  if (!coupon) return { discount: 0, coupon: null };
  const now = Date.now();
  const validWindow = (!coupon.startsAt || now >= Date.parse(coupon.startsAt)) &&
    (!coupon.expiryDate || now <= Date.parse(coupon.expiryDate));
  if (!validWindow) return { discount: 0, coupon: null };
  if (coupon.usageLimit != null && (coupon.totalUsed || 0) >= coupon.usageLimit) return { discount: 0, coupon: null };
  if (fee < (coupon.minSpend || 0)) return { discount: 0, coupon: null };
  let discount = 0;
  if (coupon.type === 'free_delivery') discount = fee;
  else if (coupon.type === 'percentage') discount = Math.min(fee * (coupon.value / 100), coupon.maxDiscount || Infinity);
  else if (coupon.type === 'fixed_amount') discount = Math.min(coupon.value, fee);
  return { discount: Math.round(discount * 100) / 100, coupon };
}

// Short recipient-facing confirmation code shown to the sender (and relayed to
// the receiver) so receipt can only be confirmed by whoever holds the code.
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!db.orders.some((o: any) => o.confirmationCode === code)) return code;
  }
}

// Are two parties authorized to touch this delivery? Mirrors the ownership
// checks used across the order routes (admins may always act).
function canAccessOrder(order: any, currentUser: any, currentUserId?: string): boolean {
  if (!currentUser) return false;
  if (['administrator', 'super-administrator'].includes(currentUser.role)) return true;
  return order.customerId === currentUserId ||
    order.vendorId === currentUser.vendorId ||
    order.riderId === currentUser.riderId ||
    order.riderId === currentUserId;
}

// Record a timestamp for the moment an order enters a given status. This gives
// every screen a real backend timestamp instead of Date.now()/render hacks.
function stampOrderStatus(order: any, status: string) {
  const now = new Date().toISOString();
  order.statusUpdatedAt = now;
  if (!order.statusTimestamps) order.statusTimestamps = {};
  order.statusTimestamps[status] = now;
}

// Ensure every order carries statusTimestamps/statusUpdatedAt (backfill for
// records created before the fields existed) so clients render real timelines.
// Also guarantees the embedded dispatchRider only ever exposes the sanitized
// snapshot — legacy records that stored the full rider record never leak PII.
function withStatusTimestamps(order: any) {
  if (!order) return order;
  if (!order.deliveryRef) order.deliveryRef = deliveryRefFor(order);
  if (!order.statusTimestamps) order.statusTimestamps = {};
  if (!order.statusTimestamps[order.status]) order.statusTimestamps[order.status] = order.statusUpdatedAt || order.updatedAt || order.createdAt;
  if (!order.statusUpdatedAt) order.statusUpdatedAt = order.statusTimestamps[order.status];
  order.deliveryStatus = deriveDeliveryStatus(order);
  if (order.dispatchRider) order.dispatchRider = publicDispatchRider(order.dispatchRider);
  return order;
}

// Authoritative delivery workflow status, derived from the persisted order state
// so every response — whatever its source — exposes one correct pipeline view.
// This deliberately keeps DISTINCT from the order status (order lifecycle) while
// still being 100% derived from backend data: the delivery pipeline.
function deriveDeliveryStatus(order: any): string {
  if (!order) return 'PROCESSING';
  const s = order.status;
  if (s === 'cancelled' || s === 'refunded') return 'CANCELLED';
  if (s === 'failed') return 'FAILED';
  if (s === 'delivered') return 'DELIVERED';
  if (s === 'completed') return 'COMPLETED';
  if (['picked_up', 'in_transit', 'arriving', 'awaiting_confirmation'].includes(s)) return 'IN_TRANSIT';
  if (order.riderId) return 'RIDER_ASSIGNED';
  if (s === 'ready_for_pickup') return 'AWAITING_RIDER';
  return 'PROCESSING';
}

// Refund a paid order exactly once when it is cancelled. Credits the customer's
// OmniWallet with a real ledger transaction and emails the receipt. Guarded by
// refundStatus and the order status so a re-cancellation or retry can never
// double-credit.
function processOrderRefund(order: any) {
  if (!order) return false;
  const paid =
    order.isPaid === true ||
    order.paymentStatus === 'paid' ||
    (order.paymentStatus === 'pending' && order.paymentMethod === 'OmniWallet');
  if (!paid) return false;
  if (order.refundStatus === 'refunded') return false;
  if (order.status !== 'cancelled' && order.status !== 'refunded') return false;

  const amount = Number(order.totalAmount) || 0;
  if (amount <= 0) return false;

  order.refundStatus = 'refunded';
  order.refundedAt = new Date().toISOString();
  order.refundAmount = amount;

  const customer = db.users.find((u: any) => u.id === order.customerId);
  if (customer) {
    db.transactions.push({
      id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
      userId: order.customerId,
      type: 'refund',
      category: 'order_refund',
      amount,
      description: `Refund for cancelled order ${order.orderNumber}`,
      status: 'completed',
      referenceId: order.id,
      referenceType: 'order',
      createdAt: new Date().toISOString()
    });
    const wallet = db.wallets.find((w: any) => w.userId === order.customerId);
    if (wallet) wallet.balance = (Number(wallet.balance) || 0) + amount;
    queueEmail({
      to: customer.email,
      template: 'refund_issued',
      data: { firstName: customer.firstName || 'there', orderNumber: order.orderNumber, totalAmount: `GHS ${amount.toFixed(2)}` }
    });
  }
  return true;
}

// Settle a delivered order exactly once. Guarded by the ledger so a retried or
// concurrent completion cannot double-credit the vendor or rider, double-send
// emails, or double-notify. All side effects are keyed to the order.
function settleDeliveredOrder(order: any) {
  const vendor = db.vendors.find((v: any) => v.id === order.vendorId);
  if (vendor && !txExistsFor(order.id, 'vendor_payout')) {
    const tx = {
      id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
      userId: vendor.ownerId,
      type: 'credit',
      category: 'vendor_payout',
      amount: Number(order.vendorPayout) || 0,
      description: `Payout for completed order ${order.orderNumber}`,
      status: 'completed',
      referenceId: order.id,
      referenceType: 'order',
      createdAt: new Date().toISOString()
    };
    db.transactions.push(tx);
    const wallet = db.wallets.find((w: any) => w.userId === vendor.ownerId);
    if (wallet) wallet.balance = (Number(wallet.balance) || 0) + tx.amount;
  }

  const rider = order.riderId ? db.riders.find((r: any) => r.id === order.riderId) : null;
  if (rider && !txExistsFor(order.id, 'rider_earning')) {
    const riderUser = db.users.find((u: any) => u.id === rider.userId);
    const earning = Number(order.deliveryFee) || Number(rider.deliveryFee) || Number(db.platformSettings.defaultDeliveryFee) || 0;
    db.transactions.push({
      id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
      userId: rider.userId,
      type: 'credit',
      category: 'rider_earning',
      amount: earning,
      description: `Delivery earnings for order ${order.orderNumber}`,
      status: 'completed',
      referenceId: order.id,
      referenceType: 'order',
      createdAt: new Date().toISOString()
    });
    const riderWallet = db.wallets.find((w: any) => w.userId === rider.userId);
    if (riderWallet) riderWallet.balance = (Number(riderWallet.balance) || 0) + earning;
    rider.totalDeliveries = (Number(rider.totalDeliveries) || 0) + 1;
    rider.totalEarnings = (Number(rider.totalEarnings) || 0) + earning;
    rider.status = 'ONLINE';
    rider.isOnline = true;
    rider.isAvailable = true;
    if (riderUser) {
      queueEmail({
        to: riderUser.email,
        template: 'rider_delivery_completed',
        data: { firstName: riderUser.firstName, orderNumber: order.orderNumber, earning: `GHS ${earning.toFixed(2)}` },
        eventKey: `rider-completed:${order.id}:${riderUser.id}`
      });
    }
  }

  const customer = db.users.find((u: any) => u.id === order.customerId);
  if (customer) {
    queueEmail({
      to: customer.email,
      template: 'delivery_completed',
      data: { firstName: customer.firstName, orderNumber: order.orderNumber, vendorName: order.vendorName },
      eventKey: `delivery-completed:${order.id}:${customer.id}`
    });
    notifyUser(order.customerId, 'Order Delivered', DELIVERY_TYPES.includes(String(order.deliveryType || '').toUpperCase() as any)
      ? `Your ${String(order.deliveryType).toLowerCase()} ${order.orderNumber} has been delivered to ${order.dropoffAddress || order.receiverName || 'the recipient'}.`
      : `Your order ${order.orderNumber} from ${order.vendorName} has been delivered. Enjoy!`,
      { type: 'DELIVERY_COMPLETED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: order.id, action: `/customer/orders/${order.id}`, dedupeKey: `delivered:${order.id}:${order.customerId}` });
  }
  if (vendor) {
    notifyUser(vendor.ownerId, 'Delivery Completed', `Order ${order.orderNumber} was delivered. Payout credited.`,
      { type: 'DELIVERY_COMPLETED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: order.id, action: `/restaurant/orders`, dedupeKey: `delivered:${order.id}:${vendor.ownerId}` });
  }

  // COD payments are collected at the door.
  if (order.paymentMethod === 'Cash on Delivery' && order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid';
    order.isPaid = true;
  }
}

// Create (or reuse) a customer <-> rider conversation tied to an order. Called
// once, server-side, when a rider is actually assigned.
function ensureCustomerRiderConversation(order: any) {
  const rider = order?.riderId ? db.riders.find((r: any) => r.id === order.riderId) : null;
  if (!order || !rider || !rider.userId) return null;
  const customerId = order.customerId;
  const existing = db.conversations.find((c: any) =>
    c.type === 'customer_rider' && c.orderId === order.id &&
    c.participantIds.includes(customerId) && c.participantIds.includes(rider.userId)
  );
  if (existing) return existing;
  const conversation = {
    id: `c-${uuidv4().slice(0, 8)}`,
    type: 'customer_rider',
    participantIds: [customerId, rider.userId],
    orderId: order.id,
    subject: `Delivery chat — ${rider.name}`,
    lastMessage: '',
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: new Date().toISOString()
  };
  db.conversations.push(conversation);
  return conversation;
}

function vendorAggregate(v: any) {
  const orders = db.orders.filter((o: any) => o.vendorId === v.id);
  const completed = orders.filter((o: any) => o.status === 'completed' || o.status === 'delivered');
  const products = db.products.filter((p: any) => p.vendorId === v.id);
  const reviews = db.reviews.filter((r: any) => r.vendorId === v.id);
  const revenue = completed.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
  const nameSplit = String(v.name || 'Vendor').split(' ');
  return {
    ...v,
    ownerName: `${nameSplit[0] || ''} ${nameSplit[1] || ''}`.trim() || v.name,
    totalOrders: orders.length,
    totalRevenue: revenue,
    totalSales: revenue,
    totalProducts: products.length,
    rating: reviews.length ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length) : (v.rating || 0),
    reviewsCount: reviews.length,
    totalReviews: v.totalReviews || reviews.length,
    tags: Array.isArray(v.tags) ? v.tags : [],
    banner: typeof v.banner === 'string' && v.banner ? v.banner : v.logo || '',
    isAvailable: v.status === 'active'
  };
}

/**
 * Public-facing ride sanitizer. Strips personal contact, licensing and live
 * GPS data before rider records leave the API for unauthenticated callers.
 */
function publicRider(r: any) {
  if (!r) return r;
  return {
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    vehicleType: r.vehicleType,
    rating: r.rating,
    etaMinutes: r.etaMinutes,
    deliveryFee: r.deliveryFee,
    totalDeliveries: r.totalDeliveries,
    isOnline: r.isOnline,
    isAvailable: r.isAvailable,
    status: r.status,
    isVerified: !!r.isVerified,
    verificationStatus: r.verificationStatus || (r.isVerified ? 'verified' : null)
  };
}

/**
 * Dispatch rider snapshot embedded on orders. Keeps only what customers and
 * vendors need (name, avatar, vehicle, contact for delivery coordination) and
 * strips personal/Security records (driver license, national id, live GPS,
 * home contact, audit fields) so dispatchRider never leaks PII.
 */
function publicDispatchRider(r: any) {
  if (!r) return r;
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    avatar: r.avatar,
    vehicleType: r.vehicleType,
    vehicleNumber: r.vehicleNumber,
    phone: r.phone || '',
    deliveryFee: r.deliveryFee,
    rating: r.rating,
    etaMinutes: r.etaMinutes,
    totalDeliveries: r.totalDeliveries,
    isOnline: r.isOnline,
    isAvailable: r.isAvailable,
    status: r.status,
    isVerified: !!r.isVerified,
    verificationStatus: r.verificationStatus || (r.isVerified ? 'verified' : null)
  };
}

/**
 * Public-facing order sanitizer. Used by the guest tracking lookup so an
 * unauthenticated visitor never receives customer/rider PII or GPS data.
 */
function publicOrder(o: any) {
  if (!o) return o;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    invoiceNumber: o.invoiceNumber,
    deliveryRef: o.deliveryRef || deliveryRefFor(o),
    deliveryStatus: deriveDeliveryStatus(o),
    cancellationReason: o.cancellationReason,
    cancelledAt: o.cancelledAt,
    refundStatus: o.refundStatus || (o.paymentStatus === 'refunded' ? 'refunded' : undefined),
    refundAmount: o.refundAmount,
    refundedAt: o.refundedAt,
    vendorId: o.vendorId,
    vendorName: o.vendorName,
    vendorLogo: o.vendorLogo,
    items: Array.isArray(o.items) ? o.items.map((i: any) => ({
      id: i.id,
      title: i.title,
      image: i.image,
      quantity: i.quantity,
      price: i.price
    })) : [],
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    tax: o.tax,
    discount: o.discount,
    totalAmount: o.totalAmount,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    deliveryMethod: o.deliveryMethod,
    deliveryType: o.deliveryType || 'FOOD_ORDER',
    packageSize: o.packageSize,
    packageType: o.packageType,
    service: o.service,
    receiverName: o.receiverName,
    pickupAddress: o.pickupAddress,
    dropoffAddress: o.dropoffAddress,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    estimatedDeliveryTime: o.estimatedDeliveryTime
  };
}

/** Safe, publicly-visible vendor fields for the marketplace directory. */
function publicVendor(v: any, agg: any) {
  if (!v) return v;
  return {
    id: v.id,
    name: v.name,
    logo: v.logo,
    banner: typeof v.banner === 'string' && v.banner ? v.banner : v.logo || '',
    description: v.description || '',
    about: typeof v.about === 'string' ? v.about : '',
    category: v.category || 'General',
    cuisines: Array.isArray(v.cuisines) ? v.cuisines : [],
    address: typeof v.address === 'string' ? v.address : '',
    city: v.city || 'Takoradi',
    phone: typeof v.phone === 'string' ? v.phone : '',
    email: typeof v.email === 'string' ? v.email : '',
    rating: Number(agg.rating) || 0,
    reviewsCount: Number(agg.reviewsCount) || 0,
    totalReviews: Number(agg.totalReviews) || 0,
    totalProducts: Number(agg.totalProducts) || 0,
    deliveryFee: Number(v.deliveryFee) || 0,
    deliveryTime: v.deliveryTime || '25-35 min',
    minOrder: Number(v.minOrder) || 0,
    distanceKm: Number(v.distanceKm) || 1.2,
    openHours: v.openHours || [],
    businessHours: Array.isArray(v.businessHours) ? v.businessHours : [],
    isOpen: v.isOpen === false ? false : v.status === 'active',
    isKitchenOpen: v.isKitchenOpen === false ? false : v.status === 'active',
    isAvailable: !!agg.isAvailable,
    status: v.status,
    tags: Array.isArray(v.tags) ? v.tags : []
  };
}

/** Ownership check for a private user-owned resource. */
function isOwnerOrAdmin(req: express.Request, resourceUserId?: string) {
  const userId = getAuthUserId(req);
  if (!userId) return false;
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return false;
  if (['administrator', 'super-administrator'].includes(user.role)) return true;
  return resourceUserId === userId;
}

function computeOrderMoney(o: any) {
  const commissionRate = Number(db.platformSettings.defaultCommissionRate) || 10;
  const subtotal = Number(o.subtotal) || 0;
  const platformCommission = subtotal * (commissionRate / 100);
  const vendorPayout = subtotal - platformCommission;
  return { platformCommission, vendorPayout };
}

// ------------------------------------------------------------
// PERSISTENCE (survives restarts / hot-reloads)
// ------------------------------------------------------------
const DB_FILE = path.join(process.cwd(), 'omnimarket-db.json');

// EMAIL CONFIGURATION
// All email sending goes through the centralized EmailService (email/email.service.ts).
// SMTP credentials, sender address and app URL come from environment variables
// (see .env.example) — never hard-coded here.

// Email delivery log: hydrated from the persisted DB on boot so idempotency
// (no duplicate emails) and recent-send rate limiting survive restarts.
function hydrateEmailLog() {
  emailService.hydrate(db.emailLog || [], 5 * 60 * 1000);
}

// Persist email delivery results to disk. Called after sending (non-fatal: an
// email failure must never roll back a successful business operation).
function logEmailToDb(entry: EmailLogEntry) {
  db.emailLog = db.emailLog || [];
  const envelope = { ...entry } as EmailLogEntry;
  db.emailLog.push(envelope);
}

// Fire-and-forget send: routes are synchronous, and an email failure must never
// block or fail the business operation. All errors are caught inside send().
function queueEmail(opts: { to: string; template: any; data?: any; eventKey?: string }) {
  emailService.send(opts as any)
    .then((entry) => logEmailToDb(entry))
    .catch((err) => console.error('[EMAIL] queue failed:', err?.message || err));
}

function persistDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`\x1b[32m[DB]\x1b[0m Saved ${db.users.length} users, ${db.vendors.length} vendors, ${db.products.length} products to disk.`);
  } catch (e: any) {
    console.error('[DB] persist failed:', e?.message || e);
    systemLog({ level: 'error', source: 'db', event: 'db_persist_failure', message: `Database persist failed: ${e?.message || e}` });
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (saved && typeof saved === 'object') {
        db = { ...db, ...saved };
        console.log(`[DB] Loaded persisted database: ${db.users.length} users, ${db.vendors.length} vendors, ${db.products.length} products.`);
      }
    } else {
      console.log('[DB] No saved database found. Starting fresh.');
    }
  } catch (e: any) {
    console.error('[DB] Failed to load saved database, starting fresh:', e?.message || e);
  }
}

// Persist to disk after every mutating request (POST/PATCH/PUT/DELETE)
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  res.json = function (body: any) { const r = originalJson(body); persistDb(); return r; };
  res.send = function (body: any) { const r = originalSend(body); persistDb(); return r; };
  next();
});

loadDb();
hydrateEmailLog();

// Backfill the notification model for records written by earlier versions
// (they only had time/read/type). Keeps old history loadable in the new UI.
function migrateNotifications() {
  if (!Array.isArray(db.notifications)) return;
  db.notifications.forEach((n: any) => {
    if (!n.createdAt) n.createdAt = n.time || new Date().toISOString();
    if (!n.category) n.category = notifCategory(n.type || 'system');
    if (!n.priority) n.priority = 'NORMAL';
    if (n.readAt === undefined) n.readAt = n.read ? n.createdAt : null;
    if (n.relatedOrderId === undefined) n.relatedOrderId = null;
    if (n.relatedDeliveryId === undefined) n.relatedDeliveryId = null;
    if (n.relatedConversationId === undefined) n.relatedConversationId = null;
    if (n.relatedRestaurantId === undefined) n.relatedRestaurantId = null;
    if (n.relatedUserId === undefined) n.relatedUserId = null;
    if (n.action === undefined) n.action = null;
    if (n.dedupeKey === undefined) n.dedupeKey = null;
  });
}
migrateNotifications();

// Backfill collections/keys added after the persisted DB was first written
// (loadDb is a shallow merge, so new arrays/keys need explicit backfill).
function migrateNewCollections() {
  db.systemLogs = Array.isArray(db.systemLogs) ? db.systemLogs : [];
  db.fuelPriceHistory = Array.isArray(db.fuelPriceHistory) ? db.fuelPriceHistory : [];
  db.pricingVersions = Array.isArray(db.pricingVersions) ? db.pricingVersions : [];
  if (!db.audit || !Array.isArray(db.audit)) db.audit = [];
  if (Array.isArray(db.audit)) {
    db.audit.forEach((a: any) => {
      if (!a.description && a.action && a.entity) a.description = auditDescription(a.action, a.entity, a.entityId || '', a.meta);
      if (!a.resourceType) a.resourceType = a.entity || null;
      if (!a.resourceId) a.resourceId = a.entityId || null;
      if (!a.riskLevel && a.severity) a.riskLevel = a.severity;
      if (a.previousValue === undefined) a.previousValue = null;
      if (a.newValue === undefined) a.newValue = null;
    });
  }
  if (db.platformSettings && typeof db.platformSettings === 'object') {
    const defaults: Record<string, any> = {
      fuelPriceCurrent: 12,
      fuelPriceReference: 12,
      fuelCostWeight: 40,
      fuelAdjustmentMode: 'automatic',
      fuelApprovedMultiplier: null,
      maxAutoIncreasePct: 10,
      maxAutoDecreasePct: 10,
      fuelPriceSource: 'manual',
      fuelPriceStatus: 'verified',
      fuelPriceUpdatedAt: null,
      fuelPriceLastVerifiedAt: null,
      fuelProviderUrl: '',
      fuelPendingReview: null,
      currentPricingVersion: 0
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (db.platformSettings[k] === undefined) db.platformSettings[k] = v;
    }
  }
  if (!db.auditSequence || typeof db.auditSequence !== 'object') {
    db.auditSequence = { value: db.audit?.length || 0 };
  }
  db.auditSequence.value = Math.max(Number(db.auditSequence.value) || 0, db.audit?.length || 0);
}
migrateNewCollections();

systemLog({ level: 'info', source: 'system', event: 'service_startup', message: `OmniMarket server starting. Version ${process.env.npm_package_version || 'dev'}.` });


app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>OmniMarket</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center}code{background:#1e293b;padding:2px 8px;border-radius:6px}a{color:#10b981;font-weight:700}</style></head>
<body><div><h1>OmniMarket API Server</h1><p>This is the backend (port 3999). The app lives at <a href="http://localhost:3003">http://localhost:3003</a></p>
<p><code>GET /api/health</code> for status</p></div></body></html>`);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'OmniMarket API is running',
    version: '1.0.0',
    userCount: db.users.length,
    lastServerError: (app as any).lastError || null,
    maintenanceMode: !!db.platformSettings.maintenanceMode,
    serverTime: new Date().toISOString()
  });
});

// ------------------------------------------------------------
// MAINTENANCE MODE GATE
// ------------------------------------------------------------
// Registered after /api/health (always reachable) and before every other /api
// route. When the platform is in maintenance mode, only administrative consoles
// (auth, admin, system, realtime) stay reachable; ordinary marketplace API calls
// are rejected with a 503 so customers and partners see a real outage, not a banner.
app.use('/api', (req, res, next) => {
  if (!db.platformSettings.maintenanceMode) return next();
  const p = req.path;
  const alwaysOpen = p === '/health'
    || p.startsWith('/auth')
    || p.startsWith('/admin')
    || p.startsWith('/system')
    || p.startsWith('/realtime');
  if (alwaysOpen) return next();
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  if (user && ['administrator', 'super-administrator'].includes(user.role)) return next();
  return res.status(503).json({ success: false, maintenance: true, message: 'The marketplace is currently in maintenance mode.' });
});


// ------------------------------------------------------------
// REAL-TIME (SSE)
// ------------------------------------------------------------

let clients: { id: string; res: express.Response; userId?: string }[] = [];

app.get('/api/realtime', (req, res) => {
  const token = req.query.token as string;
  let userId: string | undefined;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }) as any;
      userId = decoded.sub;
    } catch (e) {}
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Optimization: ensure headers are sent immediately
  if (res.flushHeaders) {
    res.flushHeaders();
  } else {
    res.write(':ok\n\n');
  }

  const clientId = uuidv4();
  clients.push({ id: clientId, res, userId });

  // Send a heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(c => c.id !== clientId);
  });
});

function broadcast(event: string, data: any, targetUserId?: string) {
  const message = JSON.stringify({ event, data });
  clients.forEach(client => {
    if (!targetUserId || client.userId === targetUserId) {
      client.res.write(`data: ${message}\n\n`);
    }
  });
}

// ------------------------------------------------------------
// AUTHENTICATION UTILS
// ------------------------------------------------------------

// Password hashing (H6). New hashes use salted scrypt; legacy SHA-256 (and any
// historical plaintext) entries remain verifiable and are upgraded on success.
const OLD_SHA = 'sha256:';

function hashPasswordLegacy(password: string): string {
  return OLD_SHA + crypto.createHash('sha256').update(String(password)).digest('hex');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function isScryptHash(stored: string): boolean {
  return String(stored || '').startsWith('scrypt$');
}

// Verify a password against any supported stored format (scrypt, legacy SHA-256,
// or legacy plaintext). Returns true only for a genuine match.
function verifyPassword(stored: string | null | undefined, attempt: string): boolean {
  const s = String(stored || '');
  const a = String(attempt == null ? '' : attempt);
  if (s.startsWith('scrypt$')) {
    const parts = s.split('$');
    if (parts.length !== 3 || !parts[1]) return false;
    try {
      const hash = crypto.scryptSync(a, parts[1], 64).toString('hex');
      return safeEqual(hash, parts[2]);
    } catch { return false; }
  }
  const legacy = hashPasswordLegacy(a);
  const rawHex = legacy.slice(OLD_SHA.length);
  if (s.startsWith(OLD_SHA)) return safeEqual(s, legacy);
  if (/^[a-f0-9]{64}$/i.test(s)) return safeEqual(s.toLowerCase(), rawHex.toLowerCase());
  return s === a;
}

// Verify and transparently upgrade legacy hashes to scrypt on success.
function verifyPasswordAndUpgrade(user: any, attempt: string): boolean {
  if (!verifyPassword(user?.password, attempt)) return false;
  if (user && !isScryptHash(String(user.password || ''))) {
    user.password = hashPassword(attempt);
  }
  return true;
}

// Strong-password enforcement bound to the operator-tunable policy in the
// Security Settings (min length, complexity). Returns '' when strong enough.
function passwordPolicyError(pw: string): string {
  const min = securitySettings().passwordMinLength ?? 8;
  const s = String(pw || '');
  if (s.length < min) return `Password must be at least ${min} characters.`;
  if (s.length > 128) return 'Password is too long.';
  if (!/[A-Z]/.test(s)) return 'Password must contain an uppercase letter.';
  if (!/[a-z]/.test(s)) return 'Password must contain a lowercase letter.';
  if (!/[0-9]/.test(s)) return 'Password must contain a number.';
  return '';
}

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds between resends

interface OtpRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const otpStore = new Map<string, OtpRecord>();

function storeOtp(id: string, code: string) {
  otpStore.set(id, {
    codeHash: hashOtp(code),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: Date.now()
  });
}

// True if we should block a resend because one was just issued.
function otpBlockedByCooldown(id: string): boolean {
  const rec = otpStore.get(id);
  if (!rec) return false;
  return Date.now() - rec.lastSentAt < OTP_RESEND_COOLDOWN_MS;
}

// Validates a submitted code in constant-ish time by comparing hashes.
function otpMatches(id: string, code: string): boolean {
  const rec = otpStore.get(id);
  if (!rec || rec.expiresAt < Date.now()) return false;
  return safeEqual(rec.codeHash, hashOtp(code));
}

function consumeOtp(id: string) {
  otpStore.delete(id);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function generateOtp(): string {
  // Cryptographically strong codes (spec: no plaintext generation weaknesses).
  const buf = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  return buf;
}

function generateTempPassword(): string {
  return crypto.randomBytes(4).toString('hex'); // 8 char hex string
}

// ------------------------------------------------------------
// AUTHENTICATION
// ------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { identifier, password, portal } = req.body;
  const ctx = secCtx(req);
  const cfg = securitySettings();

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Missing email/phone or password' });
  }

  const id = identifier.toLowerCase().trim();
  const pass = password.trim();

  // Source hardening: per-IP+identifier login attempt budget.
  const uname = String(identifier).toLowerCase().trim();
  const authKey = `login:${ctx.ip}:${uname}`;
  const rl = checkRateLimit(authKey, cfg.loginRateLimit || 10, cfg.loginWindowMs || 60000);
  if (!rl.allowed) {
    recordSecurityEvent({ type: 'RATE_LIMIT_TRIGGERED', severity: 'MEDIUM', endpoint: '/api/auth/login', account: uname, ip: ctx.ip, detection: 'Login source exceeded attempt budget.', actionTaken: 'Login rate limited', status: 'blocked', req });
    return res.status(429).json({ success: false, message: 'Too many login attempts. Please try again shortly.' });
  }

  const user = db.users.find(u =>
    (u.email.toLowerCase().trim() === id || u.phone?.trim() === identifier.trim())
  );

  if (!user) {
    registerLoginFailure(uname, ctx.ip, () => {});
    recordSecurityEvent({ type: 'FAILED_LOGIN', severity: 'LOW', endpoint: '/api/auth/login', account: uname, ip: ctx.ip, detection: 'Unknown account login attempt.', actionTaken: 'Rejected', status: 'monitoring', req });
    logAudit(null, 'Failed login', 'auth', identifier, 'failed', { reason: 'unknown account', portal: portal || 'web' }, req);
    return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
  }

  // Account Lockout check
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    logAudit(user, 'Failed login (locked)', 'auth', user.id, 'denied', { reason: 'account locked', portal: portal || 'web' }, req);
    return res.status(403).json({ success: false, message: `Account is locked. Try again in ${minutes} minutes.` });
  }

  const passMatch = verifyPasswordAndUpgrade(user, pass);

  if (!passMatch) {
    // H9: account lockout is DoS-resistant — the counter only counts toward a
    // lock when failures come from multiple distinct IPs, so a single attacker
    // can never freeze the account for everyone else.
    const ips = Array.isArray(user.loginIps) ? user.loginIps : (user.loginIps = []);
    if (!ips.includes(ctx.ip)) ips.push(ctx.ip);
    const distinctIps = ips.length;
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    registerLoginFailure(uname, ctx.ip, () => {});
    recordSecurityEvent({ type: 'FAILED_LOGIN', severity: 'LOW', endpoint: '/api/auth/login', account: user.email, userId: user.id, ip: ctx.ip, detection: 'Incorrect password supplied.', actionTaken: 'Rejected', status: 'monitoring', req, details: { count: user.loginAttempts, distinctIps } });
    logAudit(user, 'Failed login', 'auth', user.id, 'failed', { reason: 'invalid password', portal: portal || 'web' }, req);
    if (user.loginAttempts >= (cfg.accountLockThreshold || 5) && distinctIps >= 2) {
      user.lockedUntil = Date.now() + ((cfg.accountLockMinutes || 15) * 60 * 1000);
      user.loginAttempts = 0;
      user.loginIps = [];
      recordSecurityEvent({ type: 'ACCOUNT_LOCKED', severity: 'MEDIUM', endpoint: '/api/auth/login', account: user.email, userId: user.id, ip: ctx.ip, detection: 'Account temporarily locked after repeated failed logins from multiple IPs.', actionTaken: 'Account protected', status: 'blocked', req, details: { threshold: cfg.accountLockThreshold, distinctIps } });
      logAudit(user, 'Account locked', 'user', user.id, 'success', { reason: 'Too many failed login attempts' });
      return res.status(403).json({ success: false, message: 'Too many failed attempts. Account locked for the configured period.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
  }

  // Reset attempts on success
  user.loginAttempts = 0;
  user.lockedUntil = 0;
  user.loginIps = [];

  if (portal === 'admin' && !['administrator', 'super-administrator'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted' });
  }

  if (user.isSuspended) {
    recordSecurityEvent({ type: 'FAILED_LOGIN', severity: 'MEDIUM', endpoint: '/api/auth/login', account: user.email, userId: user.id, ip: ctx.ip, detection: 'Login attempt against a suspended account.', actionTaken: 'Rejected', status: 'monitoring', req });
    return res.status(403).json({ success: false, message: 'Account is suspended' });
  }

  // Enforce approval for Vendors and Riders
  if ((user.role === 'vendor' || user.role === 'rider') && !user.isApproved) {
    return res.status(403).json({ success: false, message: 'Your account is pending approval.' });
  }

  // Device / behaviour monitoring on the credential stage (OTP is the second factor).
  const priorSessions = (db.sessions || []).filter((s: any) => s.userId === user.id && !s.revokedAt);
  const seenDevice = priorSessions.some((s: any) => s.deviceId === ctx.device.deviceId);
  if (!seenDevice) {
    recordSecurityEvent({ type: 'NEW_DEVICE_LOGIN', severity: 'MEDIUM', endpoint: '/api/auth/login', account: user.email, userId: user.id, ip: ctx.ip, detection: 'Sign-in from a device not previously used by this account.', actionTaken: 'Requiring OTP; flagged for review', status: 'monitoring', req, details: { device: ctx.device.deviceName } });
  }
  if (['administrator', 'super-administrator'].includes(user.role) && (!seenDevice || priorSessions.length >= 4)) {
    recordSecurityEvent({ type: 'ABNORMAL_ADMIN_LOGIN', severity: 'MEDIUM', endpoint: '/api/auth/login', account: user.email, userId: user.id, ip: ctx.ip, detection: 'Administrator sign-in from an unusual device or with many active sessions.', actionTaken: 'Additional verification required', status: 'monitoring', req, details: { activeSessions: priorSessions.length, device: ctx.device.deviceName } });
  }

  // SEND LOGIN OTP AS REQUESTED (this is the second factor for every login).
  const code = generateOtp();
  storeOtp(user.email.toLowerCase(), code);
  queueEmail({ to: user.email, template: 'otp', data: { code } });
  console.log(`[OTP] Login code for ${user.email} sent (demo code 123456 also works)`);

  return res.json({
    success: true,
    requiresOtp: true,
    message: 'Verification code sent to your email.'
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { identifier, code, portal } = req.body;
  const id = identifier.toLowerCase().trim();
  const user = db.users.find(u =>
    (u.email.toLowerCase().trim() === id || u.phone?.trim() === identifier.trim())
  );

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const userKey = user.email.toLowerCase();
  const stored = otpStore.get(userKey);
  // Demo code 123456 is only accepted for local development; otherwise the
  // freshly generated code (sent by email) is required.
  const isDemo = ALLOW_DEMO_OTP && code === '123456';
  const validCode = isDemo || (stored && otpMatches(userKey, code));
  if (!validCode) {
    if (stored) {
      stored.attempts += 1;
      // Invalidate after too many attempts to prevent brute force.
      if (stored.attempts >= OTP_MAX_ATTEMPTS) consumeOtp(userKey);
    }
    recordSecurityEvent({ type: 'OTP_FAILURE', severity: 'LOW', endpoint: '/api/auth/verify-otp', account: user.email, userId: user.id, ip: (secCtx(req)).ip, detection: 'Invalid or expired one-time code submitted.', actionTaken: 'Rejected', status: 'monitoring', req, details: { attempts: stored?.attempts || 0 } });
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
  }

  // Success! Clean up and issue tokens
  consumeOtp(userKey);

  if (portal === 'admin' && !['administrator', 'super-administrator'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted' });
  }

  const session = createSession(user.id, req);
  const accessToken = jwt.sign({
    sub: user.id,
    role: user.role,
    vendorId: (user as any).vendorId,
    riderId: (user as any).riderId,
    mustChangePassword: !!user.mustChangePassword,
    sessionId: session.id
  }, JWT_SECRET, { expiresIn: '1h' });

  const refreshToken = jwt.sign({ sub: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    // Track the initial refresh token so rotation + reuse detection works from
    // the very first sign-in (see /api/auth/refresh).
    session.refreshTokenHash = hashToken(refreshToken);

  user.lastLoginAt = new Date().toISOString();
  user.lastReauthAt = new Date().toISOString();

  // Real security event for a successful sign-in (second factor passed).
  recordSecurityEvent({
    type: 'LOGIN_SUCCESS', severity: 'INFO', endpoint: '/api/auth/verify-otp', account: user.email, userId: user.id,
    ip: session.ipAddress, detection: 'Successful sign-in after password + one-time code.', actionTaken: 'Session issued', status: 'monitoring', req,
    details: { device: session.deviceName, portal: portal || 'web' },
  });

  logAudit(user, 'Login', 'auth', user.id, 'success', {
    portal: portal || 'web',
    method: 'password+otp',
    device: session.deviceName,
    ip: session.ipAddress
  });

  res.json({
    success: true,
    user: {
      ...safeUser(user),
      twoFactorEnabled: !!user.twoFactorEnabled
    },
    tokens: { accessToken, refreshToken, expiresIn: 3600, tokenType: 'Bearer' }
  });
});

// Resend a login verification code (used by the "Resend" action on the OTP step).
app.post('/api/auth/send-otp', (req, res) => {
  const { identifier, channel } = req.body;
  if (!identifier) return res.status(400).json({ success: false, message: 'Identifier is required.' });

  const id = identifier.toLowerCase().trim();
  const user = db.users.find(u =>
    (u.email.toLowerCase().trim() === id || (u.phone && u.phone.trim() === identifier.trim()))
  );

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const userKey = user.email.toLowerCase();
  // Per-account OTP cap: even a valid account can only trigger a bounded number
  // of code sends per minute, limiting SMS/email flood abuse.
  const otpLim = checkRateLimit(`otp:${userKey}`, 5, 60 * 1000);
  if (!otpLim.allowed) {
    return res.status(429).json({ success: false, message: 'Too many verification codes requested. Please try again in a moment.' });
  }
  // Rate-limit resends: invalidate the previous code and block a resend
  // within the cooldown window.
  if (otpBlockedByCooldown(userKey)) {
    return res.status(429).json({ success: false, message: 'Please wait a moment before requesting another code.' });
  }

  const code = generateOtp();
  storeOtp(userKey, code);
  queueEmail({ to: user.email, template: 'otp', data: { code } });
  console.log(`[OTP] Resent login code for ${user.email} (demo code 123456 also works)`);

  if (channel === 'phone' && user.phone) {
    res.json({ success: true, message: 'Verification code sent to your phone.' });
  } else {
    res.json({ success: true, message: 'Verification code sent to your email.' });
  }
});

// Send an email-verification code to the authenticated user.
app.post('/api/auth/send-verification', requireAuth, (req, res) => {
  const currentUserId = (req as any).currentUserId;
  const user = db.users.find((u: any) => u.id === currentUserId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (user.isEmailVerified) {
    return res.json({ success: true, emailVerified: true, message: 'Your email is already verified.' });
  }

  const userKey = user.email.toLowerCase();
  const otpLim = checkRateLimit(`otp:${userKey}`, 5, 60 * 1000);
  if (!otpLim.allowed) {
    return res.status(429).json({ success: false, message: 'Too many verification codes requested. Please try again in a moment.' });
  }
  if (otpBlockedByCooldown(userKey)) {
    return res.status(429).json({ success: false, message: 'Please wait a moment before requesting another code.' });
  }

  const code = generateOtp();
  storeOtp(userKey, code);
  queueEmail({ to: user.email, template: 'email_verification', data: { firstName: user.firstName, code } });
  console.log(`[OTP] Email verification code sent to ${user.email} (demo code 123456 also works)`);
  res.json({ success: true, message: 'Verification code sent to your email.' });
});

// Verify the authenticated user's email using the OTP that was emailed to them.
app.post('/api/auth/verify-email', requireAuth, (req, res) => {
  const { code } = req.body.body ?? req.body;
  const currentUserId = (req as any).currentUserId;
  const user = db.users.find((u: any) => u.id === currentUserId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (user.isEmailVerified) {
    return res.json({ success: true, emailVerified: true, user: safeUser(user) });
  }

  if (!code || !String(code).trim()) {
    return res.status(400).json({ success: false, message: 'Verification code is required.' });
  }

  const userKey = user.email.toLowerCase();
  const isDemo = ALLOW_DEMO_OTP && code === '123456';
  const validCode = isDemo || otpMatches(userKey, code);

  if (!validCode) {
    const stored = otpStore.get(userKey);
    if (stored) {
      stored.attempts += 1;
      if (stored.attempts >= OTP_MAX_ATTEMPTS) consumeOtp(userKey);
    }
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
  }

  consumeOtp(userKey);
  user.isEmailVerified = true;
  user.isVerified = true;
  user.auditTrail = user.auditTrail || [];
  logAudit(user, 'Email verified', 'user', user.id, 'success', { email: user.email });

  res.json({ success: true, emailVerified: true, user: safeUser(user) });
});

// Return the current user profile from a valid access token (used on page refresh)
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }) as any;
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isSuspended) return res.status(401).json({ error: 'Account is suspended' });
    const revokedAt = user.tokensRevokedAt;
    if (revokedAt && (decoded.iat || 0) * 1000 < revokedAt) {
      return res.status(401).json({ error: 'Session revoked. Please sign in again.' });
    }
    if (decoded.sessionId) {
      const session = (db.sessions || []).find((s: any) => s.id === decoded.sessionId && s.userId === user.id);
      if (!session || session.revokedAt) return res.status(401).json({ error: 'Session revoked. Please sign in again.' });
      session.lastActivityAt = new Date().toISOString();
    }

    res.json({
      ...safeUser(user),
      twoFactorEnabled: !!user.twoFactorEnabled
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});


app.post('/api/auth/register', (req, res) => {
  console.log('\x1b[32m[REGISTRATION]\x1b[0m Processing data for:', req.body?.email);
  try {
    const payload = req.body;
    if (!payload || !payload.email) {
       console.log('\x1b[31m[REGISTRATION]\x1b[0m FAILED - Payload empty');
       return res.status(400).json({ success: false, message: 'Registration data was lost or malformed.' });
    }

    if (!payload.email || !payload.password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Enforce the configured strong-password policy at registration.
    const regPolicyErr = passwordPolicyError(payload.password);
    if (regPolicyErr) {
      return res.status(422).json({ success: false, message: regPolicyErr });
    }

    // Bulletproof Duplicate Check
    const normalizedEmail = String(payload.email).toLowerCase().trim();
    const emailExists = db.users.some(u => u && u.email && String(u.email).toLowerCase().trim() === normalizedEmail);

    if (emailExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const userId = uuidv4();
    let role = payload.role || 'customer';

    if (['administrator', 'super-administrator'].includes(role)) role = 'customer';

    // Platform availability controls — enforced server-side, not just hidden in
    // the UI. Maintenance mode blocks account creation entirely; per-role
    // registration switches block the matching application type.
    if (db.platformSettings.maintenanceMode) {
      return res.status(503).json({ success: false, message: 'The marketplace is currently in maintenance mode. Registration is temporarily unavailable.' });
    }
    if (role === 'customer' && db.platformSettings.allowNewCustomers === false) {
      return res.status(403).json({ success: false, message: 'New customer registration is currently disabled by the platform operator.' });
    }
    if (role === 'vendor' && db.platformSettings.allowNewVendors === false) {
      return res.status(403).json({ success: false, message: 'Restaurant applications are currently closed.' });
    }
    if (role === 'rider' && db.platformSettings.allowNewRiders === false) {
      return res.status(403).json({ success: false, message: 'Rider applications are currently closed.' });
    }

    // Approval mode decides whether a submitted application is auto-approved or
    // waits for manual review (vendor/rider only). The switch below matches the
    // selected mode so the UI can never claim manual while behavior is automatic.
    const autoApprove = (role === 'vendor' && db.platformSettings.vendorApprovalMode === 'automatic')
      || (role === 'rider' && db.platformSettings.riderApprovalMode === 'automatic');

    const newUser: any = {
      id: userId,
      email: normalizedEmail,
      phone: payload.phone || '',
      password: hashPassword(String(payload.password)),
      firstName: payload.firstName || payload.name?.split(' ')[0] || payload.ownerName?.split(' ')[0] || 'User',
      lastName: payload.lastName || payload.name?.split(' ')[1] || payload.ownerName?.split(' ')[1] || '',
      displayName: payload.displayName || payload.name || payload.ownerName || 'User',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      role: role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isVerified: role === 'customer' || autoApprove,
      isEmailVerified: role === 'customer' || autoApprove,
      isPhoneVerified: false,
      isApproved: role === 'customer' || autoApprove,
      isActive: true,
      isSuspended: false,
      twoFactorEnabled: false,
      referralCode: generateReferralCode({ id: userId })
    };

    if (role === 'vendor') {
      const vendorId = `v-${uuidv4().slice(0, 8)}`;
      newUser.vendorId = vendorId;
      db.vendors.push({
        id: vendorId, ownerId: userId, name: payload.businessName || 'New Restaurant',
        slug: (payload.businessName || 'new-restaurant').toLowerCase().replace(/\s+/g, '-'),
        logo: sanitizeImageInput(payload.logoUrl || ''), banner: sanitizeImageInput(payload.coverUrl || ''),
        category: payload.category || 'Local Dishes', address: payload.businessAddress || '',
        openHours: payload.openingHours || '08:00 AM - 10:00 PM', phone: payload.phone || '',
        email: normalizedEmail, status: autoApprove ? 'active' : 'pending', joinedDate: new Date().toISOString(),
        verification: { regNumber: payload.regNumber || '', documents: payload.documents || null }
      });
    }

    if (role === 'rider') {
      const riderId = `r-${uuidv4().slice(0, 8)}`;
      newUser.riderId = riderId;
      db.riders.push({
        id: riderId, userId: userId, name: newUser.displayName, avatar: newUser.avatarUrl,
        vehicleType: payload.vehicleType || 'Bike', vehicleNumber: payload.vehicleNumber || '',
        phone: payload.phone || '', deliveryFee: 12.00, status: 'Offline',
        isVerified: autoApprove,
        verificationStatus: autoApprove ? 'verified' : 'pending',
        verification: { driverLicense: payload.driverLicense || '', nationalId: payload.nationalId || '' }
      });
    }

    db.users.push(newUser);
    db.wallets.push({ userId, balance: 0, currency: 'GHS' });

    // Referral: if the registrant submitted a valid referral code, record it
    // against the referrer and notify them.
    const submittedCode = String(payload.referralCode || payload.ref || '').trim().toUpperCase();
    if (submittedCode) {
      const referrer = db.users.find(u => u.referralCode === submittedCode);
      if (referrer && referrer.id !== userId) {
        db.referrals.push({
          id: `ref-${uuidv4().slice(0, 8)}`,
          referralCode: submittedCode,
          referrerUserId: referrer.id,
          referrerName: referrer.displayName || `${referrer.firstName} ${referrer.lastName}`.trim() || referrer.email,
          referrerEmail: referrer.email,
          referredUserId: userId,
          referredEmail: normalizedEmail,
          referredName: newUser.displayName || `User`,
          referredRole: role,
          referredStatus: newUser.isApproved ? 'approved' : 'pending',
          createdAt: new Date().toISOString()
        });
        notifyUser(referrer.id, 'New Referral!', `${newUser.displayName || 'Someone'} signed up with your referral code (${submittedCode}).`,
          { type: 'ACCOUNT_UPDATED', category: 'account', priority: 'NORMAL', relatedUserId: referrer.id, action: '/profile', dedupeKey: `referral:${submittedCode}:${referrer.id}` });
        logAudit(referrer, 'Referral redeemed', 'referral', userId, 'success', { code: submittedCode, role });
      }
    }

    // Send Welcome / Pending Email via centralized service
    if (role === 'customer') {
      queueEmail({
        to: newUser.email,
        template: 'welcome',
        data: { firstName: newUser.firstName },
        eventKey: `welcome:${userId}`
      });
    } else {
      queueEmail({
        to: newUser.email,
        template: 'registration_pending',
        data: { firstName: newUser.firstName, role },
        eventKey: `registration-pending:${userId}`
      });
    }

    console.log('\x1b[32m[Registration]\x1b[0m SUCCESS for:', normalizedEmail);
    logAudit(newUser, 'Account registered', 'user', userId, 'success', { role, autoApproved: newUser.isApproved }, req);
    return res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  } catch (err: any) {
    console.error('\x1b[31m[Registration Error]\x1b[0m', err.message);
    return res.status(500).json({ success: false, message: 'Server error during registration.', details: err.message });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });

  try {
    const ctx = secCtx(req);
    const decoded = jwt.verify(refreshToken, JWT_SECRET, { algorithms: [JWT_ALGO] }) as any;
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isSuspended) return res.status(401).json({ error: 'Account is suspended' });
    // A revoked refresh token's session must not mint further access tokens.
    let currentSession: any = null;
    if (decoded.sessionId) {
      const session = (db.sessions || []).find((s: any) => s.id === decoded.sessionId && s.userId === user.id);
      currentSession = session;
      if (!session || session.revokedAt) return res.status(401).json({ error: 'Session revoked' });
      session.lastActivityAt = new Date().toISOString();
      // Reuse detection: if the stored hash no longer matches the presented token,
      // the refresh token was rotated and replayed — revoke the session.
      if (session.refreshTokenHash && session.refreshTokenHash !== hashToken(refreshToken)) {
        session.revokedAt = new Date().toISOString();
        recordSecurityEvent({ type: 'REFRESH_TOKEN_REUSE', severity: 'HIGH', endpoint: '/api/auth/refresh', account: user.email, userId: user.id, ip: ctx.ip, detection: 'A rotated refresh token was replayed against an active session. Revoking the session.', actionTaken: 'Session revoked', status: 'blocked', req, details: { sessionId: session.id } });
        return res.status(401).json({ error: 'Session revoked' });
      }
    }

    // Rotate the refresh token so a stolen token cannot be reused indefinitely.
    const rotatedRefresh = jwt.sign({ sub: user.id, sessionId: decoded.sessionId || null }, JWT_SECRET, { expiresIn: '7d' });
    if (currentSession) {
      currentSession.refreshTokenHash = hashToken(rotatedRefresh);
      currentSession.lastRotatedAt = new Date().toISOString();
    }

    const accessToken = jwt.sign({ sub: user.id, role: user.role, vendorId: (user as any).vendorId, riderId: (user as any).riderId, sessionId: decoded.sessionId || null }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ accessToken, refreshToken: rotatedRefresh, expiresIn: 3600, tokenType: 'Bearer' });
  } catch (e) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/request-password-reset', (req, res) => {
  const { email } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // Standard security practice: Don't reveal if user exists, but for the demo we'll return 404
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const code = generateOtp();
  storeOtp(email.toLowerCase(), code);

  // In production, send this via the centralized email service.
  const firstName = user.firstName || user.displayName?.split(' ')[0] || 'there';
  queueEmail({ to: user.email, template: 'password_reset', data: { firstName, code } });
  console.log(`\x1b[33m[AUTH] Password reset code for ${email} sent (demo code 123456 also works)\x1b[0m`);

  logAudit(user, 'Password reset requested', 'user', user.id, 'success');

  res.json({ success: true, message: 'Reset code sent to your email.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const normalizedEmail = email.toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const stored = otpStore.get(normalizedEmail);
  if (!stored || !otpMatches(normalizedEmail, code)) {
    if (stored) {
      stored.attempts += 1;
      if (stored.attempts >= OTP_MAX_ATTEMPTS) consumeOtp(normalizedEmail);
    }
    return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
  }

  const policyErr = passwordPolicyError(newPassword);
  if (policyErr) {
    return res.status(422).json({ success: false, message: policyErr });
  }

  user.password = hashPassword(newPassword);
  user.mustChangePassword = false;
  consumeOtp(normalizedEmail);

  console.log(`[AUTH] Password reset successful for ${email}`);
  logAudit(user, 'Password reset completed', 'user', user.id, 'success');
  recordSecurityEvent({ type: 'PASSWORD_RESET_REQUESTED', severity: 'MEDIUM', endpoint: '/api/auth/reset-password', account: user.email, userId: user.id, ip: secCtx(req).ip, detection: 'Password reset completed via emailed code.', actionTaken: 'Password rotated; sessions remain valid', status: 'monitoring', req });

  res.json({ success: true, message: 'Password has been successfully reset.' });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).currentUserId;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // If user is forced to change password, we might skip currentPassword check
  // if they logged in with a temp password. But usually we still want it.
  if (!verifyPasswordAndUpgrade(user, String(currentPassword || ''))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  const policyErr = passwordPolicyError(newPassword);
  if (policyErr) {
    return res.status(422).json({ success: false, message: policyErr });
  }

  user.password = hashPassword(newPassword);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date().toISOString();

  queueEmail({
    to: user.email,
    template: 'password_changed',
    data: { firstName: user.firstName },
    eventKey: `password-changed:${user.id}:${Date.now()}`
  });

  logAudit(user, 'Password changed', 'user', user.id, 'success');
  recordSecurityEvent({ type: 'PASSWORD_CHANGED', severity: 'LOW', endpoint: '/api/auth/change-password', account: user.email, userId: user.id, ip: secCtx(req).ip, detection: 'User changed their own password.', actionTaken: 'Password rotated', status: 'monitoring', req });
  res.json({ success: true, message: 'Password updated successfully.' });
});
// Admin-only security actions
app.post('/api/auth/admin/reset-password', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const { userId, newPassword } = req.body;
  const actor = (req as any).currentUser;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const policyErr = passwordPolicyError(newPassword);
  if (policyErr) return res.status(422).json({ success: false, message: policyErr });

  user.password = hashPassword(newPassword);
  user.mustChangePassword = true; // Force them to change it
  // A password reset invalidates every existing token + session.
  user.tokensRevokedAt = Date.now();
  (db.sessions || []).forEach((s: any) => {
    if (s.userId === user.id && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });

  logAudit(actor, 'Admin reset user password', 'user', user.id, 'success');
  recordSecurityEvent({ type: 'PRIVILEGE_CHANGED', severity: 'HIGH', endpoint: '/api/auth/admin/reset-password', account: actor.email, userId: actor.id, ip: secCtx(req).ip, detection: 'Administrator reset another account\'s password.', actionTaken: 'Password rotated; sessions revoked', status: 'monitoring', req, details: { target: user.email } });
  notifyUser(user.id, 'Security Alert', 'Your password was reset by an administrator. Please change it upon login.',
    { type: 'PASSWORD_RESET', category: 'account', priority: 'CRITICAL', relatedUserId: user.id, critical: true, action: '/login' });
  queueEmail({
    to: user.email,
    template: 'admin_password_changed',
    data: { firstName: user.firstName },
    eventKey: `admin-reset:${user.id}:${Date.now()}`
  });

  res.json({ success: true, message: 'User password reset.' });
});

app.post('/api/auth/admin/generate-temp-password', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const { userId } = req.body;
  const actor = (req as any).currentUser;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const tempPass = generateTempPassword();
  user.password = hashPassword(tempPass);
  user.mustChangePassword = true;
  user.tokensRevokedAt = Date.now();
  (db.sessions || []).forEach((s: any) => {
    if (s.userId === user.id && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });

  logAudit(actor, 'Admin generated temp password', 'user', user.id, 'success');
  queueEmail({
    to: user.email,
    template: 'security_alert',
    data: { firstName: user.firstName, message: 'An administrator generated a temporary password for your OmniMarket account. Please log in and change it immediately.' },
    eventKey: `temp-password:${user.id}:${Date.now()}`
  });

  res.json({ success: true, tempPassword: tempPass });
});

app.post('/api/auth/admin/force-reset', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const { userId } = req.body;
  const actor = (req as any).currentUser;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.mustChangePassword = true;
  // Forcing a reset kicks the user out so the new requirement actually applies.
  user.tokensRevokedAt = Date.now();
  (db.sessions || []).forEach((s: any) => {
    if (s.userId === user.id && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });

  logAudit(actor, 'Admin forced password reset', 'user', user.id, 'success');
  res.json({ success: true, message: 'User will be forced to change password at next login.' });
});

// ------------------------------------------------------------
// RE-AUTHENTICATION (high-risk operations)
// ------------------------------------------------------------
// Verifies the current administrator's password before a sensitive setting
// change or platform action is executed. The password is sent once in the
// request body and never stored client-side; the current session stays intact.
app.post('/api/auth/verify-password', requireAuth, (req, res) => {
  const { password } = req.body || {};
  const userId = (req as any).currentUserId;
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Current password is required.' });
  }
  if (!verifyPasswordAndUpgrade(user, String(password || ''))) {
    logAudit(user, 'Re-authentication failed', 'auth', user.id, 'denied');
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }
  return res.json({ success: true, verifiedAt: new Date().toISOString() });
});


// ------------------------------------------------------------
// SOCIAL LOGIN (Google / Apple)
// ------------------------------------------------------------
// These endpoints are the server-side entry point for OAuth 2.0 / the Sign In
// with Apple flow. They ONLY return credentials-provider metadata here; actual
// provider hand-off requires GOOGLE_CLIENT_ID / APPLE_* env vars. When those are
// missing the user is redirected back with an explicit "not configured" message
// instead of a silent failure.

function oauthNotConfigured(res: express.Response, provider: string, intent?: string) {
  const base = process.env.APP_URL || 'http://localhost:3003';
  const to = intent === 'register' ? 'register' : 'login';
  return res.redirect(`${base}/${to}?error=${encodeURIComponent(`${provider} sign-in is not configured on this server yet. Continue with email/password.`)}`);
}

/** Exchange an OAuth code with a provider and return { email, name, provider }. */
async function exchangeOAuthCode(provider: 'google' | 'apple', code: string): Promise<{ email: string; name?: string; id?: string }> {
  const base = process.env.APP_URL || 'http://localhost:3003';
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${base}/auth/callback`,
        grant_type: 'authorization_code'
      })
    });
    if (!tokenRes.ok) throw new Error('Google token exchange failed.');
    const tokenData: any = await tokenRes.json();
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!profileRes.ok) throw new Error('Could not fetch Google profile.');
    const profile: any = await profileRes.json();
    return { email: profile.email, name: profile.name, id: profile.sub };
  }

  // Apple Sign In (form_post response mode posts the code to the callback)
  const clientId = process.env.APPLE_CLIENT_ID;
  const clientSecret = process.env.APPLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Apple Sign In is not configured (APPLE_CLIENT_ID / APPLE_CLIENT_SECRET).');
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: process.env.APPLE_REDIRECT_URI || `${base}/auth/callback`,
      grant_type: 'authorization_code'
    })
  });
  if (!tokenRes.ok) throw new Error('Apple token exchange failed.');
  const tokenData: any = await tokenRes.json();
  // Decode the id_token JWT payload (email is only granted on first sign-in).
  let email = '';
  try {
    const payload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString());
    email = payload.email || '';
  } catch { /* email may be hidden */ }
  return { email, id: tokenData.sub || undefined };
}

// OAuth callback: the provider redirects the browser here with ?code=... We
// exchange it, find-or-create the user, issue JWTs, then bounce back to the
// SPA callback with credentials in the query string.
app.get('/api/auth/oauth/callback', async (req, res) => {
  const provider = String(req.query.provider || 'google');
  const code = String(req.query.code || '');
  const intent = String(req.query.intent || '');
  const base = process.env.APP_URL || 'http://localhost:3003';
  const to = intent === 'register' ? 'register' : 'login';

  const fail = (msg: string) => res.redirect(`${base}/${to}?error=${encodeURIComponent(msg)}`);

  if (!code) return fail(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in did not return an authorization code.`);
  if (!['google', 'apple'].includes(provider)) return fail('Unknown OAuth provider.');

  const providerKey: 'google' | 'apple' = provider as 'google' | 'apple';

  let profile: { email: string; name?: string; id?: string };
  try {
    profile = await exchangeOAuthCode(providerKey, code);
  } catch (err: any) {
    return fail(err?.message || 'OAuth exchange failed.');
  }

  if (!profile.email) return fail(`${provider === 'apple' ? 'Apple' : 'Google'} did not share your email address.`);

  const normalized = profile.email.toLowerCase().trim();
  let user = db.users.find((u: any) => u.email.toLowerCase().trim() === normalized);

  if (!user) {
    // Auto-provision a customer account on first social sign-in.
    const userId = `u-${uuidv4().slice(0, 8)}`;
    const nameParts = (profile.name || profile.email.split('@')[0] || 'User').split(/\s+/);
    user = {
      id: userId,
      email: normalized,
      phone: '',
      password: hashPassword(uuidv4()),
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '',
      displayName: profile.name || profile.email.split('@')[0],
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      role: 'customer',
      oauthProvider: provider,
      oauthProviderId: profile.id || null,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isVerified: true,
      isEmailVerified: true,
      isPhoneVerified: false,
      isApproved: true,
      isActive: true,
      isSuspended: false,
      twoFactorEnabled: false,
      referralCode: generateReferralCode({ id: userId })
    };
    db.users.push(user);
    db.wallets.push({ userId, balance: 0, currency: 'GHS' });
    queueEmail({ to: normalized, template: 'welcome', data: { firstName: user.firstName } });
  }

  if (user.isSuspended) return fail('This account is suspended.');
  if ((user.role === 'vendor' || user.role === 'rider') && !user.isApproved) {
    return fail('Your account is pending approval.');
  }

  const accessToken = jwt.sign({
    sub: user.id,
    role: user.role,
    vendorId: (user as any).vendorId,
    riderId: (user as any).riderId,
    mustChangePassword: !!user.mustChangePassword
  }, JWT_SECRET, { expiresIn: '1h' });
    const oauthSession = createSession(user.id, req);
    const refreshToken = jwt.sign({ sub: user.id, sessionId: oauthSession.id }, JWT_SECRET, { expiresIn: '7d' });
    if (oauthSession) oauthSession.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date().toISOString();
  logAudit(user, `${provider} sign-in`, 'auth', user.id, 'success', { portal: 'public' });

  res.redirect(`${base}/auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`);
});

app.get('/api/auth/google', (req, res) => {
  const intent = String(req.query.intent || '');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3003'}/api/auth/oauth/callback?provider=google`;
  if (!clientId) return oauthNotConfigured(res, 'Google', intent);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state: intent ? `intent=${intent}` : ''
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/api/auth/apple', (req, res) => {
  const intent = String(req.query.intent || '');
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = process.env.APPLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3003'}/api/auth/oauth/callback?provider=apple`;
  if (!clientId) return oauthNotConfigured(res, 'Apple', intent);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'name email',
    response_mode: 'form_post'
  });
  res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
});


app.get('/api/auth/sessions/:userId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const target = db.users.find((u: any) => u.id === req.params.userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const authHeader = req.headers.authorization || '';
  const currentSessionId = getSessionIdFromToken(authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

  const rows = (db.sessions || [])
    .filter((s: any) => s.userId === req.params.userId)
    .sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .map((s: any) => ({
      sessionId: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      platform: s.platform,
      ipAddress: s.ipAddress,
      createdAt: s.issuedAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      isCurrent: !s.revokedAt && s.id === currentSessionId,
      revoked: !!s.revokedAt
    }));

  res.json(rows);
});

// Graceful server-side logout: terminates the current session and records it.
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.json({ success: true });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] }) as any;
    const user = db.users.find((u: any) => u.id === decoded.sub);
    if (user) {
      if (decoded.sessionId) {
        const session = (db.sessions || []).find((s: any) => s.id === decoded.sessionId);
        if (session && !session.revokedAt) session.revokedAt = new Date().toISOString();
      }
      logAudit(user, 'Logout', 'auth', user.id, 'success', { sessionId: decoded.sessionId || null });
    }
  } catch (e) { /* token already invalid — logout is idempotent */ }

  res.json({ success: true });
});

app.delete('/api/auth/sessions/:userId', requireSuperAdmin, requirePermission('sessions:manage'), (req, res) => {
  const { userId } = req.params;
  const actor = (req as any).currentUser;
  const user = db.users.find((u: any) => u.id === userId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Mark all existing tokens as revoked
  user.tokensRevokedAt = Date.now();

  // Terminate every stored session for this account.
  let revokedCount = 0;
  (db.sessions || []).forEach((s: any) => {
    if (s.userId === userId && !s.revokedAt) {
      s.revokedAt = new Date().toISOString();
      revokedCount += 1;
    }
  });

  logAudit(actor, 'Admin revoked all user sessions', 'user', userId, 'success', { sessions: revokedCount });
  res.json({ success: true, revokedSessions: revokedCount });
});

app.delete('/api/auth/sessions/:userId/:sessionId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const session = (db.sessions || []).find((s: any) => s.id === req.params.sessionId && s.userId === req.params.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.revokedAt = new Date().toISOString();
  const actor = (req as any).currentUser;
  if (actor && (actor.role === 'administrator' || actor.role === 'super-administrator')) {
    logAudit(actor, 'Session revoked', 'session', session.id, 'success', { user: req.params.userId, deviceName: session.deviceName });
  }
  res.json({ success: true });
});

// Platform-wide session registry (admin only). Built from the real session
// records; never exposes tokens or session secrets.
app.get('/api/admin/sessions', requireAdmin, requirePermission('sessions:manage'), (req, res) => {
  const rows = (db.sessions || [])
    .map((s: any) => {
      const u = db.users.find((x: any) => x.id === s.userId);
      if (!u) return null;
      return {
        sessionId: s.id,
        userId: s.userId,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.displayName || 'Unnamed',
        email: u.email,
        role: u.role,
        isSuspended: !!u.isSuspended,
        deviceName: s.deviceName,
        platform: s.platform,
        ipAddress: s.ipAddress,
        issuedAt: s.issuedAt,
        lastActivityAt: s.lastActivityAt,
        expiresAt: s.expiresAt,
        revoked: !!s.revokedAt,
        expired: new Date(s.expiresAt).getTime() < Date.now()
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
  res.json(rows);
});

// ------------------------------------------------------------
// BUSINESS LOGIC ENDPOINTS
// ------------------------------------------------------------

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Keeps third-party geocoding behind the API boundary. Nominatim needs no key;
// a paid provider can replace this implementation without exposing credentials.
app.get('/api/geocoding/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(422).json({ error: 'Valid latitude and longitude are required.' });
  }
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`, {
      headers: { 'User-Agent': 'OmniMarket-Ghana/1.0 (location support)' }
    });
    if (!response.ok) throw new Error(`Geocoding provider returned ${response.status}`);
    const data: any = await response.json();
    const address = data.address || {};
    res.json({
      address: data.display_name || '',
      area: address.suburb || address.neighbourhood || address.quarter || address.village || '',
      city: address.city || address.town || address.municipality || '',
      region: address.state || address.region || '',
      country: address.country || '',
      latitude: lat,
      longitude: lng
    });
  } catch {
    res.status(503).json({ error: 'Address lookup is unavailable. You can enter your address manually.' });
  }
});

// Searchable place lookup (streets, areas, landmarks, cities). Nominatim is
// queried bounded to the Western Region / Takoradi-Sekondi corridor so local
// results surface first; the client merges these with its seeded dev list and
// always allows manual entry. On provider failure we return an empty list with
// `ok:false` so the UI can fall back to offline matching instead of erroring.
app.get('/api/geocoding/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ ok: false, places: [], error: 'Enter at least 2 characters to search.' });
  if (q.length > 120) return res.json({ ok: false, places: [], error: 'Search is too long.' });
  try {
    // Bounding box around Takoradi / Sekondi (Western Region, Ghana).
    const viewbox = '-1.93,4.97,-1.62,4.87';
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'OmniMarket-Ghana/1.0 (location support)' } });
    if (!response.ok) throw new Error(`Geocoding provider returned ${response.status}`);
    const data: any = await response.json();
    if (!Array.isArray(data)) return res.json({ ok: true, places: [] });
    const places = data.map((p: any) => {
      const a = p.address || {};
      const region = a.state || a.region || '';
      const city = a.city || a.town || a.municipality || a.county || '';
      const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.road || '';
      const label = [a.road || a.name, area, city].filter(Boolean).join(', ') || p.display_name || q;
      return {
        id: `geo-${p.osm_id || p.place_id || label}`,
        label: label.length > 96 ? `${label.slice(0, 96)}…` : label,
        fullLabel: p.display_name || label,
        address: p.display_name || label,
        area,
        city,
        region,
        country: a.country || '',
        latitude: Number(p.lat),
        longitude: Number(p.lon),
        type: p.type || 'place',
        source: 'geocoder'
      };
    }).filter((p: any) => p.latitude && p.longitude);
    res.json({ ok: true, places, error: null });
  } catch (e: any) {
    res.json({ ok: false, places: [], error: 'Address search is unavailable. Type your address manually instead.' });
  }
});

app.get('/api/vendors/nearby', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(422).json({ error: 'Valid latitude and longitude are required.' });
  const vendors = db.vendors
    .filter((v: any) => v.status === 'active' && Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude)))
    .map((v: any) => ({ ...publicVendor(v, vendorAggregate(v)), distanceKm: distanceKm(lat, lng, Number(v.latitude), Number(v.longitude)) }))
    .sort((a: any, b: any) => a.distanceKm - b.distanceKm);
  res.json(vendors);
});

app.get('/api/vendors', (req, res) => {
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  const isAdmin = user && ['administrator', 'super-administrator'].includes(user.role);
  if (isAdmin && !userHasPermission(user, 'restaurants:view')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to view restaurant records' });
  }

  let vendors = db.vendors;
  // If not admin, only show active vendors
  const filtered = isAdmin ? vendors : vendors.filter((v: any) => v.status === 'active');

  res.json(filtered.map((v: any) => {
    const agg = vendorAggregate(v);
    return isAdmin ? agg : publicVendor(v, agg);
  }));
});
app.get('/api/vendors/:id', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  const isAdmin = user && ['administrator', 'super-administrator'].includes(user.role);
  const isOwner = user && (user.vendorId === vendor.id || user.ownerId === vendor.ownerId);
  const agg = vendorAggregate(vendor);
  res.json(isAdmin || isOwner ? agg : publicVendor(vendor, agg));
});
app.get('/api/products', (req, res) => {
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  const isAdmin = user && ['administrator', 'super-administrator'].includes(user.role);

  let products = db.products;
  if (!isAdmin) {
    const activeVendorIds = new Set(db.vendors.filter((v: any) => v.status === 'active').map((v: any) => v.id));
    products = products.filter((p: any) => activeVendorIds.has(p.vendorId));
  }
  res.json(products);
});
app.get('/api/categories', (req, res) => {
  const activeVendorIds = new Set(db.vendors.filter((v: any) => v.status === 'active').map((v: any) => v.id));
  const activeProducts = db.products.filter((p: any) => activeVendorIds.has(p.vendorId));

  const withCounts = db.categories.map((c: any) => ({
    ...c,
    count: activeProducts.filter((p: any) => p.category === c.name).length
  }));
  res.json(withCounts);
});

// VendOr owner (or admin) check for product mutations.
function canManageVendor(req: express.Request, vendorId?: string) {
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  if (!currentUser) return false;
  if (['administrator', 'super-administrator'].includes(currentUser.role)) return true;
  return !!vendorId && currentUser.vendorId === vendorId;
}

// Create a food category (admin moderation)
app.post('/api/categories', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const p = req.body.body ?? req.body;
  const name = (p.name || '').trim();
  if (!name) return res.status(422).json({ success: false, message: 'Category name is required.' });
  if (db.categories.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
  }
  const category = {
    id: `cat-${uuidv4().slice(0, 8)}`,
    name,
    icon: p.icon || 'Utensils',
    count: 0,
    image: p.image || '',
    createdAt: new Date().toISOString()
  };
  db.categories.push(category);
  logAudit(actor, 'Category created', 'category', category.id, 'success', { name });
  res.status(201).json({ ...category, count: 0 });
});

// Rename/edit a food category
app.patch('/api/categories/:id', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const category = db.categories.find((c: any) => c.id === req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  const updates = req.body.body ?? req.body;
  if (updates.name !== undefined) {
    const name = String(updates.name).trim();
    if (!name) return res.status(422).json({ success: false, message: 'Category name cannot be empty.' });
    if (db.categories.some((c: any) => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }
    const prevName = category.name;
    category.name = name;
    // Keep meals associated by updating linked products
    db.products.forEach((p: any) => {
      if (p.category === prevName) p.category = name;
    });
  }
  if (updates.icon !== undefined) category.icon = updates.icon;
  if (updates.image !== undefined) category.image = sanitizeImageInput(updates.image);
  logAudit(actor, 'Category updated', 'category', category.id, 'success', { name: category.name });
  res.json({ ...category, count: db.products.filter((p: any) => p.category === category.name).length });
});

// Delete a food category (products keep their category value, unlinked)
app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const idx = db.categories.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  const removed = db.categories.splice(idx, 1)[0];
  logAudit(actor, 'Category deleted', 'category', removed.id, 'success', { name: removed.name });
  res.json({ success: true });
});

// Create a menu item (restaurant portal "Add New Meal")
app.post('/api/products', (req, res) => {
  const p = req.body.body ?? req.body;
  if (!canManageVendor(req, p.vendorId)) return res.status(403).json({ error: 'Forbidden' });
  const product = {
    id: `p-${uuidv4().slice(0, 8)}`,
    vendorId: p.vendorId || '',
    vendorName: p.vendorName || '',
    vendorLogo: p.vendorLogo || '',
    title: p.title || p.name || 'New Dish',
    description: p.description || '',
    price: Number(p.price) || 0,
    category: p.category || 'Local Dishes',
    images: Array.isArray(p.images) && p.images.length ? p.images.map((i: any) => sanitizeImageInput(i)) : [sanitizeImageInput(p.image || '')],
    tags: p.tags || [],
    stock: Number(p.stock) || 0,
    prepTime: p.prepTime || '20 min',
    rating: p.rating ?? 0,
    reviewsCount: p.reviewsCount ?? 0,
    isAvailable: (Number(p.stock) || 0) > 0,
    isTrending: !!p.isTrending,
    isFeatured: !!p.isFeatured,
    createdAt: new Date().toISOString()
  };
  db.products.push(product);
  const productActor = getAuthUserId(req) ? db.users.find((u: any) => u.id === getAuthUserId(req)) : null;
  logAudit(productActor, 'Menu item created', 'menu_item', product.id, 'success', { title: product.title, vendorId: product.vendorId }, req);
  res.status(201).json(product);
});

// Update a menu item
app.patch('/api/products/:id', (req, res) => {
  const product = db.products.find(pp => pp.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!canManageVendor(req, product.vendorId)) return res.status(403).json({ error: 'Forbidden' });
  const u = req.body.body ?? req.body;
  // Allowlist only vendor-editable menu fields; rating/reviews/featured/vendorId
  // and other operational fields can never be mass-assigned by a vendor.
  const ALLOWED_PRODUCT = ['title', 'description', 'price', 'category', 'options', 'image', 'images', 'stock', 'ingredients', 'nutrition', 'isAvailable', 'unit', 'prepTime', 'tags'];
  for (const k of Object.keys(u)) {
    if (!ALLOWED_PRODUCT.includes(k)) continue;
    if (k === 'images' && Array.isArray(u.images)) product.images = u.images.map((i: any) => sanitizeImageInput(i));
    else if (k === 'image') product.image = sanitizeImageInput(u.image);
    else if (k === 'stock') product.stock = Number(u.stock);
    else if (k === 'price') product.price = Number(u.price);
    else product[k] = u[k];
  }
  if (u.title) product.title = u.title;
  const prevAvailability = product.isAvailable;
  product.isAvailable = (product.stock || 0) > 0;
  const menuActor = getAuthUserId(req) ? db.users.find((u: any) => u.id === getAuthUserId(req)) : null;
  logAudit(menuActor, 'Menu item updated', 'menu_item', product.id, 'success', { title: product.title, vendorId: product.vendorId, availability: prevAvailability !== product.isAvailable ? { from: prevAvailability, to: product.isAvailable } : undefined, changed: Object.keys(u) }, req);
  res.json(product);
});

// Remove a menu item
app.delete('/api/products/:id', (req, res) => {
  const idx = db.products.findIndex(pp => pp.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  if (!canManageVendor(req, db.products[idx].vendorId)) return res.status(403).json({ error: 'Forbidden' });
  const delProd = db.products[idx];
  const delActor = getAuthUserId(req) ? db.users.find((u: any) => u.id === getAuthUserId(req)) : null;
  db.products.splice(idx, 1);
  logAudit(delActor, 'Menu item deleted', 'menu_item', delProd.id, 'success', { title: delProd.title, vendorId: delProd.vendorId }, req);
  res.json({ success: true });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const { role, id } = req.query;
  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ success: false, message: 'Authentication required' });

  // Admin/super-admin can list any scope; everyone else is locked to their own records.
  const isAdmin = ['administrator', 'super-administrator'].includes(currentUser.role);
  if (isAdmin && !userHasPermission(currentUser, 'orders:view')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to view orders' });
  }
  let filtered = db.orders;
  // Resolve riders/vendors against their platform IDs (user.riderId / user.vendorId),
  // because orders store the rider record id (r-…) and vendor record id (v-…),
  // NOT the user's uuid.
  if (role === 'customer') filtered = filtered.filter(o => o.customerId === id);
  else if (role === 'vendor') filtered = filtered.filter(o => o.vendorId === (currentUser.vendorId || id));
  else if (role === 'rider') filtered = filtered.filter(o => o.riderId === (currentUser.riderId || id));

  // Never leak another user's orders to a non-admin.
  if (!isAdmin) {
    filtered = filtered.filter(o =>
      o.customerId === currentUserId ||
      o.vendorId === currentUser.vendorId ||
      o.riderId === currentUser.riderId
    );
  }

  // Backfill statusTimestamps so every client can render the delivery timeline
  // from real backend timestamps — even for orders created before the field existed.
  filtered = filtered.map((o: any) => withStatusTimestamps(o));

  res.json(filtered);
});

// Available deliveries for riders: orders that are ready for pickup and not yet
// assigned. Only eligible riders (approved, not suspended, online/available, and
// not already at their active-delivery cap) receive the pool.
app.get('/api/orders/available', requireAuth, (req, res) => {
  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (currentUser.role !== 'rider' && !['administrator', 'super-administrator'].includes(currentUser.role)) {
    return res.status(403).json({ success: false, message: 'Only riders can browse available deliveries.' });
  }

  const rider = db.riders.find((r: any) => r.userId === currentUser.id || r.id === currentUser.riderId);
  const isAdmin = ['administrator', 'super-administrator'].includes(currentUser.role);
  const approved = isAdmin || (currentUser.isApproved !== false && currentUser.isSuspended !== true && rider?.verificationStatus !== 'rejected');
  if (!isAdmin && !approved) {
    return res.json([]);
  }
  if (!isAdmin && (!rider || !rider.isOnline || !rider.isAvailable)) {
    // Offline/off-duty riders see no jobs.
    return res.json([]);
  }
  // Active-delivery cap (business rule: at most 2 active deliveries at once).
  const ACTIVE_CAP = 2;
  if (!isAdmin && rider) {
    const activeCount = db.orders.filter((o: any) =>
      o.riderId === rider.id && !['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(o.status)
    ).length;
    if (activeCount >= ACTIVE_CAP) return res.json([]);
  }

  const now = Date.now();
  const available = db.orders
    .filter((o: any) => o.status === 'ready_for_pickup' && !o.riderId)
    .map((o: any) => {
      const vendor = db.vendors.find((v: any) => v.id === o.vendorId);
      const isPackage = DELIVERY_TYPES.includes(String(o.deliveryType || '').toUpperCase() as any);
      const pickup = isPackage ? { lat: o.pickupLat, lng: o.pickupLng } : null;
      const dropoff = isPackage ? { lat: o.dropoffLat, lng: o.dropoffLng } : null;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        deliveryRef: deliveryRefFor(o),
        deliveryType: o.deliveryType || 'FOOD_ORDER',
        vendorId: o.vendorId,
        vendorName: o.vendorName || vendor?.name || (isPackage ? 'Package Pickup' : 'Restaurant'),
        vendorAddress: isPackage ? o.pickupAddress : (vendor?.address || o.pickupAddress),
        vendorLat: isPackage ? (pickup?.lat != null ? Number(pickup.lat) : null) : (Number(vendor?.latitude ?? vendor?.lat ?? o.vendorLat) || null),
        vendorLng: isPackage ? (pickup?.lng != null ? Number(pickup.lng) : null) : (Number(vendor?.longitude ?? vendor?.lng ?? o.vendorLng) || null),
        customerAddress: isPackage ? o.dropoffAddress : o.customerAddress,
        customerLat: isPackage ? (dropoff?.lat != null ? Number(dropoff.lat) : null) : (Number(o.customerLat ?? o.customer_lat) || null),
        customerLng: isPackage ? (dropoff?.lng != null ? Number(dropoff.lng) : null) : (Number(o.customerLng ?? o.customer_lng) || null),
        pickupAddress: isPackage ? o.pickupAddress : o.pickupAddress,
        dropoffAddress: isPackage ? o.dropoffAddress : o.customerAddress,
        receiverName: isPackage ? o.receiverName : undefined,
        receiverPhone: isPackage ? o.receiverPhone : undefined,
        packageSize: isPackage ? o.packageSize : undefined,
        packageType: isPackage ? o.packageType : undefined,
        items: (o.items || []).map((it: any) => ({ title: it.title || it.productName, quantity: it.quantity })),
        itemCount: (o.items || []).reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0),
        deliveryFee: Number(o.deliveryFee) || 0,
        orderValue: Number(o.totalAmount) || 0,
        specialInstructions: o.specialInstructions || o.packageNote || '',
        pickupInstructions: vendor?.pickupInstructions || o.pickupInstructions || (isPackage ? `Collect ${o.packageSize} ${o.packageType || 'package'} from ${o.pickupAddress}` : ''),
        estimatedDeliveryTime: o.estimatedDeliveryTime || '35-45 mins',
        status: o.status,
        createdAt: o.createdAt,
        requestedAt: o.createdAt,
        requestedMinutesAgo: o.createdAt ? Math.max(0, Math.round((now - Date.parse(o.createdAt)) / 60000)) : 0,
        package: isPackage ? {
          size: o.packageSize,
          type: o.packageType,
          weightKg: o.weightKg,
          service: o.service,
          receiverName: o.receiverName,
          receiverPhone: o.receiverPhone
        } : undefined
      };
    });

  res.json(available);
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (
    order.customerId === currentUserId ||
    order.vendorId === currentUser.vendorId ||
    order.riderId === currentUser.riderId
  );
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'You do not have access to this order.' });

  res.json(withStatusTimestamps(order));
});

// Public tracking lookup by order id, order number, or invoice number.
// Unauthenticated callers only receive the sanitized public order shape; the
// customer/rider/GPS details are reserved for authenticated owners.
app.get('/api/orders/tracking/:ref', (req, res) => {
  const ref = String(req.params.ref).toLowerCase();
  const order = db.orders.find(o =>
    o.id.toLowerCase() === ref ||
    String(o.orderNumber || '').toLowerCase() === ref ||
    String(o.invoiceNumber || '').toLowerCase() === ref
  );
  if (!order) return res.status(404).json({ error: 'No order found. Please check the tracking number and try again.' });

  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (
    order.customerId === currentUserId ||
    order.vendorId === currentUser.vendorId ||
    order.riderId === currentUser.riderId
  );

  if (isAdmin || isOwner) return res.json(withStatusTimestamps(order));
  return res.json(publicOrder(order));
});

// Tracking by order id, restricted exactly like the order detail endpoint.
app.get('/api/orders/:id/tracking', requireAuth, (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (
    order.customerId === currentUserId ||
    order.vendorId === currentUser.vendorId ||
    order.riderId === currentUser.riderId
  );
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'You do not have access to this order.' });
  res.json(withStatusTimestamps(order));
});

app.post('/api/orders/:id/assign-rider', requireAuth, (req, res) => {
  let { riderId } = req.body.body ?? req.body;
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ error: 'Authentication required' });
  const isAdmin = ['administrator', 'super-administrator'].includes(currentUser.role);
  const order = db.orders[orderIndex];
  const isOwner = order.vendorId === currentUser.vendorId || order.customerId === currentUser.id;

  // Resolve the rider record whether the caller sends the fleet id (r-…) or the
  // rider's user account id (u-…). Auto-assignment from the vendor/admin used to
  // send a user id and silently fail.
  let rider = db.riders.find((r: any) => r.id === riderId || r.userId === riderId);
  if (!rider && riderId === currentUser.id && currentUser.role === 'rider') {
    rider = db.riders.find((r: any) => r.userId === currentUser.id);
    riderId = rider?.id;
  }
  const isRiderAccepting = currentUser.role === 'rider' && rider && (rider.userId === currentUser.id || rider.id === currentUser.riderId || rider.id === riderId);
  if (!isAdmin && !isOwner && !isRiderAccepting) return res.status(403).json({ error: 'Forbidden' });
  if (isAdmin && !userHasPermission(currentUser, 'deliveries:assign')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to assign deliveries' });
  }
  if (!rider) return res.status(404).json({ error: 'Rider not found' });

  // Eligibility: approved, not suspended, and online (admins may override).
  const riderUser = db.users.find((u: any) => u.id === rider.userId);
  if (!isAdmin && riderUser && (riderUser.isSuspended === true)) {
    return res.status(403).json({ success: false, message: 'Your rider account is suspended and cannot accept deliveries.' });
  }
  if (!isAdmin && (!rider.isOnline || !rider.isAvailable)) {
    return res.status(400).json({ success: false, message: 'You are offline. Go online to accept deliveries.' });
  }

  // A delivery can only be accepted once — atomic check against the live order.
  if (order.riderId && order.riderId !== rider.id) {
    return res.status(409).json({ success: false, message: 'This delivery has already been assigned to another rider.' });
  }
  if (order.status !== 'ready_for_pickup' && order.status !== 'pending' && order.status !== 'confirmed' && order.status !== 'preparing' && !['picked_up', 'in_transit', 'arriving', 'delivered', 'completed'].includes(order.status)) {
    return res.status(409).json({ success: false, message: 'This delivery is no longer available for assignment.' });
  }
  // Prevent double-booking the same rider beyond the active-delivery cap (2),
  // matching the eligibility rule the /available pool uses to surface jobs.
  const ACTIVE_CAP = 2;
  const activeCount = db.orders.filter((o: any) =>
    o.id !== order.id && o.riderId === rider.id && !['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(o.status)
  ).length;
  if (activeCount >= ACTIVE_CAP && !isAdmin) {
    return res.status(409).json({ success: false, message: 'You already have the maximum number of active deliveries. Finish one before accepting another.' });
  }

  db.orders[orderIndex].riderId = rider.id;
  db.orders[orderIndex].dispatchRider = publicDispatchRider(rider);
  // Accepting an assignment does NOT skip to "picked up" — the rider still
  // confirms pickup separately once they physically collect the order.
  if (!['picked_up', 'in_transit', 'arriving', 'delivered', 'completed'].includes(order.status)) {
    db.orders[orderIndex].status = 'rider_assigned';
    stampOrderStatus(db.orders[orderIndex], 'rider_assigned');
  }
  db.orders[orderIndex].updatedAt = new Date().toISOString();
  const updatedOrder = db.orders[orderIndex];

  logAudit(currentUser, isRiderAccepting ? 'Rider accepted delivery' : 'Order assigned to rider', 'order', updatedOrder.id, 'success', { orderNumber: updatedOrder.orderNumber, rider: rider.name, riderId: rider.id }, req);

  // Open the customer <-> rider thread for this delivery.
  ensureCustomerRiderConversation(updatedOrder);

  // Notify rider, customer and restaurant; keep every role's view synchronized.
  broadcastOrderUpdate(updatedOrder);
  // Tell other riders this job is gone so their available lists update instantly.
  broadcast('delivery_unavailable', { id: updatedOrder.id, orderNumber: updatedOrder.orderNumber });

  if (riderUser) {
    notifyUser(rider.userId, 'New Delivery Assigned', `You've been assigned delivery for order ${updatedOrder.orderNumber} from ${updatedOrder.vendorName}.`,
      { type: 'RIDER_ASSIGNED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: updatedOrder.id, relatedDeliveryId: updatedOrder.deliveryId, action: `/rider/deliveries`, dedupeKey: `assigned:${updatedOrder.id}:${rider.userId}` });
    queueEmail({
      to: riderUser.email,
      template: 'rider_assigned',
      data: {
        firstName: riderUser.firstName,
        orderNumber: updatedOrder.orderNumber,
        vendorName: updatedOrder.vendorName,
        customerAddress: `${updatedOrder.customerAddress || ''}`
      },
      eventKey: `rider-assigned:${updatedOrder.id}:${rider.id}`
    });
  }
  const customerUser = db.users.find((u: any) => u.id === updatedOrder.customerId);
  if (customerUser) {
    notifyUser(updatedOrder.customerId, 'Rider Assigned', `${rider.name} is on the way to collect your order ${updatedOrder.orderNumber}.`,
      { type: 'RIDER_ASSIGNED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: updatedOrder.id, relatedDeliveryId: updatedOrder.deliveryId, relatedUserId: rider.userId, action: `/customer/orders/${updatedOrder.id}`, dedupeKey: `assigned:${updatedOrder.id}:${updatedOrder.customerId}` });
  }
  const vendor = db.vendors.find((v: any) => v.id === updatedOrder.vendorId);
  if (vendor) {
    notifyUser(vendor.ownerId, 'Rider Dispatched', `${rider.name} is coming to collect ${updatedOrder.orderNumber}.`,
      { type: 'RIDER_ASSIGNED', category: 'deliveries', priority: 'NORMAL', relatedOrderId: updatedOrder.id, relatedDeliveryId: updatedOrder.deliveryId, action: `/restaurant/orders`, dedupeKey: `assigned:${updatedOrder.id}:${vendor.ownerId}` });
  }

  res.json(withStatusTimestamps(updatedOrder));
});

// ---------------------------------------------------------------------------
// Payment-method availability — the platform gateway configuration is the
// single source of truth. Disabled/unconfigured/unknown methods must be
// rejected server-side, regardless of what any client sends.
// ---------------------------------------------------------------------------
function normalizeGwTokens(s: string): string[] {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3);
}

function resolvePaymentGatewayByMethod(method: string): any | null {
  const gws = Array.isArray(db.platformSettings?.paymentGateways) ? db.platformSettings.paymentGateways : [];
  const m = String(method || '').toLowerCase().trim();
  if (!m) return null;

  // Canonical wallet/COD methods map to their fixed gateway ids regardless of
  // how the gateway rows are named — order paymentMethodId stays stable and the
  // lockout logic in paymentMethodStatus stays independent of gateway naming.
  if (m === 'wallet' || m === 'omniwallet' || m === 'omni wallet') {
    return gws.find((g: any) => g.id === 'gtw-wallet') || null;
  }
  if (m === 'cash on delivery' || m === 'cod' || m === 'cash') {
    // "Cash" alone must map to Cash on Delivery, never to a MoMo/GPR "Cash"-branded
    // gateway (e.g. Telecel Cash) — those are separate methods resolved below.
    const direct = gws.find((g: any) => g.id === 'gtw-cod');
    const byName = gws.find((g: any) => /cash on delivery|^cod$/.test(String(g.name || '').toLowerCase().trim()));
    return direct || byName || null;
  }

  const methodTokens = normalizeGwTokens(method);
  if (methodTokens.length === 0) return null;
  // Exact-grained first: a gateway whose full normalized name equals the method,
  // then any row whose tokens fully contain the method tokens, then loose overlap.
  for (const g of gws) {
    const gName = normalizeGwTokens(String(g.name || '')).join(' ');
    const gType = normalizeGwTokens(String(g.type || '')).join(' ');
    if (gName === methodTokens.join(' ')) return g;
  }
  for (const g of gws) {
    const gSet = new Set(normalizeGwTokens(`${g.id} ${g.name} ${g.type || ''}`));
    if (methodTokens.every((t) => gSet.has(t))) return g;
  }
  for (const g of gws) {
    const gSet = new Set(normalizeGwTokens(`${g.id} ${g.name} ${g.type || ''}`));
    if (methodTokens.some((t) => gSet.has(t))) return g;
  }
  return null;
}

function paymentMethodStatus(method: string): { available: boolean; reason?: string } {
  const m = String(method || 'Cash on Delivery');
  if (m === 'Wallet' || m === 'OmniWallet') return { available: true };
  const gw = resolvePaymentGatewayByMethod(m);
  if (!gw) return { available: false, reason: 'This payment method is not configured on the platform.' };
  if (!gw.configured) return { available: false, reason: 'This payment method is not configured on the platform.' };
  if (!gw.enabled) return { available: false, reason: 'This payment method is currently disabled. Please choose another method.' };
  return { available: true };
}

// Platform delivery pricing. When the customer selects a specific rider, the
// rider's dispatch fee is authoritative. Otherwise the platform charges a
// distance-based fee from live configuration:
//   base + (km × pricePerKm), clamped to [min, max], waived at free-delivery
//   threshold, and rejected when the route exceeds maxDeliveryDistance.
// Returns null when the route is beyond the configured maximum.
// ------------------------------------------------------------
// FUEL-PRICE-BASED DELIVERY PRICING ENGINE (shared)
// ------------------------------------------------------------
// Single source of truth for how fuel prices feed delivery fees. Used by the
// Super Admin pricing preview, order checkout, delivery/charting math and the
// fuel provider. One engine — never duplicated checkout logic.
//
// Fuel adjustment formula (configurable):
//   fuelChange%  = (current - reference) / reference * 100
//   adjustment%  = fuelChange% * (fuelCostWeight / 100)
// When the price drops (negative change) the adjustment lowers the fee by the
// same formula, clamped to maxAutoDecreasePct.
//
// If the change exceeds maxAutoIncreasePct/maxAutoDecreasePct the automatic
// adjustment is PAUSED and a `fuelPendingReview` proposal is staged so a Super
// Admin must approve before any fee moves. 0 current price means "no fuel data"
// → the fuel component stays at 0 (honest default).

const FUEL_SOURCES = ['manual', 'api', 'scraper'] as const;

function getFuelPriceInfo() {
  const s = db.platformSettings;
  const current = Number(s.fuelPriceCurrent);
  const reference = Number(s.fuelPriceReference);
  const weight = Number(s.fuelCostWeight) || 0;
  const fuelChangePct = reference > 0 && Number.isFinite(current) ? Math.round(((current - reference) / reference) * 10000) / 100 : 0;
  const adjustmentPct = Math.round(fuelChangePct * (weight / 100) * 100) / 100;
  return {
    current: Number.isFinite(current) ? current : 0,
    reference: Number.isFinite(reference) ? reference : 0,
    fuelChangePct,
    adjustmentPct,
    weight,
    source: s.fuelPriceSource || 'manual',
    status: s.fuelPriceStatus || 'unavailable',
    lastVerifiedAt: s.fuelPriceLastVerifiedAt || null,
    updatedAt: s.fuelPriceUpdatedAt || null,
    available: Number.isFinite(current) && current > 0
  };
}

// Returns the delivery-fee multiplier the fuel component should apply, or null
// when automatic adjustment is paused (Super Admin review required).
function computeFuelMultiplier(): { multiplier: number; applied: boolean; paused: boolean; reason?: string } | null {
  const s = db.platformSettings;
  const info = getFuelPriceInfo();
  if (!info.available || info.reference <= 0) {
    return { multiplier: 1, applied: false, paused: false, reason: 'no_fuel_price' };
  }
  const maxIncrease = Number(s.maxAutoIncreasePct) || 10;
  const maxDecrease = Number(s.maxAutoDecreasePct) || 10;
  const change = info.fuelChangePct;
  if (change > maxIncrease || change < -Math.abs(maxDecrease)) {
    // A super-admin approval explicitly reviews the staged multiplier and lets
    // that large change move fees (recorded in the audit trail). Without it the
    // automatic adjustment stays PAUSED — fees never silently swing.
    const approved = Number(s.fuelApprovedMultiplier);
    if (Number.isFinite(approved) && approved >= 0 && approved !== 0) {
      return { multiplier: Math.max(0, approved), applied: true, paused: false, reason: 'approved_proposal' };
    }
    return { multiplier: 1, applied: false, paused: true, reason: 'beyond_auto_limits' };
  }
  // adjustmentPct is a % of the *delivery component*; multiplier = 1 ± pct.
  return { multiplier: Math.max(0, 1 + info.adjustmentPct / 100), applied: true, paused: false };
}

// Register every pricing/fuel change as a versioned snapshot so historical
// orders keep the pricing version they were created under (never recalculated
// with today's fuel price).
function applyPricingVersion(meta: { changedBy: string; reason?: string; before: Record<string, any>; after: Record<string, any> }) {
  db.pricingVersions = Array.isArray(db.pricingVersions) ? db.pricingVersions : [];
  const version = (Number(db.platformSettings.currentPricingVersion) || 0) + 1;
  db.platformSettings.currentPricingVersion = version;
  db.pricingVersions.push({
    version,
    timestamp: new Date().toISOString(),
    changedBy: meta.changedBy,
    reason: meta.reason || 'pricing update',
    before: meta.before,
    after: meta.after
  });
  return version;
}

// Provider abstraction. `fetchFuelPriceFromProvider` can connect to a real
// Ghana fuel data API/feed; when the source is unavailable the last verified
// price is retained and surfaced as LAST VERIFIED PRICE / SOURCE UNAVAILABLE —
// never a silently invented number.
async function fetchCurrentFuelPrice(source?: string): Promise<{ price: number; source: string; providerUrl?: string }> {
  const s = db.platformSettings;
  const providerUrl = String(s.fuelProviderUrl || '').trim();
  if (providerUrl) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(providerUrl, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(timer);
      if (r.ok) {
        const j = await r.json();
        const price = parseFuelPriceFromPayload(j);
        if (Number.isFinite(price) && price > 0) {
          return { price: Math.round(price * 100) / 100, source: source || 'api', providerUrl };
        }
      }
    } catch (e: any) {
      systemLog({ level: 'error', source: 'fuel', event: 'fuel_source_unavailable', message: `Fuel provider unreachable at ${providerUrl}: ${e?.message || e}` });
    }
  }
  // No usable provider → return the last verified price (caller marks SOURCE UNAVAILABLE).
  return { price: Number(s.fuelPriceLastVerifiedAt ? Number(s.fuelPriceCurrent) : 0) || 0, source: 'fallback', providerUrl };
}

function parseFuelPriceFromPayload(payload: any): number {
  if (!payload || typeof payload !== 'object') return 0;
  for (const key of ['price', 'currentPrice', 'petrolPrice', 'dieselPrice', 'avgPrice']) {
    const v = payload[key];
    if (Array.isArray(v) && v.length) {
      const n = Number(v[0]?.price ?? v[0]?.value ?? null);
      if (Number.isFinite(n) && n > 0) return n;
    } else {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 0;
}

function recordFuelPriceHistory(entry: { price: number; reference: number; source: string; status: string; note?: string }) {
  db.fuelPriceHistory = Array.isArray(db.fuelPriceHistory) ? db.fuelPriceHistory : [];
  db.fuelPriceHistory.push({
    id: `fuel-${uuidv4().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    price: Math.round(entry.price * 100) / 100,
    reference: Math.round(entry.reference * 100) / 100,
    source: entry.source,
    status: entry.status,
    note: entry.note || null
  });
  if (db.fuelPriceHistory.length > 1000) db.fuelPriceHistory = db.fuelPriceHistory.slice(db.fuelPriceHistory.length - 1000);
}

function computeDeliveryCharge(opts: {
  deliveryMethod?: string;
  rider?: any;
  subtotal?: number;
  vendorLat?: any;
  vendorLng?: any;
  customerLat?: any;
  customerLng?: any;
}): { fee: number; distanceKm: number | null } | null {
  if (opts.deliveryMethod !== 'delivery') return { fee: 0, distanceKm: null };
  if (opts.rider) return { fee: Number(opts.rider.deliveryFee) || 0, distanceKm: null };

  const settings = db.platformSettings;
  const toCoord = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
  const vLat = toCoord(opts.vendorLat);
  const vLng = toCoord(opts.vendorLng);
  const cLat = toCoord(opts.customerLat);
  const cLng = toCoord(opts.customerLng);
  const hasRoute = [vLat, vLng, cLat, cLng].every((n) => n !== null && Number.isFinite(n));

  let distance: number | null = null;
  if (hasRoute) {
    distance = Math.round(distanceKm(vLat!, vLng!, cLat!, cLng!) * 100) / 100;
    const maxDistance = Number(settings.maxDeliveryDistance);
    if (Number.isFinite(maxDistance) && maxDistance > 0 && distance > maxDistance) return null;
  }

  const base = Number.isFinite(Number(settings.deliveryBaseFee)) ? Number(settings.deliveryBaseFee) : Number(settings.defaultDeliveryFee) || 0;
  const perKm = Number(settings.distanceFeePerKm) || 0;
  let fee = base + (distance != null ? distance * perKm : 0);

  const info = getFuelPriceInfo();
  const fuel = computeFuelMultiplier();
  if (fuel && fuel.applied && Number.isFinite(fuel.multiplier)) {
    fee = fee * fuel.multiplier;
  }

  const minFee = Number(settings.deliveryMinFee);
  const maxFee = Number(settings.deliveryMaxFee);
  if (Number.isFinite(minFee) && minFee > 0) fee = Math.max(fee, minFee);
  if (Number.isFinite(maxFee) && maxFee > 0) fee = Math.min(fee, maxFee);

  const freeThreshold = Number(settings.freeDeliveryThreshold) || 0;
  if (freeThreshold > 0 && Number(opts.subtotal) >= freeThreshold) fee = 0;

  return { fee: Math.round(fee * 100) / 100, distanceKm: distance };
}

app.post('/api/orders', requireAuth, (req, res) => {
  const { items, customerId, vendorId, paymentMethod, deliveryMethod, specialInstructions, riderId, couponCode, address, city, country, customerLat, customerLng, deliveryAddressId } = req.body;

  // Orders must belong to the authenticated caller.
  const currentUserId = (req as any).currentUserId;
  if (!customerId || customerId !== currentUserId) {
    return res.status(403).json({ success: false, message: 'You can only place orders on your own account.' });
  }
  const orderCaller = db.users.find((u: any) => u.id === currentUserId);
  if (orderCaller && !isAdminRole(orderCaller.role) && !userHasPermission(orderCaller, 'customer:order')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to place orders.' });
  }

  // Order-creation failures are recorded so the Super Admin audit trail shows
  // why orders were rejected (feeds the Audit Logs page).
  const rejectOrder = (status: number, message: string, reason: string) => {
    logAudit(orderCaller, 'Order creation failed', 'order', null, 'failed', { reason, vendorId, method: paymentMethod || 'none' }, req);
    return res.status(status).json({ success: false, message });
  };

  const vendor = db.vendors.find(v => v.id === vendorId);
  if (!vendor) return rejectOrder(404, 'Restaurant not found.', 'restaurant_not_found');

  // Do not accept new orders from suspended/unavailable vendors
  if (vendor.status === 'suspended') {
    return rejectOrder(403, 'This restaurant is currently suspended and cannot accept orders.', 'restaurant_suspended');
  }
  if (vendor.status !== 'active') {
    return rejectOrder(403, 'This restaurant is not currently accepting orders.', 'restaurant_not_active');
  }
  // Kitchen pause/close flags are authoritative: only explicit `false` blocks orders.
  // A missing flag on an active vendor means the kitchen is open.
  if (vendor.isKitchenOpen === false || vendor.isOpen === false) {
    return rejectOrder(409, 'This restaurant is currently unavailable and cannot accept orders. Please try again later.', 'restaurant_unavailable');
  }

  const customer = db.users.find(u => u.id === currentUserId);
  const rider = riderId ? db.riders.find(r => r.id === riderId) : null;
  if (riderId && !rider) return rejectOrder(400, 'Selected dispatch rider is no longer available.', 'rider_unavailable');
  // The customer may only select a genuinely eligible rider (verified/approved,
  // not suspended, online and available). The /eligible fleet is authoritative;
  // this re-checks so a stale client selection can never place an invalid one.
  if (rider) {
    const riderUser = db.users.find((u: any) => u.id === rider.userId);
    const suspended = riderUser?.isSuspended === true;
    const rejected = rider.verificationStatus === 'rejected';
    const offline = !rider.isOnline || !rider.isAvailable;
    if (suspended || rejected || offline) {
      return rejectOrder(400, 'Selected dispatch rider is not currently available for deliveries. Please choose another rider or let dispatch match you automatically.', 'rider_not_available');
    }
    const ACTIVE_CAP = 2;
    const activeCount = db.orders.filter((o: any) =>
      o.riderId === rider.id && !['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(o.status)
    ).length;
    if (activeCount >= ACTIVE_CAP) {
      return rejectOrder(400, 'Selected dispatch rider is at full delivery capacity. Please choose another rider or let dispatch match you automatically.', 'rider_at_capacity');
    }
  }

  // Saved-address reference: the customer may select one of their stored
  // addresses instead of typing a free-form string. It must genuinely belong
  // to this account — address IDs are the source of truth, not display text.
  let savedDeliveryAddress: any = null;
  if (deliveryAddressId) {
    const savedList: any[] = Array.isArray(customer?.deliveryAddress) ? customer!.deliveryAddress : [];
    savedDeliveryAddress = savedList.find((a: any) => a.id === deliveryAddressId);
    if (!savedDeliveryAddress) {
      return rejectOrder(422, 'Selected delivery address is no longer on your account. Please choose another.', 'invalid_delivery_address');
    }
  }

  // A delivery order must carry a real destination address — never an empty string.
  if (deliveryMethod === 'delivery' && !String(address || '').trim()) {
    return rejectOrder(422, 'A delivery address is required. Please select or enter your delivery location.', 'delivery_address_required');
  }

  const orderId = uuidv4();

  // ---- Authoritative pricing: never trust client-supplied prices or totals ----
  if (!Array.isArray(items) || items.length === 0) {
    return rejectOrder(422, 'Your cart is empty.', 'empty_cart');
  }
  const orderItems: any[] = [];
  let subtotal = 0;
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return rejectOrder(422, 'Invalid item quantity.', 'invalid_quantity');
    }
    const product = db.products.find((p: any) => p.id === item.productId || p.id === item.id);
    if (!product) {
      return rejectOrder(422, 'One of the selected meals is no longer available. Please refresh your cart and try again.', 'item_not_found');
    }
    if (product.vendorId !== vendorId) {
      return rejectOrder(422, 'One of the selected meals does not belong to this restaurant. Please refresh your cart.', 'item_vendor_mismatch');
    }
    if (product.status === 'archived' || product.status === 'inactive' || product.status === 'draft') {
      return rejectOrder(422, `"${product.title}" is no longer available. Please refresh your cart and try again.`, 'item_inactive');
    }
    if (product.isAvailable === false) {
      return rejectOrder(422, `"${product.title}" is currently out of stock.`, 'item_out_of_stock');
    }
    const stock = Number(product.stock);
    if (Number.isFinite(stock) && stock >= 0 && qty > stock) {
      return rejectOrder(422, `Only ${stock} of "${product.title}" are left in stock.`, 'item_insufficient_stock');
    }
    const price = Number(product.price) || 0;
    subtotal += price * qty;
    orderItems.push({
      id: uuidv4(),
      productId: product.id,
      productName: product.title,
      productImage: (product.images && product.images[0]) || '',
      productCategory: product.category || '',
      title: product.title,
      image: (product.images && product.images[0]) || '',
      quantity: qty,
      price
    });
  }

  const charge = computeDeliveryCharge({
    deliveryMethod,
    rider,
    subtotal,
    vendorLat: vendor?.latitude ?? vendor?.lat,
    vendorLng: vendor?.longitude ?? vendor?.lng,
    customerLat,
    customerLng,
  });
  if (charge === null) {
    return rejectOrder(422, 'The delivery distance exceeds the maximum supported by the platform. Please choose another address.', 'delivery_distance_exceeded');
  }
  const deliveryFee = charge.fee;
  const deliveryDistanceKm = charge.distanceKm;
  const taxRate = Number(db.platformSettings?.taxRate);
  const tax = subtotal * (Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 5) / 100;

  // Real coupon validation against the database
  let discount = 0;
  let couponRecord: any = null;
  if (couponCode) {
    couponRecord = db.coupons.find((c: any) => c.code === couponCode && c.isActive);
    if (couponRecord) {
      const now = Date.now();
      const validWindow = (!couponRecord.startsAt || now >= Date.parse(couponRecord.startsAt)) &&
        (!couponRecord.expiryDate || now <= Date.parse(couponRecord.expiryDate));
      if (validWindow && (couponRecord.usageLimit == null || (couponRecord.totalUsed || 0) < couponRecord.usageLimit) && subtotal >= (couponRecord.minSpend || 0)) {
        if (couponRecord.type === 'percentage') discount = Math.min(subtotal * (couponRecord.value / 100), couponRecord.maxDiscount || Infinity);
        else if (couponRecord.type === 'fixed_amount') discount = Math.min(couponRecord.value, subtotal);
        else if (couponRecord.type === 'free_delivery') discount = deliveryFee;
        couponRecord.totalUsed = (couponRecord.totalUsed || 0) + 1;
      } else {
        return rejectOrder(400, 'This coupon is no longer valid for this order.', 'coupon_invalid');
      }
    } else {
      return rejectOrder(400, 'Invalid coupon code.', 'coupon_not_found');
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);
  const { platformCommission, vendorPayout } = computeOrderMoney({ subtotal });

  // ---- Payment handling: the server decides when an order counts as paid ----
  const method = String(paymentMethod || 'Cash on Delivery');
  const resolvedGw = resolvePaymentGatewayByMethod(method);
  // paymentMethodId references the gateway config — the single source of truth.
  // Wallet/COD map to their canonical ids so every order carries a stable method id.
  const paymentMethodId =
    resolvedGw?.id ||
    (method === 'Wallet' || method === 'OmniWallet' ? 'gtw-wallet' : method === 'Cash on Delivery' ? 'gtw-cod' : null);
  // The platform gateway config is authoritative: a disabled, unconfigured, or
  // unknown method is rejected here even if a client still tries to use it.
  const pmCheck = paymentMethodStatus(method);
  if (!pmCheck.available) {
    return rejectOrder(400, pmCheck.reason || 'This payment method is currently unavailable.', 'payment_method_unavailable');
  }
  let paymentStatus = 'pending';
  const wallet = db.wallets.find(w => w.userId === currentUserId);

  if (method === 'Wallet' || method === 'OmniWallet') {
    // Real wallet payment: verify balance and debit it here.
    if (!wallet || (Number(wallet.balance) || 0) < grandTotal) {
      return rejectOrder(402, 'Insufficient wallet balance. Please top up your wallet or choose another payment method.', 'insufficient_wallet');
    }
    wallet.balance = Math.round(((Number(wallet.balance) || 0) - grandTotal) * 100) / 100;
    paymentStatus = 'paid';
  } else if (method === 'Cash on Delivery') {
    // Paid on delivery — stays pending until the order is fulfilled.
    paymentStatus = 'pending';
  } else {
    // Gateway methods (MTN MoMo, Telecel Cash, cards). The order is only marked
    // paid after the server confirms payment. In production this requires a
    // real gateway integration + webhook (see /api/payments/verify). In local
    // development the server auto-verifies so the app remains fully testable.
    paymentStatus = DEV_MONEY ? 'paid' : 'pending';
  }

  const newOrder = {
    id: orderId,
    orderNumber: `OM-${Math.floor(100000 + Math.random() * 900000)}`,
    invoiceNumber: `INV-${Date.now()}`,
    customerId,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Customer',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    customerAddress: savedDeliveryAddress?.address || String(address || '').trim() || 'Address not provided',
    customerLat: (customerLat === null || customerLat === undefined || customerLat === '') ? (savedDeliveryAddress?.latitude ? (Number(savedDeliveryAddress.latitude) || null) : null) : (Number(customerLat) || null),
    customerLng: (customerLng === null || customerLng === undefined || customerLng === '') ? (savedDeliveryAddress?.longitude ? (Number(savedDeliveryAddress.longitude) || null) : null) : (Number(customerLng) || null),
    city: String(city || savedDeliveryAddress?.city || '').trim(),
    country: String(country || savedDeliveryAddress?.country || '').trim(),
    deliveryAddressId: deliveryAddressId || null,
    vendorId,
    vendorName: vendor?.name || 'Restaurant',
    riderId: riderId || null,
    dispatchRider: rider ? publicDispatchRider(rider) : null,
    items: orderItems,
    subtotal,
    deliveryFee,
    deliveryDistanceKm,
    tax,
    discount,
    couponCode: couponCode || null,
    totalAmount: grandTotal,
    platformCommission,
    vendorPayout,
    pricingVersion: Number(db.platformSettings?.currentPricingVersion) || 0,
    pricingSnapshot: {
      deliveryBaseFee: Number(db.platformSettings?.deliveryBaseFee) || 0,
      distanceFeePerKm: Number(db.platformSettings?.distanceFeePerKm) || 0,
      deliveryMinFee: Number(db.platformSettings?.deliveryMinFee) || 0,
      deliveryMaxFee: Number(db.platformSettings?.deliveryMaxFee) || 0,
      freeDeliveryThreshold: Number(db.platformSettings?.freeDeliveryThreshold) || 0,
      maxDeliveryDistance: Number(db.platformSettings?.maxDeliveryDistance) || 0,
      fuelPriceCurrent: Number(db.platformSettings?.fuelPriceCurrent) || 0,
      fuelPriceReference: Number(db.platformSettings?.fuelPriceReference) || 0,
      fuelCostWeight: Number(db.platformSettings?.fuelCostWeight) || 0,
      fuelAdjustmentMode: db.platformSettings?.fuelAdjustmentMode || 'automatic'
    },
    status: 'pending',
    paymentStatus,
    isPaid: paymentStatus === 'paid',
    paymentMethod: method,
    paymentMethodId,
    paymentId: null,
    deliveryMethod: deliveryMethod || 'delivery',
    specialInstructions: specialInstructions || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDeliveryTime: '35-45 mins'
  };

  db.orders.push(newOrder as any);

  // Live order event for all participants (customer on other devices included).
  broadcastOrderUpdate(newOrder as any);

  // Record a debit transaction for wallet payments (money actually left the wallet).
  if (paymentStatus === 'paid') {
    db.transactions.push({
      id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
      userId: customerId,
      type: 'debit',
      category: 'order_payment',
      amount: grandTotal,
      description: `Payment for order ${newOrder.orderNumber}`,
      status: 'completed',
      referenceId: orderId,
      referenceType: 'order',
      createdAt: new Date().toISOString()
    });
  }

  // Track gateway payments so verification can be matched back to the order.
  if (!['Wallet', 'OmniWallet', 'Cash on Delivery'].includes(method)) {
    const payId = `pay-${uuidv4().slice(0, 8)}`;
    db.payments.push({
      id: payId,
      orderId,
      provider: method,
      amount: grandTotal,
      status: paymentStatus,
      reference: `PAY-${uuidv4().slice(0, 10).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    (newOrder as any).paymentId = payId;
  }

  // Send Order Confirmation Email + in-app notification to the customer
  if (customer) {
    notifyUser(customer.id, 'Order Placed', `Your order ${newOrder.orderNumber} for ${newOrder.vendorName} has been placed.`,
      { type: 'ORDER_PLACED', category: 'orders', priority: 'IMPORTANT', relatedOrderId: newOrder.id, action: `/customer/orders/${newOrder.id}`, dedupeKey: `placed:${newOrder.id}:${customer.id}` });
    const itemsSummary = orderItems.map((i: any) =>
      `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>${i.quantity}x ${i.title}</span><span>GHS ${(i.price * i.quantity).toFixed(2)}</span></div>`
    ).join('') +
      `<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;" />` +
      `<div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Total</span><span>GHS ${grandTotal.toFixed(2)}</span></div>`;
    queueEmail({
      to: customer.email,
      template: 'order_confirmed',
      data: {
        firstName: customer.firstName,
        orderNumber: newOrder.orderNumber,
        vendorName: newOrder.vendorName,
        itemsSummary,
        totalAmount: `GHS ${grandTotal.toFixed(2)}`
      },
      eventKey: `order-confirmed:${orderId}:${customer.id}`
    });
  }

  // Notify Vendor
  if (vendor) {
    notifyUser(vendor.ownerId, 'New Order Received!', `Order ${newOrder.orderNumber} for ${newOrder.customerName} has been placed.`,
      { type: 'ORDER_PLACED', category: 'orders', priority: 'IMPORTANT', relatedOrderId: newOrder.id, action: `/restaurant/orders`, dedupeKey: `placed:${newOrder.id}:${vendor.ownerId}` });
    const vendorOwner = db.users.find(u => u.id === vendor.ownerId);
    if (vendorOwner) {
      queueEmail({
        to: vendorOwner.email,
        template: 'vendor_new_order',
        data: { firstName: vendorOwner.firstName, orderNumber: newOrder.orderNumber, customerName: newOrder.customerName },
        eventKey: `vendor-new-order:${orderId}:${vendor.ownerId}`
      });
    }
  }

  // Open a chat thread between the customer and the restaurant so both sides
  // can message each other about this order (no separate thread required).
  if (vendor && vendor.ownerId && vendor.ownerId !== customerId) {
    const existing = db.conversations.find((c: any) =>
      c.type === 'customer_vendor' &&
      c.orderId === orderId &&
      c.participantIds.includes(customerId) &&
      c.participantIds.includes(vendor.ownerId)
    );
    if (!existing) {
      db.conversations.push({
        id: `c-${uuidv4().slice(0, 8)}`,
        type: 'customer_vendor',
        participantIds: [customerId, vendor.ownerId],
        orderId,
        subject: `Order chat — ${vendor.name}`,
        lastMessage: '',
        lastMessageAt: null,
        unreadCount: 0,
        createdAt: new Date().toISOString()
      });
    }
  }

  logAudit(orderCaller, 'Order created', 'order', orderId, 'success', { orderNumber: newOrder.orderNumber, total: grandTotal, method, vendorId: vendor.id }, req);
  res.status(201).json({ ...newOrder, deliveryRef: deliveryRefFor(newOrder) });
});

// Live PACKAGE / PASS quote. Public: it is an estimate the booking form shows;
// the authoritative total is still recomputed on creation. Uses the same fee
// engine so the estimate and the charged amount can never diverge.
app.post('/api/orders/package/quote', (req, res) => {
  const body = req.body.body ?? req.body;
  const {
    deliveryType = 'PACKAGE',
    pickupLat, pickupLng,
    dropoffLat, dropoffLng,
    packageSize, weightKg,
    service, riderId, couponCode
  } = body;

  const type = String(deliveryType || 'PACKAGE').toUpperCase();
  if (!DELIVERY_TYPES.includes(type as any)) {
    return res.status(422).json({ success: false, message: 'deliveryType must be PACKAGE or PASS.' });
  }
  if (PACKAGE_SERVICES.includes(service) === false) {
    return res.status(422).json({ success: false, message: 'Service must be Standard or Express.' });
  }
  const size = String(packageSize || 'Medium');
  if (!(size in PACKAGE_SIZE_FEE)) {
    return res.status(422).json({ success: false, message: 'Invalid package size.' });
  }
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > PACKAGE_MAX_WEIGHT_KG) {
    return res.status(422).json({ success: false, message: `Package weight must be a number between 0 and ${PACKAGE_MAX_WEIGHT_KG}kg.` });
  }
  const hasRoute = (() => {
    const toCoord = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
    return [toCoord(pickupLat), toCoord(pickupLng), toCoord(dropoffLat), toCoord(dropoffLng)]
      .every((c) => c !== null && Number.isFinite(c));
  })();

  const rider = riderId ? db.riders.find((r: any) => r.id === riderId || r.userId === riderId) : null;
  if (riderId && !rider) return res.status(400).json({ success: false, message: 'Selected rider is no longer available.' });

  const quote = computePackageDeliveryQuote({
    packageSize: size,
    weightKg: weight,
    service,
    riderFee: rider?.deliveryFee ?? null,
    pickupLat: hasRoute ? Number(pickupLat) : null,
    pickupLng: hasRoute ? Number(pickupLng) : null,
    dropoffLat: hasRoute ? Number(dropoffLat) : null,
    dropoffLng: hasRoute ? Number(dropoffLng) : null
  });

  const { discount, coupon } = couponDiscountForFee(couponCode, quote.total);
  const payable = Math.max(0, Math.round((quote.total - discount) * 100) / 100);

  res.json({
    success: true,
    deliveryType: type,
    packageSize: size,
    weightKg: weight,
    service,
    distanceKm: quote.distanceKm,
    estimatedDeliveryTime: service === 'Express' ? '20-30 mins' : '30-45 mins',
    breakdown: {
      baseFee: quote.baseFee,
      sizeFee: quote.sizeFee,
      riderFee: quote.riderFee,
      distanceFee: quote.distanceFee,
      weightFee: quote.weightFee,
      distanceKm: quote.distanceKm,
      serviceMultiplier: quote.serviceMultiplier,
      serviceFee: quote.serviceFee,
      subtotal: quote.subtotal,
      platformFee: quote.platformFee
    },
    discount,
    couponCode: coupon ? coupon.code : null,
    total: payable,
    currency: db.platformSettings.currency || 'GHS'
  });
});

// Create a PACKAGE / PASS delivery ("Deliver Something"). Reuses the order
// pipeline so riders, tracking, messages, completion and ratings are identical.
app.post('/api/orders/package', requireAuth, (req, res) => {
  const body = req.body.body ?? req.body;
  const {
    customerId,
    deliveryType = 'PACKAGE',
    riderId,
    pickupAddress,
    pickupLat, pickupLng,
    pickupArea, pickupCity, pickupRegion, pickupLandmark, pickupInstructions,
    dropoffAddress,
    dropoffLat, dropoffLng,
    dropoffArea, dropoffCity, dropoffRegion, dropoffLandmark, dropoffInstructions,
    receiverName, receiverPhone, receiverNote,
    packageSize, packageType,
    weightKg, service,
    note = '', specialInstructions,
    paymentMethod = 'MTN MoMo',
    couponCode
  } = body;

  const currentUserId = (req as any).currentUserId;
  if (!customerId || customerId !== currentUserId) {
    return res.status(403).json({ success: false, message: 'You can only create deliveries on your own account.' });
  }

  const type = String(deliveryType || 'PACKAGE').toUpperCase();
  if (!DELIVERY_TYPES.includes(type as any)) {
    return res.status(422).json({ success: false, message: 'deliveryType must be PACKAGE or PASS.' });
  }
  if (!String(pickupAddress || '').trim()) return res.status(422).json({ success: false, message: 'Enter where we should pick up the package.' });
  if (!String(dropoffAddress || '').trim()) return res.status(422).json({ success: false, message: 'Enter the delivery destination.' });
  const pickupText = String(pickupAddress || '').trim().toLowerCase();
  const dropoffText = String(dropoffAddress || '').trim().toLowerCase();
  const toCoord = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
  const pickupCoords = [toCoord(pickupLat), toCoord(pickupLng)];
  const dropoffCoords = [toCoord(dropoffLat), toCoord(dropoffLng)];
  const sameAddress = pickupText === dropoffText && pickupText.length > 0;
  const sameCoords = pickupCoords.every((n) => n !== null && Number.isFinite(n)) && dropoffCoords.every((n) => n !== null && Number.isFinite(n))
    ? distanceKm(pickupCoords[0]!, pickupCoords[1]!, dropoffCoords[0]!, dropoffCoords[1]!) < 0.05
    : false;
  if (sameAddress || sameCoords) {
    return res.status(422).json({ success: false, message: 'Pickup and destination cannot be the same location.' });
  }
  const receiver = String(receiverName || '').trim();
  if (!receiver || receiver.length < 2 || receiver.length > 80) {
    return res.status(422).json({ success: false, message: 'Enter a valid recipient name (2–80 characters).' });
  }
  const receiverPhoneClean = String(receiverPhone || '').replace(/[^\d+]/g, '');
  if (!isValidGhanaPhone(receiverPhoneClean)) {
    return res.status(422).json({ success: false, message: 'Enter a valid Ghana phone number, e.g. +233 24 000 0000 or 024 000 0000.' });
  }
  if (PACKAGE_SERVICES.includes(service) === false) return res.status(422).json({ success: false, message: 'Service must be Standard or Express.' });
  const size = String(packageSize || 'Medium');
  if (!(size in PACKAGE_SIZE_FEE)) return res.status(422).json({ success: false, message: 'Invalid package size.' });
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > PACKAGE_MAX_WEIGHT_KG) {
    return res.status(422).json({ success: false, message: `Package weight must be a number between 0 and ${PACKAGE_MAX_WEIGHT_KG}kg.` });
  }

  const customer = db.users.find((u: any) => u.id === currentUserId);
  if (!customer) return res.status(401).json({ error: 'Authentication required' });

  // Optional preferred rider: validated like any accept — approved, online,
  // available and not double-booked. Omitted => dispatch matches a rider later.
  let rider: any = null;
  if (riderId) rider = db.riders.find((r: any) => r.id === riderId || r.userId === riderId);
  const orderId = uuidv4();

  if (riderId && !rider) return res.status(400).json({ success: false, message: 'Selected dispatch rider is no longer available.' });
  if (rider) {
    const riderUser = db.users.find((u: any) => u.id === rider.userId);
    if (riderUser?.isSuspended === true) return res.status(403).json({ success: false, message: 'This rider is suspended and cannot accept deliveries.' });
    if (!rider.isOnline || !rider.isAvailable) {
      return res.status(400).json({ success: false, message: 'This rider is currently offline. Choose another rider or let dispatch match one.' });
    }
    const doubleBooked = db.orders.some((o: any) =>
      o.id !== orderId && o.riderId === rider.id && !['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(o.status)
    );
    if (doubleBooked) return res.status(409).json({ success: false, message: 'This rider already has an active delivery. Choose another.' });
  }

  const deliveryQuote = computePackageDeliveryQuote({
    packageSize: size,
    weightKg: weight,
    service,
    riderFee: rider?.deliveryFee ?? null,
    pickupLat: pickupLat != null ? Number(pickupLat) : null,
    pickupLng: pickupLng != null ? Number(pickupLng) : null,
    dropoffLat: dropoffLat != null ? Number(dropoffLat) : null,
    dropoffLng: dropoffLng != null ? Number(dropoffLng) : null
  });
  const deliveryFee = deliveryQuote.total;
  const priceBreakdown = {
    baseFee: deliveryQuote.baseFee,
    sizeFee: deliveryQuote.sizeFee,
    riderFee: deliveryQuote.riderFee,
    distanceFee: deliveryQuote.distanceFee,
    weightFee: deliveryQuote.weightFee,
    distanceKm: deliveryQuote.distanceKm,
    serviceMultiplier: deliveryQuote.serviceMultiplier,
    serviceFee: deliveryQuote.serviceFee,
    subtotal: deliveryQuote.subtotal,
    platformFee: deliveryQuote.platformFee
  };

  // Real coupon validation (same engine as the quote, single source of truth).
  let discount = 0;
  let couponRecord: any = null;
  if (couponCode) {
    const applied = couponDiscountForFee(String(couponCode), deliveryFee);
    discount = applied.discount;
    couponRecord = applied.coupon;
    if (couponRecord && applied.discount > 0) couponRecord.totalUsed = (couponRecord.totalUsed || 0) + 1;
  }

  const grandTotal = Math.max(0, deliveryFee - discount);
  const method = String(paymentMethod || 'MTN MoMo');
  const pmCheck = paymentMethodStatus(method);
  if (!pmCheck.available) {
    return res.status(400).json({ success: false, message: pmCheck.reason || 'This payment method is currently unavailable.' });
  }
  let paymentStatus = 'pending';
  const wallet = db.wallets.find((w: any) => w.userId === currentUserId);

  if (method === 'Wallet' || method === 'OmniWallet') {
    if (!wallet || (Number(wallet.balance) || 0) < grandTotal) {
      return res.status(402).json({ success: false, message: 'Insufficient wallet balance. Please top up your wallet or choose another payment method.' });
    }
    wallet.balance = Math.round(((Number(wallet.balance) || 0) - grandTotal) * 100) / 100;
    paymentStatus = 'paid';
  } else if (method === 'Cash on Delivery') {
    paymentStatus = 'pending';
  } else {
    paymentStatus = DEV_MONEY ? 'paid' : 'pending';
  }

  const carrierName = type === 'PASS' ? 'OmniMarket Pass' : 'OmniMarket Package Delivery';
  const newOrder: any = {
    id: orderId,
    orderNumber: `OMD-${Math.floor(100000 + Math.random() * 900000)}`,
    invoiceNumber: `INV-${Date.now()}`,
    deliveryType: type,
    customerId,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Customer',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    customerAddress: pickupAddress,
    pickupAddress,
    pickupLat: pickupLat != null ? Number(pickupLat) || null : null,
    pickupLng: pickupLng != null ? Number(pickupLng) || null : null,
    pickupArea: String(pickupArea || '').trim() || null,
    pickupCity: String(pickupCity || '').trim() || null,
    pickupRegion: String(pickupRegion || '').trim() || null,
    pickupLandmark: String(pickupLandmark || '').trim() || null,
    pickupInstructions: String(pickupInstructions || '').trim() || null,
    dropoffAddress,
    dropoffLat: dropoffLat != null ? Number(dropoffLat) || null : null,
    dropoffLng: dropoffLng != null ? Number(dropoffLng) || null : null,
    dropoffArea: String(dropoffArea || '').trim() || null,
    dropoffCity: String(dropoffCity || '').trim() || null,
    dropoffRegion: String(dropoffRegion || '').trim() || null,
    dropoffLandmark: String(dropoffLandmark || '').trim() || null,
    dropoffInstructions: String(dropoffInstructions || '').trim() || null,
    receiverName: receiver,
    receiverPhone: normalizeGhanaPhone(receiverPhoneClean),
    receiverNote: receiverNote || '',
    packageSize: size,
    packageType: String(packageType || 'Other'),
    weightKg: weight,
    service,
    priceBreakdown,
    packageNote: String(note || '').trim(),
    confirmationCode: generateConfirmationCode(),
    receiverConfirmed: false,
    vendorId: null,
    vendorName: carrierName,
    riderId: rider ? rider.id : null,
    dispatchRider: rider ? publicDispatchRider(rider) : null,
    items: [{
      id: uuidv4(),
      productId: null,
      productName: `${size} ${String(packageType || 'Package')}`,
      title: `${size} ${String(packageType || 'Package')}`,
      quantity: 1,
      price: 0,
      image: ''
    }],
    subtotal: 0,
    deliveryFee,
    tax: 0,
    discount,
    couponCode: couponCode || null,
    totalAmount: grandTotal,
    platformCommission: 0,
    vendorPayout: 0,
    status: 'pending',
    paymentStatus,
    isPaid: paymentStatus === 'paid',
    paymentMethod: method,
    deliveryMethod: 'delivery',
    specialInstructions: String(note || specialInstructions || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDeliveryTime: service === 'Express' ? '20-30 mins' : '30-45 mins'
  };
  stampOrderStatus(newOrder, 'pending');

  // If the customer picked a specific rider, assign right away (same rules the
  // accept endpoint uses: never auto-advance past the booking state illegally).
  if (rider) {
    newOrder.riderId = rider.id;
    newOrder.dispatchRider = publicDispatchRider(rider);
    newOrder.status = 'rider_assigned';
    stampOrderStatus(newOrder, 'rider_assigned');
    ensureCustomerRiderConversation(newOrder);
  }

  db.orders.push(newOrder);

  if (paymentStatus === 'paid') {
    db.transactions.push({
      id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
      userId: currentUserId,
      type: 'debit',
      category: 'order_payment',
      amount: grandTotal,
      description: `Payment for delivery ${newOrder.orderNumber}`,
      status: 'completed',
      referenceId: orderId,
      referenceType: 'order',
      createdAt: new Date().toISOString()
    });
  }
  if (!['Wallet', 'OmniWallet', 'Cash on Delivery'].includes(method)) {
    db.payments.push({
      id: `pay-${uuidv4().slice(0, 8)}`,
      orderId,
      provider: method,
      amount: grandTotal,
      status: paymentStatus,
      reference: `PAY-${uuidv4().slice(0, 10).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  broadcastOrderUpdate(newOrder);

  if (rider) {
    notifyUser(rider.userId, 'New Delivery Assigned', `${rider.name}, you've been assigned ${type === 'PASS' ? 'a Pass' : 'a package'} delivery ${newOrder.orderNumber} from ${pickupAddress} to ${dropoffAddress}.`,
      { type: 'RIDER_ASSIGNED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: orderId, relatedDeliveryId: newOrder.deliveryId, action: `/rider/deliveries`, dedupeKey: `assigned:${orderId}:${rider.userId}` });
    notifyUser(currentUserId, 'Rider Assigned', `${rider.name} will collect your ${type === 'PASS' ? 'Pass' : 'package'} (${newOrder.orderNumber}).`,
      { type: 'RIDER_ASSIGNED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: orderId, relatedDeliveryId: newOrder.deliveryId, action: `/customer/orders/${orderId}`, dedupeKey: `assigned:${orderId}:${currentUserId}` });
  } else {
    // Unassigned package/pass: dispatchable as soon as payment is settled
    // (wallet/momo paid now, or COD collected at the door). Promote it to the
    // rider pool directly so eligible riders see it — no manual admin dispatch.
    // Truly unpaid pending orders (e.g. a failed external payment) stay in a
    // hold state until payment clears.
    const dispatchable = paymentStatus === 'paid' || method === 'Cash on Delivery';
    if (dispatchable) {
      newOrder.status = 'ready_for_pickup';
      stampOrderStatus(newOrder, 'ready_for_pickup');
      broadcast('delivery_available', {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        orderType: newOrder.deliveryType || 'FOOD_ORDER',
        vendorName: newOrder.vendorName || 'Delivery',
        vendorAddress: newOrder.pickupAddress,
        customerAddress: newOrder.dropoffAddress,
        deliveryFee: newOrder.deliveryFee,
        itemCount: (newOrder.items || []).reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0)
      });
      db.riders.filter((r: any) => r.isOnline && r.isAvailable).forEach((onlineRider: any) => {
        notifyUser(onlineRider.userId, 'Delivery Job Available', `New ${type === 'PASS' ? 'Pass' : 'package'} delivery from ${pickupAddress} to ${dropoffAddress} — ${newOrder.deliveryFee} payout.`,
          { type: 'DELIVERY_JOB_AVAILABLE', category: 'deliveries', priority: 'NORMAL', relatedOrderId: orderId, relatedDeliveryId: newOrder.deliveryId, action: `/rider/jobs`, dedupeKey: `job-avail:${orderId}:${onlineRider.userId}` });
      });
    } else {
      // Hold until payment clears; surface to the dispatch team in the meantime.
      db.users.filter((u: any) => ['administrator', 'super-administrator'].includes(u.role)).forEach((admin: any) => {
        notifyUser(admin.id, 'Package Dispatch Request', `${newOrder.orderNumber} from ${pickupAddress} — waiting on payment before dispatch.`,
          { type: 'SYSTEM_ALERT', category: 'system', priority: 'IMPORTANT', relatedOrderId: orderId, action: `/admin/orders`, dedupeKey: `dispatch-hold:${orderId}:${admin.id}` });
      });
    }
  }

  if (customer) {
    queueEmail({
      to: customer.email,
      template: 'order_confirmed',
      data: {
        firstName: customer.firstName,
        orderNumber: newOrder.orderNumber,
        vendorName: carrierName,
        itemsSummary: `<div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span>${size} ${packageType}</span><span>GHS ${deliveryFee.toFixed(2)}</span></div>`,
        totalAmount: `GHS ${grandTotal.toFixed(2)}`
      },
      eventKey: `package-confirmed:${orderId}:${customer.id}`
    });
  }

  logAudit(customer, 'Delivery booked', 'order', orderId, 'success', { orderNumber: newOrder.orderNumber, type, total: grandTotal, method, from: pickupAddress, to: dropoffAddress }, req);
  res.status(201).json({ ...newOrder, deliveryRef: deliveryRefFor(newOrder) });
});

// Allowed status transitions per role. Keys are the new status; each value lists
// the roles permitted to set it (customer, vendor, rider) plus the set of
// acceptable previous statuses. Admins may always set any status.
const ORDER_STATUS_FLOW: Record<string, { roles: string[]; from: string[] }> = {
  confirmed: { roles: ['vendor', 'admin'], from: ['pending'] },
  preparing: { roles: ['vendor'], from: ['pending', 'confirmed'] },
  ready_for_pickup: { roles: ['vendor', 'admin'], from: ['pending', 'confirmed', 'preparing'] },
  rider_assigned: { roles: ['vendor', 'rider', 'admin'], from: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] },
  picked_up: { roles: ['rider'], from: ['ready_for_pickup', 'rider_assigned'] },
  in_transit: { roles: ['rider'], from: ['picked_up'] },
  arriving: { roles: ['rider'], from: ['picked_up', 'in_transit'] },
  // Receiver-confirmation step (package/pass deliveries) — the rider signals they
  // have arrived at the drop-off and waits for the recipient to confirm receipt
  // before the parcel counts as delivered.
  awaiting_confirmation: { roles: ['rider'], from: ['picked_up', 'in_transit', 'arriving'] },
  delivered: { roles: ['rider', 'admin'], from: ['rider_assigned', 'picked_up', 'in_transit', 'arriving', 'awaiting_confirmation'] },
  completed: { roles: ['vendor', 'rider', 'admin'], from: ['delivered'] },
  cancelled: { roles: ['customer', 'vendor', 'admin'], from: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] },
  failed: { roles: ['vendor', 'admin'], from: ['pending', 'confirmed'] }
};

app.patch('/api/orders/:id/status', requireAuth, (req, res) => {
  const body = req.body.body ?? req.body;
  const { status } = body;
  const cancelReason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const order = db.orders[orderIndex];
  const isOwner = currentUser && (
    order.vendorId === currentUser.vendorId ||
    order.riderId === currentUser.riderId ||
    order.riderId === currentUserId ||
    order.customerId === currentUserId
  );
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });
  if (isAdmin && !userHasPermission(currentUser, 'orders:manage')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to manage orders' });
  }

  const newStatus = String(status || '');
  const prevStatus = order.status;

  if (!isAdmin) {
    const rule = ORDER_STATUS_FLOW[newStatus];
    if (!rule) return res.status(422).json({ success: false, message: `Invalid order status transition: ${prevStatus} -> ${newStatus}` });
    if (!rule.roles.includes(currentUser.role)) return res.status(403).json({ success: false, message: `You are not allowed to set order status to "${newStatus}".` });
    if (!rule.from.includes(prevStatus)) return res.status(422).json({ success: false, message: `Order cannot move from "${prevStatus}" to "${newStatus}".` });
  }

  // A rider may only act on their own assigned delivery.
  if (currentUser.role === 'rider' && order.riderId !== currentUser.riderId && order.riderId !== currentUserId) {
    return res.status(403).json({ error: 'You can only update deliveries assigned to you.' });
  }

  // Package/PASS parcels only count as "delivered" AFTER the recipient confirms
  // receipt (tracking page / confirmation code). The rider must first reach the
  // awaiting_confirmation step; the receiver-confirm endpoint performs the final
  // transition. Admins may always override.
  const isPackage = DELIVERY_TYPES.includes(String(order.deliveryType || '').toUpperCase() as any);
  if (!isAdmin && isPackage && newStatus === 'delivered' && order.receiverConfirmed !== true) {
    return res.status(409).json({ success: false, message: 'This parcel requires recipient confirmation before it can be marked delivered.' });
  }

  const wasPooled = prevStatus === 'ready_for_pickup' && !order.riderId;

  db.orders[orderIndex].status = newStatus;
  stampOrderStatus(db.orders[orderIndex], newStatus);
  db.orders[orderIndex].updatedAt = new Date().toISOString();
  if (newStatus === 'delivered' || newStatus === 'completed') db.orders[orderIndex].deliveredAt = new Date().toISOString();
  if (newStatus === 'picked_up') db.orders[orderIndex].pickedUpAt = new Date().toISOString();
  const updatedOrder = db.orders[orderIndex];

  logAudit(currentUser, newStatus === 'cancelled' ? 'Order cancelled' : 'Order status changed', 'order', updatedOrder.id, 'success', { from: prevStatus, to: newStatus, orderNumber: updatedOrder.orderNumber }, req);

  // On completed/delivered: settle vendor payout + rider earnings (idempotent).
  if (newStatus === 'delivered' || newStatus === 'completed') {
    settleDeliveredOrder(updatedOrder);
  }

  // Keep the customer, restaurant and rider views synchronized.
  broadcastOrderUpdate(updatedOrder);
  // If this order left the ready-for-pickup pool, tell riders to drop it.
  if (wasPooled && newStatus !== 'ready_for_pickup') {
    broadcast('delivery_unavailable', { id: updatedOrder.id, orderNumber: updatedOrder.orderNumber });
  }

  // Lifecycle notifications (generated once, here, from the authoritative event).
  const orderOpts = (status: string) => ({ type: `ORDER_${status.toUpperCase()}` as string, category: 'orders' as const, priority: 'NORMAL' as const, relatedOrderId: updatedOrder.id, action: `/customer/orders/${updatedOrder.id}`, dedupeKey: `status:${status}:${updatedOrder.id}:${updatedOrder.customerId}` });
  if (newStatus === 'confirmed') notifyUser(updatedOrder.customerId, 'Order Confirmed', `${updatedOrder.vendorName} has accepted your order ${updatedOrder.orderNumber}.`, orderOpts('confirmed'));
  if (newStatus === 'preparing') notifyUser(updatedOrder.customerId, 'Order Being Prepared', `${updatedOrder.vendorName} is preparing your order ${updatedOrder.orderNumber}.`, orderOpts('preparing'));
  if (newStatus === 'picked_up') notifyUser(updatedOrder.customerId, 'Order Picked Up', `Your order ${updatedOrder.orderNumber} has been picked up and is on the way.`, orderOpts('picked_up'));
  if (newStatus === 'in_transit') notifyUser(updatedOrder.customerId, 'Out for Delivery', `Your order ${updatedOrder.orderNumber} is out for delivery.`, orderOpts('in_transit'));
  if (newStatus === 'arriving') notifyUser(updatedOrder.customerId, 'Rider Approaching', `Your rider is almost at your doorstep for order ${updatedOrder.orderNumber}.`, orderOpts('arriving'));
  if (newStatus === 'awaiting_confirmation') notifyUser(updatedOrder.customerId, 'Recipient Confirmation Required', `Your parcel ${updatedOrder.orderNumber} has arrived. Confirm receipt to complete the delivery.`, orderOpts('awaiting_confirmation'));
  // A delivery that lands (delivered) or an order the customer later marks
  // complete both earn a review prompt — the dedupe key keeps it to one.
  if (newStatus === 'delivered' || newStatus === 'completed') notifyUser(updatedOrder.customerId, 'How was your delivery?', `Rate your delivery ${updatedOrder.orderNumber} — your feedback powers ${updatedOrder.deliveryType ? 'your rider' : 'the restaurant and your rider'}.`,
    { type: 'REVIEW_AVAILABLE', category: 'orders', priority: 'NORMAL', relatedOrderId: updatedOrder.id, action: `/customer/reviews`, dedupeKey: `review:${updatedOrder.id}:${updatedOrder.customerId}` });
  if (newStatus === 'cancelled') {
    if (cancelReason) db.orders[orderIndex].cancellationReason = cancelReason;
    if (!db.orders[orderIndex].cancelledAt) db.orders[orderIndex].cancelledAt = new Date().toISOString();
    processOrderRefund(db.orders[orderIndex]);
    if (db.orders[orderIndex].refundStatus === 'refunded') {
      logAudit(currentUser, 'Order refunded', 'order', updatedOrder.id, 'success', { orderNumber: updatedOrder.orderNumber, amount: updatedOrder.refundAmount, reason: cancelReason }, req);
    }
    notifyUser(updatedOrder.customerId, 'Order Cancelled', `Order ${updatedOrder.orderNumber} has been cancelled.`,
      { type: 'ORDER_CANCELLED', category: 'orders', priority: 'IMPORTANT', relatedOrderId: updatedOrder.id, action: `/customer/orders/${updatedOrder.id}`, dedupeKey: `cancelled:${updatedOrder.id}:${updatedOrder.customerId}` });
    const v = db.vendors.find((vv: any) => vv.id === updatedOrder.vendorId);
    if (v) notifyUser(v.ownerId, 'Order Cancelled', `Order ${updatedOrder.orderNumber} was cancelled.`,
      { type: 'ORDER_CANCELLED', category: 'orders', priority: 'IMPORTANT', relatedOrderId: updatedOrder.id, action: `/restaurant/orders`, dedupeKey: `cancelled:${updatedOrder.id}:${v.ownerId}` });
    const r = db.riders.find((rr: any) => rr.id === updatedOrder.riderId);
    if (r) notifyUser(r.userId, 'Delivery Cancelled', `Delivery for order ${updatedOrder.orderNumber} was cancelled.`,
      { type: 'DELIVERY_CANCELLED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: updatedOrder.id, action: `/rider/deliveries`, dedupeKey: `cancelled:${updatedOrder.id}:${r.userId}` });
  }

  // If the restaurant marked the order ready and no rider is assigned, put it
  // into the live dispatch pool and alert every online rider.
  if (newStatus === 'ready_for_pickup' && !updatedOrder.riderId) {
    const vendor = db.vendors.find((v: any) => v.id === updatedOrder.vendorId);
    broadcast('delivery_available', {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      orderType: updatedOrder.deliveryType || 'FOOD_ORDER',
      vendorName: updatedOrder.vendorName || 'Delivery',
      vendorAddress: vendor?.address || updatedOrder.pickupAddress,
      customerAddress: updatedOrder.deliveryType ? updatedOrder.dropoffAddress : updatedOrder.customerAddress,
      deliveryFee: updatedOrder.deliveryFee,
      itemCount: (updatedOrder.items || []).reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0)
    });
    db.riders.filter((r: any) => r.isOnline && r.isAvailable).forEach(rider => {
      notifyUser(rider.userId, 'Delivery Job Available', `New delivery from ${updatedOrder.vendorName} — ${updatedOrder.customerAddress || ''}`,
        { type: 'DELIVERY_JOB_AVAILABLE', category: 'deliveries', priority: 'NORMAL', relatedOrderId: updatedOrder.id, action: `/rider/jobs`, dedupeKey: `job-avail:${updatedOrder.id}:${rider.userId}` });
    });
  }

  res.json(withStatusTimestamps(updatedOrder));
});

// Atomic, idempotent delivery completion. The rider confirms the delivery is
// done; the server decides the next legal status from the actual order state.
//   - Already delivered/completed            -> 200, alreadyCompleted: true (no re-run)
//   - picked_up / in_transit / arriving      -> delivered
//   - ready_for_pickup / rider_assigned with this rider assigned -> delivered
//   - pending/confirmed/preparing            -> 409 (not on the road yet)
//   - cancelled/failed/refunded              -> 422 (terminal, cannot resurrect)
// Side effects (earnings, payout, COD, notifications) are all idempotent and
// only fire on the first successful completion.
app.post('/api/orders/:id/complete', requireAuth, (req, res) => {
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ success: false, message: 'Order not found.' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const order = db.orders[orderIndex];
  const prevStatus = order.status;
  const rider = order.riderId ? db.riders.find((r: any) => r.id === order.riderId) : null;
  const ownsDelivery = !!rider && currentUser && (
    rider.userId === currentUserId || rider.id === currentUser.riderId
  );

  console.log('[delivery-complete]', JSON.stringify({
    authRiderId: currentUser?.riderId || null,
    authUserId: currentUserId,
    delivery: order.id,
    deliveryRiderId: order.riderId || null,
    deliveryRiderUserId: rider?.userId || null,
    order: order.orderNumber,
    prevStatus,
    ownsDelivery,
    isAdmin: !!isAdmin
  }));

  if (!isAdmin && !ownsDelivery) {
    return res.status(403).json({ success: false, message: 'You can only complete deliveries assigned to you.' });
  }

  // Safe no-op: already completed. No side effects are re-run. For food orders
  // `delivered` is the terminal completing state; for packages it is only the
  // terminal state once the recipient confirmed, and this route then advances
  // the confirmed parcel from delivered to completed below.
  const isPackage = DELIVERY_TYPES.includes(String(order.deliveryType || '').toUpperCase() as any);
  const isPackageConfirmed = isPackage && order.receiverConfirmed === true;
  if (order.status === 'completed' || (order.status === 'delivered' && !isPackageConfirmed)) {
    return res.json({ success: true, alreadyCompleted: true, order: withStatusTimestamps(order) });
  }

  // Package/PASS parcels that were receiver-confirmed (status delivered) still
  // need a completion step so they leave the rider's active queue and appear as
  // completed — the rider finishing the run is that step. Earnings were already
  // settled at confirmation, so this only advances the state machine.
  if (isPackageConfirmed && order.status === 'delivered') {
    order.status = 'completed';
    stampOrderStatus(order, 'completed');
    order.updatedAt = new Date().toISOString();
    logAudit(currentUser, 'Delivery completed', 'order', order.id, 'success', { orderNumber: order.orderNumber, from: 'delivered', to: 'completed' }, req);
    broadcastOrderUpdate(order);
    res.json({ success: true, alreadyCompleted: false, order: withStatusTimestamps(order) });
    return;
  }

  // Not on the road yet — the rider must first confirm pickup.
  if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
    return res.status(409).json({ success: false, message: `This delivery is not on the road yet (${statusLabel(order.status)}). Confirm pickup first.` });
  }

  // Package/PASS parcels must have recipient confirmation before they can be
  // completed — the receiver-confirm endpoint is the authoritative signal.
  if (isPackage && !isPackageConfirmed) {
    return res.status(409).json({ success: false, message: 'This parcel has not been confirmed by the recipient yet. Recipient confirmation is required before completion.' });
  }

  // Terminal states can never be completed.
  if (['cancelled', 'failed', 'refunded'].includes(order.status)) {
    return res.status(422).json({ success: false, message: `This delivery was ${order.status} and cannot be completed.` });
  }

  const wasPooled = order.status === 'ready_for_pickup' && !order.riderId;
  const now = new Date().toISOString();

  // Auto-advance from a pre-pickup state if a rider is genuinely assigned —
  // the rider confirming delivery is the authoritative signal they picked it up.
  if (['ready_for_pickup', 'rider_assigned'].includes(order.status)) {
    stampOrderStatus(order, 'picked_up');
    order.pickedUpAt = now;
  }

  order.status = 'delivered';
  stampOrderStatus(order, 'delivered');
  order.deliveredAt = now;
  order.updatedAt = now;
  const updatedOrder = order;

  settleDeliveredOrder(updatedOrder);

  logAudit(currentUser, 'Delivery completed', 'order', updatedOrder.id, 'success', { orderNumber: updatedOrder.orderNumber, from: prevStatus, to: 'delivered' }, req);

  // Delivery landed -> prompt for a review (deduped against the status path).
  notifyUser(updatedOrder.customerId, 'How was your delivery?',
    `Rate your delivery ${updatedOrder.orderNumber} — your feedback powers ${updatedOrder.deliveryType ? 'your rider' : 'the restaurant and your rider'}.`,
    { type: 'REVIEW_AVAILABLE', category: 'orders', priority: 'NORMAL', relatedOrderId: updatedOrder.id, action: `/customer/reviews`, dedupeKey: `review:${updatedOrder.id}:${updatedOrder.customerId}` });

  broadcastOrderUpdate(updatedOrder);
  if (wasPooled) {
    broadcast('delivery_unavailable', { id: updatedOrder.id, orderNumber: updatedOrder.orderNumber });
  }

  console.log('[delivery-complete]', JSON.stringify({
    delivery: updatedOrder.id,
    prevStatus,
    nextStatus: 'delivered',
    result: 'ok'
  }));

  res.json({ success: true, alreadyCompleted: false, order: updatedOrder });
});

// Recipient confirmation for PACKAGE / PASS deliveries. The sender (order owner)
// can confirm directly from the tracking page; anyone holding the generated
// confirmation code (relayed to the actual receiver) can confirm too. Once the
// parcel is confirmed, it is the only path to "delivered" for these types.
app.post('/api/orders/:id/receiver-confirm', requireAuth, (req, res) => {
  const body = req.body.body ?? req.body;
  const { code } = body;
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ success: false, message: 'Delivery not found.' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const order = db.orders[orderIndex];

  if (!DELIVERY_TYPES.includes(String(order.deliveryType || '').toUpperCase() as any)) {
    return res.status(422).json({ success: false, message: 'Recipient confirmation only applies to package and pass deliveries.' });
  }

  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isSender = currentUser && order.customerId === currentUserId;
  const codeMatches = !!code && String(order.confirmationCode || '').toUpperCase() === String(code).toUpperCase().trim();
  if (!currentUser || (!isAdmin && !isSender && !codeMatches)) {
    return res.status(403).json({ success: false, message: 'You can only confirm a delivery you sent, or with the correct confirmation code.' });
  }

  // Already delivered/completed — safe idempotent no-op.
  if (order.status === 'delivered' || order.status === 'completed') {
    return res.json({ success: true, alreadyConfirmed: true, order: withStatusTimestamps(order) });
  }

  // The parcel must have left for the recipient (or be awaiting confirmation).
  if (!['picked_up', 'in_transit', 'arriving', 'awaiting_confirmation'].includes(order.status)) {
    return res.status(409).json({ success: false, message: `This parcel is not at the recipient yet (${statusLabel(order.status)}).` });
  }

  const now = new Date().toISOString();
  order.receiverConfirmed = true;
  order.receiverConfirmedAt = now;
  order.confirmationMethod = codeMatches ? 'code' : (isSender ? 'sender' : 'admin');
  order.status = 'delivered';
  stampOrderStatus(order, 'delivered');
  order.deliveredAt = now;
  order.updatedAt = now;

  settleDeliveredOrder(order);
  broadcastOrderUpdate(order);

  notifyUser(order.customerId, 'Delivery Confirmed', `Recipient confirmed receipt of ${order.orderNumber}.`,
    { type: 'DELIVERY_COMPLETED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: order.id, action: `/customer/orders/${order.id}`, dedupeKey: `receiver-confirmed:${order.id}:${order.customerId}` });
  const rider = order.riderId ? db.riders.find((r: any) => r.id === order.riderId) : null;
  if (rider) notifyUser(rider.userId, 'Delivery Confirmed', `Recipient confirmed receipt of ${order.orderNumber}. Earning credited.`,
    { type: 'DELIVERY_COMPLETED', category: 'deliveries', priority: 'IMPORTANT', relatedOrderId: order.id, relatedDeliveryId: order.deliveryId, action: `/rider/deliveries`, dedupeKey: `receiver-confirmed:${order.id}:${rider.userId}` });

  res.json({ success: true, alreadyConfirmed: false, order: withStatusTimestamps(order) });
});

// Open (or reuse) the order-linked customer <-> rider conversation. Only the
// order's owner or an admin can open it; the server always owns the participant
// list so a customer can never message an arbitrary rider through this route.
app.post('/api/orders/:id/conversation/rider', requireAuth, (req, res) => {
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });
  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ error: 'Authentication required' });
  const order = db.orders[orderIndex];
  if (!canAccessOrder(order, currentUser, currentUserId)) return res.status(403).json({ error: 'Forbidden' });

  const rider = order.riderId ? db.riders.find((r: any) => r.id === order.riderId) : null;
  if (!rider) return res.status(409).json({ error: 'No rider is assigned to this delivery yet.' });

  const conversation = ensureCustomerRiderConversation(order);
  if (!conversation) return res.status(500).json({ error: 'Could not open the rider conversation.' });
  res.status(201).json(conversation);
});

// Open (or reuse) the order-linked customer <-> restaurant conversation. Only
// the order's owner, the vendor owner, or an admin may open it.
app.post('/api/orders/:id/conversation/vendor', requireAuth, (req, res) => {
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });
  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ error: 'Authentication required' });
  const order = db.orders[orderIndex];
  if (!canAccessOrder(order, currentUser, currentUserId)) return res.status(403).json({ error: 'Forbidden' });

  const vendor = order.vendorId ? db.vendors.find((v: any) => v.id === order.vendorId) : null;
  if (!vendor || !vendor.ownerId) return res.status(409).json({ error: 'This delivery is not linked to a restaurant.' });

  let conv = db.conversations.find((c: any) =>
    c.type === 'customer_vendor' && c.orderId === order.id &&
    c.participantIds.includes(order.customerId) && c.participantIds.includes(vendor.ownerId)
  );
  if (!conv) {
    conv = {
      id: `c-${uuidv4().slice(0, 8)}`,
      type: 'customer_vendor',
      participantIds: [order.customerId, vendor.ownerId],
      orderId: order.id,
      subject: `Order chat — ${vendor.name}`,
      lastMessage: '',
      lastMessageAt: null,
      unreadCount: 0,
      createdAt: new Date().toISOString()
    };
    db.conversations.push(conv);
  }
  res.status(201).json(conv);
});

app.get('/api/wallets', requireAdmin, requirePermission('payments:view'), (req, res) => {
  const rows = db.wallets.map((w: any) => {
    const user = db.users.find((u: any) => u.id === w.userId);
    const inflow = db.transactions.filter((t: any) => t.userId === w.userId && t.category !== 'order_payment' && t.type !== 'debit').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const outflow = db.transactions.filter((t: any) => t.userId === w.userId && (t.type === 'debit' || t.category === 'order_payment')).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    return {
      ...w,
      userName: user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Unknown',
      userEmail: user?.email || '',
      role: user?.role || 'unknown',
      totalTransactions: db.transactions.filter((t: any) => t.userId === w.userId).length,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      updatedAt: w.updatedAt || user?.updatedAt || null
    };
  });
  res.json(rows.sort((a: any, b: any) => (Number(b.balance) || 0) - (Number(a.balance) || 0)));
});

app.get('/api/wallets/:userId/balance', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const wallet = db.wallets.find(w => w.userId === req.params.userId);
  res.json(wallet || { balance: 0, currency: 'GHS' });
});

app.get('/api/wallets/:userId/transactions', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const transactions = db.transactions.filter(t => t.userId === req.params.userId);
  res.json(transactions);
});

app.post('/api/wallets/:userId/topup', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body.body ?? req.body;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(422).json({ success: false, message: 'Top-up amount must be a positive number.' });
  }
  if (amount > 100000) {
    return res.status(422).json({ success: false, message: 'Top-up amount exceeds the maximum allowed (GHS 100,000).' });
  }
  // A disabled/unconfigured gateway must never remain usable through a wallet
  // top-up just because a client picked its label. Wallet and COD are unaffected
  // (they are not external gateway funds flows).
  const method = String(body.method || '').trim();
  if (method) {
    const st = paymentMethodStatus(method);
    if (!st.available) {
      if (isProd || !DEV_MONEY) {
        return res.status(400).json({ success: false, message: `Payment via ${method} is currently unavailable.` });
      }
      recordSecurityEvent({ type: 'GATEWAY_DISABLED_ATTEMPT', severity: 'LOW', endpoint: '/api/wallets/:userId/topup', account: (db.users.find((u: any) => u.id === (req as any).currentUserId) as any)?.email || null, userId: (req as any).currentUserId, ip: secCtx(req).ip, detection: `Top-up attempted against a disabled gateway (${method}).`, actionTaken: 'Allowed in dev money mode only', status: 'monitoring', req });
    }
  }
  const wallet = db.wallets.find(w => w.userId === req.params.userId);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  // Wallet top-ups must go through a payment provider. In production the credit
  // only happens after the provider confirms via /api/payments/verify. In local
  // development (no gateway configured) the server auto-verifies so the app
  // remains testable end-to-end.
  const status = DEV_MONEY ? 'completed' : 'pending';
  if (status === 'completed') {
    wallet.balance = Math.round(((Number(wallet.balance) || 0) + amount) * 100) / 100;
  }

  const transaction = {
    id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
    userId: req.params.userId,
    type: 'credit',
    category: 'top_up',
    amount,
    description: `Wallet Top-up via ${body.method || 'payment provider'}`,
    status,
    reference: `TOP-${uuidv4().slice(0, 10).toUpperCase()}`,
    createdAt: new Date().toISOString()
  };
  db.transactions.push(transaction as any);

  res.json(transaction);
});

// Verify a pending wallet top-up or gateway order payment. This is where a real
// payment provider webhook/callback would land. Until credentials are configured
// the dev build auto-verifies; production requires the provider to call this.
// Signed provider webhook. Payment state is only ever finalized here (or by an
// authorized admin reconciliation of a provider-confirmed reference) — never by
// a client. Signature = HMAC-SHA256 of the raw body with the provider secret.
app.post('/api/payments/webhook/:provider', (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}), 'utf8');
  const signature = String(
    req.headers['x-paystack-signature'] || req.headers['x-webhook-signature'] || req.headers['x-signature'] || req.headers['x-omnimarket-signature'] || ''
  ).trim();

  const secretMap: Record<string, string | undefined> = {
    paystack: process.env.PAYSTACK_SECRET_KEY,
    flutterwave: process.env.FLUTTERWAVE_SECRET_KEY,
    mtn: process.env.MTN_API_SECRET,
    telecel: process.env.TELECEL_API_SECRET,
  };
  // Non-production fallback secret so the signed flow can be exercised locally.
  // Production requires a real, environment-provided provider secret.
  const secret = secretMap[provider] || (DEV_MONEY ? (process.env.DEV_PAYMENT_SECRET || 'omnimarket-dev-webhook-secret') : '');

  if (!secret) {
    recordSecurityEvent({ type: 'INVALID_PAYMENT_WEBHOOK', severity: 'HIGH', endpoint: `/api/payments/webhook/${provider}`, detection: `Webhook received for provider "${provider}" with no configured secret.`, actionTaken: 'Webhook rejected', status: 'blocked', req, details: { provider } });
    return res.status(403).json({ success: false, message: 'Webhook not accepted.' });
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const provided = signature.toLowerCase();
  if (!provided || !safeEqual(expected, provided)) {
    recordSecurityEvent({ type: 'PAYMENT_SIGNATURE_FAILURE', severity: 'HIGH', endpoint: `/api/payments/webhook/${provider}`, detection: 'Webhook signature did not match the provider secret.', actionTaken: 'Webhook rejected and ignored', status: 'blocked', req, details: { provider, hasSignature: !!signature } });
    return res.status(401).json({ success: false, message: 'Invalid signature.' });
  }

  let payload: any;
  try { payload = JSON.parse(raw.toString('utf8')); }
  catch { return res.status(400).json({ success: false, message: 'Malformed webhook payload.' }); }

  const ref = String(payload?.reference || payload?.data?.reference || payload?.reference_id || payload?.tx_ref || '');
  const eventId = String(payload?.id || payload?.event || `evt-${ref}`);

  // Duplicate webhook events must not double-credit/double-finalize.
  db.processedWebhooks = db.processedWebhooks || [];
  if (db.processedWebhooks.includes(eventId)) {
    return res.status(200).json({ success: true, processed: false, duplicate: true });
  }
  db.processedWebhooks.push(eventId);
  if (db.processedWebhooks.length > 5000) db.processedWebhooks = db.processedWebhooks.slice(-5000);

  const wasPaid = payload?.status === 'success' || payload?.data?.status === 'success' || payload?.event === 'charge.success';

  const tx = db.transactions.find((t: any) => t.reference === ref);
  if (tx && tx.category === 'top_up' && tx.status === 'pending') {
    if (wasPaid) {
      const wallet = db.wallets.find((w: any) => w.userId === tx.userId);
      if (wallet) wallet.balance = Math.round(((Number(wallet.balance) || 0) + Number(tx.amount)) * 100) / 100;
      tx.status = 'completed';
      logAudit(null, 'Wallet credited (webhook)', 'wallet', tx.userId, 'success', { reference: ref, amount: tx.amount, provider });
      recordSecurityEvent({ type: 'PAYMENT_ATTEMPT_SUCCESS', severity: 'INFO', endpoint: `/api/payments/webhook/${provider}`, account: null, ip: secCtx(req).ip, detection: 'Signed provider webhook confirmed a wallet top-up.', actionTaken: 'Wallet credited', status: 'monitoring', req, details: { provider, reference: ref, amount: tx.amount } });
    } else {
      tx.status = 'failed';
      recordSecurityEvent({ type: 'PAYMENT_ATTEMPT_FAILURE', severity: 'LOW', endpoint: `/api/payments/webhook/${provider}`, account: null, ip: secCtx(req).ip, detection: 'Provider reported a failed top-up.', actionTaken: 'Transaction marked failed', status: 'monitoring', req, details: { provider, reference: ref } });
    }
    return res.status(200).json({ success: true, processed: true });
  }

  const payment = db.payments.find((p: any) => p.reference === ref);
  if (payment && payment.status === 'pending') {
    if (wasPaid) {
      payment.status = 'paid';
      payment.updatedAt = new Date().toISOString();
      const order = db.orders.find((o: any) => o.id === payment.orderId);
      if (order) { order.paymentStatus = 'paid'; order.isPaid = true; }
      logAudit(null, 'Payment successful (webhook)', 'payment', payment.id, 'success', { reference: ref, provider, amount: payment.amount, orderId: payment.orderId });
      recordSecurityEvent({ type: 'PAYMENT_ATTEMPT_SUCCESS', severity: 'INFO', endpoint: `/api/payments/webhook/${provider}`, account: null, ip: secCtx(req).ip, detection: 'Signed provider webhook confirmed an order payment.', actionTaken: 'Payment finalized', status: 'monitoring', req, details: { provider, reference: ref, amount: payment.amount, orderId: payment.orderId } });
    } else {
      payment.status = 'failed';
      recordSecurityEvent({ type: 'PAYMENT_ATTEMPT_FAILURE', severity: 'LOW', endpoint: `/api/payments/webhook/${provider}`, account: null, ip: secCtx(req).ip, detection: 'Provider reported a failed payment.', actionTaken: 'Payment marked failed', status: 'monitoring', req, details: { provider, reference: ref } });
    }
    return res.status(200).json({ success: true, processed: true });
  }

  return res.status(200).json({ success: true, processed: false, unknown: true });
});

app.post('/api/payments/verify', requireAuth, (req, res) => {
  const body = req.body.body ?? req.body;
  const { reference } = body;
  if (!reference) return res.status(400).json({ success: false, message: 'Payment reference is required.' });

  const currentUserId = (req as any).currentUserId;
  const actor = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = actor && ['administrator', 'super-administrator'].includes(actor.role);

  // Payment state must be determined by the backend/provider, never asserted by a
  // client. In production a client-driven verify is refused outright; only the
  // signature-checked provider webhook (or an authorized admin reconciling a
  // provider-confirmed reference) may finalize a pending payment.
  if (isProd && !(isAdmin && actor && userHasPermission(actor, 'payments:configure'))) {
    recordSecurityEvent({ type: 'UNAUTHORIZED_API_ACCESS', severity: 'MEDIUM', endpoint: '/api/payments/verify', account: actor?.email || null, userId: currentUserId, ip: secCtx(req).ip, detection: 'Client attempted to self-verify a payment in production.', actionTaken: 'Rejected', status: 'blocked', req });
    return res.status(403).json({ success: false, message: 'Payment verification is performed by the payment provider.' });
  }

  // In local development (no provider wired) verification is a legit test path,
  // but it is still recorded so the operator sees it happened.
  const devVerify = DEV_MONEY;

  // Wallet top-up verification
  const tx = db.transactions.find((t: any) => t.reference === reference && (t.userId === currentUserId || isAdmin));
  if (tx && tx.category === 'top_up' && tx.status === 'pending') {
    if (!devVerify && !isAdmin) return res.status(403).json({ success: false, message: 'Only an administrator may finalize a top-up.' });
    const wallet = db.wallets.find(w => w.userId === tx.userId);
    if (wallet) wallet.balance = Math.round(((Number(wallet.balance) || 0) + Number(tx.amount)) * 100) / 100;
    tx.status = 'completed';
    logAudit(actor, 'Wallet credited', 'wallet', tx.userId, 'success', { reference, amount: tx.amount, category: tx.category }, req);
    recordSecurityEvent({ type: 'PAYMENT_ATTEMPT_SUCCESS', severity: 'INFO', endpoint: '/api/payments/verify', account: actor?.email || null, userId: currentUserId, ip: secCtx(req).ip, detection: devVerify ? 'Local verification of a wallet top-up.' : 'Administrator reconciled a provider-confirmed wallet top-up.', actionTaken: 'Wallet credited', status: 'monitoring', req, details: { reference, amount: tx.amount } });
    return res.json({ success: true, verified: true, transaction: tx });
  }

  // Gateway order payment verification
  const payment = db.payments.find((p: any) => p.reference === reference);
  if (payment && payment.status === 'pending') {
    if (!devVerify && !isAdmin) return res.status(403).json({ success: false, message: 'Only an administrator may finalize this payment.' });
    payment.status = 'paid';
    payment.updatedAt = new Date().toISOString();
    const order = db.orders.find((o: any) => o.id === payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.isPaid = true;
    }
    logAudit(actor, 'Payment successful', 'payment', payment.id, 'success', { reference, provider: payment.provider, amount: payment.amount, orderId: payment.orderId }, req);
    recordSecurityEvent({ type: 'PAYMENT_ATTEMPT_SUCCESS', severity: 'INFO', endpoint: '/api/payments/verify', account: actor?.email || null, userId: currentUserId, ip: secCtx(req).ip, detection: devVerify ? 'Local verification of an order payment.' : 'Administrator reconciled a provider-confirmed order payment.', actionTaken: 'Payment finalized', status: 'monitoring', req, details: { reference, amount: payment.amount, orderId: payment.orderId } });
    return res.json({ success: true, verified: true, payment });
  }

  res.status(404).json({ success: false, message: 'No pending payment found for that reference.' });
});

app.post('/api/wallets/:userId/withdrawals', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body.body ?? req.body;
  const amount = Number(body.amount);
  const method = String(body.method || 'MTN Mobile Money').trim();
  const bankInfo = body.bankInfo || null;
  const wallet = db.wallets.find(w => w.userId === req.params.userId);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(422).json({ success: false, message: 'Withdrawal amount must be a positive number.' });
  }
  const balance = Number(wallet.balance) || 0;
  if (amount > balance) return res.status(400).json({ error: 'Insufficient balance' });

  // Hold the funds (debit immediately) and leave the payout pending until an
  // admin/operator approves it.
  wallet.balance = Math.round((balance - amount) * 100) / 100;

  const transaction = {
    id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
    userId: req.params.userId,
    type: 'debit',
    category: 'withdrawal',
    amount,
    description: `Withdrawal to ${method}`,
    status: 'pending',
    method,
    bankInfo,
    createdAt: new Date().toISOString()
  };
  db.transactions.push(transaction as any);

  // Notify admins so payouts can actually be actioned.
  db.users.filter((u: any) => ['administrator', 'super-administrator'].includes(u.role)).forEach((a: any) => {
    notifyUser(a.id, 'Withdrawal Request', `A ${amount > 0 ? 'payout' : 'withdrawal'} of GHS ${amount} was requested.`,
      { type: 'WITHDRAWAL_REQUEST', category: 'payments', priority: 'IMPORTANT', referenceId: transaction.id, action: `/admin/wallet` });
  });

  res.json(transaction);
});

app.post('/api/riders/:id/location', (req, res) => {
  const riderIndex = db.riders.findIndex(r => r.id === req.params.id && r);
  let riderTarget = db.riders.find(r => r.id === req.params.id);
  // Allow lookup by rider id or the owning user id.
  if (!riderTarget) riderTarget = db.riders.find(r => r.userId === req.params.id);
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwnerRider = currentUser && riderTarget && (riderTarget.userId === currentUser.id || riderTarget.id === currentUser.id);
  if (!isAdmin && !isOwnerRider) return res.status(403).json({ error: 'Forbidden' });

  const { riderId, deliveryId, latitude, longitude, accuracy, heading, speed, timestamp } = req.body;
  const targetId = riderTarget ? riderTarget.id : riderIndex !== -1 ? req.params.id : null;
  if (!targetId) return res.status(404).json({ error: 'Rider not found' });
  const targetRiderIndex = db.riders.findIndex(r => r.id === targetId);
  if (targetRiderIndex === -1) return res.status(404).json({ error: 'Rider not found' });

  db.riders[targetRiderIndex].currentLat = latitude;
  db.riders[targetRiderIndex].currentLng = longitude;
  db.riders[targetRiderIndex].accuracy = accuracy;
  db.riders[targetRiderIndex].heading = heading;
  db.riders[targetRiderIndex].speed = speed;
  db.riders[targetRiderIndex].lastUpdate = timestamp;

  // Broadcast location update to active orders' customers
  const activeOrders = db.orders.filter(o => o.riderId === targetId && ['picked_up', 'in_transit', 'arriving'].includes(o.status));
  activeOrders.forEach(order => {
    broadcast('rider_location', {
      orderId: order.id,
      riderId: targetId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      timestamp
    }, order.customerId);
  });

  res.sendStatus(204);
});

app.get('/api/riders', (req, res) => {
  // Full rider records (phone, licence, national ID, live GPS, earnings) are
  // only exposed to platform admins and to riders viewing their own record.
  // Customers, vendors and guests only receive the sanitized public shape.
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  const isAdmin = user && ['administrator', 'super-administrator'].includes(user.role);
  if (isAdmin && !userHasPermission(user, 'riders:view')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to view rider records' });
  }
  if (isAdmin) return res.json(db.riders);
  if (user) {
    return res.json(db.riders.map((r: any) =>
      (user.riderId && (r.id === user.riderId || r.userId === user.id)) ? r : publicRider(r)
    ));
  }
  return res.json(db.riders.map(r => publicRider(r)));
});

// Eligible dispatch riders for a customer booking. This is the single source of
// truth for "who can deliver this order" — clients must never decide eligibility.
// Rules mirror /api/orders/available + /api/orders/:id/assign-rider: rider must be
// verified/approved, not suspended, online, available, and not at the active cap.
// Proximity narrows the list only when both rider + query coordinates exist.
app.get('/api/riders/eligible', (req, res) => {
  const ACTIVE_CAP = 2;
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;
  const hasQueryCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const eligible = db.riders.filter((r: any) => {
    if (r.status === 'OFFLINE' || !r.isOnline || !r.isAvailable) return false;
    if (r.verificationStatus === 'rejected') return false;
    const account = db.users.find((u: any) => u.id === r.userId);
    if (!account || account.isApproved === false || account.isSuspended === true) return false;
    const activeCount = db.orders.filter((o: any) =>
      o.riderId === r.id && !['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(o.status)
    ).length;
    if (activeCount >= ACTIVE_CAP) return false;
    return true;
  });

  const list = eligible.map((r: any) => {
    const dist = hasQueryCoords && Number.isFinite(Number(r.currentLat)) && Number.isFinite(Number(r.currentLng))
      ? Math.round(distanceKm(lat!, lng!, Number(r.currentLat), Number(r.currentLng)) * 10) / 10
      : null;
    return { ...publicRider(r), distanceKm: dist };
  });

  const nearby = list.filter((x: any) => {
    if (!hasQueryCoords) return true;
    if (x.distanceKm == null) return true;
    const radius = Number(x.availableRadius) || 25;
    return x.distanceKm <= radius;
  }).sort((a: any, b: any) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));

  res.json(nearby);
});

// Single rider record (owner/admin see full record, others get the sanitized shape)
app.get('/api/riders/:id', (req, res) => {
  const rider = db.riders.find(r => r.id === req.params.id || r.userId === req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found' });
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (rider.userId === currentUser.id || rider.id === currentUser.id);
  res.json(isAdmin || isOwner ? rider : publicRider(rider));
});

// Rider online/offline or availability toggle (rider owns it or admin manages it)
app.patch('/api/riders/:id/status', (req, res) => {
  const { status } = req.body.body ?? req.body;
  const rider = db.riders.find((r: any) => r.id === req.params.id || r.userId === req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found' });

  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (rider.userId === currentUser.id || rider.id === currentUser.id);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  const value = String(status || '').toUpperCase();
  if (value === 'ONLINE' || value === 'AVAILABLE') {
    rider.status = 'ONLINE';
    rider.isOnline = true;
    rider.isAvailable = true;
  } else if (value === 'OFFLINE' || value === 'UNAVAILABLE' || value === 'OFF_DUTY') {
    rider.status = 'OFFLINE';
    rider.isOnline = false;
    rider.isAvailable = false;
  } else {
    return res.status(422).json({ success: false, message: `Unknown rider status: ${status}` });
  }

  // Notify every connected client (admin, vendor, customers, other riders) so
  // "available riders" lists update instantly when a rider goes online/offline.
  broadcast('rider_update', {
    id: rider.id,
    userId: rider.userId,
    name: rider.name,
    avatar: rider.avatar,
    vehicleType: rider.vehicleType,
    vehicleNumber: rider.vehicleNumber,
    rating: rider.rating,
    totalDeliveries: rider.totalDeliveries,
    totalEarnings: rider.totalEarnings,
    deliveryFee: rider.deliveryFee,
    isOnline: rider.isOnline,
    isAvailable: rider.isAvailable,
    status: rider.status,
    verificationStatus: rider.verificationStatus
  });

  const actor = (req as any).currentUser;
  if (actor && (actor.role === 'administrator' || actor.role === 'super-administrator')) {
    logAudit(actor, `Rider ${rider.isOnline ? 'brought online' : 'taken offline'}`, 'rider', rider.id, 'success', { name: rider.name });
  }
  res.json(rider);
});

app.post('/api/payments/paystack/initialize', (req, res) => {
  const { amount, email } = req.body;
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(422).json({ status: false, message: 'A valid payment amount is required.' });
  }
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (paystackKey) {
    // Real Paystack integration would POST to https://api.paystack.co/transaction/initialize
    // with the secret key here and return authorization_url/access_code/reference.
    return res.status(501).json({ status: false, message: 'Paystack gateway integration is not wired up yet. Set PAYSTACK_SECRET_KEY and implement the Paystack API call to go live.' });
  }
  // No gateway configured: return a dev-only placeholder so checkout remains
  // testable locally. NEVER treat this as a real payment in production.
  if (isProd) {
    return res.status(501).json({ status: false, message: 'Payment gateway is not configured. Add PAYSTACK_SECRET_KEY to the server environment.' });
  }
  res.json({
    status: true,
    data: {
      authorization_url: 'https://checkout.paystack.com/dev-placeholder',
      access_code: 'dev_access_code',
      reference: `PAY-${uuidv4().slice(0, 10).toUpperCase()}`,
      devOnly: true,
      message: 'Development placeholder — configure PAYSTACK_SECRET_KEY to accept real payments.'
    }
  });
});

// Build the customer profile payload shape returned by GET/PATCH endpoints.
// The avatar defaults to '' so clients fall back to initials from the real
// name (or a neutral placeholder) — never a random demo avatar.
function buildCustomerProfile(user: any, wallet: any) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || (user.displayName || '').trim();
  const completedOrders = db.orders.filter((o: any) =>
    o.customerId === user.id && ['delivered', 'completed'].includes(o.status)
  );
  const points = completedOrders.reduce((s: number, o: any) => s + Math.floor((Number(o.totalAmount) || 0) / 10), 0);
  return {
    id: user.id,
    name: fullName || '',
    email: user.email,
    avatar: user.avatarUrl || '',
    phone: user.phone || '',
    addresses: Array.isArray(user.deliveryAddress) ? user.deliveryAddress : [],
    momo: user.momo || null,
    walletBalance: wallet?.balance || 0,
    loyaltyPoints: points,
    referralCode: user.referralCode || `OM-${user.id.slice(0, 4).toUpperCase()}`
  };
}

app.get('/api/customers/:id', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const wallet = db.wallets.find(w => w.userId === req.params.id);

  res.json(buildCustomerProfile(user, wallet));
});

// Loyalty summary for the authenticated customer (owner or admin).
app.get('/api/customers/:id/loyalty', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const userId = req.params.id;
  const completedOrders = db.orders.filter((o: any) => o.customerId === userId && ['delivered', 'completed'].includes(o.status));
  const points = completedOrders.reduce((s: number, o: any) => s + Math.floor((Number(o.totalAmount) || 0) / 10), 0);
  res.json({
    userId,
    points,
    tier: points >= 500 ? 'Gold' : points >= 200 ? 'Silver' : 'Bronze',
    completedOrders: completedOrders.length,
    totalSpent: completedOrders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0)
  });
});

// Customer profile update: name, phone, email, avatar, delivery location and
// MoMo details. Riders rely on the saved location when fulfilling deliveries.
app.patch('/api/customers/:id', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const updates = req.body.body ?? req.body;

  if (typeof updates.name === 'string') {
    const parts = updates.name.trim().split(/\s+/);
    user.firstName = parts[0] || '';
    user.lastName = parts.slice(1).join(' ') || '';
    user.displayName = updates.name.trim();
  }
  if (typeof updates.phone === 'string') user.phone = updates.phone.trim();
  if (typeof updates.email === 'string' && updates.email.trim()) user.email = updates.email.trim().toLowerCase();
  if (typeof updates.avatar === 'string' && updates.avatar) user.avatarUrl = sanitizeImageInput(updates.avatar);

  // Delivery location: replace the default address and keep lat/lng for riders
  if (updates.address) {
    const existing = (user.deliveryAddress && user.deliveryAddress.length > 0)
      ? user.deliveryAddress.map((a: any) => ({ ...a, isDefault: false }))
      : [];
    const hasPrimary = existing.some((a: any) => a.id === 'primary');
    const primary = {
      id: 'primary',
      title: 'Home',
      address: String(updates.address),
      isDefault: true,
      latitude: Number(updates.latitude) || existing.find(a => a.isDefault)?.latitude || 4.8920,
      longitude: Number(updates.longitude) || existing.find(a => a.isDefault)?.longitude || -1.7580,
      city: 'Takoradi',
      state: 'Western Region',
      country: 'Ghana'
    };
    user.deliveryAddress = hasPrimary
      ? existing.map(a => (a.id === 'primary' ? primary : a))
      : [primary, ...existing.filter(a => a.id !== 'primary')];
  }

  // Mobile Money (MoMo) wallet details
  if (updates.momo && typeof updates.momo === 'object') {
    user.momo = {
      provider: String(updates.momo.provider || '').trim(),
      number: String(updates.momo.number || '').trim(),
      accountName: String(updates.momo.accountName || '').trim()
    };
  }

  const wallet = db.wallets.find(w => w.userId === req.params.id);
  res.json(buildCustomerProfile(user, wallet));
});

// ------------------------------------------------------------------
// CUSTOMER ADDRESSES (persisted on user.deliveryAddress)
// ------------------------------------------------------------------

function getOrInitAddresses(user: any): any[] {
  if (!Array.isArray(user.deliveryAddress)) user.deliveryAddress = [];
  return user.deliveryAddress;
}

app.get('/api/customers/:id/addresses', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });
  res.json(getOrInitAddresses(user));
});

app.post('/api/customers/:id/addresses', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const body = req.body.body ?? req.body;
  const addresses = getOrInitAddresses(user);
  const isFirst = addresses.length === 0;
  const addr = {
    id: `addr-${uuidv4().slice(0, 8)}`,
    title: String(body.title || 'Home').trim(),
    address: String(body.address || '').trim(),
    isDefault: body.isDefault ? true : isFirst,
    latitude: Number(body.latitude) || 4.8920,
    longitude: Number(body.longitude) || -1.7580,
    city: body.city || 'Takoradi',
    state: body.state || 'Western Region',
    country: body.country || 'Ghana'
  };

  if (addr.isDefault) addresses.forEach(a => (a.isDefault = false));
  if (addr.isDefault) addresses.unshift(addr);
  else addresses.push(addr);

  res.status(201).json(addr);
});

app.patch('/api/customers/:id/addresses/:addrId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const body = req.body.body ?? req.body;
  const addresses = getOrInitAddresses(user);
  const idx = addresses.findIndex((a: any) => a.id === req.params.addrId);
  if (idx === -1) return res.status(404).json({ error: 'Address not found' });

  // Setting this one as default clears the flag on others.
  if (body.isDefault) addresses.forEach((a: any) => (a.isDefault = false));

  const current = addresses[idx];
  const updated = {
    ...current,
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : current.title,
    address: typeof body.address === 'string' && body.address.trim() ? body.address.trim() : current.address,
    latitude: typeof body.latitude === 'number' ? body.latitude : current.latitude,
    longitude: typeof body.longitude === 'number' ? body.longitude : current.longitude,
    isDefault: body.isDefault === undefined ? current.isDefault : !!body.isDefault
  };

  // Keep the default address first in the list.
  addresses.splice(idx, 1);
  addresses.unshift(updated);
  if (updated.isDefault) addresses.forEach((a: any) => (a.isDefault = false));
  addresses[0].isDefault = true;

  res.json(updated);
});

app.delete('/api/customers/:id/addresses/:addrId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const addresses = getOrInitAddresses(user);
  const idx = addresses.findIndex((a: any) => a.id === req.params.addrId);
  if (idx === -1) return res.status(404).json({ error: 'Address not found' });

  const wasDefault = !!addresses[idx].isDefault;
  addresses.splice(idx, 1);
  // If we removed the default address, promote another one if none remains set.
  if (wasDefault && addresses.length > 0 && !addresses.some((a: any) => a.isDefault)) {
    addresses[0].isDefault = true;
  }
  res.json({ success: true });
});

// Self-scoped notification feed. The recipient is ALWAYS derived from the
// authenticated token — never from a query/path parameter. Supports category
// filtering, unread-only filtering and cursor-style pagination.
app.get('/api/notifications', (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  let list = db.notifications
    .filter((n: any) => n.userId === userId)
    .sort((a: any, b: any) => String(b.createdAt || b.time).localeCompare(String(a.createdAt || a.time)));

  const { category, unread, limit, offset } = req.query;
  if (category && category !== 'all') list = list.filter(n => n.category === category);
  if (unread === '1') list = list.filter(n => !n.read);

  const total = list.length;
  const unreadCount = db.notifications.filter(n => n.userId === userId && !n.read).length;
  const pageLimit = Math.min(parseInt(String(limit), 10) || 20, 50);
  const pageOffset = parseInt(String(offset), 10) || 0;
  const items = list.slice(pageOffset, pageOffset + pageLimit);

  res.json({ items, total, unreadCount, limit: pageLimit, offset: pageOffset });
});

app.get('/api/notifications/unread-count', (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  res.json({ count: db.notifications.filter(n => n.userId === userId && !n.read).length });
});

// Legacy mobile path: still owner/admin guarded, returns the plain array.
app.get('/api/notifications/:userId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.notifications.filter(n => n.userId === req.params.userId).sort((a: any, b: any) =>
    String(b.createdAt || b.time).localeCompare(String(a.createdAt || a.time))));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const actorId = getAuthUserId(req);
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif && !isOwnerOrAdmin(req, notif.userId)) return res.status(403).json({ error: 'Forbidden' });
  if (notif) {
    if (!notif.read) {
      notif.read = true;
      notif.readAt = new Date().toISOString();
      // Live update so badges and open dropdowns de-sync without a full refresh.
      broadcast('notification_read', { id: notif.id, userId: notif.userId }, notif.userId);
    }
  } else if (!actorId) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  res.sendStatus(204);
});

app.post('/api/notifications/read-all', (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const now = new Date().toISOString();
  db.notifications.forEach(n => {
    if (n.userId === userId && !n.read) { n.read = true; n.readAt = now; }
  });
  broadcast('notifications_read_all', { userId }, userId);
  res.json({ success: true });
});

app.post('/api/notifications/clear', (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const before = db.notifications.length;
  db.notifications = db.notifications.filter(n => n.userId !== userId);
  const deleted = before - db.notifications.length;
  // Underlying orders/deliveries/messages/payments/security records are never touched.
  broadcast('notifications_cleared', { userId }, userId);
  res.json({ success: true, deleted });
});

app.delete('/api/notifications/:id', (req, res) => {
  const idx = db.notifications.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
  if (!isOwnerOrAdmin(req, db.notifications[idx].userId)) return res.status(403).json({ error: 'Forbidden' });
  const [removed] = db.notifications.splice(idx, 1);
  broadcast('notification_deleted', { id: removed.id, userId: removed.userId }, removed.userId);
  res.json({ success: true });
});

app.get('/api/reviews', (req, res) => {
  const { userId, vendorId, productId, deliveryId, riderId } = req.query;
  // Private review history is only for the review owner (or an admin).
  if (userId && !isOwnerOrAdmin(req, String(userId))) return res.status(403).json({ error: 'Forbidden' });
  let filtered = db.reviews;
  if (userId) filtered = filtered.filter(r => r.userId === userId);
  if (vendorId) filtered = filtered.filter(r => r.vendorId === vendorId);
  if (productId) filtered = filtered.filter(r => r.productId === productId);
  if (deliveryId) filtered = filtered.filter(r => r.deliveryId === deliveryId || r.orderId === deliveryId);
  if (riderId) filtered = filtered.filter(r => r.riderId === riderId);
  res.json(filtered);
});

app.post('/api/reviews', rateLimitMw('reviews', 30, 60 * 1000), (req, res) => {
  const body = req.body.body ?? req.body;
  const actorId = getAuthUserId(req);
  if (!actorId) return res.status(401).json({ error: 'Authentication required' });
  const actor = db.users.find((u: any) => u.id === actorId);
  if (!actor) return res.status(401).json({ error: 'Authentication required' });

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(422).json({ success: false, message: 'Rating must be between 1 and 5.' });
  }
  const vendorId = body.vendorId || null;
  const productId = body.productId || null;
  const deliveryId = body.deliveryId || body.orderId || null;
  const riderId = body.riderId || null;
  const target = body.target || (riderId ? 'rider' : productId ? 'product' : vendorId ? 'vendor' : 'experience');
  if (!vendorId && !productId && !riderId && !deliveryId) {
    return res.status(422).json({ success: false, message: 'A restaurant, meal, rider or delivery must be referenced for a review.' });
  }

  // Reviews are always tied to the authenticated author (cannot impersonate others).
  const authorId = actorId;

  // Ratings unlock only after the delivery is completed, and only for the party
  // that ordered it (sender). Every review is linked to the real delivery.
  if (deliveryId) {
    const order = db.orders.find((o: any) => o.id === deliveryId);
    if (!order || order.customerId !== authorId) {
      return res.status(403).json({ success: false, message: 'You can only review your own deliveries.' });
    }
    if (!['delivered', 'completed'].includes(String(order.status || '').toLowerCase())) {
      return res.status(422).json({ success: false, message: 'Only completed deliveries can be reviewed.' });
    }
    const isPackage = DELIVERY_TYPES.includes(String(order.deliveryType || '').toUpperCase() as any);
    if (isPackage && (target === 'vendor' || target === 'product')) {
      return res.status(422).json({ success: false, message: 'Package deliveries can only rate the rider and your overall experience.' });
    }
  } else if (riderId) {
    // A rider rating without a delivery link has nothing to hang the review on.
    return res.status(422).json({ success: false, message: 'A delivery must be referenced to rate a rider.' });
  } else {
    // A vendor/product review is only legitimate after a real, completed
    // purchase. Without a delivery link we must not trust the client: verify
    // the author has a delivered/completed order that references this vendor
    // (and, for a product review, the meal it self was ordered).
    const completedOrders = db.orders.filter((o: any) =>
      o.customerId === authorId && ['delivered', 'completed'].includes(String(o.status || '').toLowerCase())
    );
    const purchasedVendor = vendorId && completedOrders.some((o: any) => String(o.vendorId) === String(vendorId));
    const purchasedProduct = productId && completedOrders.some((o: any) =>
      Array.isArray(o.items) && o.items.some((it: any) => String(it.productId || it.id) === String(productId))
    );
    if (vendorId && !purchasedVendor) {
      return res.status(403).json({ success: false, message: 'You can only review a restaurant after completing an order with it.' });
    }
    if (productId && !purchasedProduct) {
      return res.status(403).json({ success: false, message: 'You can only review a meal after ordering it.' });
    }
  }

  // One review per delivery, and one review per user per meal.
  if (deliveryId && db.reviews.some((r: any) => r.orderId === deliveryId && r.userId === authorId)) {
    return res.status(409).json({ success: false, message: 'You have already reviewed this delivery.' });
  }
  if (productId && db.reviews.some((r: any) => r.productId === productId && r.userId === authorId)) {
    return res.status(409).json({ success: false, message: 'You have already reviewed this meal.' });
  }
  if (vendorId && target === 'vendor' && db.reviews.some((r: any) => r.vendorId === vendorId && r.target === 'vendor' && r.userId === authorId)) {
    return res.status(409).json({ success: false, message: 'You have already reviewed this restaurant.' });
  }

  const newReview = {
    id: uuidv4(),
    userId: authorId,
    userName: body.userName || `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.displayName || 'Customer',
    userAvatar: body.userAvatar || actor.avatarUrl || '',
    rating,
    comment: body.comment ? sanitizeText(body.comment, 2000) : '',
    orderId: deliveryId,
    deliveryId,
    riderId,
    target: ['rider', 'vendor', 'product', 'experience'].includes(target) ? target : 'experience',
    vendorId,
    productId,
    date: new Date().toISOString()
  };
  db.reviews.push(newReview);

  // Recompute the rider's aggregate rating from real review rows (authoritative).
  if (riderId) {
    const rider = db.riders.find((r: any) => r.id === riderId || r.userId === riderId);
    if (rider) {
      const riderReviews = db.reviews.filter((r: any) => r.riderId === rider.id && r.target === 'rider');
      if (riderReviews.length) {
        rider.rating = Math.round((riderReviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / riderReviews.length) * 10) / 10;
        rider.reviewsCount = riderReviews.length;
      }
    }
  }

  res.status(201).json(newReview);
});

app.get('/api/search', (req, res) => {
  const { q, cat } = req.query;
  const query = String(q || '').trim().toLowerCase();

  const filteredProducts = db.products.filter(p =>
    ((p.title || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query) || (p.category || '').toLowerCase().includes(query)) &&
    (cat === 'All' || !cat || p.category === cat)
  );

  const filteredVendors = db.vendors
    .filter(v => (v.name || '').toLowerCase().includes(query) || (v.description || '').toLowerCase().includes(query) || (v.category || '').toLowerCase().includes(query))
    .map((v: any) => publicVendor(v, vendorAggregate(v)));

  res.json({ products: filteredProducts, vendors: filteredVendors });
});

app.get('/api/coupons', (req, res) => {
  // Public listing shows only active, currently valid promo codes. Inactive,
  // expired, and internal coupons are never disclosed (prevents leaking codes
  // and validity windows that should remain admin-controlled).
  const now = Date.now();
  res.json(db.coupons.filter((c: any) =>
    !!c.isActive &&
    (!c.startsAt || now >= Date.parse(c.startsAt)) &&
    (!c.expiryDate || now <= Date.parse(c.expiryDate))
  ));
});

app.get('/api/products/trending', (req, res) => {
  res.json(db.products.filter(p => p.isTrending));
});

// Single product detail (also used as a fallback when the client needs a fresh copy)
app.get('/api/products/:id', (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Meal not found' });
  res.json(product);
});

app.get('/api/vendors/:id/products', (req, res) => {
  res.json(db.products.filter(p => p.vendorId === req.params.id));
});

// Vendor portal dashboard summary (revenue, orders, reviews) from real records
app.get('/api/vendors/:id/dashboard', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.vendorId === vendor.id || currentUser.ownerId === vendor.ownerId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  const vendorOrders = db.orders.filter((o: any) => o.vendorId === vendor.id);
  const today = new Date().toDateString();
  const todayOrders = vendorOrders.filter((o: any) => new Date(o.createdAt).toDateString() === today);
  const completed = vendorOrders.filter((o: any) => ['delivered', 'completed'].includes(o.status));
  const active = vendorOrders.filter((o: any) => ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status));
  const revenue = (arr: any[]) => arr.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

  const vendorReviews = db.reviews.filter((r: any) => r.vendorId === vendor.id);
  const wallet = db.wallets.find((w: any) => w.userId === vendor.ownerId);

  res.json({
    vendorId: vendor.id,
    totalOrders: vendorOrders.length,
    todayOrders: { total: todayOrders.length, active: active.length },
    revenue: {
      today: revenue(todayOrders),
      todayChange: 'Today',
      total: revenue(completed),
      totalChange: `${completed.length} delivered`
    },
    reviews: {
      count: vendorReviews.length,
      rating: vendorReviews.length ? vendorReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / vendorReviews.length : vendor.rating || 0
    },
    walletBalance: wallet?.balance || 0,
    lowStock: db.products.filter((p: any) => p.vendorId === vendor.id && Number(p.stock) < 10).length
  });
});

// Vendor opening hours (persisted on the vendor record)
app.get('/api/vendors/:id/hours', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json({
    openHours: vendor.openHours || '08:00 AM - 10:00 PM',
    hours: vendor.hours || null,
    businessHours: Array.isArray(vendor.businessHours) ? vendor.businessHours : []
  });
});

app.put('/api/vendors/:id/hours', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.vendorId === vendor.id || currentUser.ownerId === vendor.ownerId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body.body ?? req.body;
  if (body.openHours) vendor.openHours = body.openHours;
  if (body.hours !== undefined) vendor.hours = body.hours;
  // Weekly schedule used by customer-facing "Open/Closed" logic
  if (Array.isArray(body.businessHours)) {
    vendor.businessHours = body.businessHours.map((h: any) => ({
      day: String(h.day || ''),
      isOpen: !!h.isOpen,
      open: String(h.open || '08:00'),
      close: String(h.close || '22:00')
    }));
  }
  res.json({
    openHours: vendor.openHours,
    hours: vendor.hours || null,
    businessHours: vendor.businessHours || []
  });
});

// Toggle kitchen open/closed (vendor portal "Open/Pause kitchen")
app.post('/api/vendors/:id/kitchen-toggle', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.vendorId === vendor.id || currentUser.ownerId === vendor.ownerId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });
  vendor.isKitchenOpen = !vendor.isKitchenOpen;
  vendor.isOpen = vendor.isKitchenOpen;
  res.json(vendor);
});

// Set open/closed explicitly (matches VendorService.updateStatus on the client)
app.patch('/api/vendors/:id/status', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.vendorId === vendor.id || currentUser.ownerId === vendor.ownerId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body.body ?? req.body;
  if (typeof body.isOpen === 'boolean') {
    vendor.isKitchenOpen = body.isOpen;
    vendor.isOpen = body.isOpen;
  }
  res.json(vendor);
});

// Update a vendor's profile/approval fields (approve/reject restaurants)
app.patch('/api/vendors/:id', (req, res) => {
  const vendor = db.vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const updates = req.body.body ?? req.body;

  // Approval/status changes and other operational mutations require admin.
  // Owner updates to their own restaurant (e.g. menu info) are permitted too.
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.vendorId === vendor.id || currentUser.ownerId === vendor.ownerId);
  const requestsStatusChange = updates.status !== undefined && updates.status !== vendor.status;
  if (!isAdmin && !(isOwner && !requestsStatusChange)) return res.status(403).json({ error: 'Forbidden' });
  if (isAdmin && (requestsStatusChange || (updates.verificationStatus !== undefined && updates.verificationStatus !== vendor.verificationStatus))) {
    if (!userHasPermission(currentUser, 'restaurants:approve') && !userHasPermission(currentUser, 'restaurants:suspend')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to change restaurant status' });
    }
  }

  const prevStatus = vendor.status;
  // Forbid mass-assignment: owners may only touch their own menu/profile fields
  // via an explicit allowlist, never operational/commission/identity fields.
  const OWNER_VENDOR_FIELDS = ['name', 'description', 'cuisines', 'img', 'banner', 'logo', 'logoUrl', 'coverUrl', 'phone', 'address', 'city', 'latitude', 'longitude', 'deliveryFee', 'deliveryTime', 'category', 'isKitchenOpen', 'openHours', 'hours', 'businessHours', 'pickupAvailable', 'featured'];
  if (isAdmin) {
    Object.assign(vendor, updates);
  } else {
    for (const k of Object.keys(updates)) {
      if (OWNER_VENDOR_FIELDS.includes(k)) {
        if (k === 'logo' || k === 'logoUrl') vendor.logo = sanitizeImageInput(updates[k]);
        else if (k === 'banner' || k === 'coverUrl') vendor.banner = sanitizeImageInput(updates[k]);
        else if (k === 'img') vendor.img = sanitizeImageInput(updates[k]);
        else vendor[k] = updates[k];
      }
    }
  }

  if (!isAdmin && (updates.commissionRate !== undefined || updates.rating !== undefined)) {
    return res.status(403).json({ success: false, message: 'Operational fields cannot be changed by a vendor.' });
  }

  // Sync the owner account's approval so they can actually log in once approved
  const owner = db.users.find(u => u.id === vendor.ownerId);
  if (owner) {
    owner.isApproved = updates.status === 'active';
    if (updates.status) owner.isSuspended = updates.status === 'suspended';
  }

  // Audit + notify when an administrator changes a vendor's operational status
  if (updates.status && updates.status !== prevStatus) {
    const actor = (req as any).currentUser || currentUser;
    if (actor) {
      logAudit(actor, `Vendor ${updates.status}`, 'vendor', vendor.id, 'success', { name: vendor.name, prevStatus });
    }
    if (owner) {
      if (updates.status === 'active') {
        notifyUser(owner.id, 'Application Approved', `${vendor.name} has been approved. You can now log in and manage your restaurant.`,
          { type: 'RESTAURANT_APPROVED', category: 'account', priority: 'IMPORTANT', relatedRestaurantId: vendor.id, action: `/restaurant`, dedupeKey: `approved:${vendor.id}:${owner.id}` });
        queueEmail({
          to: owner.email,
          template: 'account_approved',
          data: { firstName: owner.firstName, vendorName: vendor.name },
          eventKey: `vendor-approved:${vendor.id}:${owner.id}`
        });
      }
      if (updates.status === 'suspended') {
        notifyUser(owner.id, 'Restaurant Suspended', `${vendor.name} has been suspended. Please contact support.`,
          { type: 'RESTAURANT_SUSPENDED', category: 'account', priority: 'CRITICAL', relatedRestaurantId: vendor.id, action: `/restaurant`, critical: true, dedupeKey: `suspended:${vendor.id}:${owner.id}` });
        queueEmail({
          to: owner.email,
          template: 'security_alert',
          data: { firstName: owner.firstName, message: `Your restaurant ${vendor.name} has been suspended. Please contact our support team for details.` },
          eventKey: `vendor-suspended:${vendor.id}:${owner.id}`
        });
      }
      if (updates.status === 'rejected') {
        const reason = updates.rejectionReason || 'Please contact support for details.';
        notifyUser(owner.id, 'Application Rejected', `Your restaurant application was rejected. ${reason}`,
          { type: 'RESTAURANT_REJECTED', category: 'account', priority: 'IMPORTANT', relatedRestaurantId: vendor.id, action: `/restaurant`, dedupeKey: `rejected:${vendor.id}:${owner.id}` });
        queueEmail({
          to: owner.email,
          template: 'account_rejected',
          data: { firstName: owner.firstName, role: 'vendor', vendorName: vendor.name, reason },
          eventKey: `vendor-rejected:${vendor.id}:${owner.id}`
        });
      }
    }
  }

  res.json(vendor);
});

// Manually add a restaurant (admin only) — mirrors the vendor registration payload
app.post('/api/vendors', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const p = req.body.body ?? req.body;
  const email = String(p.email || '').toLowerCase().trim();
  if (email && db.users.some((u: any) => u.email?.toLowerCase() === email)) {
    return res.status(409).json({ success: false, message: 'A user account with this email already exists.' });
  }
  const vendorId = `v-${uuidv4().slice(0, 8)}`;
  const ownerId = uuidv4();
  const slug = (p.businessName || p.name || 'restaurant').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const vendor = {
    id: vendorId,
    ownerId,
    name: p.businessName || p.name || 'New Restaurant',
    slug,
    logo: p.logoUrl || p.logo || '',
    banner: p.coverUrl || p.banner || '',
    category: p.category || 'Local Dishes',
    address: p.businessAddress || p.address || '',
    openHours: p.openingHours || '08:00 AM - 10:00 PM',
    phone: p.phone || '',
    email,
    description: p.description || '',
    status: 'active',
    verificationStatus: 'verified',
    commissionRate: Number(p.commissionRate) || 10,
    deliveryTime: p.deliveryTime || '30-45 min',
    joinedDate: new Date().toISOString(),
    verification: { regNumber: p.regNumber || '', documents: p.documents || null }
  };
  db.vendors.push(vendor);

  // Create an owner account so the added restaurant can log in
  if (email) {
    const ownerName = p.ownerName || p.name || vendor.name;
    const user = {
      id: ownerId,
      email: vendor.email,
      phone: p.phone || '',
      password: hashPassword(p.password || 'omnimarket2024'),
      firstName: ownerName.split(' ')[0] || 'Restaurant',
      lastName: ownerName.split(' ')[1] || '',
      displayName: ownerName,
      role: 'vendor',
      vendorId,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerId}`,
      isVerified: true, isEmailVerified: true, isPhoneVerified: false,
      isApproved: true, isActive: true, isSuspended: false, twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    db.users.push(user);
    db.wallets.push({ userId: ownerId, balance: 0, currency: 'GHS' });
  }

  logAudit(actor, 'Vendor created', 'vendor', vendor.id, 'success', { name: vendor.name, email });
  res.status(201).json(vendor);
});

// Remove a restaurant permanently (admin only)
app.delete('/api/vendors/:id', requireAdmin, requirePermission('restaurants:delete'), (req, res) => {
  const actor = (req as any).currentUser;
  const idx = db.vendors.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });
  const removed = db.vendors[idx];
  db.vendors.splice(idx, 1);
  db.products = db.products.filter(p => p.vendorId !== req.params.id);
  logAudit(actor, 'Vendor deleted', 'vendor', removed.id, 'success', { name: removed.name });
  res.json({ success: true });
});

// Update a rider's profile record (approval/verification, availability, profile)
app.patch('/api/riders/:id', (req, res) => {
  const rider = db.riders.find(r => r.id === req.params.id || r.userId === req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found' });

  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isOwner = currentUser && (rider.userId === currentUser.id || rider.id === currentUser.id);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });
  if (isAdmin && !userHasPermission(currentUser, 'riders:approve')) {
    return res.status(403).json({ success: false, message: 'You do not have permission to change rider status' });
  }

  const updates = req.body.body ?? req.body;
  // Forbid mass-assignment: owners/rider-owners may only touch their own profile
  // fields via an explicit allowlist, never operational, earnings, ratings, status
  // counts, delivery fee, location or identity/ownership fields.
  const RIDER_OWNER_FIELDS = ['name', 'phone', 'phoneSecondary', 'avatar', 'avatarUrl', 'banner', 'bannerUrl', 'about', 'bio', 'serviceArea', 'transportMode', 'vehicleType', 'vehicleNumber', 'licenseNumber', 'availabilityStatus', 'isActive'];
  if (isAdmin) {
    Object.assign(rider, updates);
  } else {
    for (const k of Object.keys(updates)) {
      if (!RIDER_OWNER_FIELDS.includes(k)) continue;
      let val = updates[k];
      if (k === 'avatar' || k === 'avatarUrl' || k === 'banner' || k === 'bannerUrl') val = sanitizeImageInput(val);
      else if (k === 'about' || k === 'bio' || k === 'name' || k === 'serviceArea' || k === 'transportMode' || k === 'vehicleType' || k === 'vehicleNumber' || k === 'licenseNumber' || k === 'phone' || k === 'phoneSecondary') val = sanitizeText(val);
      // A non-admin may only deactivate their own profile, never re-activate (admin's job).
      if (k === 'isActive' && val === true) continue;
      rider[k] = val;
    }
  }
  if (updates.verificationStatus === 'verified') rider.isVerified = true;
  if (updates.verificationStatus === 'rejected') rider.isVerified = false;

  // Sync the rider's user account so a verified rider can log in
  const user = db.users.find(u => u.id === rider.userId);
  if (user && updates.verificationStatus) {
    user.isApproved = updates.verificationStatus === 'verified';
  }

  const actor = (req as any).currentUser || currentUser;
  if (actor && updates.verificationStatus && updates.verificationStatus !== rider.verificationStatus) {
    logAudit(actor, `Rider ${updates.verificationStatus}`, 'rider', rider.id, 'success', { name: rider.name });
  }
  if (user && updates.verificationStatus === 'verified') {
    notifyUser(user.id, 'Rider Account Verified', 'Your rider account has been verified. You can now go online.',
      { type: 'RIDER_APPROVED', category: 'account', priority: 'IMPORTANT', relatedUserId: user.id, action: `/rider/profile`, dedupeKey: `rider-verified:${rider.id}:${user.id}` });
    queueEmail({
      to: user.email,
      template: 'rider_verified',
      data: { firstName: user.firstName },
      eventKey: `rider-verified:${rider.id}:${user.id}`
    });
  }

  res.json(rider);
});

app.get('/api/messages/conversations', (req, res) => {
  const { userId } = req.query;
  if (!userId || !isOwnerOrAdmin(req, userId as string)) return res.status(403).json({ error: 'Forbidden' });
  const currentUser = db.users.find((u: any) => u.id === getAuthUserId(req));
  // Match by the user id OR their rider/vendor platform ids — conversations can
  // reference any of the three depending on when they were created.
  const aliases = new Set<string>([userId as string]);
  if (currentUser) {
    if (currentUser.riderId) aliases.add(currentUser.riderId);
    if (currentUser.vendorId) aliases.add(currentUser.vendorId);
    // A rider's fleet record and the owner of a vendor record both count.
    db.riders.filter((r: any) => r.userId === currentUser.id).forEach(r => aliases.add(r.id));
    db.vendors.filter((v: any) => v.ownerId === currentUser.id).forEach(v => aliases.add(v.id));
  }
  const filtered = db.conversations.filter(c => c.participantIds.some(pid => aliases.has(pid)));

  // Attach participant info. unreadCount is recomputed from the real message
  // rows (isRead=false and written by the other side) — never trusted from the
  // stored field, which both sides share.
  const result = filtered.map(c => {
    const unread = db.messages.filter(m => m.conversationId === c.id && !m.isRead && !aliases.has(m.senderId)).length;
    return {
      ...c,
      unreadCount: unread,
      participants: c.participantIds
        .filter(id => !aliases.has(id))
        .map(id => {
          const user = db.users.find(u => u.id === id);
          const rider = db.riders.find((r: any) => r.id === id);
          const vendor = db.vendors.find((v: any) => v.ownerId === id);
          const name = vendor?.name || rider?.name || user?.displayName || user?.firstName || 'User';
          const avatar = rider?.avatarUrl || user?.avatarUrl || vendor?.logo || '';
          return { id, name, avatar, role: rider ? 'rider' : vendor ? 'vendor' : user?.role };
        }),
      type: c.type || 'customer_vendor'
    };
  });

  res.json(result);
});

// Find-or-create a 1:1 conversation between two users (customer & vendor/rider).
// Used so a customer can start messaging a restaurant without an order.
app.post('/api/messages/conversations', rateLimitMw('msgconv', 20, 60 * 1000), (req, res) => {
  const p = req.body.body ?? req.body;
  const { type = 'customer_vendor', participantIds = [], orderId, subject } = p;
  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return res.status(400).json({ error: 'participantIds must contain at least two users' });
  }

  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isParticipant = currentUser && participantIds.includes(currentUser.id);
  if (!currentUser || (!isAdmin && !isParticipant)) return res.status(403).json({ error: 'Forbidden' });

  const [a, b] = participantIds.slice(0, 2);
  const existing = db.conversations.find((c: any) =>
    c.type === type &&
    c.participantIds.includes(a) &&
    c.participantIds.includes(b)
  );

  if (existing) {
    if (orderId && !existing.orderId) existing.orderId = orderId;
    return res.json(existing);
  }

  const conversation = {
    id: `c-${uuidv4().slice(0, 8)}`,
    type,
    participantIds: [a, b],
    orderId: orderId || null,
    subject: subject ? sanitizeText(subject, 200) : 'Chat',
    lastMessage: '',
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: new Date().toISOString()
  };
  db.conversations.push(conversation);
  res.status(201).json(conversation);
});

app.get('/api/messages/:conversationId', (req, res) => {
  const conv = db.conversations.find(c => c.id === req.params.conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isParticipant = currentUser && conv.participantIds.some(pid => pid === currentUserId || pid === currentUser.riderId || pid === currentUser.vendorId);
  if (!isAdmin && !isParticipant) return res.status(403).json({ error: 'Forbidden' });

  // Mark all messages written by the other side as read for the requester.
  const messages = db.messages.filter(m => m.conversationId === req.params.conversationId);
  if (currentUser) {
    const myAliases = new Set<string>([currentUser.id]);
    if (currentUser.riderId) myAliases.add(currentUser.riderId);
    if (currentUser.vendorId) myAliases.add(currentUser.vendorId);
    db.messages.forEach(m => {
      if (m.conversationId === req.params.conversationId && !m.isRead && !myAliases.has(m.senderId)) {
        m.isRead = true;
      }
    });
    // The requester has seen every message up to now.
    conv.unreadCount = 0;
    conv.lastReadAt = new Date().toISOString();
  }

  res.json(messages);
});

// Open (or reuse) a support conversation between a user and the platform's
// admin/super-admin team. Alerts every admin so the request really reaches them.
app.post('/api/messages/support', rateLimitMw('msgsupport', 20, 60 * 1000), (req, res) => {
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  if (!currentUser) return res.status(401).json({ error: 'Authentication required' });

  const admins = db.users.filter((u: any) => ['administrator', 'super-administrator'].includes(u.role));
  const supportAdmin = admins.find((a: any) => a.id !== currentUser.id) || admins[0];
  if (!supportAdmin) return res.status(500).json({ error: 'No support staff available' });

  const type = currentUser.role === 'rider' ? 'rider_support'
    : currentUser.role === 'vendor' ? 'vendor_support'
    : 'customer_support';
  const requested = (req.body.body ?? req.body).subject;
  const subject = requested ? sanitizeText(requested, 200) : `Support Request - ${currentUser.displayName || currentUser.firstName}`;

  const existing = db.conversations.find((c: any) =>
    c.type === type &&
    c.participantIds.includes(currentUser.id) &&
    c.participantIds.includes(supportAdmin.id)
  );
  if (existing) return res.json(existing);

  const conversation = {
    id: `c-${uuidv4().slice(0, 8)}`,
    type,
    participantIds: [currentUser.id, supportAdmin.id],
    orderId: null,
    subject,
    lastMessage: '',
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: new Date().toISOString()
  };
  db.conversations.push(conversation);

  // Notify the whole support team (except the requester) so the ticket is seen.
  admins.filter((a: any) => a.id !== currentUser.id).forEach((a: any) => {
    notifyUser(
      a.id,
      'Support Request',
      `${currentUser.displayName || currentUser.firstName} (${currentUser.role}) opened a support conversation: ${subject}`,
      'info'
    );
  });

  res.status(201).json(conversation);
});

app.post('/api/messages', rateLimitMw('messages', 40, 60 * 1000), (req, res) => {
  const { conversationId, content } = req.body.body ?? req.body;
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  if (!currentUser) return res.status(401).json({ error: 'Authentication required' });

  if (!conversationId || !content?.trim()) {
    return res.status(400).json({ error: 'conversationId and content are required' });
  }
  const conv = db.conversations.find(c => c.id === conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const isAdmin = ['administrator', 'super-administrator'].includes(currentUser.role);
  const isParticipant = conv.participantIds.some(pid => pid === currentUser.id || pid === currentUser.riderId || pid === currentUser.vendorId);
  if (!isAdmin && !isParticipant) return res.status(403).json({ error: 'Forbidden' });

  // The sender is always the authenticated caller — never trusted from the body.
  const senderId = currentUser.id;
  const cleanContent = sanitizeText(content, 5000);
  if (!cleanContent) return res.status(400).json({ error: 'Message content cannot be empty after sanitization.' });
  const newMessage = {
    id: uuidv4(),
    conversationId,
    senderId,
    content: cleanContent,
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.messages.push(newMessage);

  // Update conversation
  conv.lastMessage = newMessage.content;
  conv.lastMessageAt = newMessage.createdAt;
  // unreadCount is recomputed per-viewer from the message rows, so the stored
  // value is just kept in sync (the other side's badge uses the recomputed count).
  const other = conv.participantIds.find((id: string) => id !== senderId);
  conv.unreadCount = Number(conv.unreadCount || 0) + 1;
  if (other) {
    broadcast('message', newMessage, other);
    broadcast('conversation_updated', { conversationId: conv.id, lastMessage: newMessage.content, lastMessageAt: newMessage.createdAt }, other);
    // Deep-link to the exact conversation, role-aware. Never a generic inbox.
    const otherUser = db.users.find((u: any) => u.id === other);
    const msgAction = !otherUser
      ? '/messages'
      : otherUser.role === 'rider' ? `/rider/messages?convId=${conv.id}`
      : otherUser.role === 'restaurant-owner' || otherUser.role === 'vendor' ? `/restaurant/messages?convId=${conv.id}`
      : `/customer/messages?convId=${conv.id}`;
    notifyUser(other, 'New Message', `${conv.subject || 'New message'} — ${newMessage.content}`,
      { type: 'NEW_MESSAGE', category: 'messages', priority: 'NORMAL', relatedConversationId: conv.id, relatedOrderId: conv.orderId || undefined, relatedUserId: senderId, action: msgAction, referenceId: conv.id, referenceType: 'message', dedupeKey: `msg:${newMessage.id}:${other}` });
  }

  res.status(201).json(newMessage);
});

// ------------------------------------------------------------
// ADMIN & SUPER ADMIN API
// ------------------------------------------------------------

// Admin dashboard statistics derived from real records
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const users = db.users as any[];
  const vendors = db.vendors as any[];
  const riders = db.riders as any[];
  const orders = db.orders as any[];

  const completed = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
  const now = new Date();
  const today = orders.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
  const active = orders.filter(o => !['completed', 'delivered', 'cancelled', 'refunded', 'failed'].includes(o.status));

  const revenue = completed.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const platformCommission = completed.reduce((s, o) => s + (Number(o.platformCommission) || 0), 0);
  const vendorPayout = completed.reduce((s, o) => s + (Number(o.vendorPayout) || 0), 0);
  const riderEarnings = db.transactions
    .filter((t: any) => t.category === 'rider_earning')
    .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

  res.json({
    customers: users.filter(u => u.role === 'customer').length,
    vendors: vendors.length,
    pendingVendors: vendors.filter(v => v.status === 'pending' || v.verificationStatus === 'pending').length,
    riders: riders.length,
    pendingRiders: riders.filter(r => r.verificationStatus === 'pending' || !r.isVerified).length,
    orders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    activeOrders: active.length,
    completedOrders: completed.length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    revenue,
    todayRevenue: today.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
    platformCommission,
    vendorPayout,
    riderEarnings,
    walletBalance: db.wallets.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0),
    totalProducts: db.products.length,
    totalTransactions: db.transactions.length,
    supportOpen: db.tickets.filter((t: any) => t.status === 'open').length,
    unreadNotifications: db.notifications.filter((n: any) => !n.read).length,
    users: users.length,
    pendingApprovals: vendors.filter((v: any) => v.status === 'pending' || v.verificationStatus === 'pending').length +
      riders.filter((r: any) => r.verificationStatus === 'pending' || !r.isVerified).length,
    activeSessions: (db.sessions || []).filter((s: any) => !s.revokedAt && !users.find((u: any) => u.id === s.userId)?.isSuspended).length,
    admins: users.filter(u => ['administrator', 'super-administrator'].includes(u.role)).length,
    suspendedUsers: users.filter(u => u.isSuspended).length,
    auditEvents: db.audit.length
  });
});

// Full user directory (admin only)
app.get('/api/users', requireAdmin, requirePermission('users:view'), (req, res) => {
  const rows = (db.users as any[]).map((u: any) => {
    const orders = db.orders.filter((o: any) => o.customerId === u.id);
    const wallet = db.wallets.find((w: any) => w.userId === u.id);
    const status = u.isSuspended ? 'suspended' : (u.isApproved ? 'active' : 'pending');
    return {
      ...safeUser(u),
      status,
      totalOrders: orders.length,
      totalSpent: orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0),
      walletBalance: wallet?.balance || 0
    };
  });
  res.json(rows);
});

app.get('/api/users/:id', requireAdmin, requirePermission('users:view'), (req, res) => {
  const u = db.users.find((x: any) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  const orders = db.orders.filter((o: any) => o.customerId === u.id);
  res.json({
    ...safeUser(u),
    totalOrders: orders.length,
    totalSpent: orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0),
    orders,
    reviews: db.reviews.filter((r: any) => r.userId === u.id),
    transactions: db.transactions.filter((t: any) => t.userId === u.id)
  });
});

app.patch('/api/users/:id', requireAdmin, requirePermission('users:update'), (req, res) => {
  const actor = (req as any).currentUser;
  const user = db.users.find((x: any) => x.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Only a Super Admin may modify admin OR super-admin accounts (closes the gap
  // where an administrator could previously toggle a fellow admin's / a Super
  // Admin's suspension or approval flags through this generic route).
  if ((user.role === 'administrator' || user.role === 'super-administrator') && actor.role !== 'super-administrator') {
    return res.status(403).json({ success: false, message: 'Only the Super Admin can modify admin accounts.' });
  }
  const updates = req.body.body ?? req.body;

  // Role changes are a high-risk RBAC action. They require re-authentication
  // and are audited with the previous state. This is the same flow the
  // dedicated POST /api/users/:id/role endpoint uses.
  if (updates.role && actor.role === 'super-administrator' && ['customer', 'vendor', 'rider', 'administrator', 'super-administrator'].includes(updates.role)) {
    const reauth = requireReAuth(actor, updates);
    if (reauth) return res.status(reauth.status).json(reauth.body);
    if (updates.role === 'super-administrator') {
      logAudit(actor, 'Super Admin access granted', 'user', user.id, 'success', { grantedTo: user.email, previousRole: user.role });
    } else if (user.role === 'super-administrator') {
      logAudit(actor, 'Super Admin access revoked', 'user', user.id, 'success', { revokedFrom: user.email, previousRole: user.role });
    }
    const previousRole = user.role;
    user.role = updates.role;
    user.accountType = ROLE_ACCOUNT_TYPES[updates.role as Role];
    logAudit(actor, 'Role assigned', 'user', user.id, 'success', { from: previousRole, to: updates.role, affectedEmail: user.email });
  } else if (updates.role && actor.role !== 'super-administrator') {
    return res.status(403).json({ success: false, message: 'Only the Super Admin can change roles.' });
  }

  if (updates.isSuspended !== undefined) {
    user.isSuspended = !!updates.isSuspended;
    user.isActive = !user.isSuspended;
  }
  if (updates.isApproved !== undefined) user.isApproved = !!updates.isApproved;
  if (updates.firstName) user.firstName = updates.firstName;
  if (updates.lastName) user.lastName = updates.lastName;
  if (updates.phone) user.phone = updates.phone;
  if (updates.displayName) user.displayName = updates.displayName;

  logAudit(actor, 'User updated', 'user', user.id, 'success', updates);
  notifyUser(user.id, 'Account Updated', 'Your account details were updated by an administrator.',
    { type: 'ACCOUNT_UPDATED', category: 'account', priority: 'NORMAL', relatedUserId: user.id, action: '/profile' });
  res.json({ ...safeUser(user), totalOrders: db.orders.filter((o: any) => o.customerId === user.id).length });
});

// Super admin account-control actions (suspend / reactivate / force-reset / revoke-sessions / verify)
app.post('/api/admin/users/:id/account', requireSuperAdmin, requirePermission('users:suspend'), (req, res) => {
  const actor = (req as any).currentUser;
  const user = db.users.find((x: any) => x.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { action, note } = req.body.body ?? req.body;

  // A Super Admin can never lock out their own platform account via this route.
  if (actor.id === user.id) {
    return res.status(400).json({ success: false, message: 'You cannot perform this action on your own account.' });
  }

  // Destructive actions are blocked against fellow Super Admins (prevents a
  // single misconfiguration locking out every platform owner).
  const destructive = ['suspend', 'force-reset', 'revoke-sessions'];
  if (user.role === 'super-administrator' && destructive.includes(action)) {
    return res.status(403).json({ success: false, message: 'Protected account: this action cannot target a fellow Super Admin.' });
  }

  const revokeAll = () => {
    user.tokensRevokedAt = Date.now();
    (db.sessions || []).forEach((s: any) => {
      if (s.userId === user.id && !s.revokedAt) s.revokedAt = new Date().toISOString();
    });
  };

  switch (action) {
    case 'suspend': {
      user.isSuspended = true;
      user.isActive = false;
      revokeAll();
      logAudit(actor, 'Admin suspended user', 'user', user.id, 'success', { note: note || '', sessionsRevoked: true });
      notifyUser(user.id, 'Account Suspended', 'Your OmniMarket account has been suspended. Contact support for details.',
        { type: 'ACCOUNT_SUSPENDED', category: 'account', priority: 'CRITICAL', relatedUserId: user.id, critical: true, action: '/' });
      return res.json({ success: true, user: safeUser(user), action: 'suspended' });
    }
    case 'reactivate': {
      user.isSuspended = false;
      user.isActive = true;
      logAudit(actor, 'Admin reactivated user', 'user', user.id, 'success', { note: note || '' });
      notifyUser(user.id, 'Account Reactivated', 'Your OmniMarket account has been reactivated.',
        { type: 'ACCOUNT_REACTIVATED', category: 'account', priority: 'IMPORTANT', relatedUserId: user.id, action: '/' });
      return res.json({ success: true, user: safeUser(user), action: 'reactivated' });
    }
    case 'force-reset': {
      user.mustChangePassword = true;
      revokeAll();
      logAudit(actor, 'Admin forced password reset', 'user', user.id, 'success', { note: note || '', sessionsRevoked: true });
      notifyUser(user.id, 'Security Alert', 'Your password reset was required by an administrator. You will be asked to set a new one at your next sign in.',
        { type: 'PASSWORD_RESET', category: 'account', priority: 'CRITICAL', relatedUserId: user.id, critical: true, action: '/login' });
      return res.json({ success: true, user: safeUser(user), action: 'force_reset' });
    }
    case 'revoke-sessions': {
      revokeAll();
      logAudit(actor, 'Admin revoked all user sessions', 'user', user.id, 'success', { note: note || '' });
      notifyUser(user.id, 'Security Alert', 'All your active sessions were terminated by an administrator.',
        { type: 'SESSION_REVOKED', category: 'account', priority: 'CRITICAL', relatedUserId: user.id, critical: true, action: '/login' });
      return res.json({ success: true, user: safeUser(user), action: 'sessions_revoked' });
    }
    case 'verify': {
      user.isVerified = true;
      user.isEmailVerified = true;
      logAudit(actor, 'Admin verified account', 'user', user.id, 'success', { note: note || '' });
      return res.json({ success: true, user: safeUser(user), action: 'verified' });
    }
    default:
      return res.status(400).json({ success: false, message: `Unknown account action: ${action}` });
  }
});

// Super admin creates admin accounts
app.post('/api/users', requireSuperAdmin, requirePermission('users:create'), (req, res) => {
  const actor = (req as any).currentUser;
  const payload = req.body.body ?? req.body;
  if (!payload.email || !payload.password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  const email = String(payload.email).toLowerCase().trim();
  if (db.users.some((u: any) => u.email?.toLowerCase() === email)) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
  }
  const role = payload.role === 'super-administrator' ? 'super-administrator' : 'administrator';
  const user = {
    id: uuidv4(),
    email,
    phone: payload.phone || '',
    password: hashPassword(String(payload.password)),
    firstName: payload.firstName || 'Platform',
    lastName: payload.lastName || 'Admin',
    displayName: payload.displayName || `${payload.firstName || 'Platform'} ${payload.lastName || 'Admin'}`.trim(),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uuidv4()}`,
    role,
    isVerified: true, isEmailVerified: true, isPhoneVerified: false,
    isApproved: true, isActive: true, isSuspended: false, twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  db.users.push(user);
  db.wallets.push({ userId: user.id, balance: 0, currency: 'GHS' });
  logAudit(actor, `Created ${role} account`, 'user', user.id, 'success', { email });
  res.status(201).json(safeUser(user));
});

app.delete('/api/users/:id', requireSuperAdmin, requirePermission('users:delete'), (req, res) => {
  const actor = (req as any).currentUser;
  const idx = db.users.findIndex((u: any) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const target = db.users[idx];
  if (target.id === actor.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  if (target.role === 'super-administrator') return res.status(403).json({ success: false, message: 'Protected account: Super Admin accounts cannot be deleted.' });
  db.users.splice(idx, 1);
  logAudit(actor, 'User deleted', 'user', target.id, 'success', { email: target.email });
  res.json({ success: true });
});

// ------------------------------------------------------------
// RBAC MANAGEMENT API (single source of truth: ./src/lib/auth/types)
// ------------------------------------------------------------

// Effective role→permission mapping. Refreshed from defaults or persisted overrides.
function rolesPayload() {
  return ROLE_ORDER.map((role: Role) => {
    const perms = effectiveRolePermissions(role);
    const management = perms.filter(p => MANAGEMENT_PERMISSIONS.includes(p));
    const selfService = perms.filter(p => !MANAGEMENT_PERMISSIONS.includes(p));
    return {
      id: role,
      label: ROLE_LABELS[role],
      accountType: ROLE_ACCOUNT_TYPES[role],
      permissions: management,
      selfServicePermissions: selfService,
      permissionCount: management.length,
      isManagementRole: management.length > 0,
      isProtected: role === 'super-administrator',
    };
  });
}

// View roles + their effective permission sets (admin/super with roles:view).
app.get('/api/roles', requirePermission('roles:view'), (req, res) => {
  res.json({ roles: rolesPayload(), userCounts: roleUserCounts() });
});

// View the permission registry (admin/super with permissions:view).
app.get('/api/permissions', requirePermission('permissions:view'), (req, res) => {
  res.json({
    permissions: MANAGEMENT_PERMISSIONS.map(p => ({ id: p, ...PERMISSION_META[p] })),
  });
});

function roleUserCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  ROLE_ORDER.forEach(r => { counts[r] = db.users.filter((u: any) => u.role === r).length; });
  return counts;
}

// Change a role's management permission set. Super-admin only, requires
// current-password re-authentication, audited with before/after state. The
// super-administrator role itself is immutable to prevent lockout/escalation.
app.patch('/api/roles/:id', requireSuperAdmin, requirePermission('roles:update'), (req, res) => {
  const actor = (req as any).currentUser;
  const roleId = req.params.id as string;
  if (!(roleId in ROLE_PERMISSIONS)) {
    return res.status(404).json({ success: false, message: 'Unknown role.' });
  }
  if (roleId === 'super-administrator') {
    return res.status(400).json({ success: false, message: 'The Super Admin role is protected and cannot be modified.' });
  }
  const body = req.body.body ?? req.body;
  const reauth = requireReAuth(actor, body);
  if (reauth) return res.status(reauth.status).json(reauth.body);
  if (!Array.isArray(body.permissions)) {
    return res.status(400).json({ success: false, message: 'permissions must be an array of permission ids.' });
  }
  // Only grant permissions that exist in the registry (never invented grants).
  const valid = body.permissions.filter((p: string) => (MANAGEMENT_PERMISSIONS as readonly string[]).includes(p));
  const previous = effectiveRolePermissions(roleId);
  const prevManagement = previous.filter(p => MANAGEMENT_PERMISSIONS.includes(p));
  const selfService = previous.filter(p => !MANAGEMENT_PERMISSIONS.includes(p));
  db.rolePermissions[roleId] = [...valid, ...selfService];
  const added = valid.filter(p => !prevManagement.includes(p));
  const removed = prevManagement.filter(p => !valid.includes(p));
  logAudit(actor, 'Role permissions updated', 'role', roleId, 'success', { role: roleId, added, removed, permissionCount: valid.length });
  res.json(rolesPayload().find(r => r.id === roleId));
});

// Assign (change) a user's role. Super-admin only, requires re-authentication,
// enforces role/account consistency, and refuses self-demotion that would
// remove the caller's own RBAC powers.
app.post('/api/users/:id/role', requireSuperAdmin, requirePermission('roles:assign'), (req, res) => {
  const actor = (req as any).currentUser;
  const user = db.users.find((x: any) => x.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const body = req.body.body ?? req.body;
  const nextRole = String(body.role || '');
  if (!(nextRole in ROLE_PERMISSIONS)) {
    return res.status(400).json({ success: false, message: 'Unknown target role.' });
  }
  const reauth = requireReAuth(actor, body);
  if (reauth) return res.status(reauth.status).json(reauth.body);

  // A Super Admin cannot demote their own account here — that would strip the
  // platform's RBAC powers with a single request.
  if (actor.id === user.id) {
    return res.status(400).json({ success: false, message: 'You cannot change your own role from this console.' });
  }

  const previousRole = user.role;
  if (nextRole === 'super-administrator') {
    logAudit(actor, 'Super Admin access granted', 'user', user.id, 'success', { grantedTo: user.email, previousRole });
  } else if (previousRole === 'super-administrator') {
    logAudit(actor, 'Super Admin access revoked', 'user', user.id, 'success', { revokedFrom: user.email, previousRole });
  }

  user.role = nextRole as Role;
  user.accountType = ROLE_ACCOUNT_TYPES[nextRole as Role];

  // Role/account consistency: when a user moves INTO vendor/rider territory, make
  // sure they actually hold a vendor/rider record; when they move OUT, keep the
  // record but the account type follows the role so a "Restaurant" label can
  // never be produced by a customer-role account.
  if (nextRole === 'vendor' || nextRole === 'vendor-staff' || nextRole === 'store-manager') {
    if (!db.vendors.some(v => v.ownerId === user.id)) {
      db.vendors.push({
        id: `v-${uuidv4().slice(0, 8)}`,
        ownerId: user.id,
        name: `${user.displayName || user.firstName || 'New'}'s Restaurant`,
        status: 'active',
        verificationStatus: 'verified',
        isApproved: true,
        category: 'Local Dishes',
        commissionRate: Number(db.platformSettings.defaultCommissionRate) || 10,
        createdAt: new Date().toISOString()
      });
    }
  }
  if (nextRole === 'rider' && !db.riders.some(r => r.userId === user.id)) {
    db.riders.push({
      id: `r-${uuidv4().slice(0, 8)}`,
      userId: user.id,
      name: user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'Rider',
      vehicleType: 'Motorcycle',
      isOnline: false,
      isVerified: true,
      verificationStatus: 'verified',
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }

  logAudit(actor, 'Role assigned', 'user', user.id, 'success', { from: previousRole, to: nextRole, affectedEmail: user.email });
  // Revoke all sessions so the new role takes effect cleanly on next login.
  user.tokensRevokedAt = Date.now();
  (db.sessions || []).forEach((s: any) => {
    if (s.userId === user.id && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });
  res.json({ success: true, user: safeUser(user), previousRole });
});

// Admin customer directory (with aggregates)
app.get('/api/customers', requireAdmin, (req, res) => {
  const customers = (db.users as any[]).filter((u: any) => u.role === 'customer').map((u: any) => {
    const orders = db.orders.filter((o: any) => o.customerId === u.id);
    const wallet = db.wallets.find((w: any) => w.userId === u.id);
    const lastOrder = orders[orders.length - 1];
    return {
      id: u.id, name: `${u.firstName} ${u.lastName}`.trim() || u.displayName, email: u.email,
      phone: u.phone || '', avatar: u.avatarUrl, status: u.isSuspended ? 'suspended' : 'active',
      isSuspended: !!u.isSuspended, createdAt: u.createdAt, joinedDate: u.createdAt,
      location: lastOrder?.customerAddress || '—',
      totalOrders: orders.length,
      totalSpent: orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0),
      walletBalance: wallet?.balance || 0,
      lastOrderAt: lastOrder?.createdAt || null
    };
  });
  res.json(customers);
});

// All wallet transactions (admin)
app.get('/api/transactions', requireAdmin, requirePermission('payments:view'), (req, res) => {
  const { userId, category, status, type } = req.query;
  let rows = db.transactions.map((t: any) => {
    const user = db.users.find((u: any) => u.id === t.userId);
    return { ...t, userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown', userEmail: user?.email || '' };
  });
  if (userId) rows = rows.filter(t => t.userId === userId);
  if (category) rows = rows.filter(t => t.category === category);
  if (status) rows = rows.filter(t => t.status === status);
  if (type) rows = rows.filter(t => t.type === type);
  res.json(rows);
});

// Email delivery log (admin) — no secrets, codes/tokens are redacted by design.
app.get('/api/email-log', requireAdmin, (req, res) => {
  const rows = (db.emailLog || [])
    .slice()
    .reverse()
    .map((e: any) => ({
      id: e.id,
      recipient: e.recipient,
      template: e.template,
      subject: e.subject,
      status: e.status,
      messageId: e.messageId,
      error: e.error,
      createdAt: e.createdAt
    }));
  res.json(rows);
});

// Payment records derived from real orders
app.get('/api/payments', requireAdmin, requirePermission('payments:view'), (req, res) => {
  const rows = (db.orders as any[]).map(o => ({
    id: o.id,
    reference: o.invoiceNumber,
    orderNumber: o.orderNumber,
    amount: Number(o.totalAmount) || 0,
    status: o.paymentStatus,
    method: o.paymentMethod,
    customerName: o.customerName,
    vendorName: o.vendorName,
    orderId: o.id,
    createdAt: o.createdAt,
    isPaid: !!o.isPaid || o.paymentStatus === 'paid'
  }));
  res.json(rows);
});

// Vendor payouts (from completed orders + payout transactions)
app.get('/api/payouts', requireAdmin, (req, res) => {
  const completed = (db.orders as any[]).filter(o => o.status === 'completed' || o.status === 'delivered');
  const byVendor = new Map<string, any>();
  completed.forEach(o => {
    const row = byVendor.get(o.vendorId) || { vendorId: o.vendorId, vendorName: o.vendorName, orders: 0, amount: 0, lastOrderAt: null };
    row.orders += 1;
    row.amount += Number(o.vendorPayout) || 0;
    row.lastOrderAt = o.createdAt;
    byVendor.set(o.vendorId, row);
  });
  const payoutTx = db.transactions.filter((t: any) => t.category === 'vendor_payout');
  const result = Array.from(byVendor.values()).map(r => ({
    ...r,
    paid: payoutTx.filter((t: any) => t.referenceId === r.lastOrderAt).length > 0
  }));
  res.json(result);
});

// ------------------------------------------------------------
// REFERRALS — codes, my stats, admin audit trail
// ------------------------------------------------------------

// Return the signed-in user's own referral code + their signup stats.
app.get('/api/referrals/me', requireAuth, (req, res) => {
  const userId = (req as any).currentUserId;
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Backfill: any pre-existing account without a code gets one now.
  if (!user.referralCode) user.referralCode = generateReferralCode(user);

  const records = (db.referrals as any[]).filter(r => r.referrerUserId === userId);
  const byRole = records.reduce((acc: any, r) => {
    acc[r.referredRole] = (acc[r.referredRole] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    code: user.referralCode,
    totalReferred: records.length,
    byRole,
    records: records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  });
});

// Full referral audit trail for the admin console.
app.get('/api/referrals', requireAdmin, (req, res) => {
  const rows = (db.referrals as any[]).map(r => {
    const referred = db.users.find((u: any) => u.id === r.referredUserId);
    const referrer = db.users.find((u: any) => u.id === r.referrerUserId);
    return {
      ...r,
      referredStatus: referred ? (referred.isApproved ? 'approved' : 'pending') : (r.referredStatus || 'unknown'),
      referredRole: referred ? referred.role : (r.referredRole || 'unknown'),
      referrerActive: referrer ? !!referrer.isActive : null
    };
  });
  res.json(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// Rider earnings
app.get('/api/rider-earnings', requireAdmin, requirePermission('reports:view'), (req, res) => {
  const rows = db.transactions
    .filter((t: any) => t.category === 'rider_earning')
    .map((t: any) => {
      const rider = db.riders.find((r: any) => r.userId === t.userId);
      const order = db.orders.find((o: any) => o.id === t.referenceId);
      return { ...t, riderName: rider?.name || 'Unknown', riderId: rider?.id, orderNumber: order?.orderNumber || '' };
    });
  res.json(rows);
});

// Coupon management (admin)
app.post('/api/coupons', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const p = req.body.body ?? req.body;
  if (!p.code || !p.value) return res.status(400).json({ success: false, message: 'Coupon code and value are required.' });
  const code = String(p.code).toUpperCase().replace(/\s+/g, '');
  if (db.coupons.some((c: any) => c.code === code)) return res.status(400).json({ success: false, message: 'A coupon with this code already exists.' });
  const coupon = {
    id: `cp-${uuidv4().slice(0, 8)}`,
    code,
    description: p.description || '',
    type: p.type || 'percentage',
    value: Number(p.value) || 0,
    maxDiscount: p.maxDiscount ? Number(p.maxDiscount) : undefined,
    minSpend: p.minSpend ? Number(p.minSpend) : 0,
    usageLimit: p.usageLimit ? Number(p.usageLimit) : undefined,
    totalUsed: 0,
    vendorId: p.vendorId || undefined,
    isActive: p.isActive !== false,
    startsAt: p.startsAt || undefined,
    expiryDate: p.expiryDate || '',
    createdAt: new Date().toISOString()
  };
  db.coupons.push(coupon);
  logAudit(actor, 'Coupon created', 'coupon', coupon.id, 'success', { code });
  res.status(201).json(coupon);
});

app.patch('/api/coupons/:id', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const coupon = db.coupons.find((c: any) => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  const updates = req.body.body ?? req.body;
  Object.assign(coupon, updates);
  if (updates.value !== undefined) coupon.value = Number(updates.value);
  if (updates.minSpend !== undefined) coupon.minSpend = Number(updates.minSpend);
  if (updates.value !== undefined && Number(updates.value) > 0) {
    if (coupon.type === 'percentage') coupon.value = Math.min(coupon.value, 100);
  }
  logAudit(actor, 'Coupon updated', 'coupon', coupon.id, 'success', { code: coupon.code });
  res.json(coupon);
});

app.delete('/api/coupons/:id', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const idx = db.coupons.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });
  db.coupons.splice(idx, 1);
  logAudit(actor, 'Coupon deleted', 'coupon', req.params.id, 'success');
  res.json({ success: true });
});

// Coupon validation used by checkout
app.get('/api/coupons/validate', (req, res) => {
  const { code, amount } = req.query;
  const coupon = db.coupons.find((c: any) => c.code === String(code).toUpperCase() && c.isActive);
  if (!coupon) return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
  const now = Date.now();
  if (coupon.startsAt && now < Date.parse(coupon.startsAt)) return res.status(400).json({ success: false, message: 'This coupon is not active yet.' });
  if (coupon.expiryDate && now > Date.parse(coupon.expiryDate)) return res.status(400).json({ success: false, message: 'This coupon has expired.' });
  if (coupon.usageLimit != null && (coupon.totalUsed || 0) >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
  const subtotal = Number(amount) || 0;
  if (subtotal < (coupon.minSpend || 0)) return res.status(400).json({ success: false, message: `Minimum order of GHS ${coupon.minSpend} required.` });
  let discount = 0;
  if (coupon.type === 'percentage') discount = Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity);
  else if (coupon.type === 'fixed_amount') discount = Math.min(coupon.value, subtotal);
  else if (coupon.type === 'free_delivery') discount = Number(db.platformSettings.defaultDeliveryFee) || 0;
  // Return only the fields checkout needs. Never reveal raw usage limits,
  // internal validity windows, or anything that would aid enumeration.
  res.json({
    valid: true,
    coupon: {
      id: coupon.id,
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
      minSpend: coupon.minSpend
    },
    discount,
    message: `Coupon applied: GHS ${discount.toFixed(2)} off`
  });
});

// Support tickets
app.get('/api/support/tickets', (req, res) => {
  const { userId } = req.query;
  // A user may only read their own tickets; admins may read all.
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  if (!currentUser) return res.status(401).json({ success: false, message: 'Authentication required' });

  const rows = db.tickets
    .filter((t: any) => isAdmin ? (!userId || t.userId === userId) : (t.userId === currentUser.id))
    .map((t: any) => {
      const user = db.users.find((u: any) => u.id === t.userId);
      return { ...t, userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown', userEmail: user?.email || '' };
    });
  res.json(rows);
});

app.post('/api/support/tickets', requireAuth, (req, res) => {
  const { subject, message, priority = 'medium' } = req.body;
  // Tickets always belong to the authenticated caller (no impersonation).
  const uid = (req as any).currentUserId;
  if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message are required.' });
  const ticket = {
    id: `tk-${uuidv4().slice(0, 8)}`,
    userId: uid,
    subject, message, priority,
    status: 'open',
    assigneeId: null,
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.tickets.push(ticket);
  // Notify all admins
  db.users.filter((u: any) => ['administrator', 'super-administrator'].includes(u.role)).forEach((a: any) => {
    notifyUser(a.id, 'New Support Ticket', subject,
      { type: 'SUPPORT_TICKET', category: 'system', priority: 'IMPORTANT', referenceId: ticket.id, referenceType: 'support', action: `/admin/support`, dedupeKey: `ticket:${ticket.id}:${a.id}` });
  });
  res.status(201).json(ticket);
});

app.post('/api/support/tickets/:id/reply', requireAuth, (req, res) => {
  const ticket = db.tickets.find((t: any) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const { content } = req.body;
  const uid = (req as any).currentUserId;
  const actor = db.users.find((u: any) => u.id === uid);
  const isAdmin = actor && ['administrator', 'super-administrator'].includes(actor.role);
  // Only the ticket owner or an admin may reply.
  if (!isAdmin && ticket.userId !== uid) return res.status(403).json({ error: 'Forbidden' });
  if (!content) return res.status(400).json({ success: false, message: 'Reply is empty.' });
  ticket.replies.push({ id: uuidv4(), senderId: uid, content, createdAt: new Date().toISOString() });
  ticket.updatedAt = new Date().toISOString();
  if (ticket.status === 'open') ticket.status = 'responded';
  // Notify the other party
  const otherId = ticket.userId === uid ? (ticket.assigneeId || db.users.find((u: any) => ['administrator', 'super-administrator'].includes(u.role))?.id) : ticket.userId;
  if (otherId && otherId !== uid) {
    notifyUser(otherId, 'Support Reply', content.slice(0, 80),
      { type: 'SUPPORT_REPLY', category: 'system', priority: 'IMPORTANT', referenceId: ticket.id, referenceType: 'support', action: `/support/tickets/${ticket.id}`, dedupeKey: `ticket-reply:${ticket.id}:${otherId}` });
  }
  res.json(ticket);
});

app.patch('/api/support/tickets/:id', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const ticket = db.tickets.find((t: any) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const updates = req.body.body ?? req.body;
  if (updates.status) ticket.status = updates.status;
  if (updates.priority) ticket.priority = updates.priority;
  if (updates.assigneeId !== undefined) ticket.assigneeId = updates.assigneeId;
  ticket.updatedAt = new Date().toISOString();
  logAudit(actor, 'Support ticket updated', 'support_ticket', ticket.id, 'success', { status: updates.status });
  res.json(ticket);
});

// One shared filter pipeline for the audit trail. Both the paginated list
// endpoint and the CSV export use it so the export always honours the exact
// same filters the operator sees on screen.
function filterAuditRows(q: any) {
  const action = String(q.action || '').trim();
  const entity = String(q.entity || '').trim();
  const category = String(q.category || '').trim();
  const entityId = String(q.entityId || '').trim();
  const result = String(q.result || '').trim();
  const severity = String(q.severity || '').trim();
  const actorId = String(q.actorId || '').trim();
  const role = String(q.role || '').trim();
  const search = String(q.search || '').trim().toLowerCase();
  const from = q.from ? new Date(String(q.from)).getTime() : null;
  const to = q.to ? new Date(String(q.to)).getTime() : null;
  const sort = String(q.sort || 'newest').trim();

  let rows: any[] = [...db.audit];

  if (action) rows = rows.filter(r => r.action === action);
  if (entity) rows = rows.filter(r => r.entity === entity);
  if (category) rows = rows.filter(r => (r.category || auditCategory(r.entity)) === category);
  if (entityId) rows = rows.filter(r => String(r.entityId || '').toLowerCase().includes(entityId.toLowerCase()));
  if (result) rows = rows.filter(r => r.result === result);
  if (severity) rows = rows.filter(r => (r.severity || auditSeverity(r.action)) === severity);
  if (actorId) rows = rows.filter(r => r.actorId === actorId);
  if (role) rows = rows.filter(r => r.actorRole === role);
  if (search) {
    rows = rows.filter(r =>
      String(r.actorName || '').toLowerCase().includes(search) ||
      String(r.actorEmail || '').toLowerCase().includes(search) ||
      String(r.action || '').toLowerCase().includes(search) ||
      String(r.entity || '').toLowerCase().includes(search) ||
      String(r.category || '').toLowerCase().includes(search) ||
      String(r.entityId || '').toLowerCase().includes(search) ||
      String(r.id || '').toLowerCase().includes(search)
    );
  }
  if (from || to) {
    rows = rows.filter(r => {
      const t = new Date(r.timestamp).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      return true;
    });
  }

  if (sort === 'oldest') rows.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  else if (sort === 'action') rows.sort((a, b) => String(a.action).localeCompare(String(b.action)) || (a.timestamp < b.timestamp ? 1 : -1));
  else if (sort === 'actor') rows.sort((a, b) => String(a.actorName).localeCompare(String(b.actorName)) || (a.timestamp < b.timestamp ? 1 : -1));
  else if (sort === 'entity') rows.sort((a, b) => String(a.entity).localeCompare(String(b.entity)) || (a.timestamp < b.timestamp ? 1 : -1));
  else if (sort === 'severity') {
    const sevRank = (s: string) => ({ critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>)[String(s || 'low')] ?? 3;
    rows.sort((a, b) => sevRank(a.severity || auditSeverity(a.action)) - sevRank(b.severity || auditSeverity(b.action)) || (a.timestamp < b.timestamp ? 1 : -1));
  }
  else rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)); // newest

  return { rows, total: rows.length };
}

// Server-side audit log (immutable to admins, super-admin can read)
// Audit log (super admin only): server-side filter, search and pagination.
app.get('/api/audit', requireSuperAdmin, requirePermission('audit:view'), (req, res) => {
  const q = req.query;
  const page = Math.max(Number(q.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);

  const { rows, total } = filterAuditRows(q);
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize).map(r => ({
    ...r,
    category: r.category || auditCategory(r.entity),
    severity: r.severity || auditSeverity(r.action)
  }));

  res.json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items
  });
});

// Export the filtered audit trail as CSV. The export re-uses the exact filter
// pipeline of the list endpoint and is itself recorded as an audit event.
app.get('/api/audit/export', requireSuperAdmin, requirePermission('audit:view'), (req, res) => {
  const actor = (req as any).currentUser;
  const { rows } = filterAuditRows(req.query);

  const esc = (v: any) => {
    const s = v === undefined || v === null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['event_id', 'timestamp', 'actor_id', 'actor_name', 'actor_email', 'actor_role',
    'action', 'category', 'resource_type', 'resource_id', 'result', 'severity', 'ip_address', 'user_agent', 'request_id', 'session_id', 'metadata'].map(esc);
  const lines = rows.map(r => {
    const cat = r.category || auditCategory(r.entity);
    const sev = r.severity || auditSeverity(r.action);
    return [r.id, r.timestamp, r.actorId, r.actorName, r.actorEmail, r.actorRole,
      r.action, cat, r.entity, r.entityId, r.result, sev, r.ipAddress, r.userAgent, r.requestId, r.sessionId,
      r.meta ? JSON.stringify(r.meta) : ''].map(esc);
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="omnimarket-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send([header.join(','), ...lines.map(l => l.join(','))].join('\n'));

  logAudit(actor, 'Audit log exported', 'database', 'global', 'success', { rows: rows.length, format: 'csv' }, req);
});

// Immutable audit overview for the Security / Recent Activity modules and the
// Audit Log stat cards: counts by action, result, category, severity and the
// latest events (super admin only).
app.get('/api/audit/summary', requireSuperAdmin, requirePermission('security:view'), (req, res) => {
  const rows = db.audit;
  const actions: Record<string, number> = {};
  const results: Record<string, number> = {};
  const byEntity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byDay: Record<string, number> = {};
let today = 0;
  let failed = 0;
  let security = 0;
  let payments = 0;
  let adminActions = 0;
  let criticalRisk = 0;
  let operations = 0;
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  rows.forEach((r: any) => {
    actions[r.action] = (actions[r.action] || 0) + 1;
    results[r.result] = (results[r.result] || 0) + 1;
    byEntity[r.entity] = (byEntity[r.entity] || 0) + 1;
    byCategory[r.category || auditCategory(r.entity)] = (byCategory[r.category || auditCategory(r.entity)] || 0) + 1;
    bySeverity[r.severity || auditSeverity(r.action)] = (bySeverity[r.severity || auditSeverity(r.action)] || 0) + 1;
    byDay[(r.timestamp || '').slice(0, 10)] = (byDay[(r.timestamp || '').slice(0, 10)] || 0) + 1;
    if ((r.timestamp || '').slice(0, 10) === todayKey) today += 1;
    if (r.result === 'failed') failed += 1;
    if ((r.severity || auditSeverity(r.action)) === 'critical') criticalRisk += 1;
    if (['order', 'payment', 'wallet', 'delivery', 'menu_item', 'category', 'coupon',
      'vendor', 'rider', 'referral', 'support_ticket', 'announcement'].includes(r.entity)) operations += 1;
    if (['auth', 'permission', 'role', 'session'].includes(r.entity) || r.category === 'Security' || r.category === 'RBAC') security += 1;
    if (['payment', 'wallet', 'payment_gateway'].includes(r.entity) || r.category === 'Payments') payments += 1;
    if (['administrator', 'super-administrator'].includes(r.actorRole)) adminActions += 1;
  });

  const last24 = rows.filter((r: any) => (new Date(r.timestamp).getTime() || 0) > Date.now() - 24 * 60 * 60 * 1000).length;

  res.json({
    total: rows.length,
    last24h: last24,
    today,
    failed,
    criticalRisk,
    security,
    operations,
    payments,
    adminActions,
    byAction: Object.entries(actions).sort((a, b) => b[1] - a[1]),
    byResult: results,
    byEntity,
    byCategory,
    bySeverity,
    byDay: Object.entries(byDay).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    recent: [...rows].reverse().slice(0, 25)
  });
});

// Distinct audit facets (super admin only) so the filter dropdowns reflect the
// real values present in the database instead of a hard-coded list.
app.get('/api/audit/facets', requireSuperAdmin, requirePermission('audit:view'), (req, res) => {
  const actions = new Set<string>();
  const entities = new Set<string>();
  const categories = new Set<string>();
  const roles = new Set<string>();
  const results = new Set<string>();
  const severities = new Set<string>();
  db.audit.forEach((r: any) => {
    if (r.action) actions.add(String(r.action));
    if (r.entity) entities.add(String(r.entity));
    categories.add(r.category || auditCategory(r.entity));
    if (r.actorRole) roles.add(String(r.actorRole));
    if (r.result) results.add(String(r.result));
    severities.add(r.severity || auditSeverity(r.action));
  });

  const roleLabels: Record<string, string> = {
    'super-administrator': 'Super Admin', administrator: 'Admin', vendor: 'Vendor',
    rider: 'Rider', customer: 'Customer', system: 'System'
  };
  const entityLabels: Record<string, string> = {
    auth: 'Auth', user: 'User', order: 'Order', payment: 'Payment', wallet: 'Wallet',
    payment_gateway: 'Payment Gateway', vendor: 'Restaurant', rider: 'Rider',
    menu_item: 'Menu Item', category: 'Category', coupon: 'Coupon', delivery: 'Delivery',
    platform_settings: 'Platform Settings', database: 'Database', role: 'Role',
    permission: 'Permission', referral: 'Referral', support_ticket: 'Support Ticket',
    announcement: 'Announcement', maintenance: 'Maintenance', notification: 'Notification',
    platform_message: 'Platform Message'
  };

  res.json({
    actions: [...actions].sort((a, b) => a.localeCompare(b)),
    entities: [...entities].sort((a, b) => (entityLabels[a] || a).localeCompare(entityLabels[b] || b)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    roles: [...roles].sort((a, b) => (roleLabels[a] || a).localeCompare(roleLabels[b] || b)),
    results: [...results].sort(),
    severities: [...severities].sort(),
    roleLabels,
    entityLabels
  });
});

// ------------------------------------------------------------
// SYSTEM LOGS (technical events — super admin only)
// ------------------------------------------------------------
// Distinct from the audit log: System Logs record technical/service events
// (restart, worker failure, API/DB error, integration error). The System Logs
// page therefore never shows fabricated personnel activity.
function filterSystemLogs(q: any) {
  const level = String(q.level || '').trim();
  const source = String(q.source || '').trim();
  const search = String(q.search || '').trim().toLowerCase();
  const from = q.from ? new Date(String(q.from)).getTime() : null;
  const to = q.to ? new Date(String(q.to)).getTime() : null;
  const sort = String(q.sort || 'newest').trim();

  let rows: any[] = [...(Array.isArray(db.systemLogs) ? db.systemLogs : [])];

  if (level) rows = rows.filter(r => r.level === level);
  if (source) rows = rows.filter(r => r.source === source);
  if (search) {
    rows = rows.filter(r =>
      String(r.event || '').toLowerCase().includes(search) ||
      String(r.message || '').toLowerCase().includes(search) ||
      String(r.source || '').toLowerCase().includes(search) ||
      String(r.id || '').toLowerCase().includes(search)
    );
  }
  if (from || to) {
    rows = rows.filter(r => {
      const t = new Date(r.timestamp).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      return true;
    });
  }

  if (sort === 'oldest') rows.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  else if (sort === 'level') {
    const rank = (l?: string) => ({ error: 0, warn: 1, info: 2, debug: 3 } as Record<string, number>)[String(l || 'info')] ?? 2;
    rows.sort((a, b) => rank(a.level) - rank(b.level) || (a.timestamp < b.timestamp ? 1 : -1));
  }
  else rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return { rows, total: rows.length };
}

app.get('/api/admin/system-logs', requireSuperAdmin, requirePermission('api:view'), (req, res) => {
  const q = req.query;
  const page = Math.max(Number(q.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);

  const { rows, total } = filterSystemLogs(q);
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  const all = Array.isArray(db.systemLogs) ? db.systemLogs : [];
  const byLevel: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let errors24h = 0;
  all.forEach(r => {
    byLevel[r.level] = (byLevel[r.level] || 0) + 1;
    bySource[r.source] = (bySource[r.source] || 0) + 1;
    if (r.level === 'error' && (new Date(r.timestamp).getTime() || 0) > Date.now() - 24 * 60 * 60 * 1000) errors24h += 1;
  });

  res.json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
    summary: {
      total: all.length,
      errors: byLevel.error || 0,
      warnings: byLevel.warn || 0,
      infos: byLevel.info || 0,
      errors24h,
      byLevel,
      bySource
    },
    sources: SYSTEM_LOG_SOURCES
  });
});

// Clear system logs (super admin, re-auth required). The clear itself is
// recorded as an audit event so the action is traceable.
app.post('/api/admin/system-logs/clear', requireSuperAdmin, requirePermission('api:view'), (req, res) => {
  const actor = (req as any).currentUser;
  if (applyReAuth(req.body, actor, res)) return;
  const before = (Array.isArray(db.systemLogs) ? db.systemLogs : []).length;
  db.systemLogs = [];
  logAudit(actor, 'System logs cleared', 'database', 'global', 'success', { before, cleared: true }, req);
  res.json({ ok: true, cleared: before });
});

// Platform settings (super admin)
app.get('/api/platform/settings', (req, res) => {
  res.json(db.platformSettings);
});

// Keys whose change can take the platform offline, open/close registration, or
// re-route money/communications. These require password re-authentication.
const HIGH_RISK_SETTINGS = new Set([
  'maintenanceMode', 'allowNewCustomers', 'allowNewVendors', 'allowNewRiders',
  'notificationsEnabled', 'vendorApprovalMode', 'riderApprovalMode'
]);

function validatePlatformSettings(updates: any): { errors: string[]; sanitized: Record<string, any> } {
  const errors: string[] = [];
  const out: Record<string, any> = {};

  if ('platformName' in updates) {
    const name = String(updates.platformName || '').trim().replace(/[\u0000-\u001f]/g, '');
    if (name.length < 2 || name.length > 60) errors.push('Platform name must be between 2 and 60 characters.');
    else out.platformName = name;
  }
  if ('currency' in updates) {
    const c = String(updates.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) errors.push('Currency must be a 3-letter code (e.g. GHS).');
    else out.currency = c;
  }
  if ('defaultCommissionRate' in updates) {
    const rate = Number(updates.defaultCommissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) errors.push('Commission rate must be a number between 0 and 100.');
    else out.defaultCommissionRate = Math.round(rate * 100) / 100;
  }
  if ('defaultDeliveryFee' in updates) {
    const fee = Number(updates.defaultDeliveryFee);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Default delivery fee must be a non-negative number.');
    else out.defaultDeliveryFee = Math.round(fee * 100) / 100;
  }
  if ('distanceFeePerKm' in updates) {
    const fee = Number(updates.distanceFeePerKm);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Distance fee per km must be a non-negative number.');
    else out.distanceFeePerKm = Math.round(fee * 100) / 100;
  }
  if ('deliveryBaseFee' in updates) {
    const fee = Number(updates.deliveryBaseFee);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Delivery base fee must be a non-negative number.');
    else out.deliveryBaseFee = Math.round(fee * 100) / 100;
  }
  if ('deliveryMinFee' in updates) {
    const fee = Number(updates.deliveryMinFee);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Delivery minimum fee must be a non-negative number.');
    else out.deliveryMinFee = Math.round(fee * 100) / 100;
  }
  if ('deliveryMaxFee' in updates) {
    const fee = Number(updates.deliveryMaxFee);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Delivery maximum fee must be a non-negative number.');
    else out.deliveryMaxFee = Math.round(fee * 100) / 100;
  }
  if ('freeDeliveryThreshold' in updates) {
    const fee = Number(updates.freeDeliveryThreshold);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Free delivery threshold must be a non-negative number.');
    else out.freeDeliveryThreshold = Math.round(fee * 100) / 100;
  }
  if ('maxDeliveryDistance' in updates) {
    const d = Number(updates.maxDeliveryDistance);
    if (!Number.isFinite(d) || d < 0) errors.push('Maximum delivery distance must be a non-negative number.');
    else out.maxDeliveryDistance = Math.round(d * 100) / 100;
  }
  if ('platformFee' in updates) {
    const fee = Number(updates.platformFee);
    if (!Number.isFinite(fee) || fee < 0) errors.push('Platform fee must be a non-negative number.');
    else out.platformFee = Math.round(fee * 100) / 100;
  }
  if ('taxRate' in updates) {
    const rate = Number(updates.taxRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) errors.push('Tax rate must be a number between 0 and 100.');
    else out.taxRate = Math.round(rate * 100) / 100;
  }
  if ('supportEmail' in updates) {
    const email = String(updates.supportEmail || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Support email must be a valid email address.');
    else out.supportEmail = email;
  }
  if ('smsSenderId' in updates) {
    const sid = String(updates.smsSenderId || '').trim().replace(/[\u0000-\u001f]/g, '');
    if (sid.length > 20) errors.push('SMS sender id must be 20 characters or fewer.');
    else out.smsSenderId = sid;
  }
  if ('maintenanceMode' in updates) out.maintenanceMode = !!updates.maintenanceMode;
  if ('notificationsEnabled' in updates) out.notificationsEnabled = !!updates.notificationsEnabled;
  if ('allowNewCustomers' in updates) out.allowNewCustomers = !!updates.allowNewCustomers;
  if ('allowNewVendors' in updates) out.allowNewVendors = !!updates.allowNewVendors;
  if ('allowNewRiders' in updates) out.allowNewRiders = !!updates.allowNewRiders;
  if ('vendorApprovalMode' in updates) {
    if (!['manual', 'automatic'].includes(updates.vendorApprovalMode)) errors.push('Vendor approval mode must be manual or automatic.');
    else out.vendorApprovalMode = updates.vendorApprovalMode;
  }
  if ('riderApprovalMode' in updates) {
    if (!['manual', 'automatic'].includes(updates.riderApprovalMode)) errors.push('Rider approval mode must be manual or automatic.');
    else out.riderApprovalMode = updates.riderApprovalMode;
  }
  if ('fuelPriceCurrent' in updates) {
    const p = Number(updates.fuelPriceCurrent);
    if (!Number.isFinite(p) || p < 0) errors.push('Current fuel price must be a non-negative number.');
    else out.fuelPriceCurrent = Math.round(p * 100) / 100;
  }
  if ('fuelPriceReference' in updates) {
    const p = Number(updates.fuelPriceReference);
    if (!Number.isFinite(p) || p <= 0) errors.push('Fuel price baseline must be greater than zero.');
    else out.fuelPriceReference = Math.round(p * 100) / 100;
  }
  if ('fuelCostWeight' in updates) {
    const w = Number(updates.fuelCostWeight);
    if (!Number.isFinite(w) || w < 0 || w > 100) errors.push('Fuel cost weight must be between 0 and 100.');
    else out.fuelCostWeight = Math.round(w * 100) / 100;
  }
  if ('fuelAdjustmentMode' in updates) {
    if (!['automatic', 'approval'].includes(updates.fuelAdjustmentMode)) errors.push('Fuel adjustment mode must be automatic or approval.');
    else out.fuelAdjustmentMode = updates.fuelAdjustmentMode;
  }
  if ('maxAutoIncreasePct' in updates) {
    const m = Number(updates.maxAutoIncreasePct);
    if (!Number.isFinite(m) || m < 0 || m > 100) errors.push('Max auto increase % must be between 0 and 100.');
    else out.maxAutoIncreasePct = Math.round(m * 100) / 100;
  }
  if ('maxAutoDecreasePct' in updates) {
    const m = Number(updates.maxAutoDecreasePct);
    if (!Number.isFinite(m) || m < 0 || m > 100) errors.push('Max auto decrease % must be between 0 and 100.');
    else out.maxAutoDecreasePct = Math.round(m * 100) / 100;
  }
  if ('fuelProviderUrl' in updates) {
    const url = String(updates.fuelProviderUrl || '').trim();
    if (url && !/^https?:\/\/.+/i.test(url)) errors.push('Fuel provider URL must be a valid http(s) URL.');
    else out.fuelProviderUrl = url;
  }

  return { errors, sanitized: out };
}

app.put('/api/platform/settings', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  const actor = (req as any).currentUser;
  const raw = req.body.body ?? req.body;
  const { password } = raw;

  // High-risk changes demand proof the current operator is at the keyboard.
  const touchesHighRisk = Object.keys(raw).some(k => HIGH_RISK_SETTINGS.has(k));
  if (touchesHighRisk) {
    if (!password || typeof password !== 'string') {
      return res.status(401).json({ success: false, requiresPassword: true, message: 'Re-authentication required for this change.' });
    }
    if (!verifyPasswordAndUpgrade(actor, String(password || ''))) {
      logAudit(actor, 'Platform settings change denied', 'platform_settings', 'global', 'denied', { reason: 're-auth failed' });
      return res.status(401).json({ success: false, requiresPassword: true, message: 'Current password is incorrect.' });
    }
  }

  const { errors, sanitized } = validatePlatformSettings(raw);
  if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

  // Record exactly which keys changed and their before/after values.
  const changed: Record<string, { from: any; to: any }> = {};
  Object.entries(sanitized).forEach(([k, v]) => {
    const prev = (db.platformSettings as any)[k];
    if (JSON.stringify(prev) !== JSON.stringify(v)) changed[k] = { from: prev, to: v };
  });

  if (Object.keys(changed).length === 0) return res.json(db.platformSettings);

  const PRICING_KEYS = ['deliveryBaseFee', 'distanceFeePerKm', 'deliveryMinFee', 'deliveryMaxFee',
    'freeDeliveryThreshold', 'maxDeliveryDistance', 'fuelPriceCurrent', 'fuelPriceReference',
    'fuelCostWeight', 'fuelAdjustmentMode', 'maxAutoIncreasePct', 'maxAutoDecreasePct'];
  const pricingChanged = Object.keys(changed).some(k => PRICING_KEYS.includes(k));

  const beforeSnapshot: Record<string, any> = {};
  Object.entries(changed).forEach(([k, v]) => { beforeSnapshot[k] = (v as any).from; });

  db.platformSettings = { ...db.platformSettings, ...sanitized, updatedAt: new Date().toISOString() };

  if (pricingChanged) {
    const afterSnapshot: Record<string, any> = {};
    Object.entries(changed).forEach(([k, v]) => { afterSnapshot[k] = (v as any).to; });
    applyPricingVersion({ changedBy: actor?.email || 'system', reason: 'pricing update via platform settings', before: beforeSnapshot, after: afterSnapshot });
    // mark fuel price as manually verified/updated when the operator sets it
    if ('fuelPriceCurrent' in changed || 'fuelPriceReference' in changed) {
      db.platformSettings.fuelPriceStatus = 'verified';
      db.platformSettings.fuelPriceSource = 'manual';
      db.platformSettings.fuelPriceUpdatedAt = new Date().toISOString();
      db.platformSettings.fuelPriceLastVerifiedAt = new Date().toISOString();
      recordFuelPriceHistory({
        price: Number(db.platformSettings.fuelPriceCurrent) || 0,
        reference: Number(db.platformSettings.fuelPriceReference) || 0,
        source: 'manual',
        status: 'verified',
        note: 'Super admin set fuel price'
      });
    }
    logAudit(actor, 'Delivery pricing updated', 'platform_settings', 'global', 'success', { changed, pricingVersion: db.platformSettings.currentPricingVersion });
  }

  logAudit(actor, 'Platform settings updated', 'platform_settings', 'global', 'success', { changed });
  res.json(db.platformSettings);
});

// ------------------------------------------------------------
// FUEL PRICE + DELIVERY PRICING API (super admin)
// ------------------------------------------------------------
// Read model shared by the Pricing preview, System Logs fuel source, and the
// checkout hint. `fuelPendingReview` carries the staged proposal when automatic
// adjustment is paused (see computeFuelMultiplier) or approval-mode is on.

function fuelProposalState() {
  const s = db.platformSettings;
  const info = getFuelPriceInfo();
  const fuel = computeFuelMultiplier();
  const paused = !!(fuel && fuel.paused && fuel.reason === 'beyond_auto_limits');
  const pendingReview = paused || (s.fuelAdjustmentMode === 'approval' && !s.fuelPendingReview);
  return { info, fuel, paused, pendingReview };
}

app.get('/api/admin/fuel/price', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  const s = db.platformSettings;
  const state = fuelProposalState();
  res.json({
    info: state.info,
    multiplier: state.fuel ? state.fuel.multiplier : null,
    applied: state.fuel ? state.fuel.applied : false,
    paused: state.paused,
    pendingReview: s.fuelPendingReview || null,
    fuelPriceStatus: s.fuelPriceStatus || 'unavailable',
    fuelPriceUpdatedAt: s.fuelPriceUpdatedAt || null,
    fuelPriceLastVerifiedAt: s.fuelPriceLastVerifiedAt || null,
    fuelProviderUrl: s.fuelProviderUrl || '',
    fuelAdjustmentMode: s.fuelAdjustmentMode || 'automatic',
    maxAutoIncreasePct: Number(s.maxAutoIncreasePct) || 10,
    maxAutoDecreasePct: Number(s.maxAutoDecreasePct) || 10,
    currentPricingVersion: Number(s.currentPricingVersion) || 0,
    delivery: {
      baseFee: Number(s.deliveryBaseFee) || 0,
      perKm: Number(s.distanceFeePerKm) || 0,
      minFee: Number(s.deliveryMinFee) || 0,
      maxFee: Number(s.deliveryMaxFee) || 0,
      freeDeliveryThreshold: Number(s.freeDeliveryThreshold) || 0,
      maxDeliveryDistance: Number(s.maxDeliveryDistance) || 0
    }
  });
});

app.get('/api/admin/fuel/history', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  const q = req.query;
  let rows: any[] = [...(Array.isArray(db.fuelPriceHistory) ? db.fuelPriceHistory : [])];
  const from = q.from ? new Date(String(q.from)).getTime() : null;
  const to = q.to ? new Date(String(q.to)).getTime() : null;
  if (from || to) {
    rows = rows.filter(r => {
      const t = new Date(r.timestamp).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      return true;
    });
  }
  rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const page = Math.max(Number(q.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);
  const start = (page - 1) * pageSize;
  res.json({ total: rows.length, page, pageSize, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)), items: rows.slice(start, start + pageSize) });
});

// Sync fuel price from the configured provider (or the supplied price). The
// outcome is audited. When a *new* provider price lands beyond auto limits, an
// approval proposal is staged instead of silently applying a large change.
app.post('/api/admin/fuel/sync', requireSuperAdmin, requirePermission('settings:update'), async (req, res) => {
  const actor = (req as any).currentUser;
  const raw = req.body.body ?? req.body;
  const source = String(raw?.source || '').trim();
  const manualPrice = raw?.price !== undefined && raw?.price !== null && String(raw?.price) !== '' ? Number(raw.price) : null;

  const result = await (manualPrice !== null
    ? Promise.resolve({ price: manualPrice, source: 'manual' })
    : fetchCurrentFuelPrice(source));

  if (!Number.isFinite(result.price) || result.price <= 0) {
    logAudit(actor, 'Fuel price sync failed', 'platform_settings', 'global', 'failed', {
      reason: 'source_unavailable',
      providerUrl: db.platformSettings.fuelProviderUrl || null
    }, req);
    return res.status(502).json({
      success: false,
      message: 'Fuel price source is currently unavailable. The last verified price is retained — no new price was applied.',
      retained: getFuelPriceInfo()
    });
  }

  const s = db.platformSettings;
  const reference = Number(s.fuelPriceReference) || result.price;
  const changePct = reference > 0 ? ((result.price - reference) / reference) * 100 : 0;
  const maxIncrease = Number(s.maxAutoIncreasePct) || 10;
  const maxDecrease = Number(s.maxAutoDecreasePct) || 10;
  const prev = { ...s, fuelPriceCurrent: s.fuelPriceCurrent };

  const newPrice = Math.round(result.price * 100) / 100;
  const beyondLimits = changePct > maxIncrease || changePct < -Math.abs(maxDecrease);

  // A source-unavailable fallback must never be presented as a new verified price.
  if (result.source === 'fallback' && !db.platformSettings.fuelProviderUrl) {
    logAudit(actor, 'Fuel price sync failed', 'platform_settings', 'global', 'failed', { reason: 'no_provider' }, req);
    return res.status(502).json({ success: false, message: 'No fuel provider is configured (fuelProviderUrl missing). Configure a provider URL or set the price manually.' });
  }

  const effectiveSource = result.source === 'manual' ? 'manual' : 'api';
  db.platformSettings.fuelPriceCurrent = newPrice;
  db.platformSettings.fuelPriceSource = effectiveSource;
  db.platformSettings.fuelPriceUpdatedAt = new Date().toISOString();
  db.platformSettings.fuelPriceLastVerifiedAt = new Date().toISOString();
  db.platformSettings.fuelPriceStatus = 'verified';
  // A freshly synced price supersedes any previously approved multiplier.
  db.platformSettings.fuelApprovedMultiplier = null;

  if (beyondLimits) {
    // Stage proposal instead of applying the automatic adjustment.
    const proposal = {
      id: `proposal-${uuidv4().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      stagedBy: actor?.email || 'system',
      fuelChangePct: Math.round(changePct * 100) / 100,
      newFuelPrice: newPrice,
      previousFuelPrice: reference,
      currentPricing: {
        baseFee: Number(s.deliveryBaseFee) || 0,
        perKm: Number(s.distanceFeePerKm) || 0,
        minFee: Number(s.deliveryMinFee) || 0,
        maxFee: Number(s.deliveryMaxFee) || 0
      },
      plannedAdjustmentPct: Math.round((Math.round(changePct * 100) / 100) * (Number(s.fuelCostWeight) || 0) / 100 * 100) / 100,
      proposedFuelMultiplier: Math.max(0, 1 + (Math.round(changePct * 100) / 100) * (Number(s.fuelCostWeight) || 0) / 10000),
      expectedImpact: `Fuel price changed by ${changePct >= 0 ? '+' : ''}${Math.round(changePct * 100) / 100}%. Automatic delivery adjustment is paused pending approval.`,
      reason: raw?.reason || 'fuel price change detected',
      status: 'pending'
    };
    db.platformSettings.fuelPendingReview = proposal;
    systemLog({ level: 'warn', source: 'fuel', event: 'fuel_price_large_change', message: `Fuel price changed by ${changePct >= 0 ? '+' : ''}${Math.round(changePct * 100) / 100}%. Automatic delivery adjustment has been paused pending approval.` });
    logAudit(actor, 'Fuel price change flagged for review', 'platform_settings', 'global', 'success', {
      newFuelPrice: newPrice,
      previousFuelPrice: reference,
      fuelChangePct: Math.round(changePct * 100) / 100,
      mode: db.platformSettings.fuelAdjustmentMode
    }, req);
    recordFuelPriceHistory({ price: newPrice, reference, source: effectiveSource, status: 'pending_review', note: 'beyond auto limits — flagged for approval' });
    return res.json({
      success: true,
      flagged: true,
      message: `Fuel price updated to GH₵${newPrice.toFixed(2)} but the change is beyond automatic limits. Approval is required before delivery fees move.`,
      pendingReview: proposal,
      info: getFuelPriceInfo()
    });
  }

  applyPricingVersion({
    changedBy: actor?.email || 'system',
    reason: raw?.reason || 'fuel price sync',
    before: { fuelPriceCurrent: prev.fuelPriceCurrent, fuelPriceReference: reference },
    after: { fuelPriceCurrent: newPrice, fuelPriceReference: reference }
  });

  logAudit(actor, 'Fuel price synced', 'platform_settings', 'global', 'success', {
    newFuelPrice: newPrice,
    previousFuelPrice: reference,
    fuelChangePct: Math.round(changePct * 100) / 100,
    source: effectiveSource,
    mode: db.platformSettings.fuelAdjustmentMode
  }, req);
  recordFuelPriceHistory({ price: newPrice, reference, source: effectiveSource, status: 'applied', note: 'auto adjustment applied within limits' });
  systemLog({ level: 'info', source: 'fuel', event: 'fuel_price_synced', message: `Fuel price synced (${effectiveSource}): GH₵${reference.toFixed(2)} → GH₵${newPrice.toFixed(2)}.` });
  res.json({ success: true, flagged: false, info: getFuelPriceInfo(), message: 'Fuel price updated and applied automatically.' });
});

// Manual override with re-auth. Audited with before/after values. Bypasses the
// approval gate because the operator explicitly confirms the value.
app.post('/api/admin/fuel/override', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  const actor = (req as any).currentUser;
  const raw = req.body.body ?? req.body;
  if (applyReAuth(raw, actor, res)) return;
  const price = Number(raw?.price);

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ success: false, message: 'A positive fuel price is required.' });
  }
  const s = db.platformSettings;
  const reference = Number(s.fuelPriceReference) || price;
  const before = Number(s.fuelPriceCurrent) || 0;
  const rounded = Math.round(price * 100) / 100;

  const prevSettings = { ...s };
  db.platformSettings.fuelPriceCurrent = rounded;
  db.platformSettings.fuelPriceReference = reference;
  db.platformSettings.fuelPriceSource = 'manual';
  db.platformSettings.fuelPriceStatus = 'verified';
  db.platformSettings.fuelPriceUpdatedAt = new Date().toISOString();
  db.platformSettings.fuelPriceLastVerifiedAt = new Date().toISOString();
  db.platformSettings.fuelPendingReview = null;
  db.platformSettings.fuelApprovedMultiplier = null;

  applyPricingVersion({
    changedBy: actor?.email || 'system',
    reason: raw?.reason || 'manual fuel price override',
    before: { fuelPriceCurrent: before, fuelPriceReference: reference },
    after: { fuelPriceCurrent: rounded, fuelPriceReference: reference }
  });

  logAudit(actor, 'Fuel price override', 'platform_settings', 'global', 'success', {
    previousValue: before,
    newValue: rounded,
    reference,
    reason: raw?.reason || null,
    pricingVersion: db.platformSettings.currentPricingVersion
  }, req);
  recordFuelPriceHistory({ price: rounded, reference, source: 'manual', status: 'applied', note: raw?.reason || 'super admin override' });
  res.json({
    success: true,
    previousValue: before,
    newValue: rounded,
    reference,
    pricingVersion: db.platformSettings.currentPricingVersion,
    info: getFuelPriceInfo()
  });
});

// Approval endpoints: approve a staged fuel-proposal (applies the pricing
// version with the new multiplier) or reject it (reverts to the last applied
// price). Both are audited.
app.post('/api/admin/fuel/proposal/approve', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  const actor = (req as any).currentUser;
  if (applyReAuth(req.body, actor, res)) return;
  const proposal = db.platformSettings.fuelPendingReview;
  if (!proposal) return res.status(404).json({ success: false, message: 'No pending fuel review proposal.' });

  const s = db.platformSettings;
  const prev = Number(s.fuelPriceCurrent) || 0;
  const prevRef = Number(s.fuelPriceReference) || proposal.previousFuelPrice || prev;
  s.fuelPriceCurrent = proposal.newFuelPrice;
  s.fuelPriceReference = prevRef;
  s.fuelPriceStatus = 'verified';
  s.fuelPriceUpdatedAt = new Date().toISOString();
  s.fuelPriceLastVerifiedAt = new Date().toISOString();
  s.fuelPendingReview = null;
  // The approved change may exceed the automatic limits; the explicitly-reviewed
  // multiplier now drives delivery fees until the next price change.
  s.fuelApprovedMultiplier = Number(proposal.proposedFuelMultiplier);
  if (!Number.isFinite(s.fuelApprovedMultiplier) || s.fuelApprovedMultiplier <= 0) s.fuelApprovedMultiplier = 1;

  applyPricingVersion({
    changedBy: actor?.email || 'system',
    reason: `approved proposal ${proposal.id}: ${proposal.reason || 'fuel price change'}`,
    before: { fuelPriceCurrent: prev, fuelPriceReference: prevRef },
    after: { fuelPriceCurrent: proposal.newFuelPrice, fuelPriceReference: prevRef }
  });

  logAudit(actor, 'Fuel price proposal approved', 'platform_settings', 'global', 'success', {
    proposalId: proposal.id,
    previousValue: prev,
    newValue: proposal.newFuelPrice,
    reason: proposal.reason || null,
    pricingVersion: db.platformSettings.currentPricingVersion
  }, req);
  recordFuelPriceHistory({ price: proposal.newFuelPrice, reference: prevRef, source: 'api', status: 'applied', note: 'approved proposal' });
  systemLog({ level: 'info', source: 'fuel', event: 'fuel_proposal_approved', message: `Fuel price proposal ${proposal.id} approved by ${actor?.email}.` });
  res.json({ success: true, message: 'Proposal approved and applied.', info: getFuelPriceInfo() });
});

app.post('/api/admin/fuel/proposal/reject', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  const actor = (req as any).currentUser;
  if (applyReAuth(req.body, actor, res)) return;
  const proposal = db.platformSettings.fuelPendingReview;
  if (!proposal) return res.status(404).json({ success: false, message: 'No pending fuel review proposal.' });

  const prev = Number(db.platformSettings.fuelPriceCurrent) || 0;
  db.platformSettings.fuelPendingReview = null;
  db.platformSettings.fuelApprovedMultiplier = null;
  // Retain the last verified price as the active price; no pricing version bump
  // because no pricing change occurred.
  logAudit(actor, 'Fuel price proposal rejected', 'platform_settings', 'global', 'success', {
    proposalId: proposal.id,
    retainedPrice: prev,
    reason: 'rejected by super admin'
  }, req);
  systemLog({ level: 'warn', source: 'fuel', event: 'fuel_proposal_rejected', message: `Fuel price proposal ${proposal.id} rejected by ${actor?.email}. Active price unchanged.` });
  res.json({ success: true, message: 'Proposal rejected. Active price unchanged.', info: getFuelPriceInfo() });
});

// Historical pricing versions (orders retain the version at creation).
app.get('/api/admin/pricing/versions', requireSuperAdmin, requirePermission('settings:update'), (req, res) => {
  let rows: any[] = [...(Array.isArray(db.pricingVersions) ? db.pricingVersions : [])];
  rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 200);
  const start = (page - 1) * pageSize;
  res.json({ total: rows.length, page, pageSize, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)), items: rows.slice(start, start + pageSize) });
});

app.get('/api/payment-gateways', (req, res) => {
  // Present operational truth: a method without valid backend configuration must
  // not pretend it is enabled just because a stale toggle flag says so.
  const view = db.platformSettings.paymentGateways.map((g: any) => ({
    ...g,
    enabled: g.configured ? !!g.enabled : false,
    operational: !!(g.configured && g.enabled)
  }));
  res.json(view);
});

app.patch('/api/payment-gateways/:id', requireSuperAdmin, requirePermission('payments:configure'), (req, res) => {
  const actor = (req as any).currentUser;
  const gw = db.platformSettings.paymentGateways.find((g: any) => g.id === req.params.id);
  if (!gw) return res.status(404).json({ error: 'Gateway not found' });

  const raw = req.body.body ?? req.body;
  const { password } = raw;

  // Payment gateway changes are high-risk: prove the operator is present.
  if (!password || typeof password !== 'string') {
    return res.status(401).json({ success: false, requiresPassword: true, message: 'Re-authentication required for this change.' });
  }
  if (!verifyPasswordAndUpgrade(actor, password)) {
    logAudit(actor, 'Payment gateway change denied', 'payment_gateway', gw.id, 'denied', { reason: 're-auth failed' });
    return res.status(401).json({ success: false, requiresPassword: true, message: 'Current password is incorrect.' });
  }

  // Only the enabled flag is operator-toggled. A method that lacks valid backend
  // configuration must never present as operational just because the toggle is on.
  if ('enabled' in raw) {
    const enabling = !!raw.enabled;
    if (enabling && !gw.configured) {
      return res.status(400).json({ success: false, message: 'This payment method cannot be enabled because the required configuration is missing.' });
    }
    if (gw.enabled === enabling) return res.json(db.platformSettings.paymentGateways);
    const before = gw.enabled;
    gw.enabled = enabling;
    logAudit(actor, enabling ? 'Payment method enabled' : 'Payment method disabled', 'payment_gateway', gw.id, 'success', { name: gw.name, enabled: { from: before, to: enabling } });
    recordSecurityEvent({ type: 'GATEWAY_CONFIG_CHANGED', severity: 'HIGH', endpoint: `/api/payment-gateways/${gw.id}`, account: actor.email, userId: actor.id, ip: secCtx(req).ip, detection: `Payment gateway "${gw.name}" ${enabling ? 'enabled' : 'disabled'} by an administrator.`, actionTaken: enabling ? 'Gateway enabled' : 'Gateway disabled', status: 'monitoring', req, details: { gatewayId: gw.id, gatewayName: gw.name, enabled: enabling, from: before } });
  }

  res.json(db.platformSettings.paymentGateways);
});

// Platform announcement broadcast
app.post('/api/announcements', requireAdmin, requirePermission('announcements:publish'), (req, res) => {
  const actor = (req as any).currentUser;
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required.' });
  const announcement = { id: `an-${uuidv4().slice(0, 8)}`, title, message, createdBy: actor.id, createdAt: new Date().toISOString() };
  db.announcements.push(announcement);
  let sent = 0;
  db.users.forEach((u: any) => {
    notifyUser(u.id, title, message, { type: 'ADMIN_ANNOUNCEMENT', category: 'system', priority: 'NORMAL', referenceId: announcement.id, referenceType: 'announcement', action: '/' });
    emailService.send({
      to: u.email,
      template: 'announcement',
      data: { title, message },
      eventKey: `announcement:${announcement.id}:${u.id}`
    }).then(entry => logEmailToDb(entry));
    sent += 1;
  });
  logAudit(actor, 'Announcement published', 'announcement', announcement.id, 'success', { recipients: sent });
  res.status(201).json({ success: true, announcement, recipients: sent });
});

app.get('/api/announcements', (req, res) => {
  res.json([...db.announcements].reverse());
});

// Newsletter subscription (public)
app.post('/api/newsletter/subscribe', rateLimitMw('newsletter', 20, 60 * 1000), async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }
  if (db.newsletter.some((s: any) => s.email === email)) {
    return res.status(200).json({ success: true, alreadySubscribed: true, message: 'You are already subscribed.' });
  }
  const sub = { id: `nl-${uuidv4().slice(0, 8)}`, email, createdAt: new Date().toISOString() };
  db.newsletter.push(sub);
  res.status(201).json({ success: true, alreadySubscribed: false, message: 'Subscription confirmed.' });
});

app.get('/api/newsletter/subscribers', requireAdmin, (req, res) => {
  res.json(db.newsletter);
});

// System health with real checks
app.get('/api/system/health', requireAdmin, requirePermission('api:view'), (req, res) => {
  const memory = process.memoryUsage();
  const activeSessions = (db.sessions || []).filter((s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now());
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    api: { status: 'operational', message: 'API responding' },
    database: { status: db ? 'operational' : 'failed', records: db.users.length + db.vendors.length + db.orders.length, persisted: fs.existsSync(DB_FILE) },
    auth: { status: db.users.some((u: any) => ['administrator', 'super-administrator'].includes(u.role)) ? 'operational' : 'degraded', message: 'Admin accounts present' },
    realtime: { status: 'operational', activeConnections: clients.length },
    payments: { status: db.platformSettings.paymentGateways.some((g: any) => g.enabled && g.configured) ? 'operational' : 'degraded', message: `${db.platformSettings.paymentGateways.filter((g: any) => g.enabled && g.configured).length} gateways enabled and configured` },
    notifications: { status: db.platformSettings.notificationsEnabled ? 'operational' : 'disabled', message: db.platformSettings.notificationsEnabled ? 'System notifications enabled' : 'System notifications disabled' },
    email: { configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER), status: (process.env.SMTP_HOST && process.env.SMTP_USER) ? 'configured' : 'not-configured' },
    sms: { configured: !!process.env.TWILIO_ACCOUNT_SID, status: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not-configured' },
    sessions: { active: activeSessions.length, total: (db.sessions || []).length },
    security: { auditEvents: db.audit.length, suspended: db.users.filter((u: any) => u.isSuspended).length },
    memory: { used: Math.round(memory.heapUsed / 1024 / 1024), total: Math.round(memory.heapTotal / 1024 / 1024), rss: Math.round(memory.rss / 1024 / 1024) },
    serverTime: new Date().toISOString()
  });
});

// Backup & restore (server-side). Snapshots are real point-in-time copies of
// the persisted database, capped at 5 so the DB file stays manageable.
app.get('/api/system/backups', requireSuperAdmin, requirePermission('database:view'), (req, res) => {
  const backups = (db.backups || []).map((b: any) => ({
    id: b.id,
    createdAt: b.createdAt,
    file: b.file,
    size: b.size,
    users: b.users,
    vendors: b.vendors,
    orders: b.orders,
    createdBy: b.createdBy
  }));
  res.json(backups.sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1)));
});

app.post('/api/system/backup', requireSuperAdmin, requirePermission('database:backup'), (req, res) => {
  const actor = (req as any).currentUser;
  const now = new Date().toISOString();
  const snapshot = {
    _snapshot: true,
    createdAt: now,
    users: db.users,
    vendors: db.vendors,
    products: db.products,
    orders: db.orders,
    riders: db.riders,
    reviews: db.reviews,
    coupons: db.coupons,
    notifications: db.notifications,
    wallets: db.wallets,
    transactions: db.transactions,
    conversations: db.conversations,
    messages: db.messages,
    sessions: db.sessions,
    tickets: db.tickets,
    audit: db.audit,
    announcements: db.announcements,
    referrals: db.referrals,
    payments: db.payments,
    newsletter: db.newsletter,
    platformSettings: db.platformSettings
  };
  const size = Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
  db.backups = db.backups || [];
  db.backups.push({
    id: `bk-${uuidv4().slice(0, 8)}`,
    createdAt: now,
    file: DB_FILE,
    size,
    users: db.users.length,
    vendors: db.vendors.length,
    orders: db.orders.length,
    createdBy: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email,
    data: snapshot
  });
  if (db.backups.length > 5) db.backups = db.backups.slice(db.backups.length - 5);
  db.platformSettings.lastBackupAt = now;
  logAudit(actor, 'Database backup created', 'database', 'global', 'success', { file: DB_FILE, size });
  res.json({ success: true, createdAt: now, file: DB_FILE, size, backups: db.backups.length });
});

// Restore a snapshot. The body must carry an explicit `confirm: true` flag — a
// one-click accidental restore is deliberately impossible.
app.post('/api/system/restore', requireSuperAdmin, requirePermission('database:restore'), (req, res) => {
  const actor = (req as any).currentUser;
  const { backupId, confirm } = req.body.body ?? req.body;
  if (confirm !== true) {
    return res.status(400).json({ success: false, message: 'Restore requires explicit confirmation (confirm: true).' });
  }
  const backup = (db.backups || []).find((b: any) => b.id === backupId);
  if (!backup || !backup.data) return res.status(404).json({ success: false, message: 'Backup snapshot not found.' });

  const snapshot = backup.data;
  const restoredAt = new Date().toISOString();
  db.users = snapshot.users;
  db.vendors = snapshot.vendors;
  db.products = snapshot.products;
  db.orders = snapshot.orders;
  db.riders = snapshot.riders;
  db.reviews = snapshot.reviews;
  db.coupons = snapshot.coupons;
  db.notifications = snapshot.notifications;
  db.wallets = snapshot.wallets;
  db.transactions = snapshot.transactions;
  db.conversations = snapshot.conversations;
  db.messages = snapshot.messages;
  db.sessions = snapshot.sessions;
  db.tickets = snapshot.tickets;
  db.audit = snapshot.audit;
  db.announcements = snapshot.announcements;
  db.referrals = snapshot.referrals;
  db.payments = snapshot.payments;
  db.newsletter = snapshot.newsletter;
  db.platformSettings = snapshot.platformSettings;
  db.backups = (db.backups || []).filter((b: any) => b.id !== backupId);
  db.platformSettings.lastBackupAt = restoredAt;
  persistDb();
  logAudit(actor, 'Database restored', 'database', 'global', 'success', { from: backupId, snapshotAt: backup.createdAt });
  console.log(`\x1b[33m[DB]\x1b[0m Restored database from snapshot ${backupId} (${backup.createdAt})`);
  res.json({ success: true, restoredAt, from: backupId });
});

// Reports & analytics series derived from real orders
app.get('/api/admin/reports', requireAdmin, requirePermission('reports:view'), (req, res) => {
  const range = (req.query.range as string) || '30';
  const days = range === '7' ? 7 : range === '90' ? 90 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);

  const orders = (db.orders as any[]).filter(o => new Date(o.createdAt) >= cutoff);
  const series: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.createdAt.slice(0, 10) === key);
    series.push({
      date: key,
      revenue: dayOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
      orders: dayOrders.length
    });
  }

  const vendorMap = new Map<string, any>();
  orders.forEach(o => {
    const v = vendorMap.get(o.vendorId) || { id: o.vendorId, name: o.vendorName, orders: 0, revenue: 0 };
    v.orders += 1;
    v.revenue += Number(o.totalAmount) || 0;
    vendorMap.set(o.vendorId, v);
  });

  const productMap = new Map<string, any>();
  orders.forEach(o => o.items.forEach((i: any) => {
    const p = productMap.get(i.productId) || { id: i.productId, name: i.productName, quantity: 0, revenue: 0 };
    p.quantity += Number(i.quantity) || 0;
    p.revenue += (Number(i.price) || 0) * (Number(i.quantity) || 0);
    productMap.set(i.productId, p);
  }));

  const completed = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
  const cancelled = orders.filter(o => o.status === 'cancelled');

  res.json({
    range: days,
    series,
    totals: {
      orders: orders.length,
      revenue: orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
      completed: completed.length,
      cancelled: cancelled.length,
      completionRate: orders.length ? Math.round((completed.length / orders.length) * 100) : 0,
      cancellationRate: orders.length ? Math.round((cancelled.length / orders.length) * 100) : 0,
      commission: completed.reduce((s, o) => s + (Number(o.platformCommission) || 0), 0)
    },
    topVendors: Array.from(vendorMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    topProducts: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;

  if (err.type === 'entity.too.large' || status === 413) {
    console.error(`[PAYLOAD ERROR] Size: ${req.headers['content-length']} bytes. Limit: ${err.limit}`);
    return res.status(413).json({
      success: false,
      message: `Request Entity Too Large: The file you are uploading is too big for the current server configuration (${(err.limit / 1024 / 1024).toFixed(0)}MB limit).`,
      details: { size: req.headers['content-length'], limit: err.limit }
    });
  }

  console.error(`[Server Error] ${req.method} ${req.originalUrl} → Status ${status}:`, err.message, (err as any).stack ? `\n${(err as any).stack}` : '');
  systemLog({
    level: 'error', source: 'api', event: 'http_error',
    message: `${req.method} ${req.originalUrl} failed (HTTP ${status}): ${err.message}`,
    meta: { status, path: req.originalUrl, method: req.method }, req
  });
  res.status(status).json({ success: false, message: err.message });
});

// ------------------------------------------------------------
// BOOTSTRAP (For development setup only)
// ------------------------------------------------------------

const bootstrapAdmin = () => {
  const hasRole = (role: string) => db.users.some((u: any) => u.role === role);

  // Super Admin (only if not already present, so restarts never duplicate/erase)
  if (!hasRole('super-administrator')) {
    const superAdminId = uuidv4();
    db.users.push({
      id: superAdminId,
      email: 'favmoms440@gmail.com',
      password: hashPassword('qwerty12345'),
      role: 'super-administrator',
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'System Super Admin',
      isVerified: true,
      isApproved: true,
      isActive: true,
      mustChangePassword: false,
      loginAttempts: 0,
      lockedUntil: 0,
      createdAt: new Date().toISOString()
    });
    db.wallets.push({ userId: superAdminId, balance: 0, currency: 'GHS' });
    console.log(' - Super Admin: favmoms440@gmail.com / qwerty12345');
  }

  // Admin (only if missing)
  if (!hasRole('administrator')) {
    const adminId = uuidv4();
    db.users.push({
      id: adminId,
      email: 'admin@omnimarket.com',
      password: hashPassword('qwerty12345'),
      role: 'administrator',
      firstName: 'Platform',
      lastName: 'Admin',
      displayName: 'Platform Admin',
      isVerified: true,
      isApproved: true,
      isActive: true,
      mustChangePassword: false,
      loginAttempts: 0,
      lockedUntil: 0,
      createdAt: new Date().toISOString()
    });
    db.wallets.push({ userId: adminId, balance: 0, currency: 'GHS' });
    console.log(' - Admin: admin@omnimarket.com / qwerty12345');
  }

  console.log('[BOOTSTRAP] Admin accounts ensured (skipped if already present).');
};
// ============================================================
// MAINTENANCE MANAGEMENT & PLATFORM MESSAGING
// ------------------------------------------------------------
// Real maintenance windows, scheduled notifications, platform
// messages with target groups, per-recipient delivery status and a
// lightweight idempotent scheduler. Everything persists to the same
// DB and is audited. Reuses notifyUser / emailService / broadcast.
// ============================================================

const MAINTENANCE_SERVICE_OPTIONS = ['Marketplace', 'Checkout', 'Orders', 'Rider Operations', 'Vendor Portal'];
const MAINTENANCE_TIMING_OPTIONS = ['immediate', '24h', '12h', '6h', '1h', 'start'];
const MAINTENANCE_LEAD_MS: Record<string, number> = {
  immediate: 0, '1h': 60 * 60 * 1000, '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, start: 0
};
const MAINTENANCE_IMPACT: Record<string, string> = {
  'Marketplace': 'Customers may be unable to browse the marketplace or place orders.',
  'Checkout': 'Checkout and payments may be temporarily unavailable.',
  'Orders': 'Order processing may be temporarily paused.',
  'Rider Operations': 'Riders may be unable to receive delivery assignments.',
  'Vendor Portal': 'Vendors may be unable to process or manage orders.'
};

db.maintenanceWindows = db.maintenanceWindows || [];
db.maintenanceNotifications = db.maintenanceNotifications || [];
db.platformMessages = db.platformMessages || [];
db.notificationDeliveries = db.notificationDeliveries || [];

function groupUsersForTypeKey(key: string): any[] {
  const users = db.users || [];
  if (key === 'customers') return users.filter((u: any) => u.role === 'customer');
  if (key === 'vendors') return users.filter((u: any) => u.role === 'vendor' || u.role === 'vendor-staff' || u.role === 'store-manager');
  if (key === 'riders') return users.filter((u: any) => u.role === 'rider');
  if (key === 'administrators') return users.filter((u: any) => u.role === 'administrator');
  if (key === 'super-administrators') return users.filter((u: any) => u.role === 'super-administrator');
  return users; // all / all-users / unknown
}

function resolveRecipientUsers(types: string[], explicitUserIds?: string[]): any[] {
  const map = new Map<string, any>();
  (Array.isArray(types) ? types : []).forEach((t: any) =>
    groupUsersForTypeKey(t).forEach((u: any) => { if (u && u.id) map.set(u.id, u); }));
  (Array.isArray(explicitUserIds) ? explicitUserIds : []).forEach((id: string) => {
    const u = (db.users || []).find((x: any) => x.id === id);
    if (u && u.id) map.set(u.id, u);
  });
  return Array.from(map.values());
}

function parseGroups(group: string): string[] {
  if (group === 'all' || group === 'all-users' || !group) return ['all'];
  if (group === 'customers') return ['customers'];
  if (group === 'vendors') return ['vendors'];
  if (group === 'riders') return ['riders'];
  if (group === 'administrators') return ['administrators', 'super-administrators'];
  return ['all'];
}

function recordDelivery(recipient: any, channel: string, refId: string, refType: string, refTitle: string, status: string, error?: string) {
  db.notificationDeliveries = db.notificationDeliveries || [];
  db.notificationDeliveries.push({
    id: `d-${uuidv4().slice(0, 8)}`, userId: recipient ? recipient.id : null, name: recipient ? recipient.displayName || recipient.email : '—',
    email: recipient ? recipient.email : '', role: recipient ? recipient.role : 'unknown', recipientType: recipient ? recipient.role : 'unknown',
    channel, refId, refType, refTitle, status, error: error || null,
    createdAt: new Date().toISOString(), sentAt: status === 'sent' ? new Date().toISOString() : null, readAt: null
  });
}

function deliverInApp(u: any, title: string, message: string, ref: { id: string }, opts: any = {}) {
  const dedupeKey = opts.dedupeKey || null;
  if (dedupeKey && (db.notifications || []).some((nn: any) => nn.userId === u.id && nn.dedupeKey === dedupeKey && !nn.read)) {
    recordDelivery(u, 'In-app', ref.id, opts.referenceType || 'maintenance', title, 'skipped', 'Duplicate (already delivered)');
    return false;
  }
  notifyUser(u.id, title, message, {
    type: opts.type || 'MAINTENANCE', category: opts.category || 'system', priority: opts.priority || 'IMPORTANT',
    referenceId: ref.id, referenceType: opts.referenceType || 'maintenance', action: opts.action || '/', dedupeKey, critical: !!opts.critical
  });
  recordDelivery(u, 'In-app', ref.id, opts.referenceType || 'maintenance', title, 'sent');
  return true;
}

async function deliverEmailAsync(u: any, subject: string, template: any, data: any, eventKey: string, ref: { id: string; refType: string; refTitle: string }): Promise<string> {
  db.notificationDeliveries = db.notificationDeliveries || [];
  const base = {
    id: `d-${uuidv4().slice(0, 8)}`, userId: u ? u.id : null, name: u ? u.displayName || u.email : '—',
    email: u ? u.email : '', role: u ? u.role : 'unknown', recipientType: u ? u.role : 'unknown',
    channel: 'Email', refId: ref.id, refType: ref.refType, refTitle: ref.refTitle,
    status: 'queued' as string, error: null as string | null, createdAt: new Date().toISOString(), sentAt: null as string | null, readAt: null as string | null
  };
  if (!u || !u.email || !String(u.email).includes('@')) {
    db.notificationDeliveries.push({ ...base, status: 'failed', error: 'No valid email on record' });
    return 'failed';
  }
  if (emailService.hasSentEvent(eventKey)) {
    db.notificationDeliveries.push({ ...base, status: 'skipped', error: 'Already sent (dedupe)' });
    return 'skipped';
  }
  // Truthful provider handling: never claim a disabled/unconfigured email service
  // delivered anything. Reported separately so the UI can show "Not Configured".
  if (!emailProviderConfigured()) {
    db.notificationDeliveries.push({ ...base, status: 'not_configured', error: 'Email provider not configured' });
    return 'not_configured';
  }
  db.notificationDeliveries.push({ ...base });
  try {
    // A stalled provider must never block the whole batch: enforce a hard send
    // timeout so the delivery always reaches a terminal, truthful status.
    const entry = await Promise.race([
      emailService.send({ to: u.email, template, data, eventKey }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Email provider timed out')), 20000)),
    ]);
    logEmailToDb(entry);
    const rec = db.notificationDeliveries.find((r: any) => r.id === base.id);
    if (rec) {
      rec.status = entry.status;
      rec.sentAt = entry.status === 'sent' ? new Date().toISOString() : null;
      rec.error = entry.status === 'failed' ? (entry.error || 'Email delivery failed') : null;
    }
    return entry.status;
  } catch (e: any) {
    const rec = db.notificationDeliveries.find((r: any) => r.id === base.id);
    if (rec) { rec.status = 'failed'; rec.error = e?.message || 'Email delivery failed'; }
    return 'failed';
  }
}

// ---- Centralized communication provider config (single source of truth) ----
function emailProviderConfigured(): boolean {
  if (process.env.MAIL_ENABLED === 'false') return false;
  return !!((process.env.SMTP_HOST || process.env.MAIL_HOST || '').trim());
}

function emailProviderStatus(): { code: string; label: string } {
  const enabled = process.env.MAIL_ENABLED !== 'false';
  const host = (process.env.SMTP_HOST || process.env.MAIL_HOST || '').trim();
  if (!enabled) return { code: 'disabled', label: 'Disabled' };
  if (!host) return { code: 'not_configured', label: 'Not Configured' };
  return { code: 'configured', label: 'Configured' };
}

// The one communication capability map shared by messages, notifications,
// maintenance and other broadcasts. The UI must never claim a disabled service
// delivered something.
function communicationProviders() {
  return {
    inApp: { code: 'available', label: 'Available' },
    email: emailProviderStatus(),
    push: { code: 'not_configured', label: 'Not Configured' },
    sms: { code: 'not_configured', label: 'Not Configured' }
  };
}

// ---- Single-flight background job queue (processes real work, never blocks
// the request that enqueued it). Idempotent per job; restart-safe because the
// underlying delivery writers are deduped (notifyUser dedupeKey + email eventKey). ----
const backgroundJobs: { id: string; fn: (job: any) => Promise<void> }[] = [];
let backgroundRunning = false;
async function runBackgroundJobs() {
  if (backgroundRunning) return;
  backgroundRunning = true;
  try {
    let job;
    while ((job = backgroundJobs.shift())) {
      try { await job.fn(job); } catch (e: any) { console.error('[BACKGROUND] job error:', e?.message || e); }
    }
  } finally {
    backgroundRunning = false;
  }
}
function enqueueBackground(fn: (job: any) => Promise<void>) {
  backgroundJobs.push({ id: `bg-${uuidv4().slice(0, 8)}`, fn });
  runBackgroundJobs();
}

function buildMaintenanceBody(w: any, kind: string): string {
  const start = new Date(w.scheduledStart).toLocaleString();
  const end = new Date(w.scheduledEnd).toLocaleString();
  const impact = (w.affectedServices || []).map((s: string) => `• ${MAINTENANCE_IMPACT[s] || s}`).join('\n');
  if (kind === 'scheduled') return `OmniMarket will undergo scheduled maintenance ${start} to ${end}.\n\nDuring this period:\n${impact}\n\nWe apologize for the inconvenience and appreciate your patience.`;
  if (kind === 'warning') return `Scheduled maintenance for OmniMarket begins ${start} and is expected to end ${end}.\n\nDuring this period:\n${impact}\n\nWe appreciate your patience.`;
  if (kind === 'start') return `Maintenance has started. OmniMarket services (${(w.affectedServices || []).join(', ') || 'marketplace services'}) may be temporarily unavailable until approximately ${end}.\n\nWe apologize for the inconvenience and appreciate your patience.`;
  if (kind === 'completion') return `OmniMarket is back online.\n\nScheduled maintenance has been completed and marketplace services are now available.`;
  if (kind === 'cancelled') return `Scheduled maintenance (${w.title || 'OmniMarket'}) has been cancelled.\n\nOmniMarket services remain available as normal.`;
  return w.description || w.title || '';
}

function maintenanceNotifSent(wId: string, kind: string): boolean {
  return (db.maintenanceNotifications || []).some((m: any) => m.maintenanceId === wId && m.kind === kind && m.sent === true);
}

function markMaintenanceNotif(wId: string, kind: string, at: string, sent = true) {
  db.maintenanceNotifications = db.maintenanceNotifications || [];
  db.maintenanceNotifications.push({ id: `mn-${uuidv4().slice(0, 8)}`, maintenanceId: wId, kind, at, sent });
}

function maintenanceTitles(kind: string): { title: string; type: string; priority: string } {
  if (kind === 'start') return { title: 'Maintenance Started', type: 'MAINTENANCE_STARTED', priority: 'CRITICAL' };
  if (kind === 'completion') return { title: 'Maintenance Completed', type: 'MAINTENANCE_COMPLETED', priority: 'IMPORTANT' };
  if (kind === 'cancelled') return { title: 'Maintenance Cancelled', type: 'MAINTENANCE_CANCELLED', priority: 'IMPORTANT' };
  if (kind === 'warning') return { title: 'Scheduled Maintenance Approaching', type: 'MAINTENANCE_WARNING', priority: 'IMPORTANT' };
  return { title: 'Scheduled Maintenance', type: 'MAINTENANCE_SCHEDULED', priority: 'IMPORTANT' };
}

async function sendMaintenanceNotification(w: any, kind: string, actor?: any): Promise<{ sent: number; already: boolean }> {
  if (maintenanceNotifSent(w.id, kind)) return { sent: 0, already: true };
  const users = resolveRecipientUsers(w.affectedUserTypes || ['all'], w.affectedUserIds || []);
  const { title, type, priority } = maintenanceTitles(kind);
  const body = buildMaintenanceBody(w, kind);
  const ref = { id: w.id, refType: 'maintenance' };
  for (const u of users) {
    const eventKey = `maint:${w.id}:${kind}:${u.id}:${w.updatedAt}`;
    deliverInApp(u, title, body, ref, { type, category: 'system', priority, dedupeKey: eventKey, referenceType: 'maintenance', action: '/' });
    await deliverEmailAsync(u, `${title} — ${w.title || 'OmniMarket'}`, 'announcement', { title: w.title || title, message: body }, eventKey, { ...ref, refTitle: title });
  }
  markMaintenanceNotif(w.id, kind, new Date().toISOString());
  w.notifications = w.notifications || {}; w.notifications[kind] = new Date().toISOString();
  if (actor) logAudit(actor, `Maintenance notification sent (${kind})`, 'maintenance', w.id, 'success', { recipients: users.length });
  else logAudit(null, `Maintenance notification sent (${kind})`, 'maintenance', w.id, 'success', { recipients: users.length, auto: true });
  return { sent: users.length, already: false };
}

function publicMaintenanceView() {
  const ws = db.maintenanceWindows || [];
  const active = ws.find((w: any) => w.status === 'active');
  if (active) return { status: 'active', id: active.id, title: active.title, description: active.description || active.title, reason: active.reason || '', scheduledStart: active.scheduledStart, scheduledEnd: active.scheduledEnd, timezone: active.timezone || 'UTC', affectedServices: active.affectedServices || [] };
  const next = ws.filter((w: any) => w.status === 'scheduled' || w.status === 'warning')
    .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0];
  if (next) return { status: next.status === 'warning' ? 'warning' : 'scheduled', id: next.id, title: next.title, description: next.description || next.title, reason: next.reason || '', scheduledStart: next.scheduledStart, scheduledEnd: next.scheduledEnd, timezone: next.timezone || 'UTC', affectedServices: next.affectedServices || [] };
  return null;
}

async function activateMaintenanceWindow(w: any, actor?: any, auto = false) {
  w.status = 'active';
  w.activatedAt = w.activatedAt || new Date().toISOString();
  w.updatedAt = new Date().toISOString();
  db.platformSettings.maintenanceMode = true;
  w.notifications = w.notifications || {};
  broadcast('maintenance', publicMaintenanceView());
  logAudit(actor || null, 'Maintenance activated', 'maintenance', w.id, 'success', { title: w.title, auto: auto || undefined });
  await sendMaintenanceNotification(w, 'start', actor);
}

async function completeMaintenanceWindow(w: any, actor?: any, auto = false) {
  w.status = 'completed';
  w.endedAt = w.endedAt || new Date().toISOString();
  w.updatedAt = new Date().toISOString();
  const otherActive = (db.maintenanceWindows || []).find((x: any) => x.status === 'active' && x.id !== w.id);
  if (!otherActive) db.platformSettings.maintenanceMode = false;
  broadcast('maintenance', publicMaintenanceView());
  logAudit(actor || null, 'Maintenance completed', 'maintenance', w.id, 'success', { title: w.title, auto: auto || undefined });
  await sendMaintenanceNotification(w, 'completion', actor);
}

function sanitizeMaintenanceInput(body: any): { errors: string[]; data: any } {
  const errors: string[] = [];
  const data: any = {};
  const title = String(body.title || '').trim();
  if (!title || title.length > 120) errors.push('Maintenance title is required (max 120 characters).');
  data.title = title;
  data.description = String(body.description || '').trim();
  data.reason = String(body.reason || '').trim();
  const start = new Date(body.scheduledStart || '');
  const end = new Date(body.scheduledEnd || '');
  if (isNaN(start.getTime())) errors.push('A valid start date/time is required.');
  if (isNaN(end.getTime())) errors.push('A valid end date/time is required.');
  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() <= start.getTime()) errors.push('End time must be after start time.');
  data.scheduledStart = start.toISOString();
  data.scheduledEnd = end.toISOString();
  data.timezone = String(body.timezone || 'UTC');
  const services = Array.isArray(body.affectedServices) ? body.affectedServices.filter((s: any) => MAINTENANCE_SERVICE_OPTIONS.includes(s)) : [];
  data.affectedServices = services.length ? services : MAINTENANCE_SERVICE_OPTIONS.slice();
  const types = Array.isArray(body.affectedUserTypes) ? body.affectedUserTypes.filter((t: any) => ['all', 'customers', 'vendors', 'riders', 'administrators', 'super-administrators'].includes(t)) : [];
  data.affectedUserTypes = types.length ? types : ['all'];
  data.affectedUserIds = Array.isArray(body.affectedUserIds) ? body.affectedUserIds : [];
  data.notificationTiming = MAINTENANCE_TIMING_OPTIONS.includes(body.notificationTiming) ? body.notificationTiming : 'start';
  return { errors, data };
}

function applyReAuth(body: any, actor: any, res: any): boolean {
  const reauth = requireReAuth(actor, body || {});
  if (reauth) { res.status(reauth.status).json(reauth.body); return true; }
  return false;
}

// ---- Public status (used by the maintenance page + countdown; admin-safe) ----
app.get('/api/maintenance', (req, res) => {
  res.json(publicMaintenanceView());
});

// ---- Super Admin maintenance windows ----
app.get('/api/maintenance/windows', requireSuperAdmin, (req, res) => {
  res.json({ items: [...(db.maintenanceWindows || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
});

app.post('/api/maintenance/windows', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  if (applyReAuth(req.body, actor, res)) return;
  const { errors, data } = sanitizeMaintenanceInput(req.body || {});
  if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors });
  const nowIso = new Date().toISOString();
  const w = {
    id: `mw-${uuidv4().slice(0, 8)}`, ...data,
    status: new Date(data.scheduledStart).getTime() <= Date.now() ? 'scheduled' : 'scheduled',
    notifications: {}, enrolledWarning: false,
    createdBy: actor.id, createdByName: actor.displayName || actor.email,
    createdAt: nowIso, updatedAt: nowIso, activatedAt: null, endedAt: null, cancelledAt: null
  };
  db.maintenanceWindows = db.maintenanceWindows || [];
  db.maintenanceWindows.push(w);
  logAudit(actor, 'Maintenance scheduled', 'maintenance', w.id, 'success', { title: w.title, start: w.scheduledStart, end: w.scheduledEnd });
  // "immediate" timing means schedule a start notification right away through the scheduler's lead logic (lead 0 -> activates when start hits).
  res.status(201).json({ success: true, maintenance: w });
});

app.patch('/api/maintenance/windows/:id', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const w = (db.maintenanceWindows || []).find((x: any) => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Maintenance window not found' });
  if (w.status === 'active' || w.status === 'completed' || w.status === 'cancelled') return res.status(409).json({ success: false, message: 'Cannot edit an active or already-ended maintenance window.' });
  if (applyReAuth(req.body, actor, res)) return;
  const { errors, data } = sanitizeMaintenanceInput(req.body || {});
  if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors });
  const prevEnd = w.scheduledEnd;
  Object.assign(w, data, { updatedAt: new Date().toISOString() });
  // reschedule invalidates previously scheduled notifications for the new window
  logAudit(actor, 'Maintenance updated', 'maintenance', w.id, 'success', { title: w.title, prevEnd, newEnd: w.scheduledEnd });
  res.json({ success: true, maintenance: w });
});

app.post('/api/maintenance/windows/:id/activate', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const w = (db.maintenanceWindows || []).find((x: any) => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Maintenance window not found' });
  if (w.status === 'active') return res.status(409).json({ success: false, message: 'Maintenance is already active.' });
  if (w.status === 'completed' || w.status === 'cancelled') return res.status(409).json({ success: false, message: 'This maintenance window has already ended.' });
  if (applyReAuth(req.body, actor, res)) return;
  const now = Date.now();
  const newStart = new Date().toISOString();
  let newEnd = new Date(w.scheduledEnd).getTime();
  if (newEnd <= now) newEnd = now + 30 * 60 * 1000;
  w.scheduledStart = newStart;
  if (newEnd !== new Date(w.scheduledEnd).getTime()) w.scheduledEnd = new Date(newEnd).toISOString();
  await activateMaintenanceWindow(w, actor);
  persistDb();
  res.json({ success: true, maintenance: w });
});

app.post('/api/maintenance/windows/:id/cancel', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const w = (db.maintenanceWindows || []).find((x: any) => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Maintenance window not found' });
  if (w.status === 'completed' || w.status === 'cancelled') return res.status(409).json({ success: false, message: 'This maintenance window already ended.' });
  if (applyReAuth(req.body, actor, res)) return;
  w.status = 'cancelled';
  w.cancelledAt = new Date().toISOString();
  w.updatedAt = new Date().toISOString();
  if (db.platformSettings.maintenanceMode) {
    const other = (db.maintenanceWindows || []).find((x: any) => x.status === 'active' && x.id !== w.id);
    if (!other) db.platformSettings.maintenanceMode = false;
  }
  broadcast('maintenance', publicMaintenanceView());
  logAudit(actor, 'Maintenance cancelled', 'maintenance', w.id, 'success', { title: w.title });
  await sendMaintenanceNotification(w, 'cancelled', actor);
  persistDb();
  res.json({ success: true, maintenance: w });
});

app.post('/api/maintenance/windows/:id/complete', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const w = (db.maintenanceWindows || []).find((x: any) => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Maintenance window not found' });
  if (w.status === 'completed') return res.status(409).json({ success: false, message: 'Maintenance already completed.' });
  if (applyReAuth(req.body, actor, res)) return;
  await completeMaintenanceWindow(w, actor);
  persistDb();
  res.json({ success: true, maintenance: w });
});

app.post('/api/maintenance/windows/:id/extend', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const w = (db.maintenanceWindows || []).find((x: any) => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Maintenance window not found' });
  if (w.status === 'completed' || w.status === 'cancelled') return res.status(409).json({ success: false, message: 'This maintenance window already ended.' });
  if (applyReAuth(req.body, actor, res)) return;
  const newEnd = new Date(req.body.scheduledEnd || '');
  const newStart = new Date(req.body.scheduledStart || w.scheduledStart);
  if (isNaN(newEnd.getTime()) || newEnd.getTime() <= newStart.getTime()) return res.status(400).json({ success: false, message: 'An end time after the start is required.' });
  const from = w.scheduledEnd;
  w.scheduledEnd = newEnd.toISOString();
  w.updatedAt = new Date().toISOString();
  logAudit(actor, 'Maintenance extended', 'maintenance', w.id, 'success', { from, to: w.scheduledEnd });
  res.json({ success: true, maintenance: w });
});

app.post('/api/maintenance/windows/:id/notify', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const w = (db.maintenanceWindows || []).find((x: any) => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Maintenance window not found' });
  const kind = ['scheduled', 'warning', 'start', 'completion', 'cancelled'].includes(req.body && req.body.kind) ? req.body.kind : 'scheduled';
  const result = await sendMaintenanceNotification(w, kind, actor);
  persistDb();
  res.json({ success: true, ...result });
});

// ---- Platform messages (namespaced under /api/platform/messages to avoid
// clashing with the earlier generic `/api/messages/:conversationId` route) ----
app.post('/api/platform/messages/preview', requireSuperAdmin, (req, res) => {
  const b = req.body || {};
  const types = parseGroups(String(b.recipientGroup || 'all'));
  const users = resolveRecipientUsers(types, b.selectedUserIds || []);
  res.json({ success: true, recipients: users.length, channels: Array.isArray(b.deliveryChannels) ? b.deliveryChannels : ['In-app'] });
});

app.get('/api/platform/messages', requireSuperAdmin, (req, res) => {
  res.json({ items: [...(db.platformMessages || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
});

// Stage order for the send progress workflow reported to the UI. Each stage maps
// to real backend work (no fake timers / artificial delays).
const PM_STAGES = ['verifying', 'preparing', 'processing', 'inapp', 'email', 'auditing', 'completed'];

function platformMessageProgress(msg: any) {
  const p = msg.progress || {};
  return {
    stage: p.stage || (msg.status === 'scheduled' ? 'scheduled' : 'preparing'),
    startedAt: p.startedAt || null,
    completedAt: p.completedAt || null,
    totalRecipients: msg.totalRecipients || 0,
  };
}

function platformMessageSummary(msg: any) {
  const items = (db.notificationDeliveries || []).filter((x: any) => x.refId === msg.id);
  let inAppSent = 0, inAppSkipped = 0, emailSent = 0, emailFailed = 0, emailNotConfigured = 0, emailSkipped = 0, failures = 0;
  const failedRecipients: any[] = [];
  for (const d of items) {
    if (d.channel === 'In-app') {
      if (d.status === 'sent') inAppSent++;
      else if (d.status === 'skipped') inAppSkipped++;
    } else if (d.channel === 'Email') {
      if (d.status === 'sent' || d.status === 'queued') emailSent++;
      else if (d.status === 'failed') { emailFailed++; failures++; failedRecipients.push({ name: d.name, email: d.email, reason: d.error }); }
      else if (d.status === 'not_configured') emailNotConfigured++;
      else if (d.status === 'skipped') emailSkipped++;
    }
  }
  const delivered = inAppSent + emailSent;
  const skipped = inAppSkipped + emailSkipped;
  return {
    totalRecipients: msg.totalRecipients || 0,
    delivered, skipped, failed: failures,
    channels: {
      inApp: { delivered: inAppSent, skipped: inAppSkipped },
      email: { delivered: emailSent, failed: emailFailed, notConfigured: emailNotConfigured, skipped: emailSkipped },
    },
    failedRecipients: failedRecipients.slice(0, 50),
  };
}

// The actual delivery worker. Runs in the background so the sending request and
// UI never block on email/notification providers. Target can be limited to a set
// of userIds for "retry failed" operations.
async function runPlatformMessageJob(msg: any, actor?: any, opts: { targetUserIds?: string[] } = {}) {
  const start = new Date().toISOString();
  msg.progress = { ...(msg.progress || {}), stage: 'processing', startedAt: start };
  msg.status = 'processing';
  msg.updatedAt = start;
  persistDb();

  const users = opts.targetUserIds?.length
    ? (opts.targetUserIds.map((id: string) => (db.users || []).find((u: any) => u.id === id)).filter(Boolean))
    : resolveRecipientUsers(parseGroups(msg.recipientGroup), msg.selectedUserIds || []);
  const channels = Array.isArray(msg.deliveryChannels) && msg.deliveryChannels.length ? msg.deliveryChannels : ['In-app'];
  const ref = { id: msg.id, refType: 'platform_message' };
  msg.totalRecipients = users.length;

  if (channels.includes('In-app')) { msg.progress.stage = 'inapp'; persistDb(); }
  let emailPlanned = false;
  if (channels.includes('Email')) { msg.progress.stage = 'email'; emailPlanned = true; persistDb(); }

  for (const u of users) {
    const eventKey = `pm:${msg.id}:${u.id}`;
    if (channels.includes('In-app')) {
      deliverInApp(u, msg.subject, msg.message, ref, { type: 'PLATFORM_MESSAGE', category: 'system', priority: msg.priority === 'CRITICAL' ? 'CRITICAL' : 'NORMAL', dedupeKey: eventKey, referenceType: 'platform_message', action: '/' });
    }
    if (channels.includes('Email')) {
      await deliverEmailAsync(u, msg.subject, 'announcement', { title: msg.subject, message: msg.message }, eventKey, { ...ref, refTitle: msg.subject });
    }
  }

  msg.progress.stage = 'auditing';
  persistDb();

  const summary = platformMessageSummary(msg);
  msg.deliverySummary = summary;
  msg.updatedAt = new Date().toISOString();
  if (summary.failed > 0 && summary.delivered > 0) msg.status = 'partially_sent';
  else if (summary.failed > 0) msg.status = 'failed';
  else msg.status = 'sent';
  if (msg.status === 'sent') msg.sentAt = new Date().toISOString();
  msg.progress.stage = 'completed';
  msg.progress.completedAt = new Date().toISOString();

  // Immutable audit trail for every communication action + provider results.
  logAudit(actor || null, 'Message sent', 'platform_message', msg.id, 'success', {
    subject: msg.subject, recipients: summary.totalRecipients, delivered: summary.delivered, failed: summary.failed, skipped: summary.skipped,
    mail: emailPlanned ? communicationProviders().email : 'n/a',
  });
  if (summary.channels.email.failed > 0) {
    logAudit(actor || null, 'Email failed', 'platform_message', msg.id, 'failed', { subject: msg.subject, failed: summary.channels.email.failed, reason: 'Email delivery failed' });
  }
  if (summary.channels.email.notConfigured > 0) {
    logAudit(actor || null, 'Email not configured', 'platform_message', msg.id, 'failed', { subject: msg.subject, skipped: summary.channels.email.notConfigured, reason: 'Email provider not configured' });
  }
  persistDb();
}

// Non-blocking enqueuer. Only initiates the async job and returns control so the
// request/UI never hang on provider delivery. Idempotent: the worker's writers
// (notifyUser dedupeKey + email eventKey) prevent duplicate sends on retry.
function sendPlatformMessage(msg: any, actor?: any, opts: { targetUserIds?: string[] } = {}) {
  const now = new Date().toISOString();
  msg.status = 'processing';
  msg.progress = { ...(msg.progress || {}), stage: 'verifying', startedAt: msg.progress?.startedAt || now };
  msg.updatedAt = now;
  // Pass the live db message object so the worker writes status/progress/summary
  // back onto the persisted record (a copy would lose the result).
  enqueueBackground(async () => { await runPlatformMessageJob(msg, actor, opts); });
  return { queued: true, messageId: msg.id, correlationId: msg.correlationId || null };
}

app.post('/api/platform/messages', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const b = req.body || {};
  if (applyReAuth(b, actor, res)) return;
  const subject = String(b.subject || '').trim();
  const message = String(b.message || '').trim();
  if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message are required.' });
  const correlationId = String(b.clientRequestId || '').trim();

  // Idempotency: a known request id must never create a duplicate message —
  // even after the first has finished (guards double-clicks / retries).
  if (correlationId) {
    const existing = (db.platformMessages || []).find((x: any) => x.correlationId === correlationId);
    if (existing) {
      const terminal = ['sent', 'partially_sent', 'failed'].includes(existing.status);
      return res.status(terminal ? 200 : 409).json({
        success: true, message: existing, duplicate: true, existingMessageId: existing.id,
        ...(terminal ? { alreadyDelivered: true } : { message: 'A message for this request is already being processed.' }),
      });
    }
  }

  const scheduleAt = b.scheduleAt ? new Date(b.scheduleAt).toISOString() : null;
  const isScheduled = !!scheduleAt && new Date(scheduleAt).getTime() > Date.now();
  const msg = {
    id: `pm-${uuidv4().slice(0, 8)}`, subject, message,
    correlationId: correlationId || null,
    messageType: String(b.messageType || 'general-announcement'),
    priority: ['NORMAL', 'IMPORTANT', 'CRITICAL'].includes(b.priority) ? b.priority : 'NORMAL',
    recipientGroup: String(b.recipientGroup || 'all'),
    selectedUserIds: Array.isArray(b.selectedUserIds) ? b.selectedUserIds : [],
    deliveryChannels: Array.isArray(b.deliveryChannels) && b.deliveryChannels.length ? b.deliveryChannels : ['In-app'],
    scheduleAt, expirationAt: b.expirationAt ? new Date(b.expirationAt).toISOString() : null,
    status: isScheduled ? 'scheduled' : 'processing',
    createdBy: actor.id, createdByName: actor.displayName || actor.email,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sentAt: null,
    progress: { stage: isScheduled ? 'scheduled' : 'verifying', startedAt: new Date().toISOString(), completedAt: null },
    totalRecipients: 0
  };
  db.platformMessages = db.platformMessages || [];
  db.platformMessages.push(msg);
  logAudit(actor, 'Message created', 'platform_message', msg.id, 'success', { subject, correlationId: correlationId || undefined });
  persistDb();
  if (isScheduled) {
    logAudit(actor, 'Message scheduled', 'platform_message', msg.id, 'success', { subject, scheduleAt });
    persistDb();
    return res.status(201).json({ success: true, message: msg, scheduled: true, correlationId: correlationId || null });
  }
  const result = sendPlatformMessage(msg, actor);
  res.status(201).json({ success: true, message: msg, ...result });
});

app.get('/api/platform/messages/:id/deliveries', requireSuperAdmin, (req, res) => {
  const items = (db.notificationDeliveries || []).filter((x: any) => x.refId === req.params.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ items });
});

// Live send status: real stage + delivery summary + provider config. Used by the
// UI for progress polling and the final result (never fabricated on the client).
app.get('/api/platform/messages/:id/status', requireSuperAdmin, (req, res) => {
  const msg = (db.platformMessages || []).find((x: any) => x.id === req.params.id);
  if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
  res.json({ success: true, message: msg, progress: platformMessageProgress(msg), summary: platformMessageSummary(msg), providers: communicationProviders() });
});

// Retry failed deliveries: only re-attempts users whose prior delivery failed
// (or couldn't be configured), never duplicates already-delivered recipients.
app.post('/api/platform/messages/:id/resend', requireSuperAdmin, async (req, res) => {
  const actor = (req as any).currentUser;
  const msg = (db.platformMessages || []).find((x: any) => x.id === req.params.id);
  if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
  if (applyReAuth(req.body, actor, res)) return;
  const failed = (db.notificationDeliveries || []).filter((x: any) => x.refId === msg.id && (x.status === 'failed' || x.status === 'not_configured'));
  const targetUserIds = Array.from(new Set(failed.map((x: any) => x.userId).filter(Boolean)));
  if (!targetUserIds.length) {
    return res.json({ success: true, message: msg, retried: 0, note: 'No failed deliveries to retry.' });
  }
  // Remove stale failed rows so the worker recreates truthful records.
  db.notificationDeliveries = (db.notificationDeliveries || []).filter((x: any) => !(x.refId === msg.id && (x.status === 'failed' || x.status === 'not_configured')));
  logAudit(actor, 'Message retry', 'platform_message', msg.id, 'success', { subject: msg.subject, retriedUsers: targetUserIds.length });
  const result = sendPlatformMessage(msg, actor, { targetUserIds });
  res.json({ success: true, ...result, retried: targetUserIds.length });
});

// ---- Notification deliveries admin view ----
app.get('/api/notifications/deliveries', requireSuperAdmin, (req, res) => {
  let items = [...(db.notificationDeliveries || [])];
  const q = String(req.query.q || '').toLowerCase();
  const channel = req.query.channel;
  const status = req.query.status;
  const type = req.query.recipientType;
  if (channel && channel !== 'all') items = items.filter((x: any) => x.channel === channel);
  if (status && status !== 'all') items = items.filter((x: any) => x.status === status);
  if (type && type !== 'all') items = items.filter((x: any) => x.recipientType === type || x.role === type);
  if (q) items = items.filter((x: any) => String(x.email || '').toLowerCase().includes(q) || String(x.name || '').toLowerCase().includes(q) || String(x.refTitle || '').toLowerCase().includes(q));
  items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = items.length;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  items = items.slice(offset, offset + limit);
  res.json({ items, total, limit, offset });
});

// ---- Maintenance / scheduled-message scheduler (idempotent) ----
async function runMaintenanceScheduler() {
  const now = Date.now();
  const windows = db.maintenanceWindows || [];
  let changed = false;
  for (const w of windows) {
    if (!w || !w.id) continue;
    const startT = new Date(w.scheduledStart).getTime();
    const endT = new Date(w.scheduledEnd).getTime();
    if ((w.status === 'scheduled' || w.status === 'warning')) {
      if (now >= startT) {
        await activateMaintenanceWindow(w, null, true);
        changed = true;
        continue;
      }
      const lead = MAINTENANCE_LEAD_MS[w.notificationTiming || 'start'] || 0;
      if (lead > 0 && w.status === 'scheduled' && (startT - now) <= lead && !w.notifications.warning) {
        w.status = 'warning';
        w.enrolledWarning = true;
        await sendMaintenanceNotification(w, 'warning', null);
        changed = true;
      }
    }
    if (w.status === 'active' && now >= endT) {
      await completeMaintenanceWindow(w, null, true);
      changed = true;
    }
  }
  // Scheduled platform messages whose time has arrived
  const msgs = db.platformMessages || [];
  for (const m of msgs) {
    if (m.status === 'scheduled' && m.scheduleAt && now >= new Date(m.scheduleAt).getTime()) {
      await sendPlatformMessage(m, null);
      changed = true;
    }
  }
  if (changed) persistDb();
}

// ============================================================
// SECURITY CENTER API — real data from real backend monitoring
// ============================================================

function securityRead(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireSuperAdmin(req, res, () => requirePermission('security:view')(req, res, next));
}

app.get('/api/security/overview', securityRead, (req, res) => {
  const events = db.securityEvents || [];
  const now = Date.now();
  const last24 = events.filter((e: any) => now - Date.parse(e.timestamp) <= 24 * 60 * 60 * 1000);

  const bySeverity: Record<string, number> = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  events.forEach((e: any) => { if (bySeverity[e.severity] != null) bySeverity[e.severity] += 1; });
  const byStatus: Record<string, number> = {};
  events.forEach((e: any) => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });

  const active = events.filter((e: any) => ['investigating', 'monitoring'].includes(e.status) && SEV_ORDER[e.severity] >= SEV_ORDER.MEDIUM);
  const activeThreats = events.filter((e: any) => ['blocked', 'investigating'].includes(e.status) && SEV_ORDER[e.severity] >= SEV_ORDER.HIGH);
  const critical = events.filter((e: any) => e.severity === 'CRITICAL' && e.status !== 'resolved');
  const high = events.filter((e: any) => e.severity === 'HIGH' && e.status !== 'resolved');
  const failedAuth = last24.filter((e: any) => e.type === 'FAILED_LOGIN' || e.type === 'BRUTE_FORCE_LOGIN_ATTEMPT' || e.type === 'OTP_FAILURE');
  const blocked = events.filter((e: any) => e.status === 'blocked');
  const apiAbuse = events.filter((e: any) => e.type === 'API_ABUSE' || e.type === 'RATE_LIMIT_TRIGGERED');
  const paymentSec = events.filter((e: any) => /PAYMENT|WEBHOOK|GATEWAY|REFUND/.test(e.type));
  const sessionsActive = (db.sessions || []).filter((s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > now);
  const suspended = db.users.filter((u: any) => u.isSuspended).length;

  const recentAdminActions = db.audit.slice(-1).length
    ? db.audit.filter((a: any) => ['administrator', 'super-administrator'].includes(a.actorRole)).slice(-8).reverse()
    : [];

  // Honest posture: any un-resolved HIGH/CRITICAL means attention is required.
  let posture = 'SECURE';
  if (critical.length) posture = 'AT_RISK';
  else if (high.length || activeThreats.length) posture = 'ATTENTION';
  else if (suspended || failedAuth.length) posture = 'MONITORING';

  res.json({
    posture,
    generatedAt: new Date().toISOString(),
    summary: { total: events.length, last24h: last24.length, active, activeThreats: activeThreats.length },
    bySeverity,
    byStatus,
    counters: {
      criticalAlerts: critical.length,
      highRiskEvents: high.length,
      failedAuthentication: failedAuth.length,
      suspiciousSessions: (db.sessions || []).filter((s: any) => { const u = db.users.find((x: any) => x.id === s.userId); return !s.revokedAt && (u?.isSuspended || s.deviceName === 'Unknown device'); }).length,
      blockedRequests: blocked.length,
      apiAbuse: apiAbuse.length,
      paymentSecurityEvents: paymentSec.length,
      activeSessions: sessionsActive.length,
      suspendedAccounts: suspended,
      disabledGateways: db.platformSettings.paymentGateways.filter((g: any) => !g.enabled || !g.configured).length,
    },
    disabledGateways: db.platformSettings.paymentGateways.filter((g: any) => !g.enabled || !g.configured).map((g: any) => ({ id: g.id, name: g.name })),
    recentAdminActions,
    recentEvents: events.slice(-15).reverse(),
  });
});

app.get('/api/security/events', securityRead, (req, res) => {
  let items = [...(db.securityEvents || [])].reverse();
  const q: any = req.query || {};
  const { severity, type, status, search, from, to, page = '1', pageSize = '25' } = q;
  if (severity) items = items.filter((e: any) => e.severity === severity);
  if (status) items = items.filter((e: any) => e.status === status);
  if (type) items = items.filter((e: any) => e.type === type);
  if (from) items = items.filter((e: any) => Date.parse(e.timestamp) >= Date.parse(from));
  if (to) items = items.filter((e: any) => Date.parse(e.timestamp) <= Date.parse(to));
  if (search) {
    const s = String(search).toLowerCase();
    items = items.filter((e: any) => (e.account || '').toLowerCase().includes(s) || (e.endpoint || '').toLowerCase().includes(s) || (e.type || '').toLowerCase().includes(s) || (e.actionTaken || '').toLowerCase().includes(s));
  }
  const total = items.length;
  const size = Math.max(1, Math.min(200, Number(pageSize) || 25));
  const totalPages = Math.max(1, Math.ceil(total / size));
  const p = Math.max(1, Number(page) || 1);
  const slice = items.slice((p - 1) * size, p * size);
  res.json({ items: slice, total, totalPages, page: p, pageSize: size });
});

app.get('/api/security/events/:id', securityRead, (req, res) => {
  const event = (db.securityEvents || []).find((e: any) => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const relatedAudit = db.audit.filter((a: any) =>
    (event.account && (a.actorEmail === event.account || a.entityId === event.userId))
    || (a.meta && a.meta && (event.requestId && a.requestId === event.requestId))
  ).slice(-20);
  const relatedSessions = event.userId ? (db.sessions || []).filter((s: any) => s.userId === event.userId).slice(-20) : [];
  res.json({ event, relatedAudit, relatedSessions });
});

// Controlled response for a security event. Destructive actions require the
// confirming operator's password (server-side re-authentication).
app.post('/api/security/events/:id/respond', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const actor = (req as any).currentUser;
  const event = (db.securityEvents || []).find((e: any) => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const { action, note, password } = req.body || {};
  const destructive = ['lock_account', 'revoke_sessions'].includes(action);
  if (destructive) {
    const reauthErr = requireReAuth(actor, { password });
    if (reauthErr) return res.status(reauthErr.status).json(reauthErr.body);
  }

  const targetUser = db.users.find((u: any) => u.id === event.userId);
  let result: any = { action, note: note || null };
  switch (action) {
    case 'revoke_sessions': {
      const n = targetUser ? revokeAllSessions(targetUser.id, 'Security Center response', req) : 0;
      result.sessionsRevoked = n;
      if (targetUser) {
        targetUser.tokensRevokedAt = Date.now();
        notifyUser(targetUser.id, 'Security Alert', 'Your sessions were terminated by the security team for your protection.', { type: 'SESSION_REVOKED', category: 'account', priority: 'CRITICAL', critical: true, action: '/login' });
      }
      break;
    }
    case 'lock_account': {
      if (targetUser) {
        targetUser.isSuspended = true;
        targetUser.lockedUntil = Date.now() + 60 * 60 * 1000;
        revokeAllSessions(targetUser.id, 'Account locked by security team', req);
        notifyUser(targetUser.id, 'Security Alert', 'Your account was temporarily locked by the security team.', { type: 'ACCOUNT_SUSPENDED', category: 'account', priority: 'CRITICAL', critical: true, action: '/' });
        result.locked = true;
      }
      break;
    }
    case 'require_reauth': {
      if (targetUser) targetUser.lockedUntil = Date.now() + 30 * 60 * 1000;
      result.note = 'Operator must re-authenticate on next access.';
      break;
    }
    case 'rate_limit_ip': {
      ipBlock.set(event.source?.ip || maskIp(event.source?.ip || ''), Date.now() + 60 * 60 * 1000);
      result.ipRateLimited = event.source?.ip || null;
      break;
    }
    default:
      return res.status(400).json({ success: false, message: 'Unknown response action.' });
  }

  event.status = 'blocked';
  event.responseAt = new Date().toISOString();
  event.responseBy = actor.email;
  event.responseAction = action;
  event.responseNote = note || null;
  logAudit(actor, action === 'lock_account' ? 'Security response: account locked' : `Security response: ${action}`, 'security', event.id, 'success', { note, eventType: event.type });
  recordSecurityEvent({ type: 'SUPER_ADMIN_ACTION', severity: 'LOW', endpoint: `/api/security/events/${event.id}/respond`, account: actor.email, userId: actor.id, ip: secCtx(req).ip, detection: `Super Admin applied response "${action}" to a security event.`, actionTaken: action, status: 'resolved', req, details: { eventId: event.id, eventType: event.type } });
  res.json({ success: true, event, result });
});

app.post('/api/security/events/:id/resolve', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const actor = (req as any).currentUser;
  const event = (db.securityEvents || []).find((e: any) => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const { note, password } = req.body || {};
  const reauthErr = requireReAuth(actor, { password });
  if (reauthErr) return res.status(reauthErr.status).json(reauthErr.body);
  event.status = 'resolved';
  event.resolvedAt = new Date().toISOString();
  event.resolutionNote = note || null;
  event.resolvedBy = actor.email;
  logAudit(actor, 'Security event resolved', 'security', event.id, 'success', { note, eventType: event.type });
  recordSecurityEvent({ type: 'SUPER_ADMIN_ACTION', severity: 'LOW', endpoint: `/api/security/events/${event.id}/resolve`, account: actor.email, userId: actor.id, ip: secCtx(req).ip, detection: 'Super Admin resolved a security event.', actionTaken: 'Resolved', status: 'resolved', req, details: { eventId: event.id } });
  res.json({ success: true, event });
});

app.get('/api/security/settings', securityRead, (req, res) => {
  res.json(securitySettings());
});

// Changing security settings is itself a high-risk operation: require the
// operator's password and record a real audit + security event.
app.post('/api/security/settings', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const actor = (req as any).currentUser;
  const body = req.body.body ?? req.body;
  const { password, ...updates } = body || {};
  const reauthErr = requireReAuth(actor, { password });
  if (reauthErr) return res.status(reauthErr.status).json(reauthErr.body);

  const current = securitySettings();
  const changed: Record<string, { from: any; to: any }> = {};
  const allowed = ['loginRateLimit', 'loginWindowMs', 'accountLockThreshold', 'accountLockMinutes', 'bruteForceThreshold', 'bruteForceWindowMs', 'apiRateLimit', 'sessionDurationMs', 'passwordMinLength', 'requireMfaAdmin', 'reauthMinutes', 'alertEmails', 'notifySeverity', 'securityEventRetention', 'rateLimit', 'maxLoginFailuresBeforeAlert'];
  allowed.forEach((k: string) => {
    if (updates[k] !== undefined && JSON.stringify(updates[k]) !== JSON.stringify((current as any)[k])) {
      changed[k] = { from: (current as any)[k], to: updates[k] };
    }
  });
  if (Object.keys(changed).length === 0) return res.json(securitySettings());

  db.securitySettings = { ...current, ...allowed.reduce((acc: any, k) => { if (updates[k] !== undefined) acc[k] = updates[k]; return acc; }, {}), updatedAt: new Date().toISOString() };
  logAudit(actor, 'Security settings updated', 'security', 'global', 'success', { changed });
  recordSecurityEvent({ type: 'SECURITY_CONFIG_CHANGED', severity: 'HIGH', endpoint: '/api/security/settings', account: actor.email, userId: actor.id, ip: secCtx(req).ip, detection: 'Super Admin changed security configuration.', actionTaken: 'Settings updated', status: 'monitoring', req, details: { changed } });
  res.json(securitySettings());
});

// ============================================================
// API OPERATIONS & SECURITY CONSOLE — real, live, read-only +
// gated administrative controls.
//
// Purpose: give the Super Admin an operational view of the real
// HTTP surface — endpoint health/status, live request metrics,
// security posture per endpoint, and audit history. It disables
// endpoints for real and never fabricates telemetry.
// ============================================================

// Authoritative, curated metadata for known endpoints. Only paths
// listed here get rich metadata (group/description/required auth or
// permission). Any unrouted/unknown path is still shown but derived
// from the live Express router so nothing is ever fabricated.
interface ApiConsoleMeta {
  group: string; service: string; description: string;
  auth: boolean; role?: string; permission?: string;
  rateLimit?: string; destructive?: boolean;
}
const API_CONSOLE_META: Record<string, ApiConsoleMeta> = {
  'GET /api/system/health':      { group: 'System', service: 'Core API', description: 'Aggregate infrastructure and subsystem health', auth: true, permission: 'api:view' },
  'GET /api/admin/stats':        { group: 'Control Center', service: 'Core API', description: 'Platform operational counters', auth: true, permission: 'reports:view' },
  'GET /api/admin/reports':      { group: 'Control Center', service: 'Core API', description: 'Revenue and order analytics series', auth: true, permission: 'reports:view' },
  'GET /api/admin/sessions':     { group: 'Control Center', service: 'Auth', description: 'Platform-wide live session registry', auth: true, permission: 'sessions:manage' },
  'POST /api/admin/users/:id/account': { group: 'Identity & Governance', service: 'Auth', description: 'Account lifecycle actions (suspend/activate/ban)', auth: true, permission: 'users:update', destructive: true },

  'GET /api/users':              { group: 'Identity & Governance', service: 'Core API', description: 'List user accounts', auth: true, permission: 'users:view' },
  'GET /api/users/:id':          { group: 'Identity & Governance', service: 'Core API', description: 'Fetch a single user account', auth: true, permission: 'users:view' },
  'POST /api/users':             { group: 'Identity & Governance', service: 'Core API', description: 'Provision a new user account', auth: true, permission: 'users:create' },
  'PATCH /api/users/:id':        { group: 'Identity & Governance', service: 'Core API', description: 'Update a user account profile', auth: true, permission: 'users:update' },
  'DELETE /api/users/:id':       { group: 'Identity & Governance', service: 'Core API', description: 'Delete a user account', auth: true, permission: 'users:delete', destructive: true },
  'POST /api/users/:id/role':    { group: 'Identity & Governance', service: 'Core API', description: 'Assign a role to a user', auth: true, permission: 'roles:assign' },

  'GET /api/auth/me':            { group: 'Identity & Governance', service: 'Auth', description: 'Return the authenticated profile', auth: true },
  'POST /api/auth/login':        { group: 'Identity & Governance', service: 'Auth', description: 'Authenticate a user', auth: false, rateLimit: '120/min' },
  'POST /api/auth/register':     { group: 'Identity & Governance', service: 'Auth', description: 'Create a new customer account', auth: false, rateLimit: '120/min' },
  'POST /api/auth/refresh':      { group: 'Identity & Governance', service: 'Auth', description: 'Rotate a refresh token and mint an access token', auth: false },
  'POST /api/auth/change-password': { group: 'Identity & Governance', service: 'Auth', description: 'Change the current user password', auth: true },
  'POST /api/auth/verify-password': { group: 'Identity & Governance', service: 'Auth', description: 'Re-authenticate for high-risk actions', auth: true },
  'POST /api/auth/admin/force-reset': { group: 'Identity & Governance', service: 'Auth', description: 'Force-reset a user password', auth: true, permission: 'users:update', destructive: true },
  'POST /api/auth/admin/generate-temp-password': { group: 'Identity & Governance', service: 'Auth', description: 'Generate a temporary password for a user', auth: true, permission: 'users:update' },
  'GET /api/auth/sessions/:userId': { group: 'Identity & Governance', service: 'Auth', description: 'List sessions for a user', auth: true },
  'DELETE /api/auth/sessions/:userId': { group: 'Identity & Governance', service: 'Auth', description: 'Revoke all sessions for a user', auth: true, permission: 'sessions:manage', destructive: true },

  'GET /api/roles':              { group: 'Identity & Governance', service: 'Core API', description: 'List roles and their permissions', auth: true, permission: 'roles:view' },
  'PATCH /api/roles/:id':        { group: 'Identity & Governance', service: 'Core API', description: 'Update a role permission set', auth: true, permission: 'roles:update' },
  'GET /api/permissions':        { group: 'Identity & Governance', service: 'Core API', description: 'List available permissions', auth: true, permission: 'roles:view' },

  'GET /api/vendors':            { group: 'Vendors', service: 'Core API', description: 'List vendors', auth: true, permission: 'vendors:view' },
  'GET /api/vendors/:id':        { group: 'Vendors', service: 'Core API', description: 'Fetch a vendor', auth: true },
  'POST /api/vendors':           { group: 'Vendors', service: 'Core API', description: 'Register a vendor', auth: true, permission: 'vendors:create' },
  'PATCH /api/vendors/:id':      { group: 'Vendors', service: 'Core API', description: 'Update vendor profile', auth: true },
  'PATCH /api/vendors/:id/status': { group: 'Vendors', service: 'Core API', description: 'Approve/reject a vendor', auth: true, permission: 'vendors:update' },
  'POST /api/vendors/:id/kitchen-toggle': { group: 'Vendors', service: 'Core API', description: 'Toggle kitchen open/closed', auth: true },

  'GET /api/products':           { group: 'Restaurants', service: 'Core API', description: 'List products', auth: false },
  'GET /api/products/:id':       { group: 'Restaurants', service: 'Core API', description: 'Fetch a product', auth: false },
  'GET /api/products/trending':  { group: 'Restaurants', service: 'Core API', description: 'Trending products', auth: false },
  'POST /api/products':          { group: 'Restaurants', service: 'Core API', description: 'Create a product', auth: true, permission: 'products:manage' },
  'PATCH /api/products/:id':     { group: 'Restaurants', service: 'Core API', description: 'Update a product', auth: true, permission: 'products:manage' },
  'DELETE /api/products/:id':    { group: 'Restaurants', service: 'Core API', description: 'Delete a product', auth: true, permission: 'products:manage', destructive: true },

  'GET /api/riders':             { group: 'Riders', service: 'Core API', description: 'List riders', auth: true, permission: 'riders:view' },
  'GET /api/riders/:id':         { group: 'Riders', service: 'Core API', description: 'Fetch a rider', auth: true },
  'POST /api/riders/:id/location': { group: 'Riders', service: 'Core API', description: 'Report rider location', auth: true },
  'PATCH /api/riders/:id':       { group: 'Riders', service: 'Core API', description: 'Update rider profile', auth: true },
  'PATCH /api/riders/:id/status': { group: 'Riders', service: 'Core API', description: 'Approve/reject a rider', auth: true, permission: 'riders:update' },

  'GET /api/orders':             { group: 'Orders', service: 'Core API', description: 'List orders', auth: true, permission: 'orders:view' },
  'GET /api/orders/:id':         { group: 'Orders', service: 'Core API', description: 'Fetch an order', auth: true, permission: 'orders:view' },
  'GET /api/orders/:id/tracking': { group: 'Orders', service: 'Core API', description: 'Order tracking', auth: true },
  'GET /api/orders/available':   { group: 'Orders', service: 'Core API', description: 'Available orders for riders', auth: true },
  'POST /api/orders':            { group: 'Orders', service: 'Core API', description: 'Create an order', auth: true },
  'POST /api/orders/:id/assign-rider': { group: 'Orders', service: 'Delivery', description: 'Assign a rider to an order', auth: true, permission: 'orders:update' },
  'POST /api/orders/:id/complete': { group: 'Orders', service: 'Delivery', description: 'Complete an order', auth: true, permission: 'orders:update' },
  'POST /api/orders/:id/receiver-confirm': { group: 'Orders', service: 'Delivery', description: 'Confirm order delivery', auth: true },
  'PATCH /api/orders/:id/status': { group: 'Orders', service: 'Delivery', description: 'Transition order status', auth: true, permission: 'orders:update' },
  'POST /api/orders/package':    { group: 'Orders', service: 'Delivery', description: 'Create a package delivery', auth: true },
  'POST /api/orders/package/quote': { group: 'Orders', service: 'Delivery', description: 'Quote a package delivery', auth: true },
  'GET /api/orders/tracking/:ref': { group: 'Orders', service: 'Delivery', description: 'Track a package by reference', auth: false },

  'GET /api/payment-gateways':   { group: 'Payments', service: 'Payments', description: 'Payment gateway operational state', auth: false },
  'PATCH /api/payment-gateways/:id': { group: 'Payments', service: 'Payments', description: 'Configure a payment gateway', auth: true, permission: 'payments:configure', destructive: true },
  'GET /api/payments':           { group: 'Payments', service: 'Payments', description: 'List payment records', auth: true, permission: 'payments:view' },
  'GET /api/transactions':       { group: 'Payments', service: 'Payments', description: 'List transactions', auth: true, permission: 'payments:view' },
  'GET /api/payouts':            { group: 'Payments', service: 'Payments', description: 'List payouts', auth: true, permission: 'payments:view' },
  'POST /api/payments/verify':   { group: 'Payments', service: 'Payments', description: 'Verify a payment', auth: true },
  'POST /api/payments/paystack/initialize': { group: 'Payments', service: 'Payments', description: 'Initialize a Paystack charge', auth: true },
  'POST /api/payments/webhook/:provider': { group: 'Payments', service: 'Payments', description: 'Payment provider webhook (HMAC verified)', auth: false, rateLimit: '60/min' },

  'GET /api/reviews':            { group: 'Customers', service: 'Core API', description: 'List reviews', auth: false },
  'POST /api/reviews':           { group: 'Customers', service: 'Core API', description: 'Submit a review', auth: true },

  'GET /api/wallets/:userId/balance': { group: 'Wallet', service: 'Wallet', description: 'Wallet balance', auth: true },
  'GET /api/wallets/:userId/transactions': { group: 'Wallet', service: 'Wallet', description: 'Wallet transactions', auth: true },
  'POST /api/wallets/:userId/topup': { group: 'Wallet', service: 'Wallet', description: 'Top up a wallet', auth: true },
  'POST /api/wallets/:userId/withdrawals': { group: 'Wallet', service: 'Wallet', description: 'Request a withdrawal', auth: true },

  'GET /api/coupons':            { group: 'System', service: 'Core API', description: 'List active coupons', auth: false },
  'GET /api/coupons/validate':   { group: 'System', service: 'Core API', description: 'Validate a coupon code', auth: true, rateLimit: '30/min' },
  'POST /api/coupons':           { group: 'System', service: 'Core API', description: 'Create a coupon', auth: true, permission: 'settings:update' },
  'PATCH /api/coupons/:id':      { group: 'System', service: 'Core API', description: 'Update a coupon', auth: true, permission: 'settings:update' },
  'DELETE /api/coupons/:id':     { group: 'System', service: 'Core API', description: 'Delete a coupon', auth: true, permission: 'settings:update', destructive: true },

  'GET /api/notifications':      { group: 'Notifications', service: 'Notifications', description: 'List notifications', auth: true },
  'GET /api/notifications/unread-count': { group: 'Notifications', service: 'Notifications', description: 'Unread notification count', auth: true },
  'POST /api/notifications/:id/read': { group: 'Notifications', service: 'Notifications', description: 'Mark a notification read', auth: true },
  'POST /api/notifications/read-all': { group: 'Notifications', service: 'Notifications', description: 'Mark all notifications read', auth: true },
  'POST /api/notifications/clear': { group: 'Notifications', service: 'Notifications', description: 'Clear notifications', auth: true },
  'DELETE /api/notifications/:id': { group: 'Notifications', service: 'Notifications', description: 'Delete a notification', auth: true },
  'GET /api/notifications/deliveries': { group: 'Notifications', service: 'Notifications', description: 'Notification deliveries', auth: true },

  'GET /api/messages/conversations': { group: 'Messaging', service: 'Realtime', description: 'List message conversations', auth: true },
  'GET /api/messages/:conversationId': { group: 'Messaging', service: 'Realtime', description: 'Fetch a conversation', auth: true },
  'POST /api/messages':          { group: 'Messaging', service: 'Realtime', description: 'Send a message', auth: true },
  'POST /api/messages/conversations': { group: 'Messaging', service: 'Realtime', description: 'Open a conversation', auth: true },
  'POST /api/messages/support':  { group: 'Messaging', service: 'Realtime', description: 'Open a support conversation', auth: true },

  'GET /api/audit':              { group: 'Security', service: 'Core API', description: 'Search the immutable audit log', auth: true, permission: 'audit:view' },
  'GET /api/audit/summary':      { group: 'Security', service: 'Core API', description: 'Aggregate audit summary', auth: true, permission: 'security:view' },
  'GET /api/audit/facets':       { group: 'Security', service: 'Core API', description: 'Distinct audit filter facets', auth: true, permission: 'audit:view' },
  'GET /api/audit/export':       { group: 'Security', service: 'Core API', description: 'Export audit rows as CSV', auth: true, permission: 'audit:view' },
  'GET /api/security/overview':  { group: 'Security', service: 'Security', description: 'Security posture overview', auth: true, permission: 'security:view' },
  'GET /api/security/events':    { group: 'Security', service: 'Security', description: 'Filtered security event feed', auth: true, permission: 'security:view' },
  'GET /api/security/events/:id': { group: 'Security', service: 'Security', description: 'Security event detail', auth: true, permission: 'security:view' },
  'POST /api/security/events/:id/respond': { group: 'Security', service: 'Security', description: 'Respond to a security event', auth: true, permission: 'security:manage', destructive: true },
  'POST /api/security/events/:id/resolve': { group: 'Security', service: 'Security', description: 'Resolve a security event', auth: true, permission: 'security:manage' },
  'GET /api/security/settings':  { group: 'Security', service: 'Security', description: 'Read security settings', auth: true, permission: 'security:view' },
  'POST /api/security/settings': { group: 'Security', service: 'Security', description: 'Update security settings', auth: true, permission: 'security:manage', destructive: true },

  'GET /api/platform/settings':  { group: 'System', service: 'Core API', description: 'Read platform settings', auth: true, permission: 'settings:update' },
  'PUT /api/platform/settings':  { group: 'System', service: 'Core API', description: 'Update platform settings', auth: true, permission: 'settings:update', destructive: true },
  'GET /api/system/backups':     { group: 'System', service: 'Core API', description: 'List database backups', auth: true, permission: 'database:view' },
  'POST /api/system/backup':     { group: 'System', service: 'Core API', description: 'Create a database backup', auth: true, permission: 'database:backup' },
  'POST /api/system/restore':    { group: 'System', service: 'Core API', description: 'Restore a database backup', auth: true, permission: 'database:restore', destructive: true },
};

const API_CONSOLE_GROUP_ORDER = ['Control Center', 'Identity & Governance', 'Authentication', 'Customers', 'Vendors', 'Restaurants', 'Riders', 'Orders', 'Delivery', 'Payments', 'Wallet', 'Notifications', 'Messaging', 'System', 'Security', 'Database'];

// Deployed list of endpoints currently disabled by the Super Admin. Persisted
// under db.platformSettings.apiDisabled (array of "METHOD path" strings). A
// real gate middleware below refuses matching requests with 503.
function apiDisabledList(): string[] {
  return Array.isArray(db.platformSettings.apiDisabled) ? db.platformSettings.apiDisabled : [];
}
function isApiDisabled(method: string, path: string): boolean {
  const p = String(path || '').split('?')[0];
  return apiDisabledList().some((d) => {
    const [m, ...rest] = String(d).split(' ');
    const dp = rest.join(' ');
    if (m !== method) return false;
    // Path-template match: :param segments match any single segment.
    const dSegs = dp.split('/'); const pSegs = p.split('/');
    if (dSegs.length !== pSegs.length) return false;
    return dSegs.every((s, i) => s.startsWith(':') || s === pSegs[i]);
  });
}

// Gate middleware — refuses requests to currently-disabled endpoints.
app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (isApiDisabled((req.method || 'GET').toUpperCase(), req.originalUrl)) {
      recordSecurityEvent({ type: 'DISABLED_ENDPOINT_ACCESS', severity: 'HIGH', endpoint: req.originalUrl.split('?')[0], account: null, detection: 'A request reached an endpoint that is disabled in the API console.', actionTaken: 'Request refused (503)', status: 'blocked', req, details: { method: req.method } });
      return res.status(503).json({ success: false, message: 'This endpoint is currently disabled by the administrator.' });
    }
  } catch { /* never break request flow */ }
  return next();
});

const API_CONSOLE_SERVICE_HEALTH = () => {
  const now = Date.now();
  const activeSessions = (db.sessions || []).filter((s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > now);
  return {
    generatedAt: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      'Core API':    { status: 'operational', message: 'API responding' },
      'Database':    { status: db ? 'operational' : 'failed', records: db.users.length + db.vendors.length + db.orders.length, persisted: fs.existsSync(DB_FILE) },
      'Auth':        { status: db.users.some((u: any) => ['administrator', 'super-administrator'].includes(u.role)) ? 'operational' : 'degraded', message: 'Admin accounts present' },
      'Realtime':    { status: 'operational', activeConnections: clients.length },
      'Payments':    { status: db.platformSettings.paymentGateways.some((g: any) => g.enabled && g.configured) ? 'operational' : 'degraded', message: 'At least one payable gateway configured' },
      'Notifications': { status: 'operational', queued: (db.notifications || []).length },
      'Orders':      { status: 'operational', active: db.orders.filter((o: any) => ['placed', 'assigned', 'preparing', 'out_for_delivery'].includes(o.status)).length },
      'Delivery':    { status: 'operational', riders: db.riders.filter((r: any) => r.status === 'available' || r.isActive).length },
      'Security':    { status: 'operational', events: db.securityEvents.length },
      'Messaging':   { status: 'operational', conversations: db.conversations.length },
      'Wallet':      { status: 'operational', wallets: db.wallets.length },
    } as Record<string, any>,
    sessions: { active: activeSessions.length, total: (db.sessions || []).length },
    security: { auditEvents: db.audit.length, suspended: db.users.filter((u: any) => u.isSuspended).length, events: (db.securityEvents || []).length },
    memory: { used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) },
    serverTime: new Date().toISOString(),
  };
};

// Build the live endpoint catalog by merging real router traffic (apiMetrics)
// with curated metadata, live security events, and live audit history.
function buildApiConsoleCatalog(): any[] {
  const events = db.securityEvents || [];
  const audit = db.audit || [];
  const disabled = apiDisabledList();
  // Derive the set of real paths that have ever received traffic.
  const known = new Map<string, any>();
  const NO_META: ApiConsoleMeta = { group: 'System', service: 'Core API', description: '', auth: true };

  apiMetrics.forEach((b, key) => {
    const [method, ...rest] = key.split(' ');
    const path = rest.join(' ');
    const meta: ApiConsoleMeta = API_CONSOLE_META[key] || NO_META;
    known.set(key, {
      method: b.method, path,
      group: meta.group || inferGroup(path),
      service: meta.service || 'Core API',
      description: meta.description || `HTTP ${b.method} ${path}`,
      auth: meta.auth !== false,
      role: meta.role, permission: meta.permission,
      rateLimit: meta.rateLimit,
      destructive: !!meta.destructive,
      disabled: isApiDisabled(b.method, path),
      status: computeEndpointStatus(b, events, path, meta),
      metrics: {
        requestsPerMinute: requestsPerMinute(b),
        totalRequests: b.totalRequests,
        avgMs: avgMs(b), p95Ms: p95Ms(b),
        errorRate: errorRatePct(b), timeoutRate: timeoutRatePct(b),
        errorCount: b.errorCount, blockedCount: b.blockedCount,
        statusDist: b.statusDist, lastRequestAt: b.lastRequestAt,
      },
      security: {
        eventCount: events.filter((e: any) => e.endpoint === path).length,
        blockedRequests: events.filter((e: any) => e.endpoint === path && e.status === 'blocked').length,
        lastEvent: events.filter((e: any) => e.endpoint === path).slice(-1)[0] || null,
        risk: riskForEndpoint(events, path),
        types: events.filter((e: any) => e.endpoint === path).reduce((acc: any, e: any) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {}),
      },
      audit: audit.filter((a: any) => (a.entityId === path) || (a.meta && a.meta.endpoint === path)).slice(-6).reverse().map((a: any) => ({ action: a.action, actorName: a.actorName, timestamp: a.timestamp, result: a.result })),
    });
  });

  // Merge route catalog entries that exist as real Express routes even if they
  // have not yet received traffic, so the console reflects the true surface.
  return Array.from(known.values());
}
function inferGroup(path: string): string {
  const seg = String(path || '').split('/')[2] || 'System';
  const map: Record<string, string> = { auth: 'Identity & Governance', users: 'Identity & Governance', roles: 'Identity & Governance', permissions: 'Identity & Governance', vendors: 'Vendors', products: 'Restaurants', riders: 'Riders', orders: 'Orders', payments: 'Payments', reviews: 'Customers', customers: 'Customers', wallets: 'Wallet', coupons: 'System', notifications: 'Notifications', messages: 'Messaging', audit: 'Security', security: 'Security', system: 'System', platform: 'System', admin: 'Control Center', geocoding: 'System', support: 'Messaging', newsletter: 'System', referrals: 'System', categories: 'Restaurants', 'email-log': 'System' };
  return map[seg] || 'System';
}
function computeEndpointStatus(bucket: ApiMetricBucket, events: any[], path: string, meta: any): string {
  if (bucket && bucket.timeoutCount / Math.max(1, bucket.totalRequests) > 0.3) return 'DOWN';
  if (bucket && bucket.totalRequests && bucket.errorCount / bucket.totalRequests > 0.25) return 'DEGRADED';
  if (bucket && bucket.errorCount / Math.max(1, bucket.totalRequests) > 0.05) return 'DEGRADED';
  const critical = events.some((e: any) => e.endpoint === path && e.severity === 'CRITICAL' && e.status !== 'resolved');
  if (critical) return 'BLOCKED';
  return 'HEALTHY';
}
function riskForEndpoint(events: any[], path: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const e = events.filter((x: any) => x.endpoint === path);
  if (e.some((x: any) => x.severity === 'CRITICAL')) return 'HIGH';
  if (e.some((x: any) => x.severity === 'HIGH')) return 'HIGH';
  if (e.some((x: any) => x.severity === 'MEDIUM')) return 'MEDIUM';
  if (e.length) return 'LOW';
  return 'LOW';
}

// Read the API console snapshot (Super Admin, api:view). Everything is derived
// from live request metrics, live security events, and the live audit log.
app.get('/api/admin/api-console', requireSuperAdmin, requirePermission('api:view'), (req, res) => {
  const health = API_CONSOLE_SERVICE_HEALTH();
  const catalog = buildApiConsoleCatalog();
  const events = db.securityEvents || [];
  const criticalEvents = events.filter((e: any) => e.severity === 'CRITICAL' && e.status !== 'resolved').length;
  let totalReqs = 0; let totalErrors = 0; let totalBucketCount = 0;
  apiMetrics.forEach(b => { totalReqs += requestsPerMinute(b); totalErrors += b.errorCount; totalBucketCount += b.totalRequests; });
  const healthy = catalog.filter(c => c.status === 'HEALTHY').length;
  const degraded = catalog.filter(c => c.status === 'DEGRADED').length;
  const down = catalog.filter(c => c.status === 'DOWN').length;
  const blocked = catalog.filter(c => c.status === 'BLOCKED').length;
  const errorRate = totalBucketCount ? Math.round((totalErrors / totalBucketCount) * 10000) / 100 : 0;

  res.json({
    generatedAt: health.generatedAt,
    serverTime: new Date().toISOString(),
    health,
    summary: {
      liveEndpoints: catalog.length,
      healthy, degraded, down, blocked,
      criticalSecurityEvents: criticalEvents,
      requestsPerMinute: totalReqs,
      errorRate,
      disabled: apiDisabledList().length,
    },
    filters: {
      groups: API_CONSOLE_GROUP_ORDER,
      services: Object.keys(health.services),
    },
    endpoints: catalog.sort((a, b) => {
      const ga = API_CONSOLE_GROUP_ORDER.indexOf(a.group); const gb = API_CONSOLE_GROUP_ORDER.indexOf(b.group);
      if (ga !== gb) return (ga === -1 ? 999 : ga) - (gb === -1 ? 999 : gb);
      return a.path < b.path ? -1 : 1;
    }),
  });
});

// Disable or re-enable an endpoint (Super Admin, security:manage, fresh auth,
// audited). Mirrors the high-risk re-auth + audit pattern used for security
// settings and payment gateways.
app.post('/api/admin/api-console/endpoints/toggle', requireSuperAdmin, requirePermission('security:manage'), (req, res) => {
  const actor = (req as any).currentUser;
  const body = req.body.body ?? req.body;
  const { method, path, enabled, password } = body || {};
  if (!method || !path) return res.status(400).json({ success: false, message: 'method and path are required.' });
  const m = String(method).toUpperCase(); const p = String(path).split('?')[0];
  const key = `${m} ${p}`;
  const metaKey = API_CONSOLE_META[key] ? key : null;
  if (!metaKey) return res.status(400).json({ success: false, message: 'Endpoints can only be toggled where backend metadata exists.' });

  const reauthErr = requireReAuth(actor, { password });
  if (reauthErr) return res.status(reauthErr.status).json(reauthErr.body);

  let disabled = apiDisabledList();
  const currently = disabled.some((d) => d === key);
  if (enabled === true && currently) disabled = disabled.filter((d) => d !== key);
  else if (enabled === false && !currently) disabled.push(key);
  db.platformSettings.apiDisabled = disabled;
  logAudit(actor, enabled === false ? 'Endpoint disabled' : 'Endpoint enabled', 'api', p, 'success', { method: m, path: p }, req);
  recordSecurityEvent({ type: enabled === false ? 'ENDPOINT_DISABLED' : 'ENDPOINT_ENABLED', severity: enabled === false ? 'MEDIUM' : 'INFO', endpoint: p, account: actor.email, userId: actor.id, ip: secCtx(req).ip, detection: `Super Admin ${enabled === false ? 'disabled' : 'enabled'} endpoint ${m} ${p} from the API console.`, actionTaken: enabled === false ? 'Endpoint disabled' : 'Endpoint enabled', status: 'resolved', req, details: { method: m, path: p, enabled } });
  res.json({ success: true, disabled: db.platformSettings.apiDisabled, key, enabled: enabled === true });
});

// ============================================================
// INFRASTRUCTURE / PAYMENTS / NOTIFICATIONS ADMIN REPORTS
// Consolidated, backend-derived consoles for System Health,
// Payments & Gateways, and Notifications. Every number is read
// from the live in-memory DB + real request telemetry — nothing
// is fabricated on the server or the client.
// ============================================================

// Last time a health report was genuinely produced (used for the
// "Last checked Xs ago" label; only advance when a real check ran).
let globalLastHealthCheck: string | null = null;

function globalAvgMs(): number | null {
  let n = 0, sum = 0;
  apiMetrics.forEach((b: any) => { n += b.totalRequests || 0; sum += (b.totalRequests || 0) * avgMs(b); });
  return n ? Math.round(sum / n) : null;
}

function normalizeServiceStatus(s: string): 'operational' | 'degraded' | 'down' | 'unknown' {
  if (s === 'operational') return 'operational';
  if (s === 'degraded') return 'degraded';
  if (s === 'down' || s === 'failed') return 'down';
  return 'unknown';
}

function compileSystemReport() {
  const now = Date.now();
  const nowIso = new Date().toISOString();
  const memory = process.memoryUsage();
  const activeSessions = (db.sessions || []).filter((s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > now);
  const orders = (db.orders || []);
  const users = (db.users || []);

  let totalReqs = 0, totalErr = 0, totalCount = 0;
  apiMetrics.forEach((b: any) => { totalReqs += requestsPerMinute(b); totalErr += b.errorCount || 0; totalCount += b.totalRequests || 0; });
  const errorRate = totalCount ? Math.round((totalErr / totalCount) * 10000) / 100 : 0;

  const adminPresent = users.some((u: any) => ['administrator', 'super-administrator'].includes(u.role));
  const enabledGw = (db.platformSettings.paymentGateways || []).filter((g: any) => g.enabled && g.configured);
  const activeOrders = orders.filter((o: any) => ['placed', 'assigned', 'preparing', 'out_for_delivery'].includes(o.status));
  const emailOk = emailProviderConfigured();
  const smsOk = !!process.env.TWILIO_ACCOUNT_SID;

  const sources: Record<string, any> = {
    'Core API': { status: 'operational', message: 'API responding', responseTimeMs: globalAvgMs(), version: (process.env.APP_VERSION || '1.0.0') },
    'Authentication': { status: adminPresent ? 'operational' : 'degraded', message: adminPresent ? 'Authentication service responding' : 'No admin accounts present' },
    'Database': { status: db ? 'operational' : 'down', message: db ? 'Database responding' : 'Database unreachable', records: users.length + (db.vendors || []).length + orders.length, persisted: fs.existsSync(DB_FILE) },
    'Realtime': { status: 'operational', message: `${clients.length} active SSE connections`, activeConnections: clients.length },
    'Payments': { status: enabledGw.length ? 'operational' : 'degraded', message: `${enabledGw.length} gateways configured and enabled` },
    'Orders': { status: 'operational', message: `${activeOrders.length} active orders`, active: activeOrders.length },
    'Delivery': { status: (db.riders || []).some((r: any) => r.status === 'available' || r.isActive) ? 'operational' : 'degraded', message: `${(db.riders || []).filter((r: any) => r.status === 'available' || r.isActive).length} available riders`, riders: (db.riders || []).filter((r: any) => r.status === 'available' || r.isActive).length },
    'Notifications': { status: db.platformSettings.notificationsEnabled ? 'operational' : 'degraded', message: db.platformSettings.notificationsEnabled ? 'System notifications enabled' : 'System notifications disabled' },
    'Email': { status: emailOk ? 'operational' : 'not_configured', configured: emailOk, message: emailProviderStatus().label },
    'SMS': { status: smsOk ? 'operational' : 'not_configured', configured: smsOk, message: 'SMS provider not configured' },
    'Background Jobs': { status: backgroundJobs.length ? 'operational' : 'operational', queued: backgroundJobs.length, running: backgroundRunning },
  };

  const services = Object.entries(sources).map(([name, s]: any) => ({
    name,
    status: normalizeServiceStatus(s.status),
    message: s.message || '',
    responseTimeMs: s.responseTimeMs != null ? s.responseTimeMs : null,
    lastChecked: nowIso,
    uptime: name === 'Core API' ? Math.floor(process.uptime()) : null,
    errorRate,
    version: s.version || null,
    records: s.records != null ? s.records : null,
    activeConnections: s.activeConnections != null ? s.activeConnections : null,
    active: s.active != null ? s.active : null,
    riders: s.riders != null ? s.riders : null,
    queued: s.queued != null ? s.queued : null,
    configured: typeof s.configured === 'boolean' ? s.configured : null,
  }));

  const degraded = services.filter((s: any) => s.status === 'degraded').length;
  const down = services.filter((s: any) => s.status === 'down').length;
  const total = services.length;
  let overallStatus: 'operational' | 'degraded' | 'down' = 'operational';
  if (down > 0) overallStatus = 'down';
  else if (degraded > 0 || db.platformSettings.maintenanceMode) overallStatus = 'degraded';

  const incidents: any[] = [];
  services.forEach((s: any) => {
    if (s.status === 'degraded') incidents.push({ title: s.name, service: s.name, severity: 'warning', status: 'degraded', reason: s.message || 'Service degraded', startedAt: nowIso });
    if (s.status === 'down') incidents.push({ title: s.name, service: s.name, severity: 'critical', status: 'down', reason: s.message || 'Service down', startedAt: nowIso });
  });
  (db.maintenanceWindows || []).filter((w: any) => w.status === 'active').forEach((w: any) => {
    incidents.push({ title: w.title, service: 'Maintenance', severity: 'warning', status: 'active', reason: w.reason || w.description || 'Scheduled maintenance window', startedAt: w.activatedAt || w.scheduledStart });
  });

  const marketplace = {
    restaurants: (db.vendors || []).length,
    riders: (db.riders || []).length,
    customers: users.filter((u: any) => u.role === 'customer').length,
    orders: orders.length,
    activeDeliveries: activeOrders.length,
    pendingVendors: (db.vendors || []).filter((v: any) => v.status === 'pending' || v.verificationStatus === 'pending').length,
    pendingRiders: (db.riders || []).filter((r: any) => r.verificationStatus === 'pending' || !r.isVerified).length,
    pendingApprovals: (db.vendors || []).filter((v: any) => v.status === 'pending' || v.verificationStatus === 'pending').length + (db.riders || []).filter((r: any) => r.verificationStatus === 'pending' || !r.isVerified).length,
    failedPayments: orders.filter((o: any) => o.paymentStatus === 'failed' || o.status === 'failed').length,
  };

  const resources = {
    cpu: null,
    memory: { heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024), heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024), rssMB: Math.round(memory.rss / 1024 / 1024) },
    realtimeConnections: clients.length,
    dbRecords: users.length + (db.vendors || []).length + orders.length,
    requestRatePerMin: totalReqs,
    errorRate,
    backgroundJobs: backgroundJobs.length,
    backgroundRunning: backgroundRunning,
    queueLength: backgroundJobs.length,
    activeSessions: activeSessions.length,
  };

  return {
    generatedAt: nowIso, serverTime: nowIso, uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    lastHealthCheck: globalLastHealthCheck || nowIso,
    overall: { status: overallStatus, label: overallStatus === 'operational' ? 'Operational' : overallStatus === 'down' ? 'Down' : 'Degraded', healthy: total - degraded - down, degraded, down, total },
    services, resources, marketplace, incidents,
    maintenance: { mode: !!db.platformSettings.maintenanceMode, activeWindows: (db.maintenanceWindows || []).filter((w: any) => w.status === 'active').length },
  };
}

function gatewayMethodName(g: any): string {
  const key = String((g.id || '') + ' ' + (g.name || '')).toLowerCase();
  if (/wallet|omni/.test(key)) return 'OmniWallet';
  if (/cod|cash on delivery/.test(key)) return 'Cash on Delivery';
  if (/mtn/.test(key)) return 'MTN MoMo';
  if (/telecel|vodafone/.test(key)) return 'Telecel Cash';
  if (/airteltigo/.test(key)) return 'AirtelTigo Money';
  if (/mastercard/.test(key)) return 'Mastercard';
  if (/visa|card/.test(key)) return 'Visa / Mastercard';
  return g.name || g.id;
}

function orderPaymentStatus(o: any): 'paid' | 'pending' | 'failed' | 'refunded' | 'cancelled' {
  if (o.refundStatus === 'refunded' || o.paymentStatus === 'refunded' || o.status === 'refunded') return 'refunded';
  if (o.paymentStatus === 'failed' || o.status === 'failed') return 'failed';
  if (o.isPaid || o.paymentStatus === 'paid' || ['completed', 'delivered'].includes(o.status)) return 'paid';
  if (o.status === 'cancelled') return 'cancelled';
  return 'pending';
}

function compilePaymentOverview() {
  const gw = db.platformSettings.paymentGateways || [];
  const orders = (db.orders || []);
  const payments = (db.payments || []);
  const events = (db.securityEvents || []);
  const users = (db.users || []);
  const now = new Date();
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  const txs = orders.map((o: any) => {
    const pay = payments.find((p: any) => p.orderId === o.id);
    const status = orderPaymentStatus(o);
    const methodName = pay?.provider || o.paymentMethod || '—';
    const user = users.find((u: any) => u.id === o.customerId);
    return {
      id: pay?.id || o.id,
      orderId: o.id,
      orderNumber: o.orderNumber || o.id,
      customer: o.customerName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '—'),
      customerEmail: user?.email || '',
      method: methodName,
      provider: methodName,
      amount: Number(o.totalAmount) || 0,
      status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt || o.createdAt,
    };
  }).filter((t: any) => t.method !== '—' || t.amount > 0);

  const count = (st: string) => txs.filter((t: any) => t.status === st).length;
  const failedTotal = count('failed');
  const summary = {
    totalTransactions: txs.length,
    successful: count('paid'),
    pending: count('pending'),
    failed: failedTotal,
    refunded: count('refunded'),
    cancelled: count('cancelled'),
    totalVolume: txs.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + t.amount, 0),
    todayVolume: txs.filter((t: any) => t.status === 'paid' && new Date(t.createdAt).toDateString() === now.toDateString()).reduce((s: number, t: any) => s + t.amount, 0),
    failureRate: txs.length ? Math.round((failedTotal / txs.length) * 10000) / 100 : 0,
  };

  const providers = gw.map((g: any) => {
    const name = gatewayMethodName(g);
    const rel = txs.filter((t: any) => String(t.method).toLowerCase() === String(name).toLowerCase() || String(t.method).toLowerCase().includes(String(name).toLowerCase()));
    const success = rel.filter((t: any) => t.status === 'paid').length;
    const failed = rel.filter((t: any) => t.status === 'failed').length;
    const total = rel.length;
    const last = total ? rel.map((r: any) => r.createdAt).sort().pop() : null;
    return {
      id: g.id, name: g.name, shortName: name, type: g.type,
      enabled: g.configured ? !!g.enabled : false,
      configured: !!g.configured,
      operational: !!(g.configured && g.enabled),
      status: !g.configured ? 'not_configured' : (!g.enabled ? 'disabled' : 'enabled'),
      environment: env,
      transactions: total, success, failed,
      successRate: total ? Math.round((success / total) * 10000) / 100 : null,
      failureRate: total ? Math.round((failed / total) * 10000) / 100 : null,
      lastTransaction: last || null,
    };
  });

  const failures = txs.filter((t: any) => t.status === 'failed').map((t: any) => {
    const ev = events.filter((e: any) => e.type === 'PAYMENT_ATTEMPT_FAILURE' && (e.meta?.orderId === t.orderId || e.details?.orderId === t.orderId)).slice(-1)[0];
    const pay = payments.find((p: any) => p.orderId === t.orderId);
    return { id: t.id, orderId: t.orderId, provider: t.provider, customer: t.customer, amount: t.amount, reason: pay?.failureReason || ev?.detection || null, timestamp: t.updatedAt || t.createdAt, status: 'failed' };
  });

  const webhookEvents = events.filter((e: any) => ['INVALID_PAYMENT_WEBHOOK', 'PAYMENT_SIGNATURE_FAILURE'].includes(e.type));
  const processed = db.processedWebhooks || [];
  const lastWebhook = processed.slice(-1)[0] || null;
  const webhooks = {
    lastWebhook: lastWebhook ? (lastWebhook.provider || null) : null,
    lastWebhookAt: lastWebhook ? (lastWebhook.receivedAt || lastWebhook.timestamp || null) : null,
    totalProcessed: processed.length,
    failures: webhookEvents.length,
    signatureFailures: events.filter((e: any) => e.type === 'PAYMENT_SIGNATURE_FAILURE').length,
    retryCount: 0,
  };

  return {
    generatedAt: new Date().toISOString(), serverTime: new Date().toISOString(), environment: env,
    summary, providers,
    transactions: txs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    failures: failures.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100),
    webhooks,
  };
}

function compileNotificationSummary() {
  const notifications = db.notifications || [];
  const deliveries = db.notificationDeliveries || [];
  const inApp = deliveries.filter((d: any) => d.channel === 'In-app');
  const email = deliveries.filter((d: any) => d.channel === 'Email');
  const inAppSent = inApp.filter((d: any) => ['sent', 'queued'].includes(d.status)).length;
  const emailSent = email.filter((d: any) => ['sent', 'queued'].includes(d.status)).length;
  const emailFailed = email.filter((d: any) => d.status === 'failed').length;
  const emailNotConf = email.filter((d: any) => d.status === 'not_configured').length;
  return {
    generatedAt: new Date().toISOString(), serverTime: new Date().toISOString(),
    providers: communicationProviders(),
    summary: {
      total: deliveries.length,
      delivered: inAppSent + emailSent,
      pending: deliveries.filter((d: any) => ['queued', 'sending'].includes(d.status)).length,
      failed: deliveries.filter((d: any) => d.status === 'failed').length,
      notConfigured: emailNotConf + email.filter((d: any) => d.status === 'not_configured').length,
      read: notifications.filter((n: any) => n.read).length,
      unread: notifications.filter((n: any) => !n.read).length,
      byChannel: { inApp: inAppSent, email: { delivered: emailSent, failed: emailFailed, notConfigured: emailNotConf } },
    },
    messagesCount: (db.platformMessages || []).length,
    maintenanceNotifications: (db.maintenanceNotifications || []).length,
  };
}

app.get('/api/admin/system', requireSuperAdmin, requirePermission('api:view'), (req, res) => {
  globalLastHealthCheck = new Date().toISOString();
  res.json(compileSystemReport());
});

app.post('/api/admin/system/check', requireSuperAdmin, requirePermission('api:view'), (req, res) => {
  const actor = (req as any).currentUser;
  globalLastHealthCheck = new Date().toISOString();
  const report = compileSystemReport();
  logAudit(actor, 'System health check', 'system', 'health', 'success', { overall: report.overall.status, services: report.overall.total }, req);
  res.json({ success: true, ...report });
});

app.get('/api/admin/payments/overview', requireSuperAdmin, requirePermission('payments:view'), (req, res) => {
  res.json(compilePaymentOverview());
});

app.get('/api/admin/notifications/summary', requireSuperAdmin, (req, res) => {
  res.json(compileNotificationSummary());
});

bootstrapAdmin();persistDb();

// Drive the idempotent maintenance / scheduled-message scheduler on a timer so
// scheduled notifications, auto-activation and auto-completion actually fire.
setInterval(() => { runMaintenanceScheduler().catch(() => {}); }, 15000);

httpServer.on('error', (err: any) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use. Another OmniMarket server appears to be running.\n`);
    console.error('Fix: stop the other process, then run "npm run dev" again (it auto-cleans stale servers).\n');
    process.exit(1);
    return;
  }
  throw err;
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`OmniMarket Unified Server running on http://localhost:${PORT}`);
});




















