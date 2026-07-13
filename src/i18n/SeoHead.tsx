import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from './config';

interface SeoHeadProps {
  title?: string;
  description?: string;
}

const defaultDescription: Record<string, string> = {
  en: 'ProFundX — Prop Trading Platform. Pass the challenge, get funded, and trade with capital up to $200,000.',
  ar: 'بروفنداكس — منصة تمويل المتداولين. اجتز التحدي، احصل على التمويل، وتداول برأس مال يصل إلى ٢٠٠,٠٠٠ دولار.',
  fr: 'ProFundX — Plateforme de Prop Trading. Relevez le défi, obtenez un financement et tradez avec un capital jusqu\'à 200 000 $.',
  es: 'ProFundX — Plataforma de Prop Trading. Supera el desafío, obtén financiación y opera con hasta $200,000.',
  id: 'ProFundX — Platform Prop Trading. Lewati tantangan, dapatkan pendanaan, dan trading dengan modal hingga $200,000.',
};

export function SeoHead({ title, description }: SeoHeadProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const siteName = 'ProFundX';

  const currentUrl = window.location.href;
  const path = window.location.pathname.replace(/^\/[a-z]{2}/, '');

  const metaDescription = description || defaultDescription[lang] || defaultDescription.en;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title ? `${title} | ${siteName}` : siteName}</title>
      <meta name="description" content={metaDescription} />
      <meta name="language" content={lang} />

      {SUPPORTED_LANGUAGES.map((l) => (
        <link
          key={l.code}
          rel="alternate"
          hrefLang={l.code}
          href={`${window.location.origin}/${l.code}${path}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${window.location.origin}/en${path}`} />

      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content={lang === 'ar' ? 'ar_SA' : lang === 'fr' ? 'fr_FR' : lang === 'es' ? 'es_ES' : lang === 'id' ? 'id_ID' : 'en_US'} />
    </Helmet>
  );
}
