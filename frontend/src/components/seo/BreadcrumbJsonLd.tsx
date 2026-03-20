import { Helmet } from 'react-helmet-async';

interface BreadcrumbJsonLdProps {
  property: {
    city: string;
    region: string;
    region_ka: string;
    name_en: string;
    name_ka: string;
    slug: string;
  };
}

export default function BreadcrumbJsonLd({ property }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'GuestFlow.ge',
        item: 'https://guestflow.ge',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${property.region_ka} (${property.region})`,
        item: `https://guestflow.ge/region/${property.region.toLowerCase()}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: property.city,
        item: `https://guestflow.ge/region/${property.region.toLowerCase()}/${property.city.toLowerCase()}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: property.name_en || property.name_ka,
        item: `https://guestflow.ge/book/${property.slug}`,
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
