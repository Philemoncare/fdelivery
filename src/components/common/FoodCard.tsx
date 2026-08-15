import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Clock } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import { Product } from '@/src/types';
import { motion } from 'framer-motion';

interface FoodCardProps {
  product: Product;
  variant?: 'grid' | 'list' | 'compact';
}

export const FoodCard: React.FC<FoodCardProps> = ({ product, variant = 'grid' }) => {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist, formatPrice, t } = useApp();

  const handleNavigate = () => {
    navigate(`/product/${product.id}`);
  };

  const isFav = isInWishlist(product.id);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:shadow-lg transition-all group cursor-pointer" onClick={handleNavigate}>
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm">
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{product.title}</h4>
          <p className="text-[9px] text-emerald-600 font-bold uppercase truncate">{product.vendorName}</p>
          <p className="text-[11px] font-black text-gray-900 dark:text-white mt-0.5">{formatPrice(product.price)}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden transition-all flex flex-col h-full",
        "shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
        "border border-gray-50 dark:border-slate-800/50",
        variant === 'list' && "sm:flex-row sm:h-56"
      )}
    >
      {/* Image Area with high-end framing */}
      <div className={cn(
        "relative overflow-hidden bg-gray-50 dark:bg-slate-800 shrink-0 m-2 rounded-[2rem]",
        variant === 'grid' ? "aspect-[4/5]" : "aspect-square sm:w-52 sm:h-full"
      )}>
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onClick={handleNavigate}
        />

        {/* Minimal Price Badge */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-2xl border border-white/20 dark:border-white/5">
            <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           {product.isFlashSale && (
             <span className="bg-rose-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-[0.1em]">{t('home.deals')}</span>
           )}
        </div>

        {/* Favorite Action */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
          className={cn(
            "absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md transition-all duration-300",
            "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
            isFav ? "bg-rose-500 text-white" : "bg-white/80 dark:bg-slate-900/80 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800"
          )}
        >
          <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
        </button>
      </div>

      {/* Editorial Content Layout */}
      <div className="p-6 pt-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">
            {product.category}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
            <Star className="w-3 h-3 fill-current" /> {product.rating || '4.5'}
          </div>
        </div>

        <h3
          onClick={handleNavigate}
          className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-2 cursor-pointer hover:text-emerald-600 transition-colors"
        >
          {product.title}
        </h3>

        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-6 uppercase tracking-wider">
           <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 20-30 min</span>
           <span className="w-1 h-1 rounded-full bg-gray-300" />
           <span className="truncate">by {product.vendorName}</span>
        </div>

        <div className="mt-auto">
           <button
            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
            className="w-full h-12 rounded-[1.25rem] bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
          >
            <ShoppingBag className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
            {t('common.addToCart')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
