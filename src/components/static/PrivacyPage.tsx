import { Shield, Lock, Eye, Database } from 'lucide-react';
import { Breadcrumbs } from '@/src/components/common/Breadcrumbs';

const SECTIONS = [
  {
    icon: Database,
    title: 'Information We Collect',
    content: 'We collect account details, order history, payment preferences, delivery addresses, and device information necessary to operate the marketplace, process transactions, and improve your experience.',
  },
  {
    icon: Lock,
    title: 'How We Use Your Data',
    content: 'Your data powers order fulfillment, rider dispatch, vendor payouts, fraud prevention, and personalized recommendations. We never sell personal information to third parties.',
  },
  {
    icon: Shield,
    title: 'Data Security',
    content: 'All sensitive data is encrypted in transit and at rest. Payment information is tokenized through certified payment partners. Access is restricted by role-based permissions.',
  },
  {
    icon: Eye,
    title: 'Your Rights',
    content: 'You may request data export, account deletion, or correction of inaccurate information at any time through Settings or by contacting privacy@omnimarket.gh.',
  },
];

export function PrivacyPage() {
  return (
    <div className="pb-16">
      <Breadcrumbs />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-3xl font-heading font-black text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-xs text-gray-500">Last updated: August 1, 2026</p>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center">
          OmniMarket is committed to protecting your privacy across our multi-vendor marketplace, delivery network, and payment ecosystem.
        </p>

        <div className="space-y-6">
          {SECTIONS.map(({ icon: Icon, title, content }) => (
            <div key={title} className="sleek-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="font-black text-gray-900 dark:text-white">{title}</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
