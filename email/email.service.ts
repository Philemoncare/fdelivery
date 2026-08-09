import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { renderTemplate, type TemplateName, type TemplateData } from './templates.js';

export interface EmailLogEntry {
  id: string;
  recipient: string;
  template: string;
  subject: string;
  eventKey?: string;
  status: 'queued' | 'sent' | 'failed';
  messageId?: string;
  error?: string;
  createdAt: string;
}

export interface EmailOptions {
  to: string;
  template: TemplateName;
  data?: TemplateData;
  eventKey?: string;
}

interface EmailServiceConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
  appUrl?: string;
  enabled?: boolean;
  inspectorUrl?: string;
}

let smtp: nodemailer.TransportOptions = {};

function buildTransporter(): Transporter {
  const c = getConfig();
  smtp = {
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user && c.pass ? { user: c.user, pass: c.pass } : undefined
  };
  return nodemailer.createTransport(smtp);
}

function getConfig(): Required<Pick<EmailServiceConfig, 'host' | 'port' | 'secure' | 'user' | 'pass' | 'fromEmail' | 'fromName' | 'appUrl' | 'enabled' | 'inspectorUrl'>> {
  return {
    host: process.env.SMTP_HOST || process.env.MAIL_HOST || '',
    port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
    secure: (process.env.SMTP_SECURE || 'false') === 'true',
    user: process.env.SMTP_USER || process.env.MAIL_USER || '',
    pass: process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD || '',
    fromEmail: process.env.MAIL_FROM_EMAIL || 'omnimarket.gh@gmail.com',
    fromName: process.env.MAIL_FROM_NAME || 'OmniMarket Ghana',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    enabled: process.env.MAIL_ENABLED !== 'false',
    inspectorUrl: process.env.MAIL_INSPECTOR_URL || ''
  };
}

class EmailService {
  private transporter?: Transporter;
  private seenEvents: Set<string>;
  private recentSends: Map<string, number>;
  private logEntries: EmailLogEntry[];

  constructor() {
    this.seenEvents = new Set();
    this.recentSends = new Map();
    this.logEntries = [];
    // Rebuild the transporter lazily on first send so .env is fully loaded.
    this.transporter = undefined;
  }

  private transporterInstance(): Transporter {
    if (!this.transporter) this.transporter = buildTransporter();
    return this.transporter;
  }

  /**
   * Keep dedup + recent-send state in sync with the data loaded from the DB
   * so idempotency survives restarts.
   */
  hydrate(entries: EmailLogEntry[] = [], recentWindowMs = 5 * 60 * 1000) {
    const now = Date.now();
    for (const e of entries) {
      this.logEntries.push(e);
      if (e.eventKey) this.seenEvents.add(e.eventKey);
    }
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.recipient || !e.createdAt) continue;
      const t = Date.parse(e.createdAt);
      if (Number.isNaN(t)) continue;
      const last = this.recentSends.get(e.recipient) || 0;
      if (t > last) this.recentSends.set(e.recipient, t);
    }
    // Prune recentSends older than the window so the map stays small.
    this.recentSends.forEach((t, recipient) => {
      if (Date.now() - t > recentWindowMs) this.recentSends.delete(recipient);
    });
  }

  recentSend(recipient: string): number {
    return this.recentSends.get(recipient.toLowerCase()) || 0;
  }

  hasSentEvent(eventKey: string): boolean {
    return this.seenEvents.has(eventKey);
  }

  private log(entry: EmailLogEntry) {
    this.logEntries.push(entry);
  }

  getLogEntries(): EmailLogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Send one templated email. Handles dedup via eventKey, logs delivery to the
   * in-memory log (caller persists to DB), and never throws.
   */
  async send({ to, template, data, eventKey }: EmailOptions): Promise<EmailLogEntry> {
    const recipient = (to || '').trim().toLowerCase();
    const id = `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base: EmailLogEntry = { id, recipient, template, subject: '', eventKey, status: 'queued', createdAt: new Date().toISOString() };
    if (!recipient) {
      base.status = 'failed';
      base.error = 'Missing recipient';
      this.log(base);
      return base;
    }

    const config = getConfig();

    // Idempotency: skip if this event was already emailed to this recipient.
    if (eventKey) {
      const dedupKey = `${eventKey}:${recipient}`;
      if (this.seenEvents.has(dedupKey)) {
        base.status = 'failed';
        base.error = 'dedup: event already sent';
        base.createdAt = new Date().toISOString();
        this.log(base);
        return base;
      }
      this.seenEvents.add(dedupKey);
    }

    const { subject, html } = renderTemplate(template, data);

    // Guard against leaking secrets: never include code in logs of plaintext.
    if (template === 'otp' || template === 'password_reset') {
      const code = String((data as any)?.code || '');
      base.subject = code
        ? subject.replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '••••••')
        : 'Verification code (redacted)';
    } else {
      base.subject = subject;
    }

    // If mailing is disabled or not configured, capture the email instead of
    // pretending it was sent (spec: no fake success messages).
    if (!config.enabled || !config.host) {
      base.status = 'queued';
      console.log(`\x1b[36m[EMAIL:${config.host ? 'ENV' : 'NO_SMTP'}] ${template}\x1b[0m queued for ${recipient}: ${subject}`);
      // Do NOT fake a send — status stays 'queued' so dashboards can see it is pending delivery.
      this.log(base);
      return base;
    }

    try {
      // Rate-limit: at most one message per recipient every 30s to protect the sender.
      const now = Date.now();
      const last = this.recentSend(recipient);
      if (now - last < 30000 && this.recentSends.has(recipient)) {
        base.status = 'failed';
        base.error = 'rate-limit: send again shortly';
        this.log(base);
        console.log(`\x1b[33m[EMAIL] ${template} rate-limited for ${recipient}\x1b[0m`);
        return base;
      }

      const mail = await this.transporterInstance().sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: recipient,
        subject,
        html
      });

      this.recentSends.set(recipient, Date.now());
      base.status = 'sent';
      base.messageId = Array.isArray(mail.messageId) ? mail.messageId[0] : mail.messageId;
      this.log(base);
      console.log(`\x1b[32m[EMAIL] ${template} sent to ${recipient}: ${subject} (${base.messageId})\x1b[0m`);
      return base;
    } catch (err: any) {
      base.status = 'failed';
      base.error = (err && err.message) ? String(err.message).slice(0, 500) : String(err);
      this.log(base);
      console.error(`\x1b[31m[EMAIL] ${template} failed for ${recipient}:\x1b[0m`, base.error);
      return base;
    }
  }

  async sendLoginOtp(to: string, code: string): Promise<EmailLogEntry> {
    return this.send({ to, template: 'otp', data: { code }, eventKey: `login-otp:${to}` });
  }

  async sendResentOtp(to: string, code: string): Promise<EmailLogEntry> {
    return this.send({ to, template: 'otp', data: { code }, eventKey: `resent-otp:${to}` });
  }

  async sendPasswordResetOtp(to: string, firstName: string, code: string): Promise<EmailLogEntry> {
    return this.send({ to, template: 'password_reset', data: { firstName, code }, eventKey: `password-reset:${to}:${code}` });
  }
}

export const emailService = new EmailService();