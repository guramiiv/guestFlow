import { useMemo } from 'react';
import {
  format,
  eachDayOfInterval,
  isToday,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns';
import type { Room, BookingCalendar } from '@/types';
import CalendarBar from './CalendarBar';

interface CalendarGridProps {
  rooms: Room[];
  bookings: BookingCalendar[];
  startDate: Date;
  endDate: Date;
  onCellClick: (roomId: number, date: string) => void;
  onBookingNavigate: (id: number) => void;
}

export default function CalendarGrid({
  rooms,
  bookings,
  startDate,
  endDate,
  onCellClick,
  onBookingNavigate,
}: CalendarGridProps) {
  const days = useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate],
  );

  const totalDays = days.length;

  // Group bookings by room
  const bookingsByRoom = useMemo(() => {
    const map = new Map<number, BookingCalendar[]>();
    for (const b of bookings) {
      const list = map.get(b.room) ?? [];
      list.push(b);
      map.set(b.room, list);
    }
    return map;
  }, [bookings]);

  function getBarPosition(booking: BookingCalendar) {
    const bStart = parseISO(booking.check_in);
    const bEnd = parseISO(booking.check_out);

    // Clamp to visible range
    const visibleStart = isBefore(bStart, startDate) ? startDate : bStart;
    const visibleEnd = isAfter(bEnd, endDate) ? endDate : bEnd;

    const leftDays = differenceInCalendarDays(visibleStart, startDate);
    const spanDays = differenceInCalendarDays(visibleEnd, visibleStart);

    if (spanDays <= 0) return null;

    const left = (leftDays / totalDays) * 100;
    const width = (spanDays / totalDays) * 100;
    return { left, width };
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div
        className="min-w-[800px]"
        style={{
          display: 'grid',
          gridTemplateColumns: `140px repeat(${totalDays}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div className="sticky left-0 z-20 bg-muted border-b border-r px-2 py-2 text-xs font-medium text-muted-foreground flex items-center" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`border-b border-r px-1 py-2 text-center text-xs font-medium ${
              isToday(day)
                ? 'bg-teal/10 text-teal font-bold'
                : 'text-muted-foreground'
            }`}
          >
            <div>{format(day, 'dd.MM')}</div>
            <div className="text-[10px] opacity-60">{format(day, 'EEE')}</div>
          </div>
        ))}

        {/* Room rows */}
        {rooms.map((room) => {
          const roomBookings = bookingsByRoom.get(room.id) ?? [];
          return (
            <div key={room.id} className="contents">
              {/* Room name - sticky */}
              <div className="sticky left-0 z-20 bg-card border-b border-r px-2 py-3 text-sm font-medium flex items-center">
                <span className="truncate">{room.name_ka}</span>
              </div>

              {/* Day cells + booking bars */}
              <div
                className="relative border-b col-span-full"
                style={{
                  gridColumn: `2 / -1`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${totalDays}, 1fr)`,
                  minHeight: '40px',
                }}
              >
                {/* Background cells (clickable) */}
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`border-r h-full cursor-pointer hover:bg-muted/50 transition-colors ${
                      isToday(day) ? 'bg-teal/5' : ''
                    }`}
                    onClick={() => onCellClick(room.id, format(day, 'yyyy-MM-dd'))}
                  />
                ))}

                {/* Booking bars positioned absolutely */}
                {roomBookings.map((booking) => {
                  const pos = getBarPosition(booking);
                  if (!pos) return null;
                  return (
                    <CalendarBar
                      key={booking.id}
                      booking={booking}
                      left={pos.left}
                      width={pos.width}
                      onNavigate={onBookingNavigate}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {rooms.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm">
          No rooms found
        </div>
      )}
    </div>
  );
}
