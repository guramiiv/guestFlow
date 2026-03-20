import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BookingCalendar } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import DateDisplay from '@/components/shared/DateDisplay';
import { Button } from '@/components/ui/button';

const sourceStyles: Record<string, string> = {
  booking_com: 'bg-blue-100 text-blue-800',
  airbnb: 'bg-red-100 text-red-800',
  direct: 'bg-teal-100 text-teal-800',
  phone: 'bg-gray-100 text-gray-600',
  walkin: 'bg-amber-100 text-amber-800',
};

interface CalendarDayViewProps {
  selectedDate: Date;
  bookings: BookingCalendar[];
  onDateChange: (date: Date) => void;
  onBookingClick: (id: number) => void;
}

export default function CalendarDayView({
  selectedDate,
  bookings,
  onDateChange,
  onBookingClick,
}: CalendarDayViewProps) {
  const { t } = useTranslation();

  const dayBookings = useMemo(() => {
    return bookings.filter((b) => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return (
        isSameDay(selectedDate, checkIn) ||
        isSameDay(selectedDate, checkOut) ||
        (selectedDate > checkIn && selectedDate < checkOut)
      );
    });
  }, [bookings, selectedDate]);

  function prevDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  }

  function nextDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  }

  return (
    <div className="space-y-4">
      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold">
          {format(selectedDate, 'dd.MM.yyyy — EEEE')}
        </span>
        <Button variant="outline" size="sm" onClick={nextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Bookings list */}
      {dayBookings.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          {t('common.noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {dayBookings.map((b) => {
            const srcStyle = sourceStyles[b.source] ?? 'bg-gray-100 text-gray-600';
            return (
              <button
                key={b.id}
                type="button"
                className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors"
                onClick={() => onBookingClick(b.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.guest_name}</span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{b.room_name}</span>
                  <span>
                    <DateDisplay date={b.check_in} /> — <DateDisplay date={b.check_out} />
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${srcStyle}`}>
                    {t(`bookings.source_labels.${b.source}`, b.source)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
