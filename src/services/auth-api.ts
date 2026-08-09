/**
 * ============================================================
 * OMNIMARKET AUTH API SERVICE
 * ============================================================
 * Handles real production-level authentication calls to the backend.
 */

import { AuthTokens, Portal, UserProfile, LoginResponse, AuthResult } from '../lib/auth/types';
import { readRequestTokens } from '../lib/auth/token-scope';

// Automatically detect environment and bypass proxy if needed
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = IS_LOCAL ? 'http://127.0.0.1:3999/api' : '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  // Automatically attach Authorization from the CURRENT TAB's scoped token,
  // so multiple tabs / portals never clobber each other's auth.
  try {
    const tokens = readRequestTokens();
    if (tokens?.accessToken) {
      headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
  } catch (e) {
    console.error('[API] Failed to resolve auth token', e);
  }

  if (options.body && typeof options.body === 'string') {
    const sizeMB = (options.body.length / 1024 / 1024).toFixed(2);
    console.log(`[API] Sending ${sizeMB}MB to ${endpoint} via ${API_BASE_URL}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const AuthApiService = {
  login: (payload: any) => request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  register: (payload: any) => request<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  me: () => request<UserProfile>('/auth/me', {
    method: 'GET'
  }),

  loginWithGoogle: (intent?: string) => {
    const url = `${API_BASE_URL}/auth/google${intent ? `?intent=${intent}` : ''}`;
    window.location.href = url;
  },

  loginWithApple: (intent?: string) => {
    const url = `${API_BASE_URL}/auth/apple${intent ? `?intent=${intent}` : ''}`;
    window.location.href = url;
  },

  refreshToken: (refreshToken: string) => request<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  }),

  sendOtp: (identifier: string, channel: string) => request<{ success: boolean; message: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ identifier, channel })
  }),

  verifyOtp: (identifier: string, code: string, portal?: Portal) => request<AuthResult>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ identifier, code, portal })
  }),

  requestPasswordReset: (email: string) => request<{ success: boolean; message: string }>('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),

  completePasswordReset: (payload: any) => request<{ success: boolean; message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  getSessions: (userId: string) => request<any[]>(`/auth/sessions/${userId}`),

  revokeSession: (userId: string, sessionId: string) => request<void>(`/auth/sessions/${userId}/${sessionId}`, {
    method: 'DELETE'
  }),

  revokeAllSessions: (userId: string) => request<void>(`/auth/sessions/${userId}`, {
    method: 'DELETE'
  }),

  changePassword: (payload: any) => request<{ success: boolean; message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  adminResetPassword: (payload: any) => request<{ success: boolean; message: string }>('/auth/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  adminGenerateTempPassword: (userId: string) => request<{ success: boolean; tempPassword?: string }>('/auth/admin/generate-temp-password', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),

  adminForceReset: (userId: string) => request<{ success: boolean; message: string }>('/auth/admin/force-reset', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),
};
