import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Star,
  Store,
  ShieldCheck,
  Truck,
  ShoppingCart,
  Heart,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ProductService } from '@/src/services/api';

export const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    selectedProduct,
    products,
    addToCart,
    formatPrice,
    riders,
    selectedRider,
    setSelectedRider,
    toggleWishlist,
    isInWishlist,
    isLoading,
    reviews,
    t
  } = useApp();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'qa'>('specs');
  const [fetched, setFetched] = useState<any>(null);

  const product = fetched || products.find((p) => p.id === id) || selectedProduct;

  // Fallback fetch for deep links / hard refreshes where the catalog may not
  // be loaded yet (e.g. sharing a meal link directly).
  React.useEffect(() => {
    if (!id || fetched) return;
    ProductService.getById(id).then(setFetched).catch(() => setFetched(null));
  }, [id, fetched]);

  const isSaved = product ? isInWishlist(product.id) : false;

  const handleAddToCart = () => {
    if (product) addToCart(product, quantity, selectedVariants);
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product, quantity, selectedVariants);
      navigate('/checkout');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  if (!product) {
    return <div className="max-w-7xl mx-auto py-16 px-4 text-center">
      <h3 className="text-xl font-bold">{t('common.noResults')}</h3>
      <button onClick={() => navigate('/products')} className="mt-4 text-emerald-600 font-bold underline">{t('nav.products')}</button>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8 sm:space-y-12 pb-32">
      
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('common.back')}</span>
      </button>

      {/* Main Grid: Gallery & Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column: Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl">
            <img
              src={product.images && product.images.length > activeImgIndex ? product.images[activeImgIndex] : (product.images?.[0] || '')}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.discountPercent && (
              <span className="absolute top-6 left-6 bg-rose-500 text-white font-black text-[10px] px-3 py-1 rounded-xl shadow-lg uppercase tracking-widest">
                -{product.discountPercent}% OFF
              </span>
            )}
            <button
              onClick={() => toggleWishlist(product)}
              className={cn(
                "absolute top-6 right-6 p-3.5 rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-90",
                isSaved ? "bg-rose-500 text-white" : "bg-white/90 text-gray-500"
              )}
            >
              <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
            </button>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 snap-start ${
                    activeImgIndex === idx ? 'border-emerald-500 scale-105 shadow-md' : 'border-gray-100 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information */}
        <div className="lg:col-span-6 space-y-8">
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate(`/vendors/${product.vendorId}`)} className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900 shadow-sm hover:underline">
                <Store className="w-4 h-4" />
                {product.vendorName}
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              </button>
              {product.isVeg && <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-3 py-2 rounded-xl">{t('common.vegetarian')}</span>}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
              {product.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500">
              <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl">
                <Star className="w-4 h-4 fill-current" />
                <span>{product.rating != null ? product.rating : '—'}</span>
                <span className="text-gray-400 font-medium">({product.reviewsCount} {t('product.reviews')})</span>
              </div>
              {product.prepTime ? (
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-500" /> {product.prepTime}</span>
              ) : null}
              <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> {t('common.inStock')} ({product.stock})</span>
            </div>
          </div>

          <div className="space-y-4">
             <div className="bg-gray-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-inner">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('product.price')}</p>
                   <p className="text-4xl font-black text-emerald-600">{formatPrice(product.price)}</p>
                </div>
                {product.originalPrice && (
                   <div className="text-right">
                      <p className="text-xs text-gray-400 line-through font-black">{formatPrice(product.originalPrice)}</p>
                      <p className="text-[10px] text-rose-500 font-black uppercase">{t('common.saveDeal')} {Math.round((1 - product.price/product.originalPrice)*100)}%</p>
                   </div>
                )}
             </div>
             <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
               {product.description}
             </p>
          </div>

          {/* Riders Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('common.preferredRider')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {riders.filter(r => r.isOnline && r.isAvailable).slice(0, 2).map((r) => (
                <button key={r.id} onClick={() => setSelectedRider(r)}
                  className={cn("p-4 rounded-3xl border-2 flex items-center gap-4 text-left transition-all",
                    selectedRider?.id === r.id ? "border-emerald-500 bg-white dark:bg-slate-800 shadow-md ring-4 ring-emerald-500/5" : "border-gray-50 bg-gray-50/50 hover:border-emerald-200")}>
                  <img src={r.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">{r.name}</p>
                    <div className="flex items-center gap-2 text-[8px] text-gray-500 font-bold uppercase mt-0.5">
                      <span className="text-amber-500 font-bold">★ {r.rating}</span>
                      <span>{r.vehicleType}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600">{formatPrice(r.deliveryFee)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Actions on Mobile */}
          <div className="fixed bottom-0 inset-x-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 p-6 z-40 lg:relative lg:p-0 lg:bg-transparent lg:border-none lg:backdrop-blur-none pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-1 shadow-inner h-14 sm:h-16 ring-1 ring-gray-200 dark:ring-slate-700">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-gray-900 font-black text-xl">-</button>
                <span className="w-10 text-center font-black text-base text-gray-900 dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-gray-900 font-black text-xl">+</button>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button className="h-14 sm:h-16 rounded-[1.5rem] bg-emerald-500 hover:bg-emerald-600 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 gap-2" onClick={handleAddToCart}>
                  <ShoppingCart className="w-4 h-4" /> {t('common.addToCart').toUpperCase()}
                </Button>
                <Button className="hidden sm:flex h-16 rounded-[1.5rem] bg-gray-900 text-white font-black text-xs uppercase tracking-widest shadow-xl gap-2" onClick={handleBuyNow}>
                   {t('checkout.placeOrder').toUpperCase()} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex border-b border-gray-200 dark:border-slate-800 space-x-6 text-xs font-bold mb-6">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'specs'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('deliver.packageDetails')}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'reviews'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('product.reviews')} ({product.reviewsCount})
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'qa'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('support.faq')}
          </button>
        </div>

        {activeTab === 'specs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {product.specifications ? (
              Object.entries(product.specifications).map(([key, val]) => (
                <div key={key} className="flex justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">{key}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{val}</span>
                </div>
              ))
            ) : (
              <>
                {[
                  { key: 'Prep Time', val: product.prepTime || '~15 minutes' },
                  { key: 'Calories', val: product.calories || 'N/A' },
                  { key: 'Spice Level', val: product.spiceLevel || 'N/A' },
                  { key: 'Dietary', val: product.isVeg ? t('common.vegetarianFriendly') : t('common.containsMeat') },
                  { key: 'Ingredients', val: product.ingredients?.join(', ') || 'N/A' },
                  { key: 'Popular Add-ons', val: product.addons?.join(', ') || 'N/A' },
                ].map((row) => (
                  <div key={row.key} className="flex justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">{row.key}</span>
                    <span className="font-bold text-gray-900 dark:text-white text-right max-w-[60%]">{row.val}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4 text-xs">
            {reviews.filter(r => r.productId === product.id).length === 0 ? (
               <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-gray-50/50 dark:bg-slate-900/50">
                 <p className="text-gray-400 font-bold uppercase tracking-widest">{t('common.noReviews')}</p>
               </div>
            ) : (
              reviews.filter(r => r.productId === product.id).map(rev => (
                <div key={rev.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">{rev.userName}</span>
                    <span className="text-amber-500 font-bold flex items-center gap-1"><Star className="w-3 h-3 fill-amber-500" /> {rev.rating}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{rev.comment}</p>
                  {rev.reply && (
                     <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/20">
                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-0.5">{t('common.chefReply')}</p>
                        <p className="text-gray-600 dark:text-gray-400 italic">"{rev.reply}"</p>
                     </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border">
              <p className="font-bold text-gray-900 dark:text-white">{t('common.faqQ1')}</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">{t('common.faqA1')}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
