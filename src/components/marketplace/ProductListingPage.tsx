import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Search,
  SlidersHorizontal,
  Grid,
  List,
  Star,
  Store,
  ShoppingBag,
  Eye,
  Heart,
  X,
  Check
} from 'lucide-react';

export const ProductListingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    products,
    vendors,
    categories,
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    addToCart,
    formatPrice,
    setSelectedProduct,
    setQuickViewProduct,
    toggleWishlist,
    isInWishlist
  } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(300);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('popular');

  // Filter products logic
  let filtered = products.filter((p) => {
    if (searchCategory !== 'All' && p.category !== searchCategory) return false;
    if (selectedVendorId !== 'all' && p.vendorId !== selectedVendorId) return false;
    if (p.price > maxPrice) return false;
    if (p.rating < minRating) return false;
    if (onlyInStock && p.stock <= 0) return false;
    if (
      searchQuery &&
      !p.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.category?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Sorting logic
  if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  if (sortBy === 'newest') filtered.sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold">Restaurant Menu & Meals</h1>
          <p className="text-xs text-emerald-100 mt-1">Discover meals, add-ons, and drinks from local restaurants with fast express delivery.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
          <span>Showing {filtered.length} of {products.length} Meals</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* FILTERS SIDEBAR */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 space-y-6 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-500" /> Filter Options
            </h3>
            <button
              onClick={() => {
                setSearchCategory('All');
                setSelectedVendorId('all');
                setMaxPrice(300);
                setMinRating(0);
                setOnlyInStock(false);
                setSearchQuery('');
              }}
              className="text-[11px] text-rose-500 font-semibold hover:underline"
            >
              Reset All
            </button>
          </div>

          {/* Search filter input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Keyword Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filter meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Filter by Restaurant</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Restaurants</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span>Max Price</span>
              <span className="text-emerald-600">{formatPrice(maxPrice)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Rating filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Minimum Rating</label>
            <div className="flex items-center space-x-2">
              {[0, 4.0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    minRating === r
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {r === 0 ? 'Any' : (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-white" /> {r}+
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only Checkbox */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="stockCheck"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="stockCheck" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Only Show Available Dishes
            </label>
          </div>

        </div>

        {/* PRODUCTS LISTING AREA */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls Header: Sort & View Toggle */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Dishes</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Products Grid / List */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-3">
              <Search className="w-10 h-10 text-gray-400 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No meals found</h3>
              <p className="text-xs text-gray-500">Try adjusting your filters or price slider.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product, idx) => (
                <div
                  key={product.id}
                  className="group bg-white dark:bg-slate-900 rounded-3xl p-4 border border-gray-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-2xl transition-all flex flex-col justify-between animate-tilt-hover"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100 dark:bg-slate-800">
                      <img
                        src={product.images?.[0] || ''}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {product.discountPercent && (
                        <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                          -{product.discountPercent}% OFF
                        </span>
                      )}
                      <button
                        onClick={() => toggleWishlist(product)}
                        className={`absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition ${
                          isInWishlist(product.id) ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                      <Store className="w-3.5 h-3.5" />
                      <span className="truncate">{product.vendorName}</span>
                    </div>

                    <h3
                      onClick={() => {
                        setSelectedProduct(product);
                        navigate(`/product/${product.id}`);
                      }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:text-emerald-500 transition line-clamp-2 cursor-pointer"
                    >
                      {product.title}
                    </h3>

                    <div className="flex items-center space-x-1.5 text-[11px] mt-2 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{product.rating}</span>
                      <span className="text-gray-400 font-normal">({product.reviewsCount} reviews)</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
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

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 transition"
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
          ) : (
            <div className="space-y-4">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-gray-200 dark:border-slate-800 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4">
                    <img src={product.images?.[0] || ''} alt={product.title} className="w-24 h-24 object-cover rounded-2xl border" />
                    <div className="space-y-1">
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> {product.vendorName}
                      </span>
                      <h4
                        onClick={() => {
                          setSelectedProduct(product);
                          navigate(`/product/${product.id}`);
                        }}
                        className="text-sm font-bold text-gray-900 dark:text-white hover:text-emerald-500 cursor-pointer"
                      >
                        {product.title}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end sm:self-center">
                    <span className="text-base font-extrabold text-emerald-600">{formatPrice(product.price)}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                    >
                      Add to Cart
                    </button>
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
