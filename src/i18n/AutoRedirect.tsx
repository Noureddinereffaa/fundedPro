import { useEffect } from 'react';
import { SUPPORTED_CODES } from './config';

export function AutoRedirect() {
  useEffect(() => {
    const pathLang = window.location.pathname.split('/')[1];
    if (pathLang && SUPPORTED_CODES.includes(pathLang)) return;

    const cookieLang = document.cookie
      .split('; ')
      .find((row) => row.startsWith('i18next='))
      ?.split('=')[1];

    if (cookieLang && SUPPORTED_CODES.includes(cookieLang)) {
      const path = window.location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/$1');
      window.location.replace(`/${cookieLang}${path}`);
      return;
    }

    const browserLangs = navigator.languages || [navigator.language];
    for (const bl of browserLangs) {
      const base = bl.split('-')[0];
      if (SUPPORTED_CODES.includes(base)) {
        const path = window.location.pathname;
        window.location.replace(`/${base}${path}`);
        return;
      }
    }
  }, []);

  return null;
}
