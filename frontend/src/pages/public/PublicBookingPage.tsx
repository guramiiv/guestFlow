import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Wifi,
  Car,
  Snowflake,
  Fence,
  CookingPot,
  Tv,
  Wine,
  Flame,
  WashingMachine,
  Waves,
  Trees,
  Beef,
  Coffee,
  Plane,
  PawPrint,
  Users,
  BedDouble,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Search,
  Loader2,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { getPublicProperty, checkAvailability, getSeoData } from '@/api/public';
import type { PublicProperty, PublicRoom, AvailableRoom, BookingConfirmation as BookingConfirmationType, SeoData } from '@/types/public';
import SeoHead from '@/components/seo/SeoHead';
import JsonLd from '@/components/seo/JsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import Breadcrumb from '@/components/seo/Breadcrumb';
import AvailableRoomsList from '@/components/public/AvailableRoomsList';
import BookingForm from '@/components/public/BookingForm';
import BookingConfirmation from '@/components/public/BookingConfirmation';

type BookingStep = 'search' | 'results' | 'booking' | 'confirmation';

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  wifi: Wifi,
  parking: Car,
  ac: Snowflake,
  balcony: Fence,
  kitchen: CookingPot,
  tv: Tv,
  minibar: Wine,
  heating: Flame,
  washer: WashingMachine,
  pool: Waves,
  garden: Trees,
  bbq: Beef,
  breakfast: Coffee,
  airport_transfer: Plane,
  pet_friendly: PawPrint,
};

function localized(ka: string, en: string, lang: string) {
  return lang === 'ka' ? ka || en : en || ka;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'ka' | 'en' | 'ru';

  const [step, setStep] = useState<BookingStep>('search');
  const [checkIn, setCheckIn] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(2);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Selected room for booking step
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmationType | null>(null);

  const { data: property, isLoading, error } = useQuery<PublicProperty>({
    queryKey: ['publicProperty', slug],
    queryFn: () => getPublicProperty(slug!),
    enabled: !!slug,
  });

  const { data: seoData } = useQuery<SeoData>({
    queryKey: ['publicSeo', slug],
    queryFn: () => getSeoData(slug!),
    enabled: !!slug,
  });

  // Sync language from ?lang= query param
  useEffect(() => {
    const paramLang = searchParams.get('lang');
    if (paramLang && ['ka', 'en', 'ru'].includes(paramLang) && paramLang !== i18n.language) {
      i18n.changeLanguage(paramLang);
    }
  }, [searchParams, i18n]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  /* ─── Browser back button intercept ─── */
  const stepRef = useRef(step);
  stepRef.current = step;

  const goBack = useCallback(() => {
    const s = stepRef.current;
    if (s === 'confirmation') return; // no going back from confirmation
    if (s === 'booking') { setStep('results'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (s === 'results') { setStep('search'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }, []);

  useEffect(() => {
    // Push a dummy state so the first back press stays on the page
    if (step !== 'search' && step !== 'confirmation') {
      window.history.pushState({ step }, '');
    }
  }, [step]);

  useEffect(() => {
    function onPopState() {
      goBack();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [goBack]);

  async function handleSearch() {
    if (!slug) return;
    setSearching(true);
    setSearchError('');
    try {
      const rooms = await checkAvailability(slug, checkIn, checkOut, guests);
      setAvailableRooms(rooms);
      setStep('results');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      const msg = t('public.searchError');
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectRoom(room: AvailableRoom) {
    setSelectedRoom(room);
    setStep('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#117A65' }} />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <Search size={36} style={{ color: '#E74C3C' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#0D2137' }}>
          {t('public.propertyNotFound')}
        </h2>
        <p className="text-sm" style={{ color: '#666' }}>
          {t('public.propertyNotFoundDesc')}
        </p>
      </div>
    );
  }

  const description = localized(property.description_ka, property.description_en, lang);
  const houseRules = localized(property.house_rules_ka, property.house_rules_en, lang);
  const address = property.address_ka || '';

  return (
    <div style={{ fontFamily: '"BPG Nino Mtavruli", "DejaVu Sans", "Segoe UI", sans-serif' }}>
      {/* ══════ SEO ══════ */}
      {seoData && (
        <>
          <SeoHead seoData={seoData} language={lang} />
          <JsonLd seoData={seoData} />
          <BreadcrumbJsonLd property={seoData.property} />
        </>
      )}

      {/* ══════ BREADCRUMB ══════ */}
      {seoData && (
        <div className="mx-auto max-w-[1200px] px-4 py-3">
          <Breadcrumb property={seoData.property} language={lang} />
        </div>
      )}

      {/* ══════ HERO ══════ */}
      <section
        className="relative flex items-end h-[200px] sm:h-[300px] md:h-[400px]"
        style={
          property.photos?.[0]
            ? { backgroundImage: `url(${property.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, #0D2137 0%, #117A65 100%)' }
        }
      >
        {/* dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-14 sm:pb-20">
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            {property.property_type}
          </span>
          <h2 className="text-xl font-bold text-white sm:text-2xl md:text-4xl">{property.name_ka}</h2>
          {property.name_en && property.name_ka !== property.name_en && (
            <p className="mt-1 text-base text-white/80 sm:text-lg">{property.name_en}</p>
          )}
          <p className="mt-2 text-sm text-white/70">
            <MapPin size={14} className="mr-1 inline" />
            {property.city}, {t(`regions.${property.region}`)}
          </p>
        </div>
      </section>

      {/* ══════ SEARCH CARD ══════ */}
      <section className="mx-auto max-w-[900px] px-4" style={{ marginTop: '-40px', position: 'relative', zIndex: 20 }}>
        <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            {/* Check-in */}
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium" style={{ color: '#2C3E50' }}>
                {t('public.checkIn')}
              </label>
              <input
                type="date"
                value={checkIn}
                min={todayStr}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (e.target.value >= checkOut) {
                    setCheckOut(format(addDays(new Date(e.target.value), 1), 'yyyy-MM-dd'));
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties}
              />
            </div>

            {/* Check-out */}
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium" style={{ color: '#2C3E50' }}>
                {t('public.checkOut')}
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || todayStr}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties}
              />
            </div>

            {/* Guests */}
            <div className="w-full sm:w-32">
              <label className="mb-1 block text-xs font-medium" style={{ color: '#2C3E50' }}>
                {t('public.guests')}
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? t('public.guest') : t('public.guests')}
                  </option>
                ))}
              </select>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={searching || !checkIn || !checkOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-bold text-white transition-opacity disabled:opacity-50 sm:w-auto sm:min-w-[180px] sm:text-sm"
              style={{ backgroundColor: '#117A65', minHeight: '44px' } as React.CSSProperties}
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              {t('public.searchRooms')}
            </button>
          </div>

          {searchError && (
            <p className="mt-3 text-sm" style={{ color: '#E74C3C' }}>{searchError}</p>
          )}
        </div>
      </section>

      {/* ══════ RESULTS (shown after search) ══════ */}
      {(step === 'results' || searching) && (
        <section ref={resultsRef} className="mx-auto mt-8 max-w-[1200px] px-4">
          <AvailableRoomsList
            rooms={availableRooms}
            nights={availableRooms[0]?.nights ?? 0}
            onSelectRoom={handleSelectRoom}
            isLoading={searching}
          />
        </section>
      )}

      {/* ══════ BOOKING FORM ══════ */}
      {step === 'booking' && selectedRoom && property && (
        <BookingForm
          property={property}
          selectedRoom={selectedRoom}
          checkIn={checkIn}
          checkOut={checkOut}
          numGuests={guests}
          onBack={() => {
            setStep('results');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSuccess={(conf) => {
            setConfirmation(conf);
            setStep('confirmation');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* ══════ BOOKING CONFIRMATION ══════ */}
      {step === 'confirmation' && confirmation && property && (
        <BookingConfirmation confirmation={confirmation} property={property} />
      )}

      {/* ══════ PROPERTY DETAILS (hide on confirmation) ══════ */}
      {step !== 'confirmation' && (
      <section className="mx-auto mt-10 max-w-[1200px] px-4 pb-10">
        {/* Description */}
        {description && (
          <div className="mb-8">
            <p className="text-sm leading-relaxed" style={{ color: '#2C3E50' }}>{description}</p>
          </div>
        )}

        {/* Amenities */}
        {property.amenities?.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
              {t('public.amenities')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {property.amenities.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity] || BedDouble;
                return (
                  <div key={amenity} className="flex items-center gap-2 rounded-lg border p-3" style={{ minHeight: '44px' }}>
                    <Icon size={18} style={{ color: '#117A65' }} />
                    <span className="text-sm" style={{ color: '#2C3E50' }}>
                      {t(`public.amenityLabels.${amenity}`, amenity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* House Rules */}
        {houseRules && (
          <div className="mb-8">
            <button
              onClick={() => setRulesExpanded(!rulesExpanded)}
              className="flex w-full items-center justify-between rounded-lg border p-4 text-left"
              style={{ minHeight: '48px' }}
            >
              <span className="font-bold" style={{ color: '#0D2137' }}>
                {t('public.houseRules')}
              </span>
              {rulesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {rulesExpanded && (
              <div className="rounded-b-lg border border-t-0 p-4">
                <p className="whitespace-pre-line text-sm" style={{ color: '#2C3E50' }}>{houseRules}</p>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
            {t('public.location')}
          </h3>
          <div className="flex items-start gap-2 text-sm" style={{ color: '#2C3E50' }}>
            <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: '#117A65' }} />
            <div>
              {address && <p>{address}</p>}
              <p>{property.city}, {t(`regions.${property.region}`)}</p>
              {property.latitude && property.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block underline"
                  style={{ color: '#117A65' }}
                >
                  View on Google Maps
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
            {t('public.contactProperty')}
          </h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            {property.phone && (
              <a href={`tel:${property.phone}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#2C3E50' }}>
                <Phone size={16} style={{ color: '#117A65' }} />
                {property.phone}
              </a>
            )}
            {property.whatsapp && (
              <a
                href={`https://wa.me/${property.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline"
                style={{ color: '#2C3E50' }}
              >
                <Phone size={16} style={{ color: '#25D366' }} />
                WhatsApp
              </a>
            )}
            {property.email && (
              <a href={`mailto:${property.email}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#2C3E50' }}>
                <Mail size={16} style={{ color: '#117A65' }} />
                {property.email}
              </a>
            )}
          </div>
        </div>

        {/* All Rooms Preview (always visible before search) */}
        {step === 'search' && property.rooms?.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
              {t('rooms.title')}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {property.rooms.map((room) => (
                <RoomPreviewCard key={room.id} room={room} lang={lang} t={t} />
              ))}
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  );
}

/* ═══════ Room Preview Card (no pricing) ═══════ */
function RoomPreviewCard({
  room,
  lang,
  t,
}: {
  room: PublicRoom;
  lang: string;
  t: TFunction;
}) {
  const roomName = localized(room.name_ka, room.name_en, lang);

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Photo or placeholder */}
      <div
        className="flex h-40 items-center justify-center"
        style={
          room.photos?.[0]
            ? { backgroundImage: `url(${room.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { backgroundColor: '#F0F4F5' }
        }
      >
        {!room.photos?.[0] && <BedDouble size={40} style={{ color: '#117A65', opacity: 0.3 }} />}
      </div>

      <div className="p-4">
        <h4 className="font-bold" style={{ color: '#0D2137' }}>{roomName}</h4>
        <div className="mt-1 flex items-center gap-3">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs"
            style={{ backgroundColor: '#E8F5F1', color: '#117A65' }}
          >
            {t(`public.roomTypes.${room.room_type}`, room.room_type)}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#666' }}>
            <Users size={14} />
            {room.max_guests}
          </span>
        </div>

        {/* Amenities icons */}
        {room.amenities?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {room.amenities.slice(0, 6).map((a) => {
              const Icon = AMENITY_ICONS[a] || BedDouble;
              return (
                <span key={a} title={t(`public.amenityLabels.${a}`, a)} className="rounded bg-gray-100 p-1">
                  <Icon size={14} style={{ color: '#666' }} />
                </span>
              );
            })}
          </div>
        )}

        {/* Base price hint */}
        <p className="mt-3 text-sm">
          <span style={{ color: '#888' }}>{t('public.perNight')}: </span>
          <span className="font-bold" style={{ color: '#117A65' }}>₾{Number(room.effective_price_gel).toFixed(0)}</span>
        </p>
      </div>
    </div>
  );
}
