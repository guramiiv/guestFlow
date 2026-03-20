import { Link } from 'react-router-dom';

interface BreadcrumbProps {
  property: {
    city: string;
    region_ka: string;
    name_en: string;
    name_ka: string;
    slug: string;
  };
  language?: 'ka' | 'en' | 'ru';
}

export default function Breadcrumb({ property, language }: BreadcrumbProps) {
  const propertyName =
    language === 'ka'
      ? property.name_ka || property.name_en
      : property.name_en || property.name_ka;

  const items = [
    { label: 'GuestFlow.ge', to: '/' },
    { label: property.region_ka, to: '/' },
    { label: property.city, to: '/' },
  ];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <Link to={item.to} className="hover:text-gray-700 hover:underline">
              {item.label}
            </Link>
            <span aria-hidden="true">/</span>
          </li>
        ))}
        <li className="text-gray-700 font-medium" aria-current="page">
          {propertyName}
        </li>
      </ol>
    </nav>
  );
}
