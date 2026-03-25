import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  MoreHorizontal,
  LogIn,
  LogOut,
  XCircle,
  Wallet,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  getBookings,
  checkIn,
  checkOut,
  cancelBooking,
  recordPayment,
} from '@/api/bookings';
import type { Booking, BookingFilters } from '@/types';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';
import StatusBadge from '@/components/shared/StatusBadge';
import DateDisplay from '@/components/shared/DateDisplay';
import NewBookingSheet from '@/components/bookings/NewBookingSheet';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

/* ── Constants ───────────────────────────────── */

const STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
const SOURCES = ['direct', 'booking_com', 'airbnb', 'phone', 'walkin'];
const PAYMENT_METHODS = ['cash', 'bog_ipay', 'tbc_pay', 'bank_transfer', 'channel'];

const sourceStyles: Record<string, string> = {
  booking_com: 'bg-blue-100 text-blue-800',
  airbnb: 'bg-red-100 text-red-800',
  direct: 'bg-teal-100 text-teal-800',
  phone: 'bg-gray-100 text-gray-600',
  walkin: 'bg-amber-100 text-amber-800',
};

const paymentStatusStyles: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
};

/* ── Zod Schemas ─────────────────────────────── */

const paymentFormSchema = z.object({
  amount: z.number().min(0.01),
  payment_method: z.string().min(1),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

/* ── Sub-components ──────────────────────────── */

function SourceBadge({ source }: { source: string }) {
  const { t } = useTranslation();
  const style = sourceStyles[source] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {t(`bookings.source_labels.${source}`, source)}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const style = paymentStatusStyles[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {t(`bookings.payment.${status}`, status)}
    </span>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 9 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </TableCell>
      ))}
    </TableRow>
  );
}

/* ── Record Payment Dialog ───────────────────── */

function RecordPaymentDialog({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const remaining = booking
    ? parseFloat(booking.total_price_gel) - parseFloat(booking.paid_amount_gel)
    : 0;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: remaining > 0 ? parseFloat(remaining.toFixed(2)) : 0,
      payment_method: 'cash',
    },
  });

  const payMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      recordPayment(booking!.id, {
        amount: data.amount.toFixed(2),
        payment_method: data.payment_method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      reset();
      onOpenChange(false);
    },
  });

  function onSubmit(data: PaymentFormData) {
    payMutation.mutate(data);
  }

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bookings.recordPayment')}</DialogTitle>
          <DialogDescription>
            {booking.guest_name} — {booking.room_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span>
              {t('bookings.totalPrice')}: <strong><CurrencyDisplay amount={booking.total_price_gel} /></strong>
            </span>
            <span>
              {t('bookings.paidAmount')}: <strong><CurrencyDisplay amount={booking.paid_amount_gel} /></strong>
            </span>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            {t('bookings.remaining')}: <strong><CurrencyDisplay amount={remaining} /></strong>
          </div>

          <div className="space-y-1.5">
            <Label>{t('bookings.paidAmount')}</Label>
            <Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t('bookings.payment.method')}</Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t(`bookings.payment.${m}`, m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method && (
              <p className="text-xs text-destructive">{errors.payment_method.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={payMutation.isPending}>
              {payMutation.isPending ? t('common.loading') : t('bookings.recordPayment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Cancel Booking Dialog ───────────────────── */

function CancelBookingDialog({
  open,
  onOpenChange,
  booking,
  reason,
  onReasonChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  reason: string;
  onReasonChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(booking!.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bookings.cancelBooking')}</DialogTitle>
          <DialogDescription>
            {t('bookings.confirmCancel')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t('bookings.cancellationReason')}</Label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={t('bookings.cancellationReasonPlaceholder')}
            className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            {cancelMutation.isPending
              ? t('common.loading')
              : t('bookings.cancelBooking')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Actions Dropdown ────────────────────────── */

function BookingActions({
  booking,
  onRecordPayment,
  onCancelBooking,
}: {
  booking: Booking;
  onRecordPayment: (b: Booking) => void;
  onCancelBooking: (b: Booking) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: () => checkIn(booking.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(booking.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-xs" />}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/bookings/${booking.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          {t('common.view')}
        </DropdownMenuItem>

        {(booking.status === 'confirmed' || booking.status === 'pending') && (
          <DropdownMenuItem onClick={() => checkInMutation.mutate()}>
            <LogIn className="mr-2 h-4 w-4" />
            {t('bookings.checkIn')}
          </DropdownMenuItem>
        )}

        {booking.status === 'checked_in' && (
          <DropdownMenuItem onClick={() => checkOutMutation.mutate()}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('bookings.checkOut')}
          </DropdownMenuItem>
        )}

        {booking.payment_status !== 'paid' && (
          <DropdownMenuItem onClick={() => onRecordPayment(booking)}>
            <Wallet className="mr-2 h-4 w-4" />
            {t('bookings.recordPayment')}
          </DropdownMenuItem>
        )}

        {booking.status !== 'cancelled' && booking.status !== 'checked_out' && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onCancelBooking(booking)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {t('bookings.cancelBooking')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Main Page ───────────────────────────────── */

export default function BookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<BookingFilters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => getBookings(filters),
  });

  const bookings = data?.results ?? [];

  function updateFilter(key: keyof BookingFilters, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value && value !== 'all') {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('bookings.title')}</h1>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('bookings.newBooking')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('common.status')}</Label>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) => updateFilter('status', v ?? '')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('common.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`bookings.status.${s}`, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('bookings.source')}</Label>
          <Select
            value={filters.source ?? 'all'}
            onValueChange={(v) => updateFilter('source', v ?? '')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('common.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`bookings.source_labels.${s}`, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('common.from')}</Label>
          <Input
            type="date"
            className="w-[150px]"
            value={filters.start_date ?? ''}
            onChange={(e) => updateFilter('start_date', e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('common.to')}</Label>
          <Input
            type="date"
            className="w-[150px]"
            value={filters.end_date ?? ''}
            onChange={(e) => updateFilter('end_date', e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bookings.guestName')}</TableHead>
              <TableHead>{t('bookings.room')}</TableHead>
              <TableHead>{t('common.from')}</TableHead>
              <TableHead>{t('common.to')}</TableHead>
              <TableHead className="text-center">{t('bookings.nights')}</TableHead>
              <TableHead>{t('bookings.source')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('bookings.totalPrice')}</TableHead>
              <TableHead className="text-right">{t('bookings.paidAmount')}</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/bookings/${b.id}`)}>
                  <TableCell className="font-medium">{b.guest_name}</TableCell>
                  <TableCell>{b.room_name}</TableCell>
                  <TableCell><DateDisplay date={b.check_in} /></TableCell>
                  <TableCell><DateDisplay date={b.check_out} /></TableCell>
                  <TableCell className="text-center">{b.num_nights}</TableCell>
                  <TableCell><SourceBadge source={b.source} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={b.status} />
                      <PaymentBadge status={b.payment_status} />
                    </div>
                    {b.status === 'cancelled' && (
                      <span className="text-xs text-destructive">
                        <DateDisplay date={b.updated_at} />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={b.total_price_gel} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={b.paid_amount_gel} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <BookingActions
                      booking={b}
                      onRecordPayment={(bk) => setPaymentBooking(bk)}
                      onCancelBooking={(bk) => setCancelBookingTarget(bk)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count */}
      {data && (
        <p className="text-sm text-muted-foreground">
          {t('common.total')}: {data.count}
        </p>
      )}

      {/* Sheets / Dialogs */}
      <NewBookingSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <RecordPaymentDialog
        open={!!paymentBooking}
        onOpenChange={(v) => { if (!v) setPaymentBooking(null); }}
        booking={paymentBooking}
      />

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        open={!!cancelBookingTarget}
        onOpenChange={(v) => {
          if (!v) {
            setCancelBookingTarget(null);
            setCancelReason('');
          }
        }}
        booking={cancelBookingTarget}
        reason={cancelReason}
        onReasonChange={setCancelReason}
      />
    </div>
  );
}
