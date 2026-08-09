import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Newsletter & Recruit Teaser */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 mb-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center lg:text-left">
            <h3 className="text-xl font-heading font-bold text-white flex items-center gap-2 justify-center lg:justify-start">
              <span>Subscribe to OmniMarket Deals & Updates</span>
            </h3>
            <p className="text-xs text-slate-400">
              Get secret promotional codes, flash sale drops, and instant cashback alerts directly in your inbox.
            </p>
          </div>

          <div className="flex w-full sm:w-auto items-center space-x-2">
            <div className="relative flex-1 sm:w-72">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                placeholder="Enter your email address..."
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <span>Join Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Column Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 text-xs">
          
          {/* Col 1: Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                <Bike className="w-5 h-5" />
              </div>
              <span className="font-heading font-extrabold text-lg text-white">
                OmniMarket<span className="text-emerald-400">.</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              Ghana's local food delivery and express logistics platform connecting Takoradi's favorite kitchens, dispatch riders, and food lovers.
            </p>
            <div className="space-y-1.5 text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Market Circle, Takoradi, Western Region, Ghana
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> +233 24 000 0001
              </p>
            </div>
          </div>

          {/* Col 2: Customer Pages */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Food Marketplace</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => navigate('/')} className="hover:text-emerald-400">Home</button></li>
              <li><button onClick={() => navigate('/products')} className="hover:text-emerald-400">All Meals & Dishes</button></li>
              <li><button onClick={() => navigate('/vendors')} className="hover:text-emerald-400">Featured Restaurants</button></li>
              <li><button onClick={() => navigate('/deals')} className="hover:text-emerald-400">Meal Deals & Flash Sales</button></li>
              <li><button onClick={() => navigate('/track-order')} className="hover:text-emerald-400">Track Order Live</button></li>
            </ul>
          </div>

          {/* Col 3: Ecosystem Partners */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Partners & Riders</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => navigate('/become-vendor')} className="hover:text-emerald-400">Partner Restaurant</button></li>
              <li><button onClick={() => navigate('/become-rider')} className="hover:text-emerald-400">Become a Rider</button></li>
              <li><button onClick={() => navigate('/how-delivery-works')} className="hover:text-emerald-400">How Delivery Works</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-emerald-400">Sign In</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-emerald-400">Create Account</button></li>
            </ul>
          </div>

          {/* Col 4: Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Company & Legal</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => navigate('/about')} className="hover:text-emerald-400">About OmniMarket</button></li>
              <li><button onClick={() => navigate('/faq')} className="hover:text-emerald-400">Help & FAQ</button></li>
              <li><button onClick={() => navigate('/about')} className="hover:text-emerald-400">Marketplace Blog</button></li>
              <li><button onClick={() => navigate('/contact')} className="hover:text-emerald-400">Careers</button></li>
              <li><button onClick={() => navigate('/contact')} className="hover:text-emerald-400">Contact Support</button></li>
              <li><button onClick={() => navigate('/terms')} className="hover:text-emerald-400">Terms of Service</button></li>
              <li><button onClick={() => navigate('/terms')} className="hover:text-emerald-400">Privacy Policy</button></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment icons */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>(c) 2026 OmniMarket Ghana. All rights reserved. Food Delivery & Express Logistics.</p>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">MTN MoMo / Telecel Cash</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">Visa / Mastercard</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">Cash on Delivery</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
