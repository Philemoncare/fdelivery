import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Eye, Star, Store } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import { Product } from '@/src/types';

interface FoodCardProps {
  product: Product;
  variant?: 'grid' | 'list' | 'compact';
}

export const FoodCard: React.FC<FoodCardProps> = ({ product, variant = 'grid' }) => {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct, formatPrice } = useApp();

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
    <div className={cn(
      "group bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:border-emerald-500/30 transition-all flex flex-col",
      variant === 'grid' ? "h-full" : "sm:flex-row sm:h-48"
    )}>
      {/* Image Area */}
      <div className={cn(
        "relative overflow-hidden bg-gray-50 dark:bg-slate-800 shrink-0",
        variant === 'grid' ? "aspect-square" : "aspect-square sm:w-48 sm:h-full"
      )}>
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onClick={handleNavigate}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isFlashSale && (
            <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-widest">Flash Sale</span>
          )}
          {product.discountPercent && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-widest">-{product.discountPercent}%</span>
          )}
        </div>

        {/* Floating Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md transition-all",
              isFav ? "bg-rose-500 text-white" : "bg-white/90 text-gray-500 hover:text-rose-500"
            )}
          >
            <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setQuickViewProduct(product); }}
            className="w-9 h-9 rounded-xl bg-white/90 text-gray-500 hover:text-emerald-500 shadow-xl backdrop-blur-md transition-all"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between min-w-0">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
             <button onClick={() => navigate(`/vendors/${product.vendorId}`)} className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline truncate">
               <Store className="w-3 h-3" /> {product.vendorName}
             </button>
             <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
               <Star className="w-3 h-3 fill-current" /> {product.rating || '4.5'}
             </span>
          </div>
          <h3
            onClick={handleNavigate}
            className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight line-clamp-2 cursor-pointer hover:text-emerald-600 transition-colors"
          >
            {product.title}
          </h3>
          {variant === 'list' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-medium leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="pt-4 mt-auto flex items-center justify-between border-t border-gray-50 dark:border-slate-800/50">
          <div>
            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
              {formatPrice(product.price)}
            </p>
            {product.originalPrice && (
              <p className="text-[10px] text-gray-400 line-through mt-1">{formatPrice(product.originalPrice)}</p>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
            className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> ADD
          </button>
        </div>
      </div>
    </div>
  );
};
