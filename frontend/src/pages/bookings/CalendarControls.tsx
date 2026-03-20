import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CalendarControlsProps {
  startDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onJumpToDate: (date: Date) => void;
}

export default function CalendarControls({
  startDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  onJumpToDate,
}: CalendarControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onPrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday}>
        <CalendarDays className="mr-1 h-4 w-4" />
        {t('dashboard.todayCheckIns').split(' ')[0] /* "Today" / "დღევანდელი" */}
      </Button>
      <Button variant="outline" size="sm" onClick={onNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Input
        type="date"
        className="w-[150px]"
        value={format(startDate, 'yyyy-MM-dd')}
        onChange={(e) => {
          if (e.target.value) onJumpToDate(new Date(e.target.value));
        }}
      />
    </div>
  );
}
