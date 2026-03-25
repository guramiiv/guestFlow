import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { ka, enUS, ru } from 'date-fns/locale';
import {
  ArrowLeft,
  BedDouble,
  Calendar,
  Users,
  Moon,
  Loader2,
  CreditCard,
  Banknote,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { createPublicBooking } from '@/api/public';
import type {
  PublicProperty,
  AvailableRoom,
  BookingConfirmation,
} from '@/types/public';

/* ─── Zod schema ─── */
const bookingSchema = z.object({
  guest_name: z.string().min(2),
  guest_email: z.string().email(),
  guest_phone: z
    .string()
    .optional()
    .refine((v) => !v || v.startsWith('+'), { message: 'phone_plus' }),
  guest_country: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 2, { message: 'country_code' }),
  guest_message: z.string().optional(),
  payment_method: z.enum(['pay_at_property', 'bog_ipay']),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

/* ─── Country list ─── */
const TOP_COUNTRIES = [
  { code: 'GE', name_ka: 'საქართველო', name_en: 'Georgia', name_ru: 'Грузия' },
  { code: 'RU', name_ka: 'რუსეთი', name_en: 'Russia', name_ru: 'Россия' },
  { code: 'DE', name_ka: 'გერმანია', name_en: 'Germany', name_ru: 'Германия' },
  { code: 'GB', name_ka: 'გაერთიანებული სამეფო', name_en: 'United Kingdom', name_ru: 'Великобритания' },
  { code: 'US', name_ka: 'აშშ', name_en: 'United States', name_ru: 'США' },
  { code: 'TR', name_ka: 'თურქეთი', name_en: 'Turkey', name_ru: 'Турция' },
  { code: 'IL', name_ka: 'ისრაელი', name_en: 'Israel', name_ru: 'Израиль' },
  { code: 'FR', name_ka: 'საფრანგეთი', name_en: 'France', name_ru: 'Франция' },
  { code: 'PL', name_ka: 'პოლონეთი', name_en: 'Poland', name_ru: 'Польша' },
];

const OTHER_COUNTRIES = [
  { code: 'AM', name_ka: 'სომხეთი', name_en: 'Armenia', name_ru: 'Армения' },
  { code: 'AT', name_ka: 'ავსტრია', name_en: 'Austria', name_ru: 'Австрия' },
  { code: 'AZ', name_ka: 'აზერბაიჯანი', name_en: 'Azerbaijan', name_ru: 'Азербайджан' },
  { code: 'BE', name_ka: 'ბელგია', name_en: 'Belgium', name_ru: 'Бельгия' },
  { code: 'BY', name_ka: 'ბელარუსი', name_en: 'Belarus', name_ru: 'Беларусь' },
  { code: 'CA', name_ka: 'კანადა', name_en: 'Canada', name_ru: 'Канада' },
  { code: 'CH', name_ka: 'შვეიცარია', name_en: 'Switzerland', name_ru: 'Швейцария' },
  { code: 'CN', name_ka: 'ჩინეთი', name_en: 'China', name_ru: 'Китай' },
  { code: 'CZ', name_ka: 'ჩეხეთი', name_en: 'Czech Republic', name_ru: 'Чехия' },
  { code: 'DK', name_ka: 'დანია', name_en: 'Denmark', name_ru: 'Дания' },
  { code: 'EE', name_ka: 'ესტონეთი', name_en: 'Estonia', name_ru: 'Эстония' },
  { code: 'ES', name_ka: 'ესპანეთი', name_en: 'Spain', name_ru: 'Испания' },
  { code: 'FI', name_ka: 'ფინეთი', name_en: 'Finland', name_ru: 'Финляндия' },
  { code: 'GR', name_ka: 'საბერძნეთი', name_en: 'Greece', name_ru: 'Греция' },
  { code: 'HU', name_ka: 'უნგრეთი', name_en: 'Hungary', name_ru: 'Венгрия' },
  { code: 'IN', name_ka: 'ინდოეთი', name_en: 'India', name_ru: 'Индия' },
  { code: 'IR', name_ka: 'ირანი', name_en: 'Iran', name_ru: 'Иран' },
  { code: 'IT', name_ka: 'იტალია', name_en: 'Italy', name_ru: 'Италия' },
  { code: 'JP', name_ka: 'იაპონია', name_en: 'Japan', name_ru: 'Япония' },
  { code: 'KZ', name_ka: 'ყაზახეთი', name_en: 'Kazakhstan', name_ru: 'Казахстан' },
  { code: 'LT', name_ka: 'ლიტვა', name_en: 'Lithuania', name_ru: 'Литва' },
  { code: 'LV', name_ka: 'ლატვია', name_en: 'Latvia', name_ru: 'Латвия' },
  { code: 'NL', name_ka: 'ნიდერლანდები', name_en: 'Netherlands', name_ru: 'Нидерланды' },
  { code: 'NO', name_ka: 'ნორვეგია', name_en: 'Norway', name_ru: 'Норвегия' },
  { code: 'RO', name_ka: 'რუმინეთი', name_en: 'Romania', name_ru: 'Румыния' },
  { code: 'SE', name_ka: 'შვედეთი', name_en: 'Sweden', name_ru: 'Швеция' },
  { code: 'UA', name_ka: 'უკრაინა', name_en: 'Ukraine', name_ru: 'Украина' },
  { code: 'UZ', name_ka: 'უზბეკეთი', name_en: 'Uzbekistan', name_ru: 'Узбекистан' },
];

const DATE_LOCALES: Record<string, Locale> = { ka, en: enUS, ru };

function localized(ka_val: string, en_val: string, lang: string) {
  return lang === 'ka' ? ka_val || en_val : en_val || ka_val;
}

function formatDateLocalized(dateStr: string, lang: string) {
  const d = parseISO(dateStr);
  return format(d, 'dd.MM.yyyy, EEEE', { locale: DATE_LOCALES[lang] || enUS });
}

/* ─── Props ─── */
interface BookingFormProps {
  property: PublicProperty;
  selectedRoom: AvailableRoom;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  onBack: () => void;
  onSuccess: (confirmation: BookingConfirmation) => void;
}

export default function BookingForm({
  property,
  selectedRoom,
  checkIn,
  checkOut,
  numGuests,
  onBack,
  onSuccess,
}: BookingFormProps) {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [submitError, setSubmitError] = useState('');

  const { room, price_per_night_gel, total_price_gel, nights } = selectedRoom;
  const roomName = localized(room.name_ka, room.name_en, lang);
  const propertyName = localized(property.name_ka, property.name_en, lang);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_country: '',
      guest_message: '',
      payment_method: 'pay_at_property',
    },
  });

  const paymentMethod = watch('payment_method');

  async function onSubmit(values: BookingFormValues) {
    if (!slug) return;
    setSubmitError('');

    if (values.payment_method === 'bog_ipay') {
      alert(t('public.onlinePaymentComingSoon'));
      return;
    }

    try {
      const confirmation = await createPublicBooking(slug, {
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut,
        num_guests: numGuests,
        guest_name: values.guest_name,
        guest_email: values.guest_email,
        guest_phone: values.guest_phone || undefined,
        guest_country: values.guest_country || undefined,
        guest_language: lang,
        guest_message: values.guest_message || undefined,
        payment_method: values.payment_method,
      });

      onSuccess(confirmation);
    } catch (err: unknown) {
      let msg = t('public.bookingError');

      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as Record<string, unknown>;
        msg = typeof data.detail === 'string' ? data.detail : msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }

      // Room occupied (409) → toast + go back to results
      if (err instanceof AxiosError && err.response?.status === 409) {
        toast.error(msg);
        onBack();
        return;
      }

      toast.error(msg);
      setSubmitError(msg);
    }
  }

  function countryName(c: { name_ka: string; name_en: string; name_ru: string }) {
    if (lang === 'ka') return c.name_ka;
    if (lang === 'ru') return c.name_ru;
    return c.name_en;
  }

  return (
    <section className="mx-auto max-w-[1100px] px-4 py-6 pb-24 sm:py-8 sm:pb-8">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ══════ SUMMARY CARD — order-first on mobile so guest sees what they're booking ══════ */}
          <aside className="order-first lg:order-last lg:w-[380px]" aria-label="Booking summary">
            <div
              className="rounded-xl border bg-white p-5 shadow-sm lg:sticky lg:top-24"
            >
              <h3
                className="mb-4 text-base font-bold"
                style={{ color: '#0D2137' }}
              >
                {t('public.bookingDetails')}
              </h3>

              {/* Room thumbnail */}
              <div className="mb-4 flex gap-3">
                <div
                  className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg"
                  role="img"
                  aria-label={`${room.name_en || room.name_ka} thumbnail`}
                  style={
                    room.photos?.[0]
                      ? {
                          backgroundImage: `url(${room.photos[0]})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : { backgroundColor: '#F0F4F5' }
                  }
                >
                  {!room.photos?.[0] && (
                    <BedDouble
                      size={24}
                      style={{ color: '#117A65', opacity: 0.3 }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: '#0D2137' }}
                  >
                    {roomName}
                  </p>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: '#E8F5F1', color: '#117A65' }}
                  >
                    {t(`public.roomTypes.${room.room_type}`, room.room_type)}
                  </span>
                </div>
              </div>

              {/* Property name */}
              <p className="mb-4 text-sm" style={{ color: '#666' }}>
                {propertyName}
              </p>

              {/* Dates & details */}
              <div className="space-y-2 text-sm" style={{ color: '#2C3E50' }}>
                <div className="flex items-center gap-2">
                  <Calendar size={15} style={{ color: '#117A65' }} />
                  <span>
                    {t('public.checkIn')}:{' '}
                    <strong>{formatDateLocalized(checkIn, lang)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={15} style={{ color: '#117A65' }} />
                  <span>
                    {t('public.checkOut')}:{' '}
                    <strong>{formatDateLocalized(checkOut, lang)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon size={15} style={{ color: '#117A65' }} />
                  <span>
                    {nights} {t('public.nightsStay')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={15} style={{ color: '#117A65' }} />
                  <span>
                    {numGuests}{' '}
                    {numGuests === 1 ? t('public.guest') : t('public.guests')}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <hr className="my-4 border-gray-200" />

              {/* Price breakdown */}
              <div className="text-sm" style={{ color: '#2C3E50' }}>
                <div className="flex justify-between">
                  <span>
                    ₾{Number(price_per_night_gel).toFixed(0)} × {nights}{' '}
                    {t('public.nightsStay')}
                  </span>
                  <span>₾{Number(total_price_gel).toFixed(0)}</span>
                </div>
              </div>

              {/* Divider */}
              <hr className="my-4 border-gray-200" />

              {/* Total */}
              <div className="flex items-baseline justify-between">
                <span
                  className="text-base font-bold"
                  style={{ color: '#0D2137' }}
                >
                  {t('public.total')}:
                </span>
                <span
                  className="text-xl font-bold"
                  style={{ color: '#117A65' }}
                >
                  ₾{Number(total_price_gel).toFixed(0)}
                </span>
              </div>

              {/* Back link */}
              <button
                type="button"
                onClick={onBack}
                className="mt-5 flex items-center gap-1 text-sm hover:underline"
                style={{ color: '#117A65', minHeight: '44px' }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                {t('public.backToRooms')}
              </button>
            </div>
          </aside>

          {/* ══════ FORM COLUMN ══════ */}
          <div className="order-last flex-1 lg:order-first">
            {/* Section header */}
            <h2
              className="mb-6 text-xl font-bold"
              style={{ color: '#0D2137' }}
            >
              {t('public.yourDetails')}
            </h2>

            {/* Full name */}
            <div className="mb-4">
              <label
                htmlFor="guest-name"
                className="mb-1 block text-sm font-medium"
                style={{ color: '#2C3E50' }}
              >
                {t('public.fullName')} *
              </label>
              <input
                id="guest-name"
                {...register('guest_name')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={
                  errors.guest_name
                    ? { borderColor: '#E74C3C', '--tw-ring-color': '#E74C3C', minHeight: '44px' } as React.CSSProperties
                    : { '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties
                }
              />
              {errors.guest_name && (
                <p className="mt-1 text-xs" style={{ color: '#E74C3C' }}>
                  {t('public.validation.nameRequired')}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="guest-email"
                className="mb-1 block text-sm font-medium"
                style={{ color: '#2C3E50' }}
              >
                {t('public.email')} *
              </label>
              <input
                id="guest-email"
                {...register('guest_email')}
                type="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={
                  errors.guest_email
                    ? { borderColor: '#E74C3C', '--tw-ring-color': '#E74C3C', minHeight: '44px' } as React.CSSProperties
                    : { '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties
                }
              />
              {errors.guest_email && (
                <p className="mt-1 text-xs" style={{ color: '#E74C3C' }}>
                  {t('public.validation.emailInvalid')}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label
                htmlFor="guest-phone"
                className="mb-1 block text-sm font-medium"
                style={{ color: '#2C3E50' }}
              >
                {t('public.phone')}
              </label>
              <input
                id="guest-phone"
                {...register('guest_phone')}
                type="tel"
                placeholder="+995..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={
                  errors.guest_phone
                    ? { borderColor: '#E74C3C', '--tw-ring-color': '#E74C3C', minHeight: '44px' } as React.CSSProperties
                    : { '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties
                }
              />
              {errors.guest_phone && (
                <p className="mt-1 text-xs" style={{ color: '#E74C3C' }}>
                  {t('public.validation.phoneFormat')}
                </p>
              )}
            </div>

            {/* Country */}
            <div className="mb-4">
              <label
                htmlFor="guest-country"
                className="mb-1 block text-sm font-medium"
                style={{ color: '#2C3E50' }}
              >
                {t('public.country')}
              </label>
              <select
                id="guest-country"
                {...register('guest_country')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#117A65', minHeight: '44px' } as React.CSSProperties}
              >
                <option value="">{t('public.selectCountry')}</option>
                <optgroup label="───────────">
                  {TOP_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryName(c)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="───────────">
                  {OTHER_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryName(c)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Message */}
            <div className="mb-6">
              <label
                htmlFor="guest-message"
                className="mb-1 block text-sm font-medium"
                style={{ color: '#2C3E50' }}
              >
                {t('public.message')}
              </label>
              <textarea
                id="guest-message"
                {...register('guest_message')}
                rows={3}
                placeholder={t('public.messagePlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#117A65' } as React.CSSProperties}
              />
            </div>

            {/* ─── Payment method ─── */}
            <fieldset className="mb-6">
              <legend>
                <h3
                  className="mb-3 text-base font-bold"
                  style={{ color: '#0D2137' }}
                >
                  {t('public.paymentMethod')}
                </h3>
              </legend>

              <div className="space-y-3">
                {/* Pay at property */}
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
                  style={{
                    minHeight: '56px',
                    ...(paymentMethod === 'pay_at_property'
                      ? { borderColor: '#117A65', backgroundColor: '#F0FAF7' }
                      : {}),
                  }}
                >
                  <input
                    {...register('payment_method')}
                    type="radio"
                    value="pay_at_property"
                    className="mt-1"
                    style={{ accentColor: '#117A65', width: '18px', height: '18px' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Banknote size={18} style={{ color: '#117A65' }} />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: '#0D2137' }}
                      >
                        {t('public.payAtProperty')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: '#666' }}>
                      {t('public.payAtPropertyDesc')}
                    </p>
                  </div>
                </label>

                {/* Pay online */}
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
                  style={{
                    minHeight: '56px',
                    ...(paymentMethod === 'bog_ipay'
                      ? { borderColor: '#117A65', backgroundColor: '#F0FAF7' }
                      : {}),
                  }}
                >
                  <input
                    {...register('payment_method')}
                    type="radio"
                    value="bog_ipay"
                    className="mt-1"
                    style={{ accentColor: '#117A65', width: '18px', height: '18px' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} style={{ color: '#117A65' }} />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: '#0D2137' }}
                      >
                        {t('public.payOnline')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: '#666' }}>
                      {t('public.payOnlineDesc')}
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Submit error */}
            {submitError && (
              <div
                className="mb-4 rounded-lg p-3 text-sm"
                role="alert"
                style={{ backgroundColor: '#FDE8E8', color: '#E74C3C' }}
              >
                {submitError}
              </div>
            )}

            {/* Submit button — hidden on mobile (we use sticky version) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="hidden h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-bold text-white transition-opacity disabled:opacity-50 sm:flex"
              style={{ backgroundColor: '#117A65' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('public.processing')}
                </>
              ) : (
                t('public.completeBooking')
              )}
            </button>

            {/* Fine print */}
            <p className="mt-3 text-center text-xs" style={{ color: '#888' }}>
              <ShieldCheck
                size={14}
                className="mr-1 inline"
                style={{ color: '#117A65' }}
              />
              {t('public.freeCancellation')}
            </p>
          </div>
        </div>

        {/* Sticky submit button on mobile */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] sm:hidden">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-bold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#117A65' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('public.processing')}
              </>
            ) : (
              <>
                {t('public.completeBooking')}
                <span className="ml-1 text-sm font-normal opacity-80">— ₾{Number(total_price_gel).toFixed(0)}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
