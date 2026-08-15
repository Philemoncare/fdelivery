import { useNavigate } from 'react-router-dom';
import { Headphones, MessageSquare, FileText, Truck, Store, HelpCircle } from 'lucide-react';
import { Breadcrumbs } from '@/src/components/common/Breadcrumbs';

const CHANNELS = [
  { icon: Headphones, title: 'Live Chat', desc: '24/7 instant support via the floating chat widget', action: 'Start Chat', path: '/contact' },
  { icon: MessageSquare, title: 'Messages', desc: 'Chat with restaurants and riders on your order threads', action: 'Open Messages', path: '/customer/messages' },
  { icon: Truck, title: 'Order Issues', desc: 'Report delivery delays, wrong items, or missing orders', action: 'Track Order', path: '/track-order' },
  { icon: Store, title: 'Vendor Support', desc: 'Onboarding, payouts, and store management help', action: 'Vendor Help', path: '/become-vendor' },
  { icon: FileText, title: 'Returns & Refunds', desc: 'Initiate returns and view refund status', action: 'My Orders', path: '/customer/orders' },
  { icon: HelpCircle, title: 'Help Center', desc: 'Browse FAQs and step-by-step guides', action: 'View FAQ', path: '/faq' },
];

export function SupportPage() {
  const navigate = useNavigate();

  return (
    <div className="pb-16">
      <Breadcrumbs />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white">Support Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">How can we help you today?</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CHANNELS.map(ch => (
            <button
              key={ch.title}
              onClick={() => navigate(ch.path)}
              className="sleek-card p-6 text-left hover:border-emerald-500/30 hover:-translate-y-1 transition-all group"
            >
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 w-fit mb-4 group-hover:scale-110 transition-transform">
                <ch.icon className="w-6 h-6" />
              </div>
              <h3 className="font-black text-gray-900 dark:text-white mb-1">{ch.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{ch.desc}</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{ch.action} →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
