import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from './config';

interface SeoHeadProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const OG_IMAGE = 'https://profundx.com/og-image.png';

const defaultDescription: Record<string, string> = {
  en: 'ProFundX — Prop Trading Platform. Pass the challenge, get funded, and trade with capital up to $200,000.',
  ar: 'بروفنداكس — منصة تمويل المتداولين. اجتز التحدي، احصل على التمويل، وتداول برأس مال يصل إلى ٢٠٠,٠٠٠ دولار.',
  fr: 'ProFundX — Plateforme de Prop Trading. Relevez le défi, obtenez un financement et tradez avec un capital jusqu\'à 200 000 $.',
  es: 'ProFundX — Plataforma de Prop Trading. Supera el desafío, obtén financiación y opera con hasta $200,000.',
  id: 'ProFundX — Platform Prop Trading. Lewati tantangan, dapatkan pendanaan, dan trading dengan modal hingga $200,000.',
};

export function SeoHead({ title, description, image, noIndex }: SeoHeadProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const siteName = 'ProFundX';

  const currentUrl = window.location.href;
  const path = window.location.pathname.replace(/^\/[a-z]{2}/, '');
  const canonicalUrl = `${window.location.origin}/${lang}${path}`;

  const metaDescription = description || defaultDescription[lang] || defaultDescription.en;
  const ogImage = image || OG_IMAGE;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title ? `${title} | ${siteName}` : siteName}</title>
      <meta name="description" content={metaDescription} />
      <meta name="language" content={lang} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <link rel="canonical" href={canonicalUrl} />

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
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang === 'ar' ? 'ar_SA' : lang === 'fr' ? 'fr_FR' : lang === 'es' ? 'es_ES' : lang === 'id' ? 'id_ID' : 'en_US'} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || siteName} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
