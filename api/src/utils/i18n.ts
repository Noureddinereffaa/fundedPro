import i18n from 'i18next';
import i18nFsBackend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr', 'es', 'id'] as const;

export const RTL_LANGUAGES = ['ar'];

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang);
}

i18n
  .use(i18nFsBackend)
  .init({
    fallbackLng: 'en',
    debug: false,
    ns: ['common', 'trading', 'auth', 'emails'],
    defaultNS: 'common',
    backend: {
      loadPath: path.join(__dirname, '../../locales/{{lng}}/{{ns}}.json'),
    },
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
  });

export default i18n;
