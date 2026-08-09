import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Bike, Star, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">OmniMarket</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 auth-gradient-light dark:bg-slate-950" />
        <div className="absolute inset-0 bg-grid opacity-50 dark:opacity-20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-6">
                <Shield className="w-4 h-4" /> Trusted by 10,000+ businesses
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                The{' '}
                <span className="text-gradient-brand">Marketplace</span>{' '}
                &amp; Delivery{' '}
                <span className="text-gradient-brand">Ecosystem</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-slate-400 mt-4 max-w-lg leading-relaxed">
                One platform for vendors, shoppers, and riders. Sell smarter, shop faster, deliver further.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button size="xl" onClick={() => navigate('/register')}>
                  Start Selling <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="xl" onClick={() => navigate('/register')}>
                  Start Shopping
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.9 Rating</div>
                <div className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-500" /> 50K+ Orders</div>
                <div className="flex items-center gap-1"><Store className="w-4 h-4 text-violet-500" /> 2K+ Vendors</div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="relative">
              <div className="relative z-10 bg-white dark:bg-slate-800/90 rounded-3xl border border-gray-100 dark:border-slate-700/50 shadow-2xl p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { role: 'Customer', icon: '🛍️', desc: 'Shop 10K+ products', color: 'from-emerald-500' },
                    { role: 'Vendor', icon: '🏪', desc: 'Sell to millions', color: 'from-violet-500' },
                    { role: 'Rider', icon: '🛵', desc: 'Earn flexibly', color: 'from-amber-500' },
                    { role: 'Admin', icon: '📊', desc: 'Manage everything', color: 'from-blue-500' },
                  ].map(item => (
                    <div key={item.role} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700/50">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="font-semibold text-gray-900 dark:text-white mt-2">{item.role}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute -top-4 -left-4 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything you need to grow</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">A complete ecosystem for modern commerce</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Multi-Vendor Marketplace', desc: 'List products alongside top brands. Reach customers actively searching for what you sell.', icon: Store, color: 'emerald' },
              { title: 'Smart Delivery Network', desc: 'Real-time dispatch routing. Customers track every mile with live GPS updates.', icon: Bike, color: 'amber' },
              { title: 'Enterprise Analytics', desc: 'Real-time revenue analytics, sales reports, and performance dashboards for every role.', icon: TrendingUp, color: 'violet' },
            ].map(f => (
              <motion.div key={f.title} whileHover={{ y: -4 }} className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
                <div className={`w-12 h-12 bg-${f.color}-50 dark:bg-${f.color}-900/30 rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className={`w-6 h-6 text-${f.color}-600 dark:text-${f.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-slate-400">
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">© 2026 OmniMarket. All rights reserved.</p>
          <p>The multi-vendor marketplace & delivery ecosystem.</p>
        </div>
      </footer>
    </div>
  );
}