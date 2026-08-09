import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Store, Eye, Heart, ShoppingBag, ArrowRight } from 'lucide-react';

export const DealsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    products,
    formatPrice,
    addToCart,
    setQuickViewProduct,
    setSelectedProduct,
    toggleWishlist,
    isInWishlist,
    isLoading
  } = useApp();

  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const deals = products.filter((p) => p.isFlashSale);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 p-0.5 rounded-3xl shadow-xl">
        <div className="bg-white dark:bg-slate-900 rounded-[23px] p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-gray-900 dark:text-white">
                  Today's Deals & Flash Sales
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Exclusive restaurant meal deals with fast rider delivery.</p>
              </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Ends in:</span>
              <div className="bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl border border-slate-700">
                {String(timeLeft.hours).padStart(2, '0')}h
              </div>
              <span className="text-slate-400 font-bold">:</span>
              <div className="bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl border border-slate-700">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </div>
              <span className="text-slate-400 font-bold">:</span>
              <div className="bg-rose-600 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl shadow">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </div>
            </div>
          </div>

          {deals.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No active flash sales right now</h3>
              <button
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition"
              >
                Browse All Meals <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {deals.map((product) => (
                <div
                  key={product.id}
                  className="group bg-gray-50 dark:bg-slate-800/60 rounded-3xl p-4 border border-gray-200 dark:border-slate-700/80 hover:border-emerald-500 hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-white dark:bg-slate-900">
                      <img src={product.images?.[0] || ''} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        -{product.discountPercent}% OFF
                      </span>
                      <button
                        onClick={() => toggleWishlist(product)}
                        className={`absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition ${
                          isInWishlist(product.id) ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                      <Store className="w-3.5 h-3.5" />
                      <span className="truncate">{product.vendorName}</span>
                    </div>

                    <h4
                      onClick={() => {
                        setSelectedProduct(product);
                        navigate(`/product/${product.id}`);
                      }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:text-emerald-500 transition line-clamp-2 cursor-pointer"
                    >
                      {product.title}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        className="p-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition"
                        title="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition shadow"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
