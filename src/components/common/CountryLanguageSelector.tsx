import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/src/context/AppContext';
import { useToast } from '@/src/components/ui/toast';
import { cn } from '@/src/lib/utils';
import { Search, X, ChevronDown, Filter, Flag, Sun, Moon, Globe, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useDebounce } from '@/src/lib/hooks/use-debounce';
import { LanguageCode, CurrencyCode } from '@/src/types';
import { COUNTRIES, getCountryByCode, getDefaultCountry, getCountryByLanguage, getAllLanguageCodes, getCountryConfigForLanguage } from '@/src/data/countries';

// Flag emoji for each country code
const FLAG_EMOJIS: Record<string, string> = {
  GH: '🇬🇭', FR: '🇫🇷', ES: '🇪🇸', DE: '🇩🇪', US: '🇺🇸', GB: '🇬🇧',
  CN: '🇨🇳', SA: '🇸🇦', AE: '🇦🇪', EG: '🇪🇬', IN: '🇮🇳', NG: '🇳🇬',
  BE: '🇧🇪', CA: '🇨🇦', AU: '🇦🇺', JP: '🇯🇵', KE: '🇰🪬', ZA: '🇿🇦',
  NL: '🇳🇱', IT: '🇮🟦', PT: '🇵🟦', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰',
  FI: '🇫🇮', PL: '🇵🇱', RU: '🇷🇺', MX: '🇲🇽', BR: '🇧🇷',
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * CountryLanguageSelector - A premium modal/popover for selecting country and language.
 * 
 * Features:
 * - Searchable country list with flags
 * - Language selection beside each country
 * - Persisted preference (localStorage via AppContext)
 * - Desktop modal and mobile full-screen sheet
 * - Motion animations
 * - Accessibility (ESC, keyboard navigation, focus management)
 */
export function CountryLanguageSelector({ 
  initialLanguage: initialLang = 'EN' as LanguageCode, 
  onSelect,
  defaultCountryCode = 'GH'
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    language, setLanguage,
    currency, setCurrency,
    notifications, wishlist, conversations, markNotificationRead, markAllNotificationsRead, showToast, t,
  } = useApp();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ country: any; language: any } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [mobileView, setMobileView] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const updateView = () => {
      setMobileView(window.innerWidth <= 768);
    };
    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  // Filter countries based on search
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const filteredCountries = useMemo(() => {
    const query = (debouncedSearchQuery || '').toLowerCase().trim();
    if (!query) {
      return COUNTRIES.map(country => ({
        ...country,
        matchingLanguages: country.languages
      }));
    }

    return COUNTRIES.map(country => {
      const matchingLanguages = country.languages.filter(
        lang => lang.name.toLowerCase().includes(query) ||
               lang.code.toLowerCase().includes(query)
      );

      const isCountryMatch = country.name.toLowerCase().includes(query) ||
                            country.code.toLowerCase().includes(query);

      return {
        ...country,
        matchingLanguages: isCountryMatch ? country.languages : matchingLanguages,
        isCountryMatch
      };
    }).filter(c => c.isCountryMatch || c.matchingLanguages.length > 0);
  }, [debouncedSearchQuery]);

  // When search is empty, show all countries with all languages
  const displayCountries = filteredCountries;

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Handle language selection
  const handleLanguageSelect = useCallback((lang: { code: LanguageCode; name: string }, country: any) => {
    setLanguage(lang.code as LanguageCode);
    setSelectedCountry({ country, language: lang });
    
    // Update currency based on country
    const countryConfig = getCountryConfigForLanguage(lang.code as LanguageCode);
    if (countryConfig?.country) {
      setCurrency(countryConfig.country.currency as CurrencyCode);
    }
    
    showToast(t('nav.language'), `${lang.name} selected`);
    onSelect?.({ country: country.code, language: lang.code });
    setIsOpen(false);
  }, [setLanguage, setCurrency, onSelect, t]);

  // Handle country selection (without language change)
  const handleCountrySelect = useCallback((country: any) => {
    const countryConfig = getCountryConfigForLanguage(language as LanguageCode);
    if (countryConfig?.country) {
      setCurrency(countryConfig.country.currency as CurrencyCode);
    }
    onSelect?.({ country: country.code, language: language as LanguageCode });
    setIsOpen(false);
  }, [language, onSelect]);

  // Render country row
  const renderCountryRow = (country: any, index: number) => {
    const flagEmoji = FLAG_EMOJIS[country.code] || '🌐';
    const matchingLangs = country.matchingLanguages.length > 0 ? country.matchingLanguages : country.languages;
    
    return (
      <div
        key={country.code}
        className={cn(
          'group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors',
          focusedIndex === index ? 'bg-emerald-50' : 'hover:bg-gray-50 dark:hover:bg-slate-800',
          'data-[state=selected]:bg-emerald-50/50'
        )}
        onClick={() => handleCountrySelect(country)}
        role="button"
        tabIndex={focusedIndex === index ? 0 : -1}
        aria-selected={focusedIndex === index ? 'true' : 'false'}
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
          {flagEmoji}
        </span>
        <span className="font-medium truncate">{country.name}</span>
        <span className="text-sm text-gray-500 dark:text-gray-300 line-clamp-1">
          {matchingLangs.map((lang: any, i: number) => (
            <span key={lang.code} className="text-gray-400 dark:text-gray-600 mx-1">
              {lang.name}
            </span>
          ))}
        </span>
      </div>
    );
  };

  // Render language pill
  const renderLanguagePill = (lang: { code: LanguageCode; name: string }) => {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
          language === lang.code ? 'bg-emerald-100 text-emerald-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800',
          'cursor-pointer'
        )}
        onClick={() => handleLanguageSelect(lang, { code: selectedCountry?.country?.code, country: selectedCountry?.country })}
        role="menuitem"
        tabIndex={0}
      >
        {lang.name}
      </span>
    );
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Focus management on mount
  useEffect(() => {
    if (isOpen) {
      const input = document.querySelector('input[placeholder*="Search"]');
      if (input) {
        input.focus();
      }
    }
  }, [isOpen]);

  return (
    <motion.div
      open={isOpen}
      whileHover={false}
      whileTap={false}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50"
    >
      {/* backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* modal content */}
      <motion.div
        ref={ref => {
          if (isOpen && ref) {
            setTimeout(() => ref.focus(), 100);
          }
        }}
        className={cn(
          'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          mobileView ? 'w-full max-w-full sm:max-w-lg' : 'w-96 max-w-lg sm:max-w-[650px]',
          'bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800',
          'overflow-hidden animate-in fade-in-slide-up zoom-in'
        )}
      >
        {/* header */}
        <div className="border-b border-gray-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-500" />
            <input
              type="text"
              placeholder="Search region..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setFocusedIndex(-1)}
              className="flex-1 px-3 py-2 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-800 dark:text-white"
              aria-label="Search region"
            />
          </div>
          <X
            className="w-5 h-5 text-slate-400 dark:text-slate-500 hover:text-emerald-600"
            onClick={() => setIsOpen(false)}
            aria-label="Close selector"
          />
        </div>
        
        {/* countries list */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {displayCountries.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-300">
              <p className="text-sm">No countries found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayCountries.map((country, countryIndex) => (
                <React.Fragment key={country.code}>
                  {renderCountryRow(country, countryIndex)}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        
        {/* no results when searching */}
        {searchQuery && searchQuery.trim() && displayCountries.length === 0 && (
          <div className="p-4 text-center text-gray-400 dark:text-gray-300 text-sm">
            <p>No matching countries found</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * HeaderCountryLanguage - The header button that shows the country/language selector.
 * 
 * Displays: 🇬🇭 EN ▾
 * When clicked, opens the CountryLanguageSelector modal.
 */
export function HeaderCountryLanguage({ 
  defaultCountryCode = 'GH',
  onCountrySelect,
  onLanguageSelect
}) {
  const { language, setLanguage, currency, setCurrency } = useApp();
  const { user } = useAuth();
  
  // Get current country config
  const currentCountry = getCountryByCode(defaultCountryCode) || getDefaultCountry();
  const currentLang = language as LanguageCode;
  
  // Get country config for current language
  const countryConfig = getCountryConfigForLanguage(currentLang);
  const countryForLang = countryConfig?.country || currentCountry;
  
  // Get phone prefix display
  const phonePrefix = countryForLang?.phoneCode || '+233';
  
  // Header flag display
  const flagEmoji = FLAG_EMOJIS[currentCountry.code] || '🌐';
  
  // Header text
  const langLabel = currentLang === 'EN' ? 'EN' : 
    currentLang === 'FR' ? 'FR' :
    currentLang === 'ES' ? 'ES' :
    currentLang === 'DE' ? 'DE' :
    currentLang === 'ZH-CN' ? 'ZH' : 'AR';
  
  return (
    <div
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors cursor-pointer"
      onClick={(e) => e.stopPropagation()}
      role="button"
      aria-label="Country and language selector"
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
        {flagEmoji}
      </span>
      <span className="text-[10px] font-bold tracking-wider">
        {langLabel}
      </span>
      <ChevronDown className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
      <span className="text-[8px] text-gray-400 dark:text-gray-300">
        {phonePrefix}
      </span>
    </div>
  );
}

/**
 * CountryLanguagePopover - The popover that appears when header selector is clicked.
 * Uses CountryLanguageSelector inside a modal/portal.
 */
export function CountryLanguagePopover({ 
  defaultCountryCode = 'GH',
  onCountrySelect,
  onLanguageSelect
}) {
  const { language, setLanguage } = useApp();
  
  return (
    <CountryLanguageSelector
      initialLanguage={language as LanguageCode}
      defaultCountryCode={defaultCountryCode}
      onSelect={({ country, language }) => {
        setLanguage(language as LanguageCode);
        onCountrySelect?.(country);
        onLanguageSelect?.(language);
      }}
    />
  );
}
