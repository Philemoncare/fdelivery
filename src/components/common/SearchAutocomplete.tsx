import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, ShoppingBag, X } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';

interface SearchAutocompleteProps {
  className?: string;
  inputClassName?: string;
  onNavigate?: () => void;
}

export function SearchAutocomplete({ className, inputClassName, onNavigate }: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const { products, vendors, searchQuery, setSearchQuery, setSelectedProduct, setSelectedVendor, formatPrice, t } = useApp();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return { products: [], vendors: [] };

    const matchedProducts = products
      .filter(p => p.status === 'active' && (p.title.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)))
      .slice(0, 5);

    const matchedVendors = vendors
      .filter(v => v.name.toLowerCase().includes(q) || v.category?.toLowerCase().includes(q))
      .slice(0, 4);

    return { products: matchedProducts, vendors: matchedVendors };
  }, [searchQuery, products, vendors]);

  const hasResults = suggestions.products.length > 0 || suggestions.vendors.length > 0;
  const showDropdown = focused && searchQuery.trim().length >= 2;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goProduct = (id: string) => {
    const p = products.find(x => x.id === id);
    if (p) setSelectedProduct(p);
    setSearchQuery('');
    setFocused(false);
    onNavigate?.();
    navigate(`/product/${id}`);
  };

  const goVendor = (id: string) => {
    const v = vendors.find(x => x.id === id);
    if (v) setSelectedVendor(v);
    setSearchQuery('');
    setFocused(false);
    onNavigate?.();
    navigate(`/vendors/${id}`);
  };

  const goAll = () => {
    setFocused(false);
    onNavigate?.();
    navigate('/products');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className={cn(
        'flex w-full rounded-2xl bg-white dark:bg-slate-800/80 border transition-all',
        focused ? 'border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-sm' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
      )}>
        <div className="relative flex-1 flex items-center h-[50px]">
          <Search className="w-4 h-4 text-gray-400 ms-4 shrink-0" />
          <input
            type="search"
            placeholder={t('header.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') goAll(); }}
            className={cn(
              'w-full bg-transparent px-3 py-2 text-sm font-medium text-gray-900 dark:text-white outline-none placeholder:text-gray-400',
              inputClassName
            )}
            aria-label="Search marketplace"
            autoComplete="off"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-2 me-1 text-gray-400 hover:text-gray-600" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full start-0 end-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-scale-in">
          {!hasResults ? (
            <p className="text-xs text-gray-400 text-center py-6">{t('common.noResults')} &ldquo;{searchQuery}&rdquo;</p>
          ) : (
            <>
              {suggestions.vendors.length > 0 && (
                <div className="p-2">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 py-1">{t('nav.restaurants')}</p>
                  {suggestions.vendors.map(v => (
                    <button
                      key={v.id}
                      onClick={() => goVendor(v.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition text-start"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 overflow-hidden">
                        <Store className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{v.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{v.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {suggestions.products.length > 0 && (
                <div className="p-2 border-t border-gray-50 dark:border-slate-800">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 py-1">{t('common.mealsAndProducts')}</p>
                  {suggestions.products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => goProduct(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition text-start"
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-gray-400" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.title}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">{formatPrice(p.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <button
            onClick={goAll}
            className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-gray-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition border-t border-gray-100 dark:border-slate-800"
          >
            {t('common.viewAllResults')}
          </button>
        </div>
      )}
    </div>
  );
}
