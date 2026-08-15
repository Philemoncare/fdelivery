const fs = require('fs');
const crypto = require('crypto');

const DB_FILE = 'omnimarket-db.json';
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const EMAIL = 'rider@demo.com';
const PASSWORD = 'Rider@123';
const EXISTING = db.users.find(u => u.email.toLowerCase() === EMAIL);

if (EXISTING) {
  console.log(`Demo rider already exists: ${EMAIL} (${EXISTING.id})`);
  process.exit(0);
}

const userId = crypto.randomUUID();
const riderId = `r-${crypto.randomUUID().slice(0, 8)}`;
const seed = String(userId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const referralCode = `OM-${(seed.slice(0, 4) || 'MMMM').slice(0, 4)}-${(seed.slice(4, 8) || 'RKET').slice(0, 4)}`;
const now = new Date().toISOString();

const hashPassword = (p) => crypto.createHash('sha256').update(p).digest('hex');

const newUser = {
  id: userId,
  email: EMAIL,
  phone: '+233201234567',
  password: hashPassword(PASSWORD),
  firstName: 'Demo',
  lastName: 'Rider',
  displayName: 'Demo Rider',
  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
  role: 'rider',
  createdAt: now,
  lastLoginAt: now,
  isVerified: true,
  isEmailVerified: true,
  isPhoneVerified: false,
  isApproved: true,
  isActive: true,
  isSuspended: false,
  twoFactorEnabled: false,
  riderId,
  loginAttempts: 0,
  lockedUntil: 0,
  auditTrail: [],
  referralCode,
};

db.users.push(newUser);
db.riders.push({
  id: riderId,
  userId,
  name: newUser.displayName,
  avatar: newUser.avatarUrl,
  vehicleType: 'Motorcycle',
  vehicleNumber: 'GE 4482-20',
  phone: newUser.phone,
  deliveryFee: 12,
  status: 'ONLINE',
  verification: { driverLicense: 'DL-DEMO-0001', nationalId: 'GH DEMO 0001' },
  verificationStatus: 'verified',
  isVerified: true,
  isOnline: true,
  isAvailable: true,
  bannerUrl: '',
  phoneSecondary: '',
  about: 'Demo rider account for QA — try the wallet, withdrawals and subscription.',
});

db.wallets.push({ userId, balance: 185, currency: 'GHS' });

const mkTx = (id, type, category, amount, description, status, createdAt) => ({
  id,
  userId,
  type,
  category,
  amount,
  description,
  status,
  referenceId: `demo-${id}`,
  referenceType: 'wallet',
  createdAt,
});

const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
db.transactions.push(
  mkTx('tx-demo-01', 'credit', 'delivery_earnings', 35, 'Delivery earnings — Order OM-881201', 'Completed', daysAgo(1)),
  mkTx('tx-demo-02', 'credit', 'delivery_earnings', 28, 'Delivery earnings — Order OM-881239', 'Completed', daysAgo(2)),
  mkTx('tx-demo-03', 'credit', 'delivery_earnings', 42, 'Delivery earnings — Order OM-881276', 'Completed', daysAgo(3)),
  mkTx('tx-demo-04', 'credit', 'bonus', 25, 'Peak-hour bonus', 'Completed', daysAgo(4)),
  mkTx('tx-demo-05', 'debit', 'withdrawal', 30, 'Withdrawal to Telecel Cash •••• 4321', 'Completed', daysAgo(5)),
  mkTx('tx-demo-06', 'credit', 'delivery_earnings', 20, 'Delivery earnings — Order OM-881298', 'Completed', daysAgo(6)),
  mkTx('tx-demo-07', 'credit', 'referral_bonus', 15, 'Referral bonus — friend joined', 'Completed', daysAgo(7)),
);

db.notifications.push({
  id: `n-${crypto.randomUUID().slice(0, 8)}`,
  userId,
  title: 'Welcome to OmniMarket!',
  message: 'Your demo rider wallet is loaded with GHS 185. Try a withdrawal.',
  type: 'system',
  read: false,
  createdAt: now,
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
console.log('Demo rider seeded:');
console.log('  email:', EMAIL);
console.log('  password:', PASSWORD);
console.log('  user id:', userId);
console.log('  rider id:', riderId);
console.log('  referral code:', referralCode);
console.log('  wallet balance: GHS 185');
