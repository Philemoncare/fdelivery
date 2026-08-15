import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const LABELS: Record<string, string> = {
  products: 'All Products',
  vendors: 'All Vendors',
  categories: 'Categories',
  deals: 'Deals & Offers',
  'flash-sales': 'Flash Sales',
  'today-offers': "Today's Offers",
  checkout: 'Checkout',
  'track-order': 'Track Order',
  about: 'About',
  blog: 'Blog',
  careers: 'Careers',
  pricing: 'Pricing',
  faq: 'FAQ',
  contact: 'Contact',
  support: 'Support',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  'become-vendor': 'Become a Vendor',
  'become-rider': 'Become a Rider',
  'how-delivery-works': 'How It Works',
};

export function Breadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = LABELS[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return { path, label, isLast: i === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3', className)}>
      <ol className="flex items-center flex-wrap gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <li>
          <Link to="/" className="flex items-center gap-1 hover:text-emerald-600 transition">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </li>
        {crumbs.map(crumb => (
          <li key={crumb.path} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-gray-300" />
            {crumb.isLast ? (
              <span className="text-gray-700 dark:text-gray-200">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hover:text-emerald-600 transition">{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
