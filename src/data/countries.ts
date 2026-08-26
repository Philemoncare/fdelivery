/**
 * Country and locale configuration for OmniMarket.
 * 
 * Source of truth for:
 * - Country flags and names
 * - Official languages
 * - Phone calling codes
 * - Currency codes
 * 
 * Ghana is the default OmniMarket deployment.
 * 
 * @format
 */

import type { LanguageCode } from '@/src/types';

export interface CountryLanguage {
  code: LanguageCode;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string; // flag emoji or identifier
  languages: CountryLanguage[];
  currency: string;
  phoneCode: string;
  currencyName?: string;
}

/**
 * Complete country list configured for OmniMarket.
 * Flags are represented using emoji flag codes for consistency
 * and universal compatibility. The flag emoji for each country
 * is the regional indicator symbol sequence.
 */
export const COUNTRIES: Country[] = [
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'GHS',
    phoneCode: '+233',
    currencyName: 'Ghana Cedi'
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    languages: [
      { code: 'FR' as LanguageCode, name: 'Français' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+33',
    currencyName: 'Euro'
  },
  {
    code: 'ES',
    name: 'Spain',
    flag: '🇪🇸',
    languages: [
      { code: 'ES' as LanguageCode, name: 'Español' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+34',
    currencyName: 'Euro'
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    languages: [
      { code: 'DE' as LanguageCode, name: 'Deutsch' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+49',
    currencyName: 'Euro'
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'USD',
    phoneCode: '+1',
    currencyName: 'US Dollar'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'GBP',
    phoneCode: '+44',
    currencyName: 'Pound'
  },
  {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    languages: [
      { code: 'ZH-CN' as LanguageCode, name: '中文 (简体)' }
    ],
    currency: 'CNY',
    phoneCode: '+86',
    currencyName: 'Chinese Yuan'
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    languages: [
      { code: 'AR' as LanguageCode, name: 'العربية' }
    ],
    currency: 'SAR',
    phoneCode: '+966',
    currencyName: 'Saudi Rial'
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    languages: [
      { code: 'DE' as LanguageCode, name: 'Deutsch' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+49',
    currencyName: 'Euro'
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    languages: [
      { code: 'AR' as LanguageCode, name: 'العربية' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'AED',
    phoneCode: '+971'
  },
  {
    code: 'EG',
    name: 'Egypt',
    flag: '🇪🇬',
    languages: [
      { code: 'AR' as LanguageCode, name: 'العربية' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EGP',
    phoneCode: '+20'
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'INR',
    phoneCode: '+91'
  },
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'NGN',
    phoneCode: '+234',
    currencyName: 'Nigerian Naira'
  },
  {
    code: 'BE',
    name: 'Belgium',
    flag: '🇧🇪',
    languages: [
      { code: 'NL' as LanguageCode, name: 'Nederlands' },
      { code: 'FR' as LanguageCode, name: 'Français' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+32'
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' },
      { code: 'FR' as LanguageCode, name: 'Français' }
    ],
    currency: 'CAD',
    phoneCode: '+1'
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'AUD',
    phoneCode: '+61'
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'JPY',
    phoneCode: '+81'
  },
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🪬',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'KES',
    phoneCode: '+254'
  },
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    languages: [
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'ZAR',
    phoneCode: '+27'
  },
  {
    code: 'NL',
    name: 'Netherlands',
    flag: '🇳🇱',
    languages: [
      { code: 'NL' as LanguageCode, name: 'Nederlands' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+31'
  },
  {
    code: 'IT',
    name: 'Italy',
    flag: '🇮🇹',
    languages: [
      { code: 'IT' as LanguageCode, name: 'Italiano' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+39'
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    languages: [
      { code: 'PT' as LanguageCode, name: 'Português' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+351'
  },
  {
    code: 'SE',
    name: 'Sweden',
    flag: '🇸🇪',
    languages: [
      { code: 'SV' as LanguageCode, name: 'Svenska' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'SEK',
    phoneCode: '+46'
  },
  {
    code: 'NO',
    name: 'Norway',
    flag: '🇳🇴',
    languages: [
      { code: 'NO' as LanguageCode, name: 'Norsk' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'NOK',
    phoneCode: '+47'
  },
  {
    code: 'DK',
    name: 'Denmark',
    flag: '🇩🇰',
    languages: [
      { code: 'DA' as LanguageCode, name: 'Dansk' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'DKK',
    phoneCode: '+45'
  },
  {
    code: 'FI',
    name: 'Finland',
    flag: '🇫🇮',
    languages: [
      { code: 'FI' as LanguageCode, name: 'Suomi' },
      { code: 'SW' as LanguageCode, name: 'Svenska' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'EUR',
    phoneCode: '+358'
  },
  {
    code: 'PL',
    name: 'Poland',
    flag: '🇵🇱',
    languages: [
      { code: 'PL' as LanguageCode, name: 'Polski' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'PLN',
    phoneCode: '+48'
  },
  {
    code: 'RU',
    name: 'Russia',
    flag: '🇷🇺',
    languages: [
      { code: 'RU' as LanguageCode, name: 'Русский' }
    ],
    currency: 'RUB',
    phoneCode: '+7'
  },
  {
    code: 'MX',
    name: 'Mexico',
    flag: '🇲🇽',
    languages: [
      { code: 'ES' as LanguageCode, name: 'Español' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'MXN',
    phoneCode: '+52'
  },
  {
    code: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    languages: [
      { code: 'PT' as LanguageCode, name: 'Português' },
      { code: 'EN' as LanguageCode, name: 'English' }
    ],
    currency: 'BRL',
    phoneCode: '+55'
  },
];

/**
 * Get a country by its alpha-2 code.
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(country => country.code === code.toUpperCase());
}

/**
 * Get the default country (Ghana).
 */
export function getDefaultCountry(): Country {
  return COUNTRIES.find(country => country.code === 'GH') || COUNTRIES[0];
}

/**
 * Get the country for the current language selection.
 * Returns the country that speaks the given language as a primary language.
 */
export function getCountryByLanguage(languageCode: LanguageCode): Country | undefined {
  return COUNTRIES.find(
    country => country.languages.some(lang => lang.code === languageCode)
  );
}

/**
 * Get all available language codes across all countries.
 */
export function getAllLanguageCodes(): LanguageCode[] {
  const codes = new Set<LanguageCode>();
  COUNTRIES.forEach(country => {
    country.languages.forEach(lang => codes.add(lang.code));
  });
  return Array.from(codes);
}

/**
 * Get country configuration by language code.
 * Returns the country that primarily uses this language.
 */
export function getCountryConfigForLanguage(languageCode: LanguageCode): { country: Country; language: CountryLanguage } | undefined {
  for (const country of COUNTRIES) {
    const language = country.languages.find(lang => lang.code === languageCode);
    if (language) {
      return { country, language };
    }
  }
  return undefined;
}