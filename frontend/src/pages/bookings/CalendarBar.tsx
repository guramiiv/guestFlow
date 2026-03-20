import { useTranslation } from 'react-i18next';
import type { BookingCalendar } from '@/types';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import StatusBadge from '@/components/shared/StatusBadge';
import DateDisplay from '@/components/shared/DateDisplay';
import { Globe, Phone, Building, Footprints } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#2980B9',
  pending: '#F39C12',
  checked_in: '#27AE60',
  checked_out: '#95A5A6',
  cancelled: '#E74C3C',
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  booking_com: Globe,
  airbnb: Building,
  direct: Globe,
  phone: Phone,
  walkin: Footprints,
};

interface CalendarBarProps {
  booking: BookingCalendar;
  left: number;
  width: number;
  onNavigate: (id: number) => void;
}

export default function CalendarBar({ booking, left, width, onNavigate }: CalendarBarProps) {
  const { t } = useTranslation();
  const bg = STATUS_COLORS[booking.status] ?? '#95A5A6';
  const SourceIcon = sourceIcons[booking.source] ?? Globe;

  return (
    <Popover>
      <PopoverTrigger
        className="absolute top-1 h-[calc(100%-8px)] rounded text-white text-xs font-medium flex items-center gap-1 px-1.5 cursor-pointer overflow-hidden whitespace-nowrap z-10 hover:brightness-110 transition-all"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: bg,
        }}
      >
        <SourceIcon className="h-3 w-3 shrink-0 opacity-70" />
        <span className="truncate">{booking.guest_name}</span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64">
        <PopoverHeader>
          <PopoverTitle>{booking.guest_name}</PopoverTitle>
          <PopoverDescription>{booking.room_name}</PopoverDescription>
        </PopoverHeader>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.status')}:</span>
            <StatusBadge status={booking.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.from')}:</span>
            <DateDisplay date={booking.check_in} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.to')}:</span>
            <DateDisplay date={booking.check_out} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('bookings.source')}:</span>
            <span>{t(`bookings.source_labels.${booking.source}`, booking.source)}</span>
          </div>
        </div>
        <button
          type="button"
          className="mt-2 w-full text-center text-xs text-teal hover:underline"
          onClick={() => onNavigate(booking.id)}
        >
          {t('common.view')} →
        </button>
      </PopoverContent>
    </Popover>
  );
}
