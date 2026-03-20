import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { ka } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRevenue, getOccupancy } from '@/api/reports';
import { getBookings } from '@/api/bookings';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';

type Period = 'this_month' | 'last_month' | 'this_year' | 'custom';

const TEAL = '#117A65';
const NAVY = '#0D2137';

const SOURCE_COLORS: Record<string, string> = {
  direct: TEAL,
  booking_com: '#003580',
  airbnb: '#FF5A5F',
  phone: '#7F8C8D',
  walkin: '#F39C12',
};

const SOURCE_LABELS: Record<string, string> = {
  direct: 'პირდაპირი',
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  phone: 'ტელეფონი',
  walkin: 'ადგილზე',
};

function getPeriodDates(period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  switch (period) {
    case 'this_month':
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return { start: format(startOfMonth(prev), 'yyyy-MM-dd'), end: format(endOfMonth(prev), 'yyyy-MM-dd') };
    }
    case 'this_year':
      return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'custom':
      return { start: customStart || format(startOfMonth(now), 'yyyy-MM-dd'), end: customEnd || format(endOfMonth(now), 'yyyy-MM-dd') };
  }
}

function periodToApi(period: Period): string {
  switch (period) {
    case 'this_month': return 'month';
    case 'last_month': return 'month';
    case 'this_year': return 'year';
    case 'custom': return 'month';
  }
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dates = getPeriodDates(period, customStart, customEnd);

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue', period, dates.start],
    queryFn: () => getRevenue(periodToApi(period), dates.start),
  });

  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: ['occupancy', dates.start, dates.end],
    queryFn: () => getOccupancy(dates.start, dates.end),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-for-source', dates.start, dates.end],
    queryFn: () => getBookings({ start_date: dates.start, end_date: dates.end }),
  });

  const totalRevenue = useMemo(
    () => revenueData?.reduce((sum, d) => sum + d.revenue_gel, 0) ?? 0,
    [revenueData],
  );

  const avgOccupancy = useMemo(() => {
    if (!occupancyData?.length) return 0;
    return Math.round(occupancyData.reduce((sum, d) => sum + d.occupancy_percent, 0) / occupancyData.length);
  }, [occupancyData]);

  const sourceData = useMemo(() => {
    if (!bookingsData?.results) return [];
    const counts: Record<string, number> = {};
    for (const b of bookingsData.results) {
      counts[b.source] = (counts[b.source] || 0) + 1;
    }
    const total = bookingsData.results.length;
    return Object.entries(counts).map(([source, count]) => ({
      name: SOURCE_LABELS[source] || source,
      source,
      value: count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [bookingsData]);

  const vat = totalRevenue * 0.18;
  const netRevenue = totalRevenue - vat;

  const periods: { key: Period; label: string }[] = [
    { key: 'this_month', label: t('reports.thisMonth') },
    { key: 'last_month', label: t('reports.lastMonth') },
    { key: 'this_year', label: t('reports.thisYear') },
    { key: 'custom', label: t('reports.custom') },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? 'default' : 'outline'}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-40"
            />
          </div>
        )}
      </div>

      {/* Revenue + Occupancy charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.revenue')}</CardTitle>
            <p className="text-3xl font-bold" style={{ color: TEAL }}>
              <CurrencyDisplay amount={totalRevenue} />
            </p>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-[300px] animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => format(new Date(v), 'dd.MM', { locale: ka })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <RechartsTooltip
                    formatter={(value) => [`₾${Number(value).toLocaleString()}`, t('reports.revenue')]}
                    labelFormatter={(label) => format(new Date(String(label)), 'dd.MM.yyyy', { locale: ka })}
                  />
                  <Bar dataKey="revenue_gel" fill={TEAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Occupancy chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.occupancyRate')}</CardTitle>
            <p className="text-3xl font-bold" style={{ color: NAVY }}>
              {avgOccupancy}%
            </p>
          </CardHeader>
          <CardContent>
            {occupancyLoading ? (
              <div className="h-[300px] animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => format(new Date(v), 'dd.MM', { locale: ka })}
                    fontSize={12}
                  />
                  <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                  <RechartsTooltip
                    formatter={(value) => [`${value}%`, t('reports.occupancyRate')]}
                    labelFormatter={(label) => format(new Date(String(label)), 'dd.MM.yyyy', { locale: ka })}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancy_percent"
                    stroke={NAVY}
                    strokeWidth={2}
                    dot={{ fill: TEAL, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source pie + Tax summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bookings by source */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.bookingsBySource')}</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100) / 100}%`}
                  >
                    {sourceData.map((entry) => (
                      <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || '#999'} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => {
                      const item = sourceData.find((d) => d.name === value);
                      return item ? `${value} (${item.value})` : value;
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tax summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.taxSummary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">{t('reports.totalRevenue')}</span>
              <span className="text-xl font-bold">
                <CurrencyDisplay amount={totalRevenue} />
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">{t('reports.vat')}</span>
              <span className="text-xl font-semibold text-red-600">
                <CurrencyDisplay amount={vat} />
              </span>
            </div>
            <div className="flex items-center justify-between pb-3">
              <span className="font-medium">Net</span>
              <span className="text-xl font-bold" style={{ color: TEAL }}>
                <CurrencyDisplay amount={netRevenue} />
              </span>
            </div>
            <Button className="w-full gap-2" variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4" />
              {t('reports.exportExcel')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function handleExportExcel() {
  // Placeholder for Excel export functionality
  alert('Excel export coming soon');
}
