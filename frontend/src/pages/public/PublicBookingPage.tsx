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
  Clock,
  Camera,
  Star,
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
import PhotoGalleryModal from '@/components/public/PhotoGalleryModal';

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
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryRoomName, setGalleryRoomName] = useState('');
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
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
        className="relative flex items-end h-[220px] sm:h-[320px] md:h-[420px]"
        role="img"
        aria-label={`${property.name_en || property.name_ka} - ${property.city}, ${t(`regions.${property.region}`)} accommodation`}
        style={
          (property.banner_photo || property.photos?.[0])
            ? { backgroundImage: `url(${property.banner_photo || property.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, #0D2137 0%, #117A65 100%)' }
        }
      >
        {/* dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-14 sm:pb-20">
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(17,122,101,0.6)' }}
          >
            <Star size={12} className="mr-1 inline" aria-hidden="true" />
            {t(`settings.propertyTypes.${property.property_type}`, property.property_type)}
          </span>
          <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-5xl drop-shadow-lg">
            <span lang="ka">{property.name_ka}</span>
            {property.name_en && property.name_ka !== property.name_en && (
              <span className="sr-only"> ({property.name_en})</span>
            )}
          </h1>
          {property.name_en && property.name_ka !== property.name_en && (
            <p className="mt-1 text-base text-white/80 sm:text-lg drop-shadow" lang="en" aria-hidden="true">{property.name_en}</p>
          )}
          <p className="mt-2 text-sm text-white/80">
            <MapPin size={14} className="mr-1 inline" aria-hidden="true" />
            {property.city}, {t(`regions.${property.region}`)}
          </p>
        </div>
      </section>

      {/* ══════ SEARCH CARD ══════ */}
      <search className="mx-auto max-w-[900px] px-4" style={{ marginTop: '-40px', position: 'relative', zIndex: 20 }}>
        <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6" role="search" aria-label="Search available rooms">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            {/* Check-in */}
            <div className="flex-1">
              <label htmlFor="check-in-date" className="mb-1 block text-xs font-medium" style={{ color: '#2C3E50' }}>
                {t('public.checkIn')}
              </label>
              <input
                id="check-in-date"
                type="date"
                value={checkIn}
                min={todayStr}
                aria-label="Check-in date"
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
              <label htmlFor="check-out-date" className="mb-1 block text-xs font-medium" style={{ color: '#2C3E50' }}>
                {t('public.checkOut')}
              </label>
              <input
                id="check-out-date"
                type="date"
                value={checkOut}
                min={checkIn || todayStr}
                aria-label="Check-out date"
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties}
              />
            </div>

            {/* Guests */}
            <div className="w-full sm:w-32">
              <label htmlFor="guest-count" className="mb-1 block text-xs font-medium" style={{ color: '#2C3E50' }}>
                {t('public.guests')}
              </label>
              <select
                id="guest-count"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                aria-label="Number of guests"
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
              aria-label="Search available rooms"
              className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-bold text-white transition-opacity disabled:opacity-50 sm:w-auto sm:min-w-[180px] sm:text-sm"
              style={{ backgroundColor: '#117A65', minHeight: '44px' } as React.CSSProperties}
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Search size={16} aria-hidden="true" />
              )}
              {t('public.searchRooms')}
            </button>
          </div>

          {searchError && (
            <p className="mt-3 text-sm" role="alert" style={{ color: '#E74C3C' }}>{searchError}</p>
          )}
        </div>
      </search>

      {/* ══════ RESULTS (shown after search) ══════ */}
      {(step === 'results' || searching) && (
        <section ref={resultsRef} className="mx-auto mt-8 max-w-[1200px] px-4">
          <AvailableRoomsList
            rooms={availableRooms}
            nights={availableRooms[0]?.nights ?? 0}
            onSelectRoom={handleSelectRoom}
            isLoading={searching}
            onViewPhotos={(photos, name, idx) => {
              setGalleryPhotos(photos);
              setGalleryRoomName(name);
              setGalleryInitialIndex(idx);
            }}
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
        <BookingConfirmation
          confirmation={confirmation}
          property={property}
          onBackToProperty={() => {
            setStep('search');
            setConfirmation(null);
            setSelectedRoom(null);
            setAvailableRooms([]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* ══════ PROPERTY DETAILS (hide on confirmation) ══════ */}
      {step !== 'confirmation' && (
      <article className="mx-auto mt-10 max-w-[1200px] px-4 pb-10" itemScope itemType="https://schema.org/LodgingBusiness">
        <meta itemProp="name" content={property.name_en || property.name_ka} />

        {/* Quick Info Bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {property.check_in_time && (
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#E8F5F1' }}>
                <Clock size={18} style={{ color: '#117A65' }} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#888' }}>{t('public.checkIn')}</p>
                <p className="text-sm font-semibold" style={{ color: '#0D2137' }}>{property.check_in_time}</p>
              </div>
            </div>
          )}
          {property.check_out_time && (
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#FEF3E2' }}>
                <Clock size={18} style={{ color: '#F39C12' }} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#888' }}>{t('public.checkOut')}</p>
                <p className="text-sm font-semibold" style={{ color: '#0D2137' }}>{property.check_out_time}</p>
              </div>
            </div>
          )}
          {property.rooms?.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#EDE8F5' }}>
                <BedDouble size={18} style={{ color: '#7D3C98' }} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#888' }}>{t('rooms.title')}</p>
                <p className="text-sm font-semibold" style={{ color: '#0D2137' }}>{property.rooms.length}</p>
              </div>
            </div>
          )}
          {(property.phone || property.whatsapp) && (
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                <Phone size={18} style={{ color: '#2196F3' }} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#888' }}>{t('public.contactProperty')}</p>
                <p className="text-sm font-semibold truncate" style={{ color: '#0D2137' }}>{property.phone || property.whatsapp}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <section className="mb-8 rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm leading-relaxed" style={{ color: '#2C3E50', lineHeight: '1.8' }} itemProp="description">{description}</p>
          </section>
        )}

        {/* Amenities */}
        {property.amenities?.length > 0 && (
          <section className="mb-8" aria-labelledby="amenities-heading">
            <h2 id="amenities-heading" className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
              {t('public.amenities')}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" role="list">
              {property.amenities.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity] || BedDouble;
                return (
                  <li key={amenity} className="flex items-center gap-2 rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md" style={{ minHeight: '44px' }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#E8F5F1' }}>
                      <Icon size={16} style={{ color: '#117A65' }} aria-hidden="true" />
                    </div>
                    <span className="text-sm" style={{ color: '#2C3E50' }}>
                      {t(`public.amenityLabels.${amenity}`, amenity)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* House Rules */}
        {houseRules && (
          <section className="mb-8">
            <button
              onClick={() => setRulesExpanded(!rulesExpanded)}
              aria-expanded={rulesExpanded}
              className="flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              style={{ minHeight: '48px' }}
            >
              <h2 className="font-bold text-lg" style={{ color: '#0D2137' }}>
                {t('public.houseRules')}
              </h2>
              {rulesExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </button>
            {rulesExpanded && (
              <div className="rounded-b-xl border border-t-0 bg-white p-4 shadow-sm">
                <p className="whitespace-pre-line text-sm" style={{ color: '#2C3E50' }}>{houseRules}</p>
              </div>
            )}
          </section>
        )}

        {/* Location + Google Maps */}
        <section className="mb-8" aria-labelledby="location-heading">
          <h2 id="location-heading" className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
            {t('public.location')}
          </h2>
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {/* Google Maps embed */}
            {property.latitude && property.longitude && (
              <div className="h-[250px] sm:h-[300px]">
                <iframe
                  title={`${property.name_en || property.name_ka} location`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                  allowFullScreen
                />
              </div>
            )}
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#E8F5F1' }}>
                <MapPin size={18} style={{ color: '#117A65' }} aria-hidden="true" />
              </div>
              <address itemProp="address" itemScope itemType="https://schema.org/PostalAddress" className="not-italic text-sm" style={{ color: '#2C3E50' }}>
                {address && <span itemProp="streetAddress">{address}</span>}
                {address && ', '}
                <span itemProp="addressLocality">{property.city}</span>,{' '}
                <span itemProp="addressRegion">{t(`regions.${property.region}`)}</span>,{' '}
                <span itemProp="addressCountry">საქართველო</span>
                {property.latitude && property.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${property.name_en || property.name_ka} on Google Maps`}
                    className="ml-2 inline-flex items-center gap-1 font-medium underline"
                    style={{ color: '#117A65' }}
                  >
                    {t('public.viewOnMap')} →
                  </a>
                )}
              </address>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-8" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
            {t('public.contactProperty')}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {property.phone && (
              <a href={`tel:${property.phone}`} aria-label={`Call ${property.name_en || property.name_ka}: ${property.phone}`} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md" style={{ color: '#2C3E50' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#E8F5F1' }}>
                  <Phone size={16} style={{ color: '#117A65' }} aria-hidden="true" />
                </div>
                <span className="text-sm font-medium">{property.phone}</span>
              </a>
            )}
            {property.whatsapp && (
              <a
                href={`https://wa.me/${property.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contact ${property.name_en || property.name_ka} on WhatsApp`}
                className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                style={{ color: '#2C3E50' }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#E8F8E5' }}>
                  <Phone size={16} style={{ color: '#25D366' }} aria-hidden="true" />
                </div>
                <span className="text-sm font-medium">WhatsApp</span>
              </a>
            )}
            {property.email && (
              <a href={`mailto:${property.email}`} aria-label={`Email ${property.name_en || property.name_ka}: ${property.email}`} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md" style={{ color: '#2C3E50' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                  <Mail size={16} style={{ color: '#2196F3' }} aria-hidden="true" />
                </div>
                <span className="text-sm font-medium">{property.email}</span>
              </a>
            )}
          </div>
        </section>

        {/* All Rooms Preview (always visible before search) */}
        {step === 'search' && property.rooms?.length > 0 && (
          <section aria-labelledby="rooms-preview-heading">
            <h2 id="rooms-preview-heading" className="mb-4 text-lg font-bold" style={{ color: '#0D2137' }}>
              {t('rooms.title')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {property.rooms.map((room) => (
                <RoomPreviewCard
                  key={room.id}
                  room={room}
                  lang={lang}
                  t={t}
                  propertyName={property.name_en || property.name_ka}
                  onViewPhotos={(photos, name, idx) => {
                    setGalleryPhotos(photos);
                    setGalleryRoomName(name);
                    setGalleryInitialIndex(idx);
                  }}
                  onCheckAvailability={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </article>
      )}

      {/* ══════ Photo Gallery Modal ══════ */}
      {galleryPhotos.length > 0 && (
        <PhotoGalleryModal
          photos={galleryPhotos}
          initialIndex={galleryInitialIndex}
          roomName={galleryRoomName}
          onClose={() => setGalleryPhotos([])}
        />
      )}
    </div>
  );
}

/* ═══════ Room Preview Card ═══════ */
function RoomPreviewCard({
  room,
  lang,
  t,
  propertyName,
  onViewPhotos,
  onCheckAvailability,
}: {
  room: PublicRoom;
  lang: string;
  t: TFunction;
  propertyName: string;
  onViewPhotos: (photos: string[], roomName: string, index: number) => void;
  onCheckAvailability: () => void;
}) {
  const roomName = localized(room.name_ka, room.name_en, lang);
  const roomNameEn = room.name_en || room.name_ka;

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Photo or placeholder */}
      <div
        className="relative flex h-44 items-center justify-center cursor-pointer"
        role="img"
        aria-label={room.photos?.[0] ? `${roomNameEn} at ${propertyName}` : `${roomNameEn} - no photo available`}
        style={
          room.photos?.[0]
            ? { backgroundImage: `url(${room.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { backgroundColor: '#F0F4F5' }
        }
        onClick={() => {
          if (room.photos?.length > 0) {
            onViewPhotos(room.photos, roomNameEn, 0);
          }
        }}
      >
        {!room.photos?.[0] && <BedDouble size={40} style={{ color: '#117A65', opacity: 0.3 }} aria-hidden="true" />}
        {room.photos?.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Camera size={12} aria-hidden="true" />
            {room.photos.length}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold" style={{ color: '#0D2137' }}>{roomName}</h3>
        <div className="mt-1 flex items-center gap-3">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs"
            style={{ backgroundColor: '#E8F5F1', color: '#117A65' }}
          >
            {t(`public.roomTypes.${room.room_type}`, room.room_type)}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#666' }}>
            <Users size={14} aria-hidden="true" />
            <span className="sr-only">Max guests:</span> {room.max_guests}
          </span>
        </div>

        {/* Amenities icons */}
        {room.amenities?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {room.amenities.slice(0, 6).map((a) => {
              const Icon = AMENITY_ICONS[a] || BedDouble;
              return (
                <span key={a} title={t(`public.amenityLabels.${a}`, a)} className="rounded-md bg-gray-50 p-1.5">
                  <Icon size={14} style={{ color: '#666' }} aria-hidden="true" />
                </span>
              );
            })}
          </div>
        )}

        {/* Base price hint — machine-readable */}
        <p className="mt-3 text-sm" itemScope itemType="https://schema.org/PriceSpecification">
          <meta itemProp="priceCurrency" content="GEL" />
          <span style={{ color: '#888' }}>{t('public.perNight')}: </span>
          <span className="text-lg font-bold" style={{ color: '#117A65' }} itemProp="price" content={String(Number(room.effective_price_gel).toFixed(0))}>
            ₾{Number(room.effective_price_gel).toFixed(0)}
          </span>
          <meta itemProp="unitCode" content="DAY" />
        </p>

        {/* Check Availability button */}
        <button
          onClick={onCheckAvailability}
          aria-label={`${t('public.checkAvailability')} - ${roomNameEn}`}
          className="mt-3 w-full rounded-lg py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#117A65' }}
        >
          {t('public.checkAvailability')}
        </button>
      </div>
    </div>
  );
}
