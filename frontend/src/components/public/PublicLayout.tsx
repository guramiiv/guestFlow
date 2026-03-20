import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { getPublicProperty } from '@/api/public';
import type { PublicProperty } from '@/types/public';

const LANGUAGES = [
  { code: 'ka', label: 'KA' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
] as const;

export default function PublicLayout() {
  const { slug } = useParams<{ slug: string }>();
  const [, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();

  // Share the same react-query cache key as PublicBookingPage — no extra request
  const { data: property } = useQuery<PublicProperty>({
    queryKey: ['publicProperty', slug],
    queryFn: () => getPublicProperty(slug!),
    enabled: !!slug,
  });

  const displayName = property
    ? i18n.language === 'ka'
      ? property.name_ka || property.name_en
      : property.name_en || property.name_ka
    : '';

  const phone = property?.phone;
  const whatsapp = property?.whatsapp;

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden" style={{ fontFamily: '"BPG Nino Mtavruli", "DejaVu Sans", "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
          <h1
            className="truncate text-lg font-bold sm:text-xl"
            style={{ color: '#0D2137' }}
          >
            {displayName}
          </h1>

          <div className="flex items-center gap-1">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => {
                  i18n.changeLanguage(code);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('lang', code);
                    return next;
                  });
                }}
                className="rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-3 sm:py-1"
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  ...(i18n.language === code
                    ? { backgroundColor: '#117A65', color: '#fff' }
                    : { backgroundColor: '#F0F0F0', color: '#2C3E50' }),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#F8F9FA' }} className="border-t">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 px-4 py-6 text-sm sm:flex-row sm:justify-between">
          <a
            href="https://guestflow.ge"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium"
            style={{ color: '#117A65' }}
          >
            {t('public.poweredBy')}
          </a>

          {(phone || whatsapp) && (
            <div className="flex items-center gap-4" style={{ color: '#2C3E50' }}>
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-1 py-2 hover:underline" style={{ minHeight: '44px' }}>
                  <Phone size={14} />
                  <span>{phone}</span>
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 py-2 hover:underline"
                  style={{ minHeight: '44px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.11.546 4.093 1.503 5.818L.036 23.573c-.066.245.015.507.21.661.142.112.316.166.49.166.057 0 .114-.007.17-.022l5.903-1.526A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.855 0-3.63-.508-5.186-1.471l-.372-.23-3.507.907.892-3.434-.248-.393A9.78 9.78 0 012.182 12c0-5.414 4.404-9.818 9.818-9.818S21.818 6.586 21.818 12 17.414 21.818 12 21.818z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
