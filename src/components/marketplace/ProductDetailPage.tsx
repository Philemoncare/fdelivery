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
  ArrowLeft
} from 'lucide-react';

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
    reviews
  } = useApp();

  const product = products.find((p) => p.id === id) || selectedProduct;

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'qa'>('specs');

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
      <h3 className="text-xl font-bold">Meal not found</h3>
      <button onClick={() => navigate('/products')} className="mt-4 text-emerald-600 font-bold underline">Back to Menu</button>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Back Button */}
      <button
        onClick={() => navigate('/products')}
        className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-emerald-600 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Menu</span>
      </button>

      {/* Main Grid: Gallery & Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Multi-Image Gallery */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl">
            <img
              src={product.images && product.images.length > activeImgIndex ? product.images[activeImgIndex] : (product.images?.[0] || '')}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.discountPercent && (
              <span className="absolute top-4 left-4 bg-rose-500 text-white font-black text-xs px-3 py-1 rounded-full shadow">
                -{product.discountPercent}% FLASH DISCOUNT
              </span>
            )}
            <button
              onClick={() => toggleWishlist(product)}
              className={`absolute top-4 right-4 p-3 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow transition ${
                isSaved ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500' : ''}`} />
            </button>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                    activeImgIndex === idx ? 'border-emerald-500 scale-105 shadow-md' : 'border-gray-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: PDP Purchasing Info */}
        <div className="lg:col-span-6 space-y-6">
          
          <div>
            {/* Vendor Banner Pill */}
            <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Store className="w-4 h-4" />
              <span>{product.vendorName}</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-gray-900 dark:text-white leading-tight">
              {product.title}
            </h1>

            {/* Ratings & Prep */}
            <div className="flex items-center space-x-4 mt-3 text-xs">
              <div className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-gray-400 font-normal">({product.reviewsCount} customer reviews)</span>
              </div>
              <span className="text-gray-400">Prep: {product.prepTime || "~15 mins"}</span>
              {product.calories && <span className="text-gray-400"> {product.calories}</span>}
              {product.isVeg && <span className="text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">Vegetarian</span>}
              <span className="text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                Available ({product.stock} portions)
              </span>
            </div>
          </div>

          {/* Price Box */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-gray-400 line-through ml-2">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> Chef Prep: {product.prepTime || "~15 Mins"}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {product.description}
          </p>

          {/* Ingredients & Add-ons */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.ingredients.map((ing) => (
                <span key={ing} className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-1 rounded-full font-medium border border-gray-200 dark:border-slate-700">
                  {ing}
                </span>
              ))}
            </div>
          )}

          {product.spiceLevel && (
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Spice Level: <span className="text-rose-500">{product.spiceLevel}</span>
            </p>
          )}

          {product.addons && product.addons.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Popular Add-ons:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.addons.map((addon) => (
                  <span key={addon} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200">
                    + {addon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4 pt-2">
              {product.variants.map((v) => (
                <div key={v.name}>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                    Select {v.name}:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt) => {
                      const isSelected = selectedVariants[v.name] === opt.label;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => setSelectedVariants((prev) => ({ ...prev, [v.name]: opt.label }))}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preferred Rider Card Selection */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Choose Preferred Dispatch Rider:</span>
              <span className="text-emerald-600 font-normal">Fastest local options</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {riders.map((r) => {
                const isSelected = selectedRider?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRider(r)}
                    className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <img src={r.avatar} alt={r.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{r.name}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">{r.etaMinutes}m ETA</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-500 p-1">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold w-8 text-center text-gray-900 dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="text-gray-500 p-1">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center space-x-2 shadow cursor-pointer"
            >
              <span>Order Now with Express Rider</span>
            </button>

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
            Product Specifications
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'reviews'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Customer Reviews ({product.reviewsCount})
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'qa'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Restaurant Q&A (4)
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
                  { key: 'Dietary', val: product.isVeg ? 'Vegetarian friendly' : 'Contains meat' },
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
                 <p className="text-gray-400 font-bold uppercase tracking-widest">No reviews for this dish yet</p>
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
                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-0.5">Chef's Reply</p>
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
              <p className="font-bold text-gray-900 dark:text-white">Q: Can I request less spice or extra sauce?</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">A: Yes! Just add a note during checkout or pick your spice level here.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
