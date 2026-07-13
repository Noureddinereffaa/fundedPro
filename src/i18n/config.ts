import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'es', name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export type LanguageDir = (typeof SUPPORTED_LANGUAGES)[number]['dir'];

export const SUPPORTED_CODES: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

const RTL_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code);

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as 'ar');
}

export function getLanguageDir(lang: string): LanguageDir {
  return isRtl(lang) ? 'rtl' : 'ltr';
}

const localeModules = import.meta.glob('./locales/**/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

function buildResources(): Record<string, Record<string, Record<string, unknown>>> {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const [path, module] of Object.entries(localeModules)) {
    const match = path.match(/\.\/locales\/([^/]+)\/(.+)\.json$/);
    if (!match) continue;
    const [, lang, ns] = match;
    if (!resources[lang]) resources[lang] = {};
    resources[lang][ns] = module.default as Record<string, unknown>;
  }
  return resources;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    ns: ['common', 'trading', 'auth', 'dashboard', 'admin'],
    defaultNS: 'common',
    resources: buildResources(),
    detection: {
      order: ['cookie', 'localStorage', 'navigator'],
      lookupCookie: 'i18next',
      caches: ['cookie'],
      cookieMinutes: 525600,
    },
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
    returnObjects: false,
    supportedLngs: SUPPORTED_CODES,
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
  });

export default i18n;
