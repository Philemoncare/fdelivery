const client = require('child_process');
const fs = require('fs');

// Read current DB to preserve admin accounts, system categories, and platform settings exactly.
const old = JSON.parse(fs.readFileSync('omnimarket-db.json', 'utf8'));

const admins = old.users.filter(u => ['administrator', 'super-administrator'].includes(u.role));
const adminIds = admin => admin.id;
const adminWallets = old.wallets.filter(w => admins.some(a => a.id === w.userId));

const clean = {
  users: admins,
  categories: Array.isArray(old.categories) ? old.categories : [],
  vendors: [],
  products: [],
  orders: [],
  riders: [],
  reviews: [],
  coupons: [],
  notifications: [],
  wallets: adminWallets,
  transactions: [],
  conversations: [],
  messages: [],
  sessions: [],
  tickets: [],
  audit: [],
  announcements: [],
  platformSettings: old.platformSettings || {}
};

fs.writeFileSync('omnimarket-db.json', JSON.stringify(clean, null, 2));
console.log('DB rebuilt.');
console.log('users:', clean.users.length, '(only admins)');
console.log('admin emails:', clean.users.map(u => u.email + ' [' + u.role + ']').join(', '));
console.log('wallets:', clean.wallets.length);
console.log('categories:', clean.categories.length, '| platformSettings:', Object.keys(clean.platformSettings).length, 'keys');
console.log('vendors/products/orders/riders/reviews/coupons/notifications/conversations/messages/transactions/audit/announcements: ALL EMPTY');