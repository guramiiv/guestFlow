import { useTranslation } from 'react-i18next';
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
  X,
  ArrowLeft,
} from 'lucide-react';
import type { AvailableRoom } from '@/types/public';

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

interface AvailableRoomsListProps {
  rooms: AvailableRoom[];
  nights: number;
  onSelectRoom: (room: AvailableRoom) => void;
  isLoading: boolean;
}

function localized(ka: string, en: string, lang: string) {
  return lang === 'ka' ? ka || en : en || ka;
}

export default function AvailableRoomsList({
  rooms,
  nights,
  onSelectRoom,
  isLoading,
}: AvailableRoomsListProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Sort by price ascending — cheapest first
  const sorted = [...rooms].sort(
    (a, b) => Number(a.price_per_night_gel) - Number(b.price_per_night_gel),
  );
  const cheapestId = sorted.length > 0 ? sorted[0].room.id : null;

  /* ─── Loading skeleton ─── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  /* ─── Empty state ─── */
  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border bg-white py-16 shadow-sm">
        <div className="relative mb-4">
          <BedDouble size={56} style={{ color: '#117A65', opacity: 0.3 }} />
          <X
            size={24}
            className="absolute -right-2 -top-2 rounded-full bg-white"
            style={{ color: '#E74C3C' }}
          />
        </div>
        <p
          className="mb-2 text-center text-base font-semibold"
          style={{ color: '#0D2137' }}
        >
          {t('public.noRoomsAvailable')}
        </p>
        <p className="mb-6 text-center text-sm" style={{ color: '#888' }}>
          {t('public.tryDifferentDates')}
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: '#117A65', minHeight: '44px' }}
        >
          <ArrowLeft size={16} />
          {t('public.backToSearch')}
        </button>
      </div>
    );
  }

  /* ─── Room cards ─── */
  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-xl font-bold" style={{ color: '#0D2137' }}>
          {t('public.availableRooms')}
        </h3>
        <p className="mt-1 text-sm" style={{ color: '#666' }}>
          {t('public.roomsAvailableCount', {
            count: sorted.length,
            nights,
          })}
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {sorted.map((ar) => {
          const isBestPrice = ar.room.id === cheapestId && sorted.length > 1;
          return (
            <RoomResultCard
              key={ar.room.id}
              availableRoom={ar}
              lang={lang}
              isBestPrice={isBestPrice}
              onSelect={() => onSelectRoom(ar)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ═══════ Single room result card ═══════ */
function RoomResultCard({
  availableRoom,
  lang,
  isBestPrice,
  onSelect,
}: {
  availableRoom: AvailableRoom;
  lang: string;
  isBestPrice: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { room, price_per_night_gel, total_price_gel, nights } = availableRoom;
  const roomName = localized(room.name_ka, room.name_en, lang);
  const description = localized(room.description_ka, room.description_en, lang);
  const truncatedDesc =
    description.length > 100 ? description.slice(0, 100) + '…' : description;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Best price badge */}
      {isBestPrice && (
        <div
          className="absolute left-0 top-0 z-10 rounded-br-lg px-3 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: '#F39C12' }}
        >
          {t('public.bestPrice')}
        </div>
      )}

      <div className="flex flex-col sm:flex-row">
        {/* ── Left: Photo (40%) ── */}
        <div className="relative sm:w-[40%]">
          <div
            className="flex aspect-[3/2] items-center justify-center sm:h-full sm:aspect-auto"
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
              <BedDouble size={48} style={{ color: '#117A65', opacity: 0.3 }} />
            )}
          </div>
        </div>

        {/* ── Right: Details (60%) ── */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Top info */}
          <div className="mb-3">
            <h4 className="text-lg font-bold" style={{ color: '#0D2137' }}>
              {roomName}
            </h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#E8F5F1', color: '#117A65' }}
              >
                {t(`public.roomTypes.${room.room_type}`, room.room_type)}
              </span>
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: '#666' }}
              >
                <Users size={14} />
                {t('public.maxGuests', { count: room.max_guests })}
              </span>
            </div>
          </div>

          {/* Amenities row */}
          {room.amenities?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {room.amenities.slice(0, 6).map((a) => {
                const Icon = AMENITY_ICONS[a] || BedDouble;
                return (
                  <span
                    key={a}
                    title={t(`public.amenityLabels.${a}`, a)}
                    className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs"
                    style={{ color: '#555' }}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">
                      {t(`public.amenityLabels.${a}`, a)}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Description */}
          {truncatedDesc && (
            <p className="mb-4 text-sm leading-relaxed" style={{ color: '#666' }}>
              {truncatedDesc}
            </p>
          )}

          {/* ── Price + Book button ── */}
          <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-2xl font-bold"
                  style={{ color: '#117A65' }}
                >
                  ₾{Number(price_per_night_gel).toFixed(0)}
                </span>
                <span className="text-xs" style={{ color: '#888' }}>
                  /{t('public.perNight')}
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: '#2C3E50' }}>
                {t('public.total')}:{' '}
                <strong style={{ color: '#F39C12' }}>
                  ₾{Number(total_price_gel).toFixed(0)}
                </strong>{' '}
                <span className="text-xs" style={{ color: '#888' }}>
                  ({nights} {t('public.nightsStay')})
                </span>
              </p>
            </div>

            <button
              onClick={onSelect}
              className="w-full rounded-lg px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: '#F39C12', minHeight: '48px' }}
            >
              {t('public.bookNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════ Skeleton loader ═══════ */
function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-[40%]">
          <div className="aspect-[3/2] bg-gray-200 sm:h-full sm:aspect-auto sm:min-h-[200px]" />
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-3 h-6 w-2/3 rounded bg-gray-200" />
          <div className="mb-2 flex gap-2">
            <div className="h-5 w-20 rounded-full bg-gray-200" />
            <div className="h-5 w-24 rounded bg-gray-200" />
          </div>
          <div className="mb-2 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-16 rounded bg-gray-100" />
            ))}
          </div>
          <div className="mb-4 space-y-2">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-4/5 rounded bg-gray-100" />
          </div>
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <div>
              <div className="h-7 w-20 rounded bg-gray-200" />
              <div className="mt-1 h-4 w-32 rounded bg-gray-100" />
            </div>
            <div className="h-10 w-28 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
