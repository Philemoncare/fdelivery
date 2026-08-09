// ============================================================
// OmniMarket Auth — Security Utilities
// (Models enterprise security behavior for the demo frontend.
//  In production these map to real backend middleware.)
// ============================================================

export class SecurityError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 401) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// --- CSRF Protection ---
let csrfToken: string | null = null;

export function generateCsrfToken(): string {
  if (!csrfToken) {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        csrfToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        csrfToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
    } catch (e) {
      csrfToken = 'fallback-token-' + Date.now();
    }
  }
  return csrfToken;
}

// --- Rate limiting (per-device/account) ---
interface RateEntry {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, RateEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 10 * 60 * 1000;

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) {
    loginAttempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.lockedUntil > now) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil };
  }

  if (now - entry.firstAt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0;
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
}

// --- Account lockout tracking ---
const lockedAccounts = new Map<string, number>();

export function isAccountLocked(accountId: string): boolean {
  const until = lockedAccounts.get(accountId);
  if (!until) return false;
  if (until < Date.now()) {
    lockedAccounts.delete(accountId);
    return false;
  }
  return true;
}

export function lockAccount(accountId: string): void {
  lockedAccounts.set(accountId, Date.now() + LOCKOUT_MS);
}

// --- Secure cookie helpers (model encrypted/signed session cookies) ---
export function setSecureCookie(name: string, value: string, days = 7): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${days * 86400}; SameSite=Strict; Secure`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict; Secure`;
}

// --- XSS sanitizer (basic) ---
export function sanitizeInput(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Secure headers (documented for production deployment) ---
export const SECURE_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'",
};

// --- Device & IP tracking ---
export function getClientIp(): string {
  const stored = getCookie('om_last_ip');
  if (stored) return stored;
  const ip = `192.168.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
  setSecureCookie('om_last_ip', ip, 1);
  return ip;
}

export function getDeviceInfo(): { deviceId: string; deviceName: string; platform: string } {
  let deviceId = getCookie('om_device_id');
  if (!deviceId) {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        deviceId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        deviceId = 'dev-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
    } catch (e) {
      deviceId = 'device-' + Date.now();
    }
    setSecureCookie('om_device_id', deviceId, 365);
  }

  const ua = navigator.userAgent;
  const platform = /iPhone|iPad|Android/i.test(ua) ? 'mobile' : /Mac|Windows|Linux/i.test(ua) ? 'desktop' : 'other';
  const browser = /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : /Edge/.test(ua) ? 'Edge' : 'Unknown';

  return { deviceId, deviceName: `${browser} on ${platform}`, platform };
}

// --- Audit trail ---
import type { AuditEvent } from './types';

const auditBuffer: AuditEvent[] = [];

export function logAudit(event: Omit<AuditEvent, 'timestamp' | 'userAgent' | 'ipAddress'>): void {
  auditBuffer.push({
    ...event,
    ipAddress: getClientIp(),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });
  // In production, flush to backend
  try {
    localStorage.setItem('om_audit_trail', JSON.stringify(auditBuffer.slice(-200)));
  } catch { /* ignore */ }
}

export function getAuditTrail(): AuditEvent[] {
  try {
    const raw = localStorage.getItem('om_audit_trail');
    return raw ? (JSON.parse(raw) as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

// --- Password strength ---
export function evaluatePasswordStrength(password: string): { score: number; label: string; color: string; width: string } {
  if (!password) return { score: 0, label: '', color: '', width: '0%' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500', width: '16%' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500', width: '40%' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500', width: '65%' };
  return { score, label: 'Strong', color: 'bg-emerald-500', width: '100%' };
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character');
  return { valid: errors.length === 0, errors };
}