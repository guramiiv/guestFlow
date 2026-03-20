import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  BarChart3,
  Wallet,
  Plus,
  UserPlus,
  Share2,
} from 'lucide-react';
import { getDashboard } from '@/api/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';
import DateDisplay from '@/components/shared/DateDisplay';

const sourceStyles: Record<string, string> = {
  booking_com: 'bg-blue-100 text-blue-800',
  airbnb: 'bg-red-100 text-red-800',
  direct: 'bg-teal-100 text-teal-800',
  phone: 'bg-gray-100 text-gray-600',
  walkin: 'bg-amber-100 text-amber-800',
};

function SourceBadge({ source }: { source: string }) {
  const { t } = useTranslation();
  const style = sourceStyles[source] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {t(`bookings.source_labels.${source}`, source)}
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function SkeletonListItem() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-b-0">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openShareModal } = useOutletContext<{ openShareModal: () => void }>();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Today's Check-ins */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.todayCheckIns')}
                </CardTitle>
                <LogIn className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.today_check_ins ?? 0}</div>
              </CardContent>
            </Card>

            {/* Today's Check-outs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.todayCheckOuts')}
                </CardTitle>
                <LogOut className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.today_check_outs ?? 0}</div>
              </CardContent>
            </Card>

            {/* Occupancy */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.occupancy')}
                </CardTitle>
                <BarChart3 className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round(data?.current_occupancy ?? 0)}%
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.min(data?.current_occupancy ?? 0, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Month Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.monthRevenue')}
                </CardTitle>
                <Wallet className="h-5 w-5 text-teal" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CurrencyDisplay amount={data?.month_revenue ?? 0} />
                </div>
              </CardContent>
            </Card>

            {/* Shares This Month */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.sharesThisMonth')}
                </CardTitle>
                <Share2 className="h-5 w-5 text-[#117A65]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.share_count_this_month ?? 0}</div>
                {(data?.share_count_this_month ?? 0) > 0 && data?.share_breakdown && (
                  <div className="mt-3 space-y-1.5">
                    {Object.entries(data.share_breakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([platform, count]) => {
                        const pct = Math.round((count / data.share_count_this_month) * 100);
                        return (
                          <div key={platform} className="flex items-center gap-2 text-xs">
                            <span className="w-16 truncate text-muted-foreground">
                              {t(`dashboard.platform_${platform}`, platform)}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-[#117A65] transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Arrivals */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.upcomingArrivals')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <>
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
              </>
            ) : !data?.upcoming_arrivals?.length ? (
              <p className="text-muted-foreground text-sm px-4 pb-4">
                {t('common.noData')}
              </p>
            ) : (
              <div className="divide-y">
                {data.upcoming_arrivals.slice(0, 8).map((arrival) => (
                  <div
                    key={arrival.id}
                    onClick={() => navigate(`/bookings/${arrival.id}`)}
                    className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{arrival.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {arrival.room_name} &middot;{' '}
                        <DateDisplay date={arrival.check_in} />
                      </p>
                    </div>
                    <StatusBadge status={arrival.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentBookings')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('bookings.guestName')}</TableHead>
                    <TableHead>{t('bookings.room')}</TableHead>
                    <TableHead>{t('bookings.dates')}</TableHead>
                    <TableHead>{t('bookings.source')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </TableBody>
              </Table>
            ) : !data?.recent_bookings?.length ? (
              <p className="text-muted-foreground text-sm px-4 pb-4">
                {t('common.noData')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('bookings.guestName')}</TableHead>
                    <TableHead>{t('bookings.room')}</TableHead>
                    <TableHead>{t('bookings.dates')}</TableHead>
                    <TableHead>{t('bookings.source')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_bookings.slice(0, 10).map((booking) => (
                    <TableRow
                      key={booking.id}
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{booking.guest_name}</TableCell>
                      <TableCell>{booking.room_name}</TableCell>
                      <TableCell>
                        <DateDisplay date={booking.check_in} />
                        {' – '}
                        <DateDisplay date={booking.check_out} />
                      </TableCell>
                      <TableCell>
                        <SourceBadge source={booking.source} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={booking.total_price_gel} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/bookings?new=true')}
          className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.newBooking')}
        </button>
        <button
          onClick={() => navigate('/bookings?new=true&source=walkin')}
          className="inline-flex items-center gap-2 rounded-lg border border-teal px-4 py-2.5 text-sm font-medium text-teal hover:bg-teal/10 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {t('dashboard.walkIn')}
        </button>
        <button
          onClick={openShareModal}
          className="inline-flex items-center gap-2 rounded-lg border border-[#117A65] px-4 py-2.5 text-sm font-medium text-[#117A65] hover:bg-[#117A65]/10 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {t('dashboard.shareBookingPage')}
        </button>
      </div>
    </div>
  );
}
