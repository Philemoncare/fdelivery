import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { Sun, Moon, Play, Pause } from 'lucide-react';

export const PortalAccessBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    theme,
    toggleTheme,
    currency,
    setCurrency,
    language,
    setLanguage,
    isLiveSimulationActive,
    toggleLiveSimulation,
    orders
  } = useApp();

  const activeOrdersCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Completed' && o.status !== 'Cancelled').length;

  return (
    <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Account & Simulation */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
          {user ? (
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="text-slate-400 hover:text-red-400 transition whitespace-nowrap px-2 py-1 rounded-full hover:bg-slate-800"
            >
              Sign Out
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/login')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition whitespace-nowrap px-2 py-1 rounded-full hover:bg-slate-800"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="text-slate-300 hover:text-white font-medium transition whitespace-nowrap px-2 py-1 rounded-full hover:bg-slate-800"
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Right: Simulation control, Theme, Currency & Quick Status */}
        <div className="flex items-center space-x-3 text-slate-300">
          {/* Active Orders Tracker Pill (Only if user has orders) */}
          {user && activeOrdersCount > 0 && (
            <button
              onClick={() => navigate('/track-order')}
              className="hidden md:flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-[11px] animate-pulse-subtle"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Order ({activeOrdersCount})</span>
            </button>
          )}

          {/* Simulation Play/Pause Toggle (Only for Admins) */}
          {user && (user.role === 'administrator' || user.role === 'super-administrator') && (
            <button
              onClick={toggleLiveSimulation}
              title="Toggle automatic rider GPS movement simulation"
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-[11px] text-slate-300 border border-slate-700 transition"
            >
              {isLiveSimulationActive ? (
                <>
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Pause Simulation</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">Play Simulation</span>
                </>
              )}
            </button>
          )}

          {/* Currency Selector */}
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            <span className="text-slate-400 text-[10px]">CURR:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="bg-transparent text-white text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="GHS" className="bg-slate-900 text-white">GHS</option>
              <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
              <option value="EUR" className="bg-slate-900 text-white">EUR</option>
              <option value="GBP" className="bg-slate-900 text-white">GBP</option>
              <option value="NGN" className="bg-slate-900 text-white">NGN</option>
            </select>
          </div>

          {/* Language Selector */}
          <div className="hidden sm:flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-white text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="EN" className="bg-slate-900 text-white">EN</option>
              <option value="ES" className="bg-slate-900 text-white">ES</option>
              <option value="FR" className="bg-slate-900 text-white">FR</option>
              <option value="DE" className="bg-slate-900 text-white">DE</option>
              <option value="ZH" className="bg-slate-900 text-white">ZH</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-amber-400 transition"
            title="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </div>
    </div>
  );
};
