import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { getLanguageDir } from './config';

function RtlDirection({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lang = i18n.language;
    const dir = getLanguageDir(lang);
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.classList.remove('rtl', 'ltr');
    document.documentElement.classList.add(dir);
    document.title = 'ProFundX';
  }, [i18n.language]);

  return <>{children}</>;
}

export function I18nRoot({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <RtlDirection>{children}</RtlDirection>
    </I18nextProvider>
  );
}
