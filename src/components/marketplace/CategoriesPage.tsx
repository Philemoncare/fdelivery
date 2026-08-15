import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { Breadcrumbs } from '@/src/components/common/Breadcrumbs';

export function CategoriesPage() {
  const navigate = useNavigate();
  const { categories, products } = useApp();

  return (
    <div className="pb-16">
      <Breadcrumbs />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white">
            All Categories
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Explore every cuisine and product category across OmniMarket&apos;s verified vendor network in Takoradi and beyond.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {categories.map((cat, i) => {
            const count = products.filter(p => p.category === cat.name && p.status === 'active').length || cat.count;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate('/products')}
                className="group glass-card rounded-[2rem] p-5 text-center hover:border-emerald-500/40 hover:-translate-y-1 transition-all"
              >
                <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden mb-4 group-hover:scale-105 transition-transform shadow-sm">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-950 dark:to-blue-950" />
                  )}
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-emerald-600 transition">{cat.name}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{count}+ items</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 mt-3 opacity-0 group-hover:opacity-100 transition">
                  Browse <ChevronRight className="w-3 h-3" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
