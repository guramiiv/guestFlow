import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { ka, enUS, ru } from 'date-fns/locale';
import {
  CheckCircle2,
  Calendar,
  Moon,
  Users,
  Phone,
  Mail,
  MapPin,
  Printer,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import type {
  BookingConfirmation as BookingConfirmationType,
  PublicProperty,
} from '@/types/public';

const DATE_LOCALES: Record<string, Locale> = { ka, en: enUS, ru };

function formatDateLocalized(dateStr: string, lang: string) {
  return format(parseISO(dateStr), 'dd.MM.yyyy, EEEE', {
    locale: DATE_LOCALES[lang] || enUS,
  });
}

function localized(ka_val: string, en_val: string, lang: string) {
  return lang === 'ka' ? ka_val || en_val : en_val || ka_val;
}

interface BookingConfirmationProps {
  confirmation: BookingConfirmationType;
  property: PublicProperty;
  onBackToProperty?: () => void;
}

export default function BookingConfirmation({
  confirmation,
  property,
  onBackToProperty,
}: BookingConfirmationProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const propertyName = localized(property.name_ka, property.name_en, lang);

  const isConfirmed = confirmation.status === 'confirmed';
  const isPaidOnline = confirmation.payment_status === 'paid';

  const whatsappMessage = encodeURIComponent(
    `${t('public.whatsappBookingMsg', { code: confirmation.confirmation_code })}`,
  );

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          header, footer, nav,
          [data-print-hide] {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 12pt !important;
          }
          [data-print-area] {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
          }
          [data-print-area] * {
            color: black !important;
            border-color: #ccc !important;
          }
        }
      `}</style>

      <section
        className="mx-auto max-w-[600px] px-4 py-10"
        data-print-area
      >
        {/* ─── Success icon with bounce animation ─── */}
        <div className="mb-6 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              backgroundColor: '#D5F5E3',
              animation: 'confirmBounce 0.6s ease-out',
            }}
          >
            <CheckCircle2 size={44} style={{ color: '#117A65' }} />
          </div>
        </div>

        <style>{`
          @keyframes confirmBounce {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); opacity: 1; }
            80% { transform: scale(0.95); }
            100% { transform: scale(1); }
          }
        `}</style>

        {/* ─── Heading ─── */}
        <h2
          className="mb-2 text-center text-xl font-bold sm:text-2xl"
          style={{ color: '#0D2137' }}
          role="status"
        >
          {t('public.thankYou')}
        </h2>
        <p className="mb-8 text-center text-sm" style={{ color: '#666' }}>
          {t('public.confirmationSent')}
        </p>

        {/* ─── Confirmation code card ─── */}
        <div
          className="mb-6 rounded-xl p-5 text-center"
          style={{ backgroundColor: '#D5F5E3' }}
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: '#117A65' }}>
            {t('public.confirmationCode')}
          </p>
          <p
            className="text-3xl font-bold tracking-[0.15em]"
            style={{ color: '#0D2137', fontFamily: '"Courier New", monospace' }}
          >
            {confirmation.confirmation_code}
          </p>
        </div>

        {/* ─── Booking details card ─── */}
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <h3
            className="mb-4 text-base font-bold"
            style={{ color: '#0D2137' }}
          >
            {t('public.bookingDetails')}
          </h3>

          <div className="space-y-3 text-sm" style={{ color: '#2C3E50' }}>
            {/* Property */}
            <div className="flex justify-between">
              <span style={{ color: '#888' }}>{t('public.propertyLabel')}</span>
              <span className="font-medium text-right">{propertyName}</span>
            </div>

            {/* Room */}
            <div className="flex justify-between">
              <span style={{ color: '#888' }}>{t('public.roomLabel')}</span>
              <span className="font-medium text-right">{confirmation.room_name}</span>
            </div>

            <hr className="border-gray-100" />

            {/* Check-in */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: '#888' }}>
                <Calendar size={14} style={{ color: '#117A65' }} />
                {t('public.checkIn')}
              </span>
              <span className="font-medium">
                {formatDateLocalized(confirmation.check_in, lang)}
              </span>
            </div>

            {/* Check-out */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: '#888' }}>
                <Calendar size={14} style={{ color: '#117A65' }} />
                {t('public.checkOut')}
              </span>
              <span className="font-medium">
                {formatDateLocalized(confirmation.check_out, lang)}
              </span>
            </div>

            {/* Nights */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: '#888' }}>
                <Moon size={14} style={{ color: '#117A65' }} />
                {t('public.nightsLabel')}
              </span>
              <span className="font-medium">
                {confirmation.num_nights} {t('public.nightsStay')}
              </span>
            </div>

            {/* Guests */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: '#888' }}>
                <Users size={14} style={{ color: '#117A65' }} />
                {t('public.guestsLabel')}
              </span>
              <span className="font-medium">
                {confirmation.num_guests}{' '}
                {confirmation.num_guests === 1
                  ? t('public.guest')
                  : t('public.guests')}
              </span>
            </div>

            <hr className="border-gray-100" />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span style={{ color: '#888' }}>{t('public.statusLabel')}</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={
                  isConfirmed
                    ? { backgroundColor: '#D5F5E3', color: '#117A65' }
                    : { backgroundColor: '#FEF3CD', color: '#856404' }
                }
              >
                {isConfirmed
                  ? t('public.bookingConfirmed')
                  : t('public.bookingPending')}
              </span>
            </div>

            {/* Payment */}
            <div className="flex items-center justify-between">
              <span style={{ color: '#888' }}>{t('public.paymentLabel')}</span>
              <span className="font-medium">
                {isPaidOnline
                  ? t('public.paidOnline')
                  : t('public.payAtProperty')}
              </span>
            </div>

            <hr className="border-gray-100" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-base font-bold" style={{ color: '#0D2137' }}>
                {t('public.total')}
              </span>
              <span
                className="text-xl font-bold"
                style={{ color: '#117A65' }}
              >
                ₾{Number(confirmation.total_price_gel).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Property contact section ─── */}
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <h3
            className="mb-4 text-base font-bold"
            style={{ color: '#0D2137' }}
          >
            {t('public.contactProperty')}
          </h3>

          <div className="space-y-3 text-sm" style={{ color: '#2C3E50' }}>
            {/* Check-in time */}
            {property.check_in_time && (
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: '#117A65' }} />
                <span>
                  {t('public.checkInTime')}:{' '}
                  <strong>{property.check_in_time}</strong>
                </span>
              </div>
            )}

            {/* Phone */}
            {property.phone && (
              <a
                href={`tel:${property.phone}`}
                aria-label={`Call ${propertyName}: ${property.phone}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Phone size={16} style={{ color: '#117A65' }} aria-hidden="true" />
                {property.phone}
              </a>
            )}

            {/* WhatsApp */}
            {property.whatsapp && (
              <a
                href={`https://wa.me/${property.whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contact ${propertyName} on WhatsApp`}
                className="flex items-center gap-2 hover:underline"
              >
                <Phone size={16} style={{ color: '#25D366' }} aria-hidden="true" />
                WhatsApp
              </a>
            )}

            {/* Email */}
            {property.email && (
              <a
                href={`mailto:${property.email}`}
                aria-label={`Email ${propertyName}: ${property.email}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Mail size={16} style={{ color: '#117A65' }} aria-hidden="true" />
                {property.email}
              </a>
            )}
          </div>
        </div>

        {/* ─── Action buttons ─── */}
        <div className="flex flex-col gap-3 sm:flex-row" data-print-hide>
          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#2C3E50' }}
          >
            <Printer size={16} />
            {t('public.print')}
          </button>

          {/* Google Maps link */}
          {property.latitude && property.longitude && (
            <a
              href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${propertyName} on Google Maps`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#117A65' }}
            >
              <MapPin size={16} aria-hidden="true" />
              {t('public.viewOnMap')}
            </a>
          )}
        </div>

        {/* Back to property */}
        {onBackToProperty && (
          <div className="mt-4" data-print-hide>
            <button
              onClick={onBackToProperty}
              className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ color: '#117A65' }}
            >
              <ArrowLeft size={16} />
              {t('public.backToProperty')}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
