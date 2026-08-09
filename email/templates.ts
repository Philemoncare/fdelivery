export type TemplateName =
  | 'otp'
  | 'welcome'
  | 'registration_pending'
  | 'account_approved'
  | 'account_rejected'
  | 'rider_verified'
  | 'password_reset'
  | 'password_changed'
  | 'admin_password_changed'
  | 'order_confirmed'
  | 'vendor_new_order'
  | 'rider_assigned'
  | 'rider_delivery_completed'
  | 'delivery_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'refund_issued'
  | 'announcement'
  | 'security_alert'
  | 'support_reply';

export interface TemplateData {
  name?: string;
  firstName?: string;
  lastName?: string;
  code?: string;
  role?: string;
  reason?: string;
  vendorName?: string;
  orderNumber?: string;
  customerName?: string;
  customerAddress?: string;
  itemsSummary?: string;
  totalAmount?: string;
  earning?: string;
  title?: string;
  message?: string;
  buttonUrl?: string;
  buttonText?: string;
}

const green = '#10b981';
const red = '#ef4444';
const amber = '#f59e0b';

function layout(title: string, inner: string): string {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <div style="background:#0f172a;padding:24px 28px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:#ffffff;">OmniMarket<span style="color:${green};">.gh</span></div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;letter-spacing:1px;">TAKORADI · WESTERN REGION · GHANA</div>
      </div>
      <div style="padding:28px;color:#1f2937;font-size:14px;line-height:1.6;">
        ${inner}
      </div>
      <div style="background:#f8fafc;padding:18px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#64748b;text-align:center;">
        You are receiving this because you have an account with OmniMarket.<br />
        &copy; ${new Date().getFullYear()} OmniMarket &amp; Delivery Platform · Support: support@omnimarket.com<br />
        Market Circle, Takoradi, Western Region, Ghana
      </div>
    </div>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${green};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">${label}</a>`;
}

function greetLine(data: TemplateData): string {
  const n = data.firstName || data.name || 'there';
  return `<p>Hello ${n},</p>`;
}

function footerNote(): string {
  return `<p style="font-size:12px;color:#6b7280;margin-top:28px;">Best regards,<br/>The OmniMarket Team</p>`;
}

export function renderTemplate(name: TemplateName, data: TemplateData): { subject: string; html: string } {
  let subject = 'OmniMarket';
  let html = '';

  switch (name) {
    case 'otp':
      subject = `${data.code} is your OmniMarket verification code`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:#111827;">Verify your login</h2>
        ${greetLine(data)}
        <p>Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:${green};background:#ecfdf5;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">${data.code}</div>
        <p style="font-size:12px;color:#6b7280;">If you did not attempt to log in, please secure your account immediately by resetting your password.</p>
        ${footerNote()}
      `);
      break;

    case 'welcome':
      subject = 'Welcome to OmniMarket Ghana!';
      html = layout(subject, `
        <h2 style="margin-top:0;color:#111827;">Welcome to the family!</h2>
        ${greetLine(data)}
        <p>Thanks for joining OmniMarket. You can now order delicious meals from the best restaurants in Takoradi and have them delivered right to your door.</p>
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/login`, data.buttonText || 'Start Ordering Now')}</div>
        ${footerNote()}
      `);
      break;

    case 'registration_pending':
      subject = `Application received — join OmniMarket as a ${data.role || 'partner'}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${amber};">Application pending review</h2>
        ${greetLine(data)}
        <p>Thank you for applying to be a <strong>${data.role || 'partner'}</strong> on OmniMarket.</p>
        <p>Our Takoradi team is currently reviewing your documents. You will receive an email as soon as your account has been approved.</p>
        ${footerNote()}
      `);
      break;

    case 'account_approved':
      subject = 'Your OmniMarket account has been approved!';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Congratulations!</h2>
        ${greetLine(data)}
        ${data.vendorName ? `<p>Your restaurant <strong>${data.vendorName}</strong> has been approved to operate on OmniMarket.</p><p>You can now go online, set up your menu, and start receiving orders.</p>` : `<p>Your <strong>${data.role || 'OmniMarket'}</strong> account has been approved. You can now log in and get started.</p>`}
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/login`, data.buttonText || 'Login to Dashboard')}</div>
        ${footerNote()}
      `);
      break;

    case 'account_rejected':
      subject = 'Update on your OmniMarket application';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${red};">Application status update</h2>
        ${greetLine(data)}
        <p>We're sorry, but your application to join OmniMarket as a <strong>${data.role || 'partner'}</strong> could not be approved at this time.</p>
        ${data.reason ? `<p style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:12px 16px;border-radius:10px;">Reason: ${data.reason}</p>` : ''}
        <p>Please contact our support team for more details or to re-apply.</p>
        ${footerNote()}
      `);
      break;

    case 'rider_verified':
      subject = 'Your rider account is verified!';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Rider Account Verified!</h2>
        ${greetLine(data)}
        <p>Your rider application has been successfully verified. You are now part of our dispatch fleet.</p>
        <p>Log in to your dashboard, set your status to <strong>ONLINE</strong>, and start earning!</p>
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/login`, data.buttonText || 'Start Delivering Now')}</div>
        ${footerNote()}
      `);
      break;

    case 'password_reset':
      subject = 'Reset your OmniMarket password';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Password reset request</h2>
        ${greetLine(data)}
        <p>We received a request to reset your password. Use the code below to proceed:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:${green};background:#ecfdf5;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">${data.code}</div>
        <p style="font-size:12px;color:#6b7280;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
        ${footerNote()}
      `);
      break;

    case 'password_changed':
      subject = 'Security alert: your password was changed';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${red};">Security alert</h2>
        ${greetLine(data)}
        <p>This is a confirmation that the password for your OmniMarket account was recently changed.</p>
        <p>If you did not perform this action, please contact our support team immediately or reset your password.</p>
        ${footerNote()}
      `);
      break;

    case 'admin_password_changed':
      subject = 'Security alert: password reset by administrator';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${red};">Security alert</h2>
        ${greetLine(data)}
        <p>An administrator has reset the password for your OmniMarket account.</p>
        <p>Please log in and change your password immediately.</p>
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/login`, 'Log in now')}</div>
        ${footerNote()}
      `);
      break;

    case 'order_confirmed':
      subject = `Order Confirmed — ${data.orderNumber}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Order Received!</h2>
        ${greetLine(data)}
        <p>Your order <strong>${data.orderNumber}</strong> has been successfully placed with <strong>${data.vendorName}</strong>.</p>
        ${data.itemsSummary ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;">${data.itemsSummary}</div>` : ''}
        ${data.totalAmount ? `<p style="font-weight:700;">Total: <span style="color:${green};">${data.totalAmount}</span></p>` : ''}
        <p>You can track your order status in real time from your dashboard.</p>
        <div style="text-align:center;margin:20px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/customer/orders`, 'Track Order')}</div>
        ${footerNote()}
      `);
      break;

    case 'vendor_new_order':
      subject = `New order received — ${data.orderNumber}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">New Order Alert!</h2>
        ${greetLine(data)}
        <p>You have received a new order <strong>${data.orderNumber}</strong> from <strong>${data.customerName}</strong>.</p>
        <p>Please check your dashboard to accept and start preparing the order.</p>
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/restaurant/orders`, 'View Order in Dashboard')}</div>
        ${footerNote()}
      `);
      break;

    case 'rider_assigned':
      subject = `New delivery job — ${data.orderNumber}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">New Delivery Assigned</h2>
        ${greetLine(data)}
        <p>You have been assigned to deliver order <strong>${data.orderNumber}</strong> from <strong>${data.vendorName}</strong>.</p>
        <p><strong>Pick-up:</strong> ${data.vendorName}</p>
        <p><strong>Drop-off:</strong> ${data.customerAddress}</p>
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/rider/dashboard`, 'View Delivery Details')}</div>
        ${footerNote()}
      `);
      break;

    case 'rider_delivery_completed':
      subject = `Delivery Completed — ${data.orderNumber}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Good job!</h2>
        ${greetLine(data)}
        <p>Order <strong>${data.orderNumber}</strong> has been successfully delivered.</p>
        <p>Your earnings of <strong>${data.earning}</strong> have been credited to your wallet.</p>
        ${footerNote()}
      `);
      break;

    case 'delivery_completed':
      subject = 'Your order has been delivered — enjoy!';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Delivered!</h2>
        ${greetLine(data)}
        <p>Your order <strong>${data.orderNumber}</strong> from <strong>${data.vendorName}</strong> has been delivered.</p>
        <p>We hope you enjoy your meal! Please take a moment to rate your experience.</p>
        <div style="text-align:center;margin:24px 0;">${button(data.buttonUrl || `${process.env.APP_URL || 'http://localhost:3000'}/customer/orders`, 'Rate My Order')}</div>
        ${footerNote()}
      `);
      break;

    case 'payment_received':
      subject = `Payment received — ${data.orderNumber}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Payment confirmed</h2>
        ${greetLine(data)}
        <p>We have received your payment of <strong>${data.totalAmount}</strong>${data.orderNumber ? ` for order <strong>${data.orderNumber}</strong>` : ''}.</p>
        ${footerNote()}
      `);
      break;

    case 'payment_failed':
      subject = `Payment issue — ${data.orderNumber || 'OmniMarket order'}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${red};">Payment failed</h2>
        ${greetLine(data)}
        <p>We could not process your payment${data.orderNumber ? ` for order <strong>${data.orderNumber}</strong>` : ''}${data.reason ? `: <strong>${data.reason}</strong>` : ''}.</p>
        <p>Please update your payment method and try again.</p>
        ${footerNote()}
      `);
      break;

    case 'refund_issued':
      subject = `Refund issued — ${data.orderNumber || 'OmniMarket'}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${amber};">Refund processed</h2>
        ${greetLine(data)}
        <p>A refund of <strong>${data.totalAmount}</strong>${data.orderNumber ? ` for order <strong>${data.orderNumber}</strong>` : ''} has been processed.</p>
        <p>Please allow a few business days for the amount to reflect in your account.</p>
        ${footerNote()}
      `);
      break;

    case 'announcement':
      subject = data.title || 'Important announcement from OmniMarket';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Important announcement</h2>
        <h3 style="color:#111827;">${data.title}</h3>
        <p>${data.message}</p>
        ${footerNote()}
      `);
      break;

    case 'security_alert':
      subject = 'Security alert — OmniMarket';
      html = layout(subject, `
        <h2 style="margin-top:0;color:${red};">Security alert</h2>
        ${greetLine(data)}
        <p>${data.message || 'We noticed unusual activity on your account. If this was not you, please secure your account immediately.'}</p>
        ${footerNote()}
      `);
      break;

    case 'support_reply':
      subject = `Support reply${data.title ? ` — ${data.title}` : ''}`;
      html = layout(subject, `
        <h2 style="margin-top:0;color:${green};">Response from OmniMarket Support</h2>
        ${greetLine(data)}
        <p>${data.message}</p>
        <p>Please reply to this email if you need further assistance. Our Takoradi-based support team is here 24/7.</p>
        ${footerNote()}
      `);
      break;

    default:
      subject = 'Message from OmniMarket';
      html = layout(subject, `<p>${data.message || ''}</p>`);
  }

  return { subject, html };
}