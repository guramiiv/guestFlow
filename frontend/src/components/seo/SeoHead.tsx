import { Helmet } from 'react-helmet-async';
import type { SeoData } from '@/types/public';

const REGION_ISO: Record<string, string> = {
  tbilisi: 'GE-TB',
  kakheti: 'GE-KA',
  imereti: 'GE-IM',
  adjara: 'GE-AJ',
  svaneti: 'GE-SZ',
  mtskheta_mtianeti: 'GE-MM',
  guria: 'GE-GU',
  samegrelo: 'GE-SZ',
  racha: 'GE-RL',
  kvemo_kartli: 'GE-KK',
  shida_kartli: 'GE-SK',
  samtskhe_javakheti: 'GE-SJ',
};

const OG_LOCALE: Record<string, string> = {
  ka: 'ka_GE',
  en: 'en_US',
  ru: 'ru_RU',
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

interface SeoHeadProps {
  seoData: SeoData;
  language: 'ka' | 'en' | 'ru';
}

export default function SeoHead({ seoData, language }: SeoHeadProps) {
  const { property, pricing, urls } = seoData;
  const slug = property.slug;
  const canonical = urls.canonical_url;
  const priceNote = pricing.min_price != null ? `₾${pricing.min_price}` : null;

  // Title
  const title =
    language === 'ka'
      ? `${property.name_ka} — ონლაინ ჯავშანი | GuestFlow.ge`
      : `${property.name_en || property.name_ka} | Book Direct — GuestFlow.ge`;

  // Description
  const rawDesc = language === 'ka' ? property.description_ka : property.description_en;
  const descSuffix = priceNote
    ? language === 'ka'
      ? `. დაჯავშნეთ პირდაპირ ${priceNote}/ღამიდან.`
      : `. Book direct from ${priceNote}/night.`
    : '';
  const maxDescBody = 160 - descSuffix.length;
  const description = rawDesc
    ? truncate(rawDesc, Math.max(maxDescBody, 60)) + descSuffix
    : descSuffix.slice(2); // strip leading ". "

  // Keywords
  const keywords = [
    property.city,
    property.region,
    'guesthouse',
    'Georgia',
    'hotel',
    'accommodation',
    'booking',
    'საქართველო',
    property.region_ka,
    'სასტუმრო',
    'ჯავშანი',
  ]
    .filter(Boolean)
    .join(', ');

  // OG short description
  const ogDesc = rawDesc
    ? truncate(rawDesc, 120) + (priceNote ? `. From ${priceNote}/night.` : '')
    : priceNote
      ? `From ${priceNote}/night.`
      : '';

  const ogTitle = `${property.name_en || property.name_ka} — Book Direct`;

  const firstPhoto = property.photos.length > 0 ? property.photos[0] : null;
  const hasGeo = property.latitude != null && property.longitude != null;

  // Resolve region key — API may return display name ("Kakheti") or slug ("kakheti")
  const regionSlug = Object.keys(REGION_ISO).find(
    (k) => k === property.region || k.replace(/_/g, ' ') === property.region.toLowerCase(),
  );
  const isoCode = regionSlug ? REGION_ISO[regionSlug] : undefined;

  const locale = OG_LOCALE[language] ?? 'ka_GE';
  const altLocales = Object.values(OG_LOCALE).filter((l) => l !== locale);

  return (
    <Helmet>
      {/* Basic */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />

      {/* Hreflang */}
      <link rel="alternate" hrefLang="ka" href={`https://guestflow.ge/book/${slug}?lang=ka`} />
      <link rel="alternate" hrefLang="en" href={`https://guestflow.ge/book/${slug}?lang=en`} />
      <link rel="alternate" hrefLang="ru" href={`https://guestflow.ge/book/${slug}?lang=ru`} />
      <link rel="alternate" hrefLang="x-default" href={`https://guestflow.ge/book/${slug}`} />

      {/* Open Graph */}
      <meta property="og:type" content="hotel" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDesc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={locale} />
      {altLocales.map((l) => (
        <meta key={l} property="og:locale:alternate" content={l} />
      ))}
      <meta property="og:site_name" content="GuestFlow.ge" />

      {firstPhoto && <meta property="og:image" content={firstPhoto} />}
      {firstPhoto && <meta property="og:image:width" content="1200" />}
      {firstPhoto && <meta property="og:image:height" content="630" />}

      {/* OG place / business */}
      {hasGeo && (
        <meta property="place:location:latitude" content={String(property.latitude)} />
      )}
      {hasGeo && (
        <meta property="place:location:longitude" content={String(property.longitude)} />
      )}
      <meta property="business:contact_data:street_address" content={property.address_ka} />
      <meta property="business:contact_data:locality" content={property.city} />
      <meta property="business:contact_data:region" content={property.region} />
      <meta property="business:contact_data:country_name" content="Georgia" />
      {property.phone && (
        <meta property="business:contact_data:phone_number" content={property.phone} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDesc} />
      {firstPhoto && <meta name="twitter:image" content={firstPhoto} />}

      {/* SEO extras */}
      <meta name="robots" content="index, follow" />
      {isoCode && <meta name="geo.region" content={isoCode} />}
      <meta name="geo.placename" content={`${property.city}, Georgia`} />
      {hasGeo && (
        <meta name="geo.position" content={`${property.latitude};${property.longitude}`} />
      )}
      {hasGeo && (
        <meta name="ICBM" content={`${property.latitude}, ${property.longitude}`} />
      )}
    </Helmet>
  );
}
