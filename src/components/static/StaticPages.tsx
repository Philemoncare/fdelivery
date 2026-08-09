import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HelpCircle, Mail, Phone, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  type: 'about' | 'how-it-works' | 'faq' | 'contact' | 'terms' | 'pricing';
}

export const StaticPages: React.FC<Props> = ({ type }) => {
  const { showToast } = useApp();
  const [contactMessage, setContactMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    showToast('Support Ticket Created!', 'Our 24/7 concierge team will respond within 15 minutes.');
  };

  if (type === 'about') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-xs sm:text-sm">
        <h1 className="text-3xl font-heading font-black text-gray-900 dark:text-white text-center">
          About OmniMarket & Express Delivery
        </h1>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center max-w-2xl mx-auto">
          OmniMarket is an all-in-one multi-vendor marketplace platform uniting verified local merchants, consumers, and hyper-fast dispatch riders into a single seamless ecosystem.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Verified Vendors</h3>
            <p className="text-gray-500 text-xs">Every merchant passes rigorous identity & inventory checks before listing on our platform.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">15-Min Express Riders</h3>
            <p className="text-gray-500 text-xs">Our localized GPS dispatch network pairs customers directly with their preferred rider.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Secure Payments</h3>
            <p className="text-gray-500 text-xs">Encrypted OmniWallet balances, instant refunds, and complete digital invoice history.</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'how-it-works') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-heading font-black text-gray-900 dark:text-white text-center">
          How OmniMarket Operates
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 text-xs">
          {[
            { step: '1', title: 'Browse Products', desc: 'Search items across multiple certified local vendor stores.' },
            { step: '2', title: 'Choose Dispatch Rider', desc: 'Pick your preferred rider based on ETA, rating, and vehicle type.' },
            { step: '3', title: 'Instant Preparation', desc: 'Merchant receives live notification and packages item.' },
            { step: '4', title: 'Doorstep Delivery', desc: 'Track rider movement in real time with interactive GPS.' }
          ].map((item) => (
            <div key={item.step} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border text-center space-y-2">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mx-auto text-sm">
                {item.step}
              </span>
              <h4 className="font-bold text-gray-900 dark:text-white">{item.title}</h4>
              <p className="text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'contact') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-black text-gray-900 dark:text-white">Contact Platform Support</h1>
          <p className="text-xs text-gray-500">24/7 Concierge Support for Customers, Merchants, and Dispatch Riders.</p>
        </div>

        {sent ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-emerald-500/30 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Ticket Submitted Successfully</h3>
            <p className="text-xs text-gray-500">Ticket #TK-99201 generated. A representative will contact your email.</p>
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Your Email Address</label>
              <input type="email" required placeholder="name@omnimarket.com" className="w-full bg-gray-50 dark:bg-slate-800 border p-3 rounded-xl" />
            </div>
            <div>
              <label className="font-bold block mb-1">Inquiry Category</label>
              <select className="w-full bg-gray-50 dark:bg-slate-800 border p-3 rounded-xl">
                <option>Order Delivery Issue</option>
                <option>Merchant Store Onboarding</option>
                <option>Rider Payout Inquiry</option>
                <option>Technical Support</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Message</label>
              <textarea
                rows={4}
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe your request..."
                className="w-full bg-gray-50 dark:bg-slate-800 border p-3 rounded-xl"
              />
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow">
              Submit Support Ticket
            </button>
          </form>
        )}
      </div>
    );
  }

  if (type === 'pricing') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-black text-gray-900 dark:text-white">Platform Pricing</h1>
          <p className="text-xs text-gray-500">Transparent plans for merchants, riders, and marketplace partners in Ghana.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {[
            { plan: 'Rider', price: 'GHS 0', period: 'forever', perks: ['No monthly fees', '100% of tips', 'Instant MoMo payouts', 'Weekly bonuses'] },
            { plan: 'Merchant Starter', price: 'GHS 250/mo', period: 'billed monthly', perks: ['Up to 50 products', '5% commission', 'Order analytics', 'Local support'] },
            { plan: 'Merchant Pro', price: 'GHS 600/mo', period: 'billed monthly', perks: ['Unlimited products', '3% commission', 'Marketing tools', 'Priority Support'] },
          ].map((tier) => (
            <div key={tier.plan} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 text-center space-y-3">
              <h3 className="font-bold text-gray-900 dark:text-white">{tier.plan}</h3>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{tier.price}</p>
              <p className="text-xs text-gray-500">{tier.period}</p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-2">
                {tier.perks.map((perk) => <li key={perk} className="flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{perk}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-xs text-gray-600 dark:text-gray-300">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service & Privacy Policy</h1>
      <p>OmniMarket multi-vendor marketplace adheres strictly to international data privacy regulations and vendor commission compliance standards.</p>
    </div>
  );
};
