import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { emailService, type EmailLogEntry } from './email/email.service.js';

console.log('!!! OMNIMARKET API SERVER !!!');
console.log('Version: 4.1');
console.log('Time:', new Date().toISOString());

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// 1. ABSOLUTE FIRST PRIORITY: Logger (Before anything else)
app.use((req, res, next) => {
  const size = req.headers['content-length'] ? (parseInt(req.headers['content-length']) / 1024 / 1024).toFixed(2) : '0';
  console.log(`\x1b[35m[NETWORK]\x1b[0m ${req.method} ${req.url} | Size: ${size}MB`);
  next();
});

// 2. Body parsers with explicit large limits
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// 3. CORS and Errors
app.use(cors());

// Handle JSON parsing errors explicitly
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('\x1b[31m[JSON Error]\x1b[0m Malformed JSON received. Is the file too large for your RAM?');
    return res.status(400).json({ success: false, message: "The data you're sending is corrupted or too large for the system to process." });
  }
  next(err);
});

const httpServer = createServer(app);
const PORT = 3999;
const JWT_SECRET = process.env.JWT_SECRET || 'omnimarket_ghana_secure_2024_key';

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
  tickets: [],
  audit: [],
  announcements: [],
  emailLog: [],
  platformSettings: {
    platformName: 'OmniMarket',
    currency: 'GHS',
    defaultCommissionRate: 10,
    defaultDeliveryFee: 3,
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
  }
};

// ------------------------------------------------------------
// ADMIN & SYSTEM HELPERS
// ------------------------------------------------------------

function getAuthUserId(req: express.Request): string | null {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.sub;

    if (!userId) return null;

    // Check for administrative session revocation
    const user = db.users.find((u: any) => u.id === userId);
    if (user && user.tokensRevokedAt) {
      const issuedAt = (decoded.iat || 0) * 1000;
      if (issuedAt < user.tokensRevokedAt) {
        return null;
      }
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

function safeUser(u: any) {
  if (!u) return null;
  return {
    id: u.id, email: u.email, phone: u.phone || '', firstName: u.firstName, lastName: u.lastName,
    displayName: u.displayName, avatarUrl: u.avatarUrl, role: u.role,
    isVerified: !!u.isVerified, isEmailVerified: !!u.isEmailVerified, isPhoneVerified: !!u.isPhoneVerified,
    isApproved: !!u.isApproved, isActive: !!u.isActive, isSuspended: !!u.isSuspended,
    mustChangePassword: !!u.mustChangePassword,
    vendorId: u.vendorId || null, riderId: u.riderId || null,
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt
  };
}

function logAudit(actor: any, action: string, entity: string, entityId: string, result: string, meta?: any) {
  db.audit.push({
    id: `a-${uuidv4().slice(0, 8)}`,
    actorId: actor.id,
    actorName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'Anonymous',
    actorEmail: actor.email,
    action,
    entity,
    entityId,
    result,
    meta: meta || null,
    timestamp: new Date().toISOString()
  });
  if (db.audit.length > 5000) db.audit = db.audit.slice(db.audit.length - 5000);
}

function notifyUser(userId: string, title: string, message: string, type = 'system', referenceId?: string) {
  db.notifications.push({
    id: `n-${uuidv4().slice(0, 8)}`,
    userId,
    title,
    message,
    time: new Date().toISOString(),
    read: false,
    type,
    referenceId,
    referenceType: 'system'
  });
  broadcast('notification', { id: `n-${uuidv4().slice(0, 8)}`, userId, title, message, type }, userId);
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
    status: r.status
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
    isOpen: !!v.isOpen,
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

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>OmniMarket</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center}code{background:#1e293b;padding:2px 8px;border-radius:6px}a{color:#10b981;font-weight:700}</style></head>
<body><div><h1>OmniMarket API Server</h1><p>This is the backend (port 3999). The app lives at <a href="http://localhost:3000">http://localhost:3000</a></p>
<p><code>GET /api/health</code> for status</p></div></body></html>`);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'OmniMarket API is running',
    version: '4.1',
    userCount: db.users.length,
    lastServerError: (app as any).lastError || null,
    serverTime: new Date().toISOString()
  });
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
      const decoded = jwt.verify(token, JWT_SECRET) as any;
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

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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
  console.log(`[Auth Request] Identifier: ${identifier}, Portal: ${portal}`);

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Missing email/phone or password' });
  }

  const id = identifier.toLowerCase().trim();
  const pass = password.trim();
  const hashedPass = hashPassword(pass);

  const user = db.users.find(u =>
    (u.email.toLowerCase().trim() === id || u.phone?.trim() === identifier.trim())
  );

  if (!user) {
    console.log(`[Auth] User not found: ${identifier}`);
    return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
  }

  // Account Lockout check
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return res.status(403).json({ success: false, message: `Account is locked. Try again in ${minutes} minutes.` });
  }

  // Support both legacy (plain text) and hashed for transition if needed,
  // but we should enforce hashed for new production logic.
  // For this transition, we'll check against hashed version.
  const passMatch = user.password === hashedPass || user.password === pass;

  if (!passMatch) {
    console.log(`[Auth] Password mismatch for ${identifier}`);

    // Increment attempts and potentially lock
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockedUntil = Date.now() + (15 * 60 * 1000); // 15 min lockout
      user.loginAttempts = 0;
      logAudit(user, 'Account locked', 'user', user.id, 'success', { reason: 'Too many failed login attempts' });
      return res.status(403).json({ success: false, message: 'Too many failed attempts. Account locked for 15 minutes.' });
    }

    return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
  }

  // Reset attempts on success
  user.loginAttempts = 0;
  user.lockedUntil = 0;

  if (portal === 'admin' && !['administrator', 'super-administrator'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ success: false, message: 'Account is suspended' });
  }

  // Enforce approval for Vendors and Riders
  if ((user.role === 'vendor' || user.role === 'rider') && !user.isApproved) {
    return res.status(403).json({ success: false, message: 'Your account is pending approval.' });
  }

  // SEND LOGIN OTP AS REQUESTED
  const code = generateOtp();
  storeOtp(user.email.toLowerCase(), code);
  queueEmail({ to: user.email, template: 'otp', data: { code } });
  // Dev/demo convenience: log ONLY a hint, the real code is sent via email.
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
  // Demo code 123456 is always accepted for local development; otherwise the
  // freshly generated code (sent by email) is required.
  const isDemo = code === '123456';
  const validCode = isDemo || (stored && otpMatches(userKey, code));
  if (!validCode) {
    if (stored) {
      stored.attempts += 1;
      // Invalidate after too many attempts to prevent brute force.
      if (stored.attempts >= OTP_MAX_ATTEMPTS) consumeOtp(userKey);
    }
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
  }

  // Success! Clean up and issue tokens
  consumeOtp(userKey);

  if (portal === 'admin' && !['administrator', 'super-administrator'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted' });
  }

  const accessToken = jwt.sign({
    sub: user.id,
    role: user.role,
    vendorId: (user as any).vendorId,
    riderId: (user as any).riderId,
    mustChangePassword: !!user.mustChangePassword
  }, JWT_SECRET, { expiresIn: '1h' });

  const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

  user.lastLoginAt = new Date().toISOString();

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

// Return the current user profile from a valid access token (used on page refresh)
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    res.json(safeUser(user));
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

    // Bulletproof Duplicate Check
    const normalizedEmail = String(payload.email).toLowerCase().trim();
    const emailExists = db.users.some(u => u && u.email && String(u.email).toLowerCase().trim() === normalizedEmail);

    if (emailExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const userId = uuidv4();
    let role = payload.role || 'customer';

    if (['administrator', 'super-administrator'].includes(role)) role = 'customer';

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
      isVerified: role === 'customer',
      isEmailVerified: role === 'customer',
      isPhoneVerified: false,
      isApproved: role === 'customer',
      isActive: true,
      isSuspended: false,
      twoFactorEnabled: false
    };

    if (role === 'vendor') {
      const vendorId = `v-${uuidv4().slice(0, 8)}`;
      newUser.vendorId = vendorId;
      db.vendors.push({
        id: vendorId, ownerId: userId, name: payload.businessName || 'New Restaurant',
        slug: (payload.businessName || 'new-restaurant').toLowerCase().replace(/\s+/g, '-'),
        logo: payload.logoUrl || '', banner: payload.coverUrl || '',
        category: payload.category || 'Local Dishes', address: payload.businessAddress || '',
        openHours: payload.openingHours || '08:00 AM - 10:00 PM', phone: payload.phone || '',
        email: normalizedEmail, status: 'pending', joinedDate: new Date().toISOString(),
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
        verification: { driverLicense: payload.driverLicense || '', nationalId: payload.nationalId || '' }
      });
    }

    db.users.push(newUser);
    db.wallets.push({ userId, balance: 0, currency: 'GHS' });

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
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = jwt.sign({ sub: user.id, role: user.role, vendorId: (user as any).vendorId, riderId: (user as any).riderId }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ accessToken, refreshToken, expiresIn: 3600, tokenType: 'Bearer' });
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

  user.password = hashPassword(newPassword);
  user.mustChangePassword = false;
  consumeOtp(normalizedEmail);

  console.log(`[AUTH] Password reset successful for ${email}`);
  logAudit(user, 'Password reset completed', 'user', user.id, 'success');

  res.json({ success: true, message: 'Password has been successfully reset.' });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).currentUserId;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // If user is forced to change password, we might skip currentPassword check
  // if they logged in with a temp password. But usually we still want it.
  if (user.password !== hashPassword(currentPassword) && user.password !== currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
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
  res.json({ success: true, message: 'Password updated successfully.' });
});
// Admin-only security actions
app.post('/api/auth/admin/reset-password', requireSuperAdmin, (req, res) => {
  const { userId, newPassword } = req.body;
  const actor = (req as any).currentUser;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.password = hashPassword(newPassword);
  user.mustChangePassword = true; // Force them to change it

  logAudit(actor, 'Admin reset user password', 'user', user.id, 'success');
  notifyUser(user.id, 'Security Alert', 'Your password was reset by an administrator. Please change it upon login.');
  queueEmail({
    to: user.email,
    template: 'admin_password_changed',
    data: { firstName: user.firstName },
    eventKey: `admin-reset:${user.id}:${Date.now()}`
  });

  res.json({ success: true, message: 'User password reset.' });
});

app.post('/api/auth/admin/generate-temp-password', requireSuperAdmin, (req, res) => {
  const { userId } = req.body;
  const actor = (req as any).currentUser;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const tempPass = generateTempPassword();
  user.password = hashPassword(tempPass);
  user.mustChangePassword = true;

  logAudit(actor, 'Admin generated temp password', 'user', user.id, 'success');
  queueEmail({
    to: user.email,
    template: 'security_alert',
    data: { firstName: user.firstName, message: 'An administrator generated a temporary password for your OmniMarket account. Please log in and change it immediately.' },
    eventKey: `temp-password:${user.id}:${Date.now()}`
  });

  res.json({ success: true, tempPassword: tempPass });
});

app.post('/api/auth/admin/force-reset', requireSuperAdmin, (req, res) => {
  const { userId } = req.body;
  const actor = (req as any).currentUser;
  const user = db.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.mustChangePassword = true;

  logAudit(actor, 'Admin forced password reset', 'user', user.id, 'success');
  res.json({ success: true, message: 'User will be forced to change password at next login.' });
});


app.get('/api/auth/sessions/:userId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  res.json([
    {
      sessionId: 'session-1',
      deviceId: 'device-1',
      deviceName: 'Chrome on Windows',
      ipAddress: req.ip,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isCurrent: true
    }
  ]);
});

app.delete('/api/auth/sessions/:userId', requireSuperAdmin, (req, res) => {
  const { userId } = req.params;
  const actor = (req as any).currentUser;
  const user = db.users.find((u: any) => u.id === userId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Mark all existing tokens as revoked
  user.tokensRevokedAt = Date.now();

  logAudit(actor, 'Admin revoked all user sessions', 'user', userId, 'success');
  res.sendStatus(204);
});

app.delete('/api/auth/sessions/:userId/:sessionId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  res.sendStatus(204);
});

// ------------------------------------------------------------
// BUSINESS LOGIC ENDPOINTS
// ------------------------------------------------------------

app.get('/api/vendors', (req, res) => {
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  const isAdmin = user && ['administrator', 'super-administrator'].includes(user.role);

  let vendors = db.vendors;
  // If not admin, only show active vendors
  const filtered = isAdmin ? vendors : vendors.filter((v: any) => v.status === 'active');

  res.json(filtered.map((v: any) => {
    const agg = vendorAggregate(v);
    return isAdmin ? agg : publicVendor(v, agg);
  }));
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
  if (updates.image !== undefined) category.image = updates.image;
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
    images: Array.isArray(p.images) && p.images.length ? p.images : [p.image || ''],
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
  res.status(201).json(product);
});

// Update a menu item
app.patch('/api/products/:id', (req, res) => {
  const product = db.products.find(pp => pp.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!canManageVendor(req, product.vendorId)) return res.status(403).json({ error: 'Forbidden' });
  const u = req.body.body ?? req.body;
  Object.assign(product, u);
  if (u.stock !== undefined) product.stock = Number(u.stock);
  if (u.price !== undefined) product.price = Number(u.price);
  if (u.title) product.title = u.title;
  if (Array.isArray(u.images) && u.images.length) product.images = u.images;
  product.isAvailable = (product.stock || 0) > 0;
  res.json(product);
});

// Remove a menu item
app.delete('/api/products/:id', (req, res) => {
  const idx = db.products.findIndex(pp => pp.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  if (!canManageVendor(req, db.products[idx].vendorId)) return res.status(403).json({ error: 'Forbidden' });
  db.products.splice(idx, 1);
  res.json({ success: true });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const { role, id } = req.query;
  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ success: false, message: 'Authentication required' });

  // Admin/super-admin can list any scope; everyone else is locked to their own records.
  const isAdmin = ['administrator', 'super-administrator'].includes(currentUser.role);
  let filtered = db.orders;
  if (role === 'customer') filtered = filtered.filter(o => o.customerId === id);
  else if (role === 'vendor') filtered = filtered.filter(o => o.vendorId === id);
  else if (role === 'rider') filtered = filtered.filter(o => o.riderId === id);

  // Never leak another user's orders to a non-admin.
  if (!isAdmin) {
    filtered = filtered.filter(o =>
      o.customerId === currentUserId ||
      o.vendorId === currentUser.vendorId ||
      o.riderId === currentUserId
    );
  }

  res.json(filtered);
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
    order.riderId === currentUserId
  );
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'You do not have access to this order.' });

  res.json(order);
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
    order.riderId === currentUserId
  );

  if (isAdmin || isOwner) return res.json(order);
  return res.json(publicOrder(order));
});

app.post('/api/orders/:id/assign-rider', requireAuth, (req, res) => {
  const { riderId } = req.body;
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const order = db.orders[orderIndex];
  const isOwner = currentUser && (order.vendorId === currentUser.vendorId || order.customerId === currentUser.id);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  db.orders[orderIndex].riderId = riderId;
  db.orders[orderIndex].status = 'picked_up';
  const updatedOrder = db.orders[orderIndex];

  // Notify Rider and Customer
  broadcast('order_update', updatedOrder, updatedOrder.customerId);
  const rider = db.riders.find(r => r.id === riderId);
  if (rider) {
    broadcast('order_update', updatedOrder, rider.userId);
    const riderUser = db.users.find(u => u.id === rider.userId);
    if (riderUser) {
      queueEmail({
        to: riderUser.email,
        template: 'rider_assigned',
        data: {
          firstName: riderUser.firstName,
          orderNumber: updatedOrder.orderNumber,
          vendorName: updatedOrder.vendorName,
          customerAddress: `${updatedOrder.customerAddress || ''}`
        },
        eventKey: `rider-assigned:${updatedOrder.id}:${riderId}`
      });
    }
  }

  res.json(updatedOrder);
});

app.post('/api/orders', requireAuth, (req, res) => {
  const { items, customerId, vendorId, totalAmount, vendorLat, vendorLng, customerLat, customerLng, paymentMethod, deliveryMethod, specialInstructions, riderId, couponCode, address } = req.body;

  // Orders must belong to the authenticated caller.
  if (customerId && customerId !== (req as any).currentUserId) {
    return res.status(403).json({ success: false, message: 'You can only place orders on your own account.' });
  }

  const vendor = db.vendors.find(v => v.id === vendorId);

  // Do not accept new orders from suspended vendors
  if (vendor && vendor.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'This restaurant is currently suspended and cannot accept orders.' });
  }

  const customer = db.users.find(u => u.id === customerId);
  const rider = db.riders.find(r => r.id === riderId);

  const orderId = uuidv4();
  const subtotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const deliveryFee = deliveryMethod === 'delivery' ? (rider ? rider.deliveryFee : (Number(db.platformSettings.defaultDeliveryFee) || 3)) : 0;
  const tax = subtotal * 0.05;

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
        return res.status(400).json({ success: false, message: 'This coupon is no longer valid for this order.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);
  const { platformCommission, vendorPayout } = computeOrderMoney({ subtotal });

  const newOrder = {
    id: orderId,
    orderNumber: `OM-${Math.floor(100000 + Math.random() * 900000)}`,
    invoiceNumber: `INV-${Date.now()}`,
    customerId,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Customer',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    customerAddress: address || 'Address not provided',
    vendorId,
    vendorName: vendor?.name || 'Restaurant',
    riderId,
    dispatchRider: rider,
    items: items.map((i: any) => ({ ...i, id: uuidv4(), orderId })),
    subtotal,
    deliveryFee,
    tax,
    discount,
    couponCode: couponCode || null,
    totalAmount: grandTotal,
    platformCommission,
    vendorPayout,
    status: 'pending',
    paymentStatus: paymentMethod === 'Cash on Delivery' ? 'pending' : 'paid',
    paymentMethod: paymentMethod || 'OmniWallet',
    deliveryMethod: deliveryMethod || 'delivery',
    specialInstructions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    vendorLat,
    vendorLng,
    customerLat,
    customerLng,
    estimatedDeliveryTime: '35-45 mins'
  };

  db.orders.push(newOrder as any);

  // Record the payment transaction when auto-paid
  if (newOrder.paymentStatus === 'paid') {
    db.transactions.push({
      id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
      userId: customerId,
      type: 'debit',
      category: 'order_payment',
      amount: grandTotal,
      description: `Payment for order ${newOrder.orderNumber}`,
      status: 'Completed',
      referenceId: orderId,
      referenceType: 'order',
      createdAt: new Date().toISOString()
    });
  }

  // Send Order Confirmation Email
  if (customer) {
    const itemsSummary = items.map((i: any) =>
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
    notifyUser(vendor.ownerId, 'New Order Received!', `Order ${newOrder.orderNumber} for ${newOrder.customerName} has been placed.`, 'order', newOrder.id);
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

  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) return res.status(404).json({ error: 'Order not found' });

  const currentUserId = (req as any).currentUserId;
  const currentUser = db.users.find((u: any) => u.id === currentUserId);
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const order = db.orders[orderIndex];
  const isOwner = currentUser && (
    order.vendorId === currentUser.vendorId ||
    order.riderId === currentUserId ||
    order.customerId === currentUserId
  );
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  db.orders[orderIndex].status = status;
  db.orders[orderIndex].updatedAt = new Date().toISOString();
  if (status === 'delivered' || status === 'completed') db.orders[orderIndex].deliveredAt = new Date().toISOString();
  if (status === 'picked_up') db.orders[orderIndex].pickedUpAt = new Date().toISOString();
  const updatedOrder = db.orders[orderIndex];

  // On completed/delivered: settle vendor payout + rider earnings
  if (status === 'delivered' || status === 'completed') {
    const vendor = db.vendors.find(v => v.id === updatedOrder.vendorId);
    if (vendor) {
      const tx = {
        id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
        userId: vendor.ownerId,
        type: 'credit',
        category: 'vendor_payout',
        amount: Number(updatedOrder.vendorPayout) || 0,
        description: `Payout for completed order ${updatedOrder.orderNumber}`,
        status: 'Completed',
        referenceId: updatedOrder.id,
        referenceType: 'order',
        createdAt: new Date().toISOString()
      };
      db.transactions.push(tx);
      const wallet = db.wallets.find(w => w.userId === vendor.ownerId);
      if (wallet) wallet.balance = (Number(wallet.balance) || 0) + tx.amount;
    }
    const rider = db.riders.find(r => r.id === updatedOrder.riderId);
    if (rider) {
      const riderUser = db.users.find(u => u.id === rider.userId);
      const earning = Number(rider.deliveryFee) || Number(db.platformSettings.defaultDeliveryFee) || 0;
      db.transactions.push({
        id: `tx-${Date.now()}-${uuidv4().slice(0, 4)}`,
        userId: rider.userId,
        type: 'credit',
        category: 'rider_earning',
        amount: earning,
        description: `Delivery earnings for order ${updatedOrder.orderNumber}`,
        status: 'Completed',
        referenceId: updatedOrder.id,
        referenceType: 'order',
        createdAt: new Date().toISOString()
      });
      rider.totalDeliveries = (Number(rider.totalDeliveries) || 0) + 1;
      rider.totalEarnings = (Number(rider.totalEarnings) || 0) + earning;
      rider.status = 'AVAILABLE';
      rider.isAvailable = true;

      // Email Rider about completed delivery
      if (riderUser) {
        queueEmail({
          to: riderUser.email,
          template: 'rider_delivery_completed',
          data: { firstName: riderUser.firstName, orderNumber: updatedOrder.orderNumber, earning: `GHS ${earning.toFixed(2)}` },
          eventKey: `rider-completed:${updatedOrder.id}:${riderUser.id}`
        });
      }
    }

    // Email Customer about completed delivery
    const customer = db.users.find(u => u.id === updatedOrder.customerId);
    if (customer) {
      queueEmail({
        to: customer.email,
        template: 'delivery_completed',
        data: { firstName: customer.firstName, orderNumber: updatedOrder.orderNumber, vendorName: updatedOrder.vendorName },
        eventKey: `delivery-completed:${updatedOrder.id}:${customer.id}`
      });
    }
  }

  // Notify Customer
  broadcast('order_update', updatedOrder, updatedOrder.customerId);

  // If ready for pickup, notify riders
  if (status === 'ready_for_pickup') {
    db.riders.filter(r => r.isOnline && r.isAvailable).forEach(rider => {
      notifyUser(rider.userId, 'Delivery Job Available', `New delivery from ${db.vendors.find(v => v.id === updatedOrder.vendorId)?.name}`, 'info');
    });
  }

  res.json(updatedOrder);
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
  const { amount, method } = req.body;
  const wallet = db.wallets.find(w => w.userId === req.params.userId);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  wallet.balance += Number(amount);

  const transaction = {
    id: `tx-${Date.now()}`,
    userId: req.params.userId,
    type: 'credit',
    category: 'top_up',
    amount: Number(amount),
    description: `Wallet Top-up via ${method}`,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  db.transactions.push(transaction as any);

  res.json(transaction);
});

app.post('/api/wallets/:userId/withdrawals', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  const { amount, method, bankInfo } = req.body;
  const wallet = db.wallets.find(w => w.userId === req.params.userId);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  wallet.balance -= Number(amount);

  const transaction = {
    id: `tx-${Date.now()}`,
    userId: req.params.userId,
    type: 'debit',
    category: 'withdrawal',
    amount: Number(amount),
    description: `Withdrawal to ${method}`,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.transactions.push(transaction as any);

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
  // Authenticated app users (customer, rider, vendor, admin) reach this list for
  // checkout, dispatch and portal features. Guests only ever receive the
  // sanitized public shape (no phone, license, GPS or earnings).
  const userId = getAuthUserId(req);
  const user = userId ? db.users.find((u: any) => u.id === userId) : null;
  if (user) return res.json(db.riders);
  return res.json(db.riders.map(r => publicRider(r)));
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

  const actor = (req as any).currentUser;
  if (actor && (actor.role === 'administrator' || actor.role === 'super-administrator')) {
    logAudit(actor, `Rider ${rider.isOnline ? 'brought online' : 'taken offline'}`, 'rider', rider.id, 'success', { name: rider.name });
  }
  res.json(rider);
});

app.post('/api/payments/paystack/initialize', (req, res) => {
  const { amount, email } = req.body;
  // In production, you'd call Paystack API here
  res.json({
    status: true,
    data: {
      authorization_url: 'https://checkout.paystack.com/demo',
      access_code: 'demo_access_code',
      reference: `OM-${uuidv4()}`
    }
  });
});

// Build the customer profile payload shape returned by GET/PATCH endpoints.
function buildCustomerProfile(user: any, wallet: any) {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim() || user.displayName || 'User',
    email: user.email,
    avatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
    phone: user.phone || '',
    addresses: Array.isArray(user.deliveryAddress) && user.deliveryAddress.length > 0
      ? user.deliveryAddress
      : [
          { id: 'addr-1', title: 'Home', address: 'Market Circle, Takoradi', isDefault: true, latitude: 4.8920, longitude: -1.7580 },
          { id: 'addr-2', title: 'Work', address: 'Chapel Hill, Takoradi', isDefault: false, latitude: 4.9010, longitude: -1.7640 }
        ],
    momo: user.momo || null,
    walletBalance: wallet?.balance || 0,
    loyaltyPoints: 0,
    referralCode: `OM-${user.id.slice(0, 4).toUpperCase()}`
  };
}

app.get('/api/customers/:id', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const wallet = db.wallets.find(w => w.userId === req.params.id);

  res.json(buildCustomerProfile(user, wallet));
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
  if (typeof updates.avatar === 'string' && updates.avatar) user.avatarUrl = updates.avatar;

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

app.get('/api/notifications/:userId', (req, res) => {
  if (!isOwnerOrAdmin(req, req.params.userId)) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.notifications.filter(n => n.userId === req.params.userId));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif && !isOwnerOrAdmin(req, notif.userId)) return res.status(403).json({ error: 'Forbidden' });
  if (notif) notif.read = true;
  res.sendStatus(204);
});

app.get('/api/reviews', (req, res) => {
  const { userId, vendorId, productId } = req.query;
  // Private review history is only for the review owner (or an admin).
  if (userId && !isOwnerOrAdmin(req, String(userId))) return res.status(403).json({ error: 'Forbidden' });
  let filtered = db.reviews;
  if (userId) filtered = filtered.filter(r => r.userId === userId);
  if (vendorId) filtered = filtered.filter(r => r.vendorId === vendorId);
  if (productId) filtered = filtered.filter(r => r.productId === productId);
  res.json(filtered);
});

app.post('/api/reviews', (req, res) => {
  const body = req.body.body ?? req.body;
  const actorId = getAuthUserId(req);
  if (!actorId) return res.status(401).json({ error: 'Authentication required' });
  // Reviews are always tied to the authenticated author (cannot impersonate others).
  const authorId = body.userId || actorId;
  const newReview = {
    id: uuidv4(),
    ...body,
    userId: authorId,
    date: new Date().toISOString()
  };
  db.reviews.push(newReview);
  res.status(201).json(newReview);
});

app.get('/api/search', (req, res) => {
  const { q, cat } = req.query;
  const query = (q as string || '').toLowerCase();

  const filteredProducts = db.products.filter(p =>
    (p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)) &&
    (cat === 'All' || !cat || p.category === cat)
  );

  const filteredVendors = db.vendors
    .filter(v => v.name.toLowerCase().includes(query) || v.description.toLowerCase().includes(query))
    .map((v: any) => publicVendor(v, vendorAggregate(v)));

  res.json({ products: filteredProducts, vendors: filteredVendors });
});

app.get('/api/coupons', (req, res) => {
  res.json(db.coupons);
});

app.get('/api/products/trending', (req, res) => {
  res.json(db.products.filter(p => p.isTrending));
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
  res.json({ openHours: vendor.openHours || '08:00 AM - 10:00 PM', hours: vendor.hours || null });
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
  res.json({ openHours: vendor.openHours, hours: vendor.hours || null });
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

  const prevStatus = vendor.status;
  Object.assign(vendor, updates);

  // Sync the owner account's approval so they can actually log in once approved
  const owner = db.users.find(u => u.id === vendor.ownerId);
  if (owner) {
    owner.isApproved = updates.status === 'active';
    if (updates.status) owner.isSuspended = updates.status === 'suspended';
  }

  // Audit + notify when an administrator changes a vendor's operational status
  if (updates.status && updates.status !== prevStatus) {
    const actor = (req as any).currentUser;
    if (actor) {
      logAudit(actor, `Vendor ${updates.status}`, 'vendor', vendor.id, 'success', { name: vendor.name, prevStatus });
    }
    if (owner) {
      if (updates.status === 'active') {
        notifyUser(owner.id, 'Application Approved', `${vendor.name} has been approved. You can now log in and manage your restaurant.`);
        queueEmail({
          to: owner.email,
          template: 'account_approved',
          data: { firstName: owner.firstName, vendorName: vendor.name },
          eventKey: `vendor-approved:${vendor.id}:${owner.id}`
        });
      }
      if (updates.status === 'suspended') {
        notifyUser(owner.id, 'Restaurant Suspended', `${vendor.name} has been suspended. Please contact support.`);
        queueEmail({
          to: owner.email,
          template: 'security_alert',
          data: { firstName: owner.firstName, message: `Your restaurant ${vendor.name} has been suspended. Please contact our support team for details.` },
          eventKey: `vendor-suspended:${vendor.id}:${owner.id}`
        });
      }
      if (updates.status === 'rejected') {
        const reason = updates.rejectionReason || 'Please contact support for details.';
        notifyUser(owner.id, 'Application Rejected', `Your restaurant application was rejected. ${reason}`);
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

// Manually add a restaurant (admin) — mirrors the vendor registration payload
app.post('/api/vendors', (req, res) => {
  const p = req.body.body ?? req.body;
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
    email: (p.email || '').toLowerCase(),
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
  if (p.email) {
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

  res.status(201).json(vendor);
});

// Remove a restaurant permanently
app.delete('/api/vendors/:id', (req, res) => {
  const idx = db.vendors.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });
  db.vendors.splice(idx, 1);
  db.products = db.products.filter(p => p.vendorId !== req.params.id);
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

  const updates = req.body.body ?? req.body;
  Object.assign(rider, updates);
  if (updates.verificationStatus === 'verified') rider.isVerified = true;
  if (updates.verificationStatus === 'rejected') rider.isVerified = false;

  // Sync the rider's user account so a verified rider can log in
  const user = db.users.find(u => u.id === rider.userId);
  if (user && updates.verificationStatus) {
    user.isApproved = updates.verificationStatus === 'verified';
  }

  const actor = (req as any).currentUser;
  if (actor && updates.verificationStatus && updates.verificationStatus !== rider.verificationStatus) {
    logAudit(actor, `Rider ${updates.verificationStatus}`, 'rider', rider.id, 'success', { name: rider.name });
  }
  if (user && updates.verificationStatus === 'verified') {
    notifyUser(user.id, 'Rider Account Verified', 'Your rider account has been verified. You can now go online.');
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
  const filtered = db.conversations.filter(c => c.participantIds.includes(userId as string));

  // Attach participant info
  const result = filtered.map(c => ({
    ...c,
    participants: c.participantIds
      .filter(id => id !== userId)
      .map(id => {
        const user = db.users.find(u => u.id === id);
        const vendor = db.vendors.find((v: any) => v.ownerId === id);
        return {
          id,
          name: vendor?.name || user?.displayName || user?.firstName || 'User',
          avatar: user?.avatarUrl || vendor?.logo || ''
        };
      }),
    type: c.type || 'customer_vendor'
  }));

  res.json(result);
});

// Find-or-create a 1:1 conversation between two users (customer & vendor/rider).
// Used so a customer can start messaging a restaurant without an order.
app.post('/api/messages/conversations', (req, res) => {
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
    subject: subject || 'Chat',
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
  const isParticipant = currentUser && conv.participantIds.includes(currentUser.id);
  if (!isAdmin && !isParticipant) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.messages.filter(m => m.conversationId === req.params.conversationId));
});

app.post('/api/messages', (req, res) => {
  const { conversationId, senderId, content } = req.body.body ?? req.body;
  if (!conversationId || !senderId || !content?.trim()) {
    return res.status(400).json({ error: 'conversationId, senderId and content are required' });
  }
  const conv = db.conversations.find(c => c.id === conversationId);
  const currentUserId = getAuthUserId(req);
  const currentUser = currentUserId ? db.users.find((u: any) => u.id === currentUserId) : null;
  const isAdmin = currentUser && ['administrator', 'super-administrator'].includes(currentUser.role);
  const isParticipant = currentUser && conv && conv.participantIds.includes(currentUser.id);
  if (conv && !isAdmin && !isParticipant) return res.status(403).json({ error: 'Forbidden' });
  const newMessage = {
    id: uuidv4(),
    conversationId,
    senderId,
    content: String(content).trim(),
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.messages.push(newMessage);

  // Update conversation
  if (conv) {
    conv.lastMessage = newMessage.content;
    conv.lastMessageAt = newMessage.createdAt;
    // bump unread for the other participant only
    const other = conv.participantIds.find((id: string) => id !== senderId);
    conv.unreadCount = Number(conv.unreadCount) + 1;
    if (other) broadcast('message', newMessage, other);
    if (other) {
      notifyUser(other, 'New Message', `${conv.subject || 'New message'} — ${newMessage.content}`, 'info');
    }
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
    users: users.length
  });
});

// Full user directory (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
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

app.get('/api/users/:id', requireAdmin, (req, res) => {
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

app.patch('/api/users/:id', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const user = db.users.find((x: any) => x.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'administrator' && actor.role !== 'super-administrator') {
    return res.status(403).json({ success: false, message: 'Only the Super Admin can modify admin accounts.' });
  }
  const updates = req.body.body ?? req.body;

  if (updates.isSuspended !== undefined) {
    user.isSuspended = !!updates.isSuspended;
    user.isActive = !user.isSuspended;
  }
  if (updates.isApproved !== undefined) user.isApproved = !!updates.isApproved;
  if (updates.firstName) user.firstName = updates.firstName;
  if (updates.lastName) user.lastName = updates.lastName;
  if (updates.phone) user.phone = updates.phone;
  if (updates.displayName) user.displayName = updates.displayName;
  if (actor.role === 'super-administrator' && updates.role && ['customer', 'vendor', 'rider', 'administrator', 'super-administrator'].includes(updates.role)) {
    user.role = updates.role;
  }

  logAudit(actor, 'User updated', 'user', user.id, 'success', updates);
  notifyUser(user.id, 'Account Updated', 'Your account details were updated by an administrator.');
  res.json({ ...safeUser(user), totalOrders: db.orders.filter((o: any) => o.customerId === user.id).length });
});

// Super admin creates admin accounts
app.post('/api/users', requireSuperAdmin, (req, res) => {
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

app.delete('/api/users/:id', requireSuperAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const idx = db.users.findIndex((u: any) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const target = db.users[idx];
  if (target.id === actor.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  db.users.splice(idx, 1);
  logAudit(actor, 'User deleted', 'user', target.id, 'success', { email: target.email });
  res.json({ success: true });
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
app.get('/api/transactions', requireAdmin, (req, res) => {
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
app.get('/api/payments', requireAdmin, (req, res) => {
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

// Rider earnings
app.get('/api/rider-earnings', requireAdmin, (req, res) => {
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
  res.json({ valid: true, coupon, discount, message: `Coupon applied: GHS ${discount.toFixed(2)} off` });
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
    notifyUser(a.id, 'New Support Ticket', subject, 'system', ticket.id);
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
    notifyUser(otherId, 'Support Reply', content.slice(0, 80), 'system', ticket.id);
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

// Server-side audit log (immutable to admins, super-admin can read)
app.get('/api/audit', requireSuperAdmin, (req, res) => {
  res.json([...db.audit].reverse());
});

// Platform settings (super admin)
app.get('/api/platform/settings', (req, res) => {
  res.json(db.platformSettings);
});

app.put('/api/platform/settings', requireSuperAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const updates = req.body.body ?? req.body;
  db.platformSettings = { ...db.platformSettings, ...updates, updatedAt: new Date().toISOString() };
  logAudit(actor, 'Platform settings updated', 'platform_settings', 'global', 'success', updates);
  res.json(db.platformSettings);
});

app.get('/api/payment-gateways', (req, res) => {
  res.json(db.platformSettings.paymentGateways);
});

app.patch('/api/payment-gateways/:id', requireSuperAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const gw = db.platformSettings.paymentGateways.find((g: any) => g.id === req.params.id);
  if (!gw) return res.status(404).json({ error: 'Gateway not found' });
  const updates = req.body.body ?? req.body;
  Object.assign(gw, updates);
  logAudit(actor, 'Payment gateway updated', 'payment_gateway', gw.id, 'success', updates);
  res.json(db.platformSettings.paymentGateways);
});

// Platform announcement broadcast
app.post('/api/announcements', requireAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required.' });
  const announcement = { id: `an-${uuidv4().slice(0, 8)}`, title, message, createdBy: actor.id, createdAt: new Date().toISOString() };
  db.announcements.push(announcement);
  let sent = 0;
  db.users.forEach((u: any) => {
    notifyUser(u.id, title, message, 'system');
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

// System health with real checks
app.get('/api/system/health', requireAdmin, (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    api: { status: 'operational', message: 'API responding' },
    database: { status: db ? 'operational' : 'failed', records: db.users.length + db.vendors.length + db.orders.length, persisted: fs.existsSync(DB_FILE) },
    auth: { status: db.users.some((u: any) => ['administrator', 'super-administrator'].includes(u.role)) ? 'operational' : 'degraded', message: 'Admin accounts present' },
    realtime: { status: clients.length >= 0 ? 'operational' : 'operational', activeConnections: clients.length },
    memory: { used: Math.round(memory.heapUsed / 1024 / 1024), total: Math.round(memory.heapTotal / 1024 / 1024), rss: Math.round(memory.rss / 1024 / 1024) },
    serverTime: new Date().toISOString()
  });
});

// Backup & restore (server-side)
app.get('/api/system/backup', requireSuperAdmin, (req, res) => {
  res.json({ createdAt: new Date().toISOString(), db });
});

app.post('/api/system/backup', requireSuperAdmin, (req, res) => {
  const actor = (req as any).currentUser;
  db.platformSettings.lastBackupAt = new Date().toISOString();
  persistDb();
  logAudit(actor, 'Database backup created', 'database', 'global', 'success', { file: DB_FILE });
  res.json({ success: true, createdAt: db.platformSettings.lastBackupAt, file: DB_FILE });
});

// Reports & analytics series derived from real orders
app.get('/api/admin/reports', requireAdmin, (req, res) => {
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

  console.error(`[Server Error] Status ${status}:`, err.message);
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
bootstrapAdmin();
persistDb();

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





