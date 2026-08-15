import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  const rates: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1550, JPY: 149.5 };
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', JPY: '¥' };
  const rate = rates[currency] || 1;
  const symbol = symbols[currency] || '$';
  const converted = price * rate;
  if (currency === 'JPY') return `${symbol}${Math.round(converted).toLocaleString()}`;
  return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getInitials(name: string): string {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

// Human-readable timestamp in the viewer's local timezone, with the granularity
// used across the notification center: "Just now" / "2 min ago" / "1 hr ago" /
// "Yesterday" / "Aug 13" / "Aug 12, 2026".
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins === 1 ? '1 min ago' : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hr ago' : `${hours} hrs ago`;

  // Yesterday (calendar day, not rolling 24h)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (startOfDay === startOfToday - 86400000) return 'Yesterday';

  const sameYear = d.getFullYear() === now.getFullYear();
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  const day = d.getDate();
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Copy text to the clipboard with a resilient fallback chain.
 * Works even on non-secure contexts (HTTP) via legacy execCommand.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern API first (requires Secure Context / HTTPS)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Modern clipboard API failed:', err);
  }

  // 2. Resilient Fallback (works on HTTP / older browsers)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Ensure the textarea is off-screen but still "visible" to the browser
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    // Prevent scrolling to bottom in some browsers
    textArea.style.width = '2em';
    textArea.style.height = '2em';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    // Specific selection for iOS
    textArea.setSelectionRange(0, 999999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

/**
 * Share content using the Web Share API if available.
 * Automatically falls back to clipboard copy if sharing is unavailable or fails.
 */
export async function shareLink(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  const shareData = {
    title: 'OmniMarket',
    text: text,
    url: url || window.location.href
  };

  // 1. Try Web Share API (Mobile / Modern Desktop Browsers on HTTPS)
  try {
    if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return 'shared';
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return 'failed';
    console.warn('navigator.share failed:', err);
  }

  // 2. Fallback: Copy to clipboard
  const contentToCopy = url ? `${text} ${url}` : text;
  const ok = await copyText(contentToCopy);
  return ok ? 'copied' : 'failed';
}
