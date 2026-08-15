import { Link } from 'react-router-dom';
import { Footer } from './Footer';
import type { FooterMode } from '@/src/lib/header-modes';
import { useApp } from '@/src/context/AppContext';

/**
 * Contextual footer system. The full public footer is reserved for marketplace
 * discovery and informational pages. Focused pages get a compact legal bar or
 * nothing at all so the viewport stays on the current task.
 */
export function ContextualFooter({ mode }: { mode: FooterMode }) {
  const { t } = useApp();
  if (mode === 'none') return null;

  if (mode === 'full') {
    return <Footer />;
  }

  return (
    <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-slate-400">
        <p>© 2026 {t('footer.copyright')}</p>
        <div className="flex items-center gap-5">
          <Link to="/terms" className="hover:text-emerald-500 transition-colors">{t('footer.terms')}</Link>
          <Link to="/privacy" className="hover:text-emerald-500 transition-colors">{t('footer.privacy')}</Link>
          <Link to="/faq" className="hover:text-emerald-500 transition-colors">{t('footer.helpFaq')}</Link>
        </div>
      </div>
    </footer>
  );
}