import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isRtl } from './config';

export function useDirection() {
  const { i18n } = useTranslation();

  return useMemo(() => {
    const lang = i18n.language;
    return {
      dir: isRtl(lang) ? 'rtl' : 'ltr',
      isRtl: isRtl(lang),
      isLtr: !isRtl(lang),
    };
  }, [i18n.language]);
}
