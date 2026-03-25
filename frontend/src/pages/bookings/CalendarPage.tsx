import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfDay } from 'date-fns';

import { getCalendarData } from '@/api/bookings';
import { getRooms } from '@/api/rooms';

import CalendarControls from './CalendarControls';
import CalendarGrid from './CalendarGrid';
import CalendarDayView from './CalendarDayView';
import NewBookingSheet from '@/components/bookings/NewBookingSheet';

const VISIBLE_DAYS = 14;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useState(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  });

  return matches;
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const endDate = useMemo(() => addDays(startDate, VISIBLE_DAYS - 1), [startDate]);

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar', startStr, endStr],
    queryFn: () => getCalendarData(startStr, endStr),
  });

  const rooms = roomsData?.results?.filter((r) => r.is_active) ?? [];
  const bookings = calendarData ?? [];
  const isLoading = roomsLoading || calendarLoading;

  const handlePrevWeek = useCallback(
    () => setStartDate((d) => addDays(d, -7)),
    [],
  );
  const handleNextWeek = useCallback(
    () => setStartDate((d) => addDays(d, 7)),
    [],
  );
  const handleToday = useCallback(
    () => setStartDate(startOfDay(new Date())),
    [],
  );
  const handleJumpToDate = useCallback(
    (date: Date) => setStartDate(startOfDay(date)),
    [],
  );

  // New booking sheet state
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [bookingInitialRoom, setBookingInitialRoom] = useState<number | undefined>();
  const [bookingInitialDate, setBookingInitialDate] = useState<string | undefined>();

  function handleCellClick(roomId: number, date: string) {
    setBookingInitialRoom(roomId);
    setBookingInitialDate(date);
    setBookingSheetOpen(true);
  }

  function handleBookingNavigate(id: number) {
    navigate(`/bookings/${id}`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t('nav.calendar')}</h1>
        <CalendarControls
          startDate={startDate}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          onJumpToDate={handleJumpToDate}
        />
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : isMobile ? (
        <CalendarDayView
          selectedDate={startDate}
          bookings={bookings}
          onDateChange={handleJumpToDate}
          onBookingClick={handleBookingNavigate}
        />
      ) : (
        <CalendarGrid
          rooms={rooms}
          bookings={bookings}
          startDate={startDate}
          endDate={endDate}
          onCellClick={handleCellClick}
          onBookingNavigate={handleBookingNavigate}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">{t('common.status')}:</span>
        {[
          { key: 'confirmed', color: '#2980B9' },
          { key: 'pending', color: '#F39C12' },
          { key: 'checked_in', color: '#27AE60' },
          { key: 'checked_out', color: '#95A5A6' },
          { key: 'cancelled', color: '#E74C3C' },
        ].map(({ key, color }) => (
          <span key={key} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: color }}
            />
            {t(`bookings.status.${key}`)}
          </span>
        ))}
      </div>

      {/* New Booking Sheet */}
      <NewBookingSheet
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        initialRoom={bookingInitialRoom}
        initialCheckIn={bookingInitialDate}
        extraInvalidateKeys={[['calendar']]}
      />
    </div>
  );
}
