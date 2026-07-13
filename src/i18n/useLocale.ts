import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getLanguageDir } from './config';

export function useLocale() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const currentLang = i18n.language;
  const dir = getLanguageDir(currentLang);

  const changeLanguage = useCallback(
    (lang: string) => {
      const path = window.location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/$1');
      navigate(`/${lang}${path}`);
      i18n.changeLanguage(lang);
    },
    [i18n, navigate],
  );

  return { currentLang, dir, changeLanguage };
}
