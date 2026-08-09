const fs = require('fs');

const DB_FILE = 'omnimarket-db.json';
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

// ------------------------------------------------------------
// 1. Drop the blank placeholder vendors (pending "New Restaurant" rows)
//    along with their owner accounts, wallets, notifications & txns.
// ------------------------------------------------------------
const PLACEHOLDERS = ['v-e74581dd', 'v-f2f630ce', 'v-ba8d948d', 'v-9d9f664b', 'v-7486516d'];

const owners = (db.vendors || [])
  .filter((v) => PLACEHOLDERS.includes(v.id))
  .map((v) => v.ownerId);

const ownerSet = new Set(owners);

db.vendors = (db.vendors || []).filter((v) => !PLACEHOLDERS.includes(v.id));
db.products = (db.products || []).filter((p) => !PLACEHOLDERS.includes(p.vendorId));
db.users = (db.users || []).filter((u) => !ownerSet.has(u.id));
db.wallets = (db.wallets || []).filter((w) => !ownerSet.has(w.userId));
db.notifications = (db.notifications || []).filter((n) => !ownerSet.has(n.userId));
db.transactions = (db.transactions || []).filter((t) => !ownerSet.has(t.userId));
db.reviews = (db.reviews || []).filter((r) => !PLACEHOLDERS.includes(r.vendorId));
db.conversations = (db.conversations || []).filter(
  (c) => !(Array.isArray(c.participantIds) && c.participantIds.some((id) => ownerSet.has(id)))
);

// ------------------------------------------------------------
// 2) Polish the surviving real vendor (v-8f0870d8)
// ------------------------------------------------------------
const vendor = db.vendors.find((v) => v.id === 'v-8f0820bc');
if (vendor) {
  Object.assign(vendor, {
    name: 'MDL Foods',
    slug: 'mdl-foods',
    description: 'Home-style Takoradi favourites — fragrant Jollof, spicy Waakye, fufu & soup and thick Kenkey platters, prepped fresh and served by our express rider fleet.',
    about: 'MDL Foods is a locally owned kitchen in Takoradi cooking real Ghanaian classics. Everything is made to order with market-fresh produce and delivered hot by a verified dispatch rider.',
    category: 'Local Dishes, Jollof Rice, Waakye, Fufu & Soup, Banku & Tilapia, Kenkey & Fish, Yam Chips',
    tags: ['Local Kitchen', 'Fresh Daily', 'Express Delivery', 'Jollof', 'Waakye'],
    status: 'active',
    verificationStatus: 'verified',
    isApproved: true,
    isOpen: true,
    isKitchenOpen: true,
    rating: 4.8,
    deliveryTime: '25-35 min',
    minOrder: 15,
    deliveryFee: 3,
    averageDeliveryMinutes: 22,
    distanceKm: 1.2,
    address: 'Market Circle, Takoradi',
    city: 'Takoradi',
    totalSales: 1260
  });
}

// ------------------------------------------------------------
// 3) Rebuild the vendor menu with real dishes (this is the data
//    referenced by HomePage / VendorDetailPage / listings)
// ------------------------------------------------------------
const now = new Date().toISOString();
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;
const MENU = {
  local: img('photo-1596040033229-a9821ebd058d'),
  jollof: img('photo-1512058564366-18510be2db19'),
  waakye: img('photo-1569718212165-3a8278d5f624'),
  fufu: img('photo-1534422298391-e4f8c172dddb'),
  banku: img('photo-1519708227418-c8fd9a32b7a2'),
  yam: img('photo-1585937421612-70a008356fbe'),
  kenkey: img('photo-1512621776951-a57141f2eefd'),
};
const vName = 'MDL Foods';
const logo = (vendor && vendor.logo) || '';
const categoryImgMap = {
  'Jollof Rice': MENU.jollof,
  'Waakye': MENU.waakye,
  'Fufu & Soup': MENU.fufu,
  'Banku & Tilapia': MENU.banku,
  'Yam Chips': MENU.yam,
  'Kenkey & Fish': MENU.kenkey,
  'Local Dishes': MENU.local,
};

const dishes = [
  {
    title: 'Ghana Jollof with Grilled Chicken',
    description: 'Smoky party jollof, fried plantain and a char-grilled chicken quarter with shito.',
    category: 'Jollof Rice',
    price: 42,
    originalPrice: 50,
    isFlashSale: true,
    isTrending: true,
    stock: 40,
    prepTime: '25 min',
  },
  {
    title: 'Waakye with Gari & Fish Stew',
    description: 'Waakye rice and beans served with gari, fried fish stew, boiled egg and shito.',
    category: 'Waakye',
    price: 35,
    isTrending: true,
    stock: 28,
    prepTime: '20 min',
  },
  {
    title: 'Fufu with Groundnut Soup',
    description: 'Fresh pounded fufu, silky groundnut soup and tender stewed beef and chicken.',
    category: 'Fufu & Soup',
    price: 48,
    isFlashSale: true,
    stock: 15,
    prepTime: '30 min',
  },
  {
    title: 'Banku & Grilled Tilapia',
    description: 'Smooth banku, flame-grilled tilapia and pepper sauce with fresh garden eggs.',
    category: 'Banku & Tilapia',
    price: 50,
    stock: 10,
    prepTime: '35 min',
  },
  {
    title: 'Kenkey with Fried Fish & Fried Pepper',
    description: 'Soft white kenkey, crisp fried fish, fried pepper sauce and sliced onions.',
    category: 'Kenkey & Fish',
    price: 28,
    stock: 20,
    prepTime: '18 min',
  },
  {
    title: 'Yam Chips with Khebab',
    description: 'Golden fried yam chips piled with peppery khebab and spicy sauce.',
    category: 'Yam Chips',
    price: 22,
    isTrending: true,
    stock: 24,
    prepTime: '15 min',
  },
  {
    title: 'Light Soup & Fufu',
    description: 'Garden-egg light soup with smoked fish, served with soft pounded fufu.',
    category: 'Fufu & Soup',
    price: 44,
    stock: 14,
    prepTime: '30 min',
  },
  {
    title: 'Special Party Rice & Chicken',
    description: 'Chef’s party special — coconut-washed rice, stewed chicken and cabbage salad.',
    category: 'Local Dishes',
    price: 38,
    isFeatured: true,
    stock: 18,
    prepTime: '22 min',
  },
];

db.products = dishes.map((d, i) => {
  const originalPrice = d.originalPrice || Math.round(d.price * 1.18);
  const discountPercent = d.isFlashSale ? Math.round((1 - d.price / originalPrice) * 100) : undefined;
  return {
    id: `p-${require('crypto').randomBytes(3).toString('hex')}`,
    vendorId: 'v-8f0820bc',
    vendorName: vName,
    vendorLogo: logo,
    title: d.title,
    slug: d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: d.description,
    shortDescription: d.title,
    sku: `MDL-${String(i + 1).padStart(3, '0')}`,
    price: d.price,
    originalPrice: discountPercent ? originalPrice : undefined,
    discountPercent,
    costPrice: Math.round(d.price * 0.7),
    rating: Number((4.4 + (i % 5) * 0.1).toFixed(1)),
    reviewsCount: 4 + i * 2,
    category: d.category,
    images: [categoryImgMap[d.category] || MENU.local],
    tags: ['Fresh', 'Local', d.category],
    stock: d.stock,
    lowStockThreshold: 5,
    prepTime: d.prepTime,
    calories: '450-720 kcal',
    isPopular: d.isTrending || d.isFlashSale || d.isFeatured !== undefined,
    isTrending: !!d.isTrending,
    isFeatured: !!d.isFlashSale || !!d.isFeatured,
    isFlashSale: !!d.isFlashSale,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
});

// Fix any image reference that fell through to the map
db.products.forEach((p) => {
  if (!Array.isArray(p.images) || !p.images[0]) {
    p.images = [categoryImgMap[p.category] || MENU.local];
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
console.log('Seed complete.');
console.log('vendors:', db.vendors.length, '->', db.vendors.map((v) => `${v.id}:${v.name}`).join(' | '));
console.log('products:', db.products.length);
console.log('users:', db.users.length);