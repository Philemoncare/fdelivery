import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg space-y-6"
      >
        <div className="relative mx-auto w-40 h-40">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-950/40 dark:to-blue-950/40 blur-2xl" />
          <div className="relative flex items-center justify-center w-full h-full rounded-[2.5rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl">
            <span className="text-6xl font-heading font-black text-gradient-brand">404</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-gray-900 dark:text-white">
            Page not found
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            The page you&apos;re looking for may have moved, been removed, or never existed. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => navigate('/')} className="rounded-xl font-black px-6">
            <Home className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <Button variant="outline" onClick={() => navigate('/products')} className="rounded-xl font-black px-6">
            <Search className="w-4 h-4 mr-2" /> Browse Products
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-xl font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
