import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  CalendarDays,
  Users,
  Moon,
  BedDouble,
  Mail,
  Phone,
  Globe,
  MessageSquare,
  FileText,
  LogIn,
  LogOut,
  XCircle,
  Wallet,
  Pencil,
  Save,
} from 'lucide-react';

import {
  getBooking,
  updateBooking,
  checkIn,
  checkOut,
  cancelBooking,
  recordPayment,
} from '@/api/bookings';
import type { RecordPaymentData } from '@/types';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';
import StatusBadge from '@/components/shared/StatusBadge';
import DateDisplay from '@/components/shared/DateDisplay';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

/* ── Payment form schema ─────────────────────── */

const paymentSchema = z.object({
  amount: z.string().refine((v) => Number(v) >= 0.01, { message: 'Min 0.01' }),
  payment_method: z.string().min(1),
});

type PaymentForm = z.infer<typeof paymentSchema>;

/* ── Notes edit schema ───────────────────────── */

const notesSchema = z.object({
  notes: z.string(),
});

type NotesForm = z.infer<typeof notesSchema>;

/* ── Skeleton ────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg lg:col-span-2" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="h-48 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}

/* ── Payment status badge ────────────────────── */

const paymentStyles: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-600',
};

function PaymentBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStyles[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {t(`bookings.payment.${status}`, status)}
    </span>
  );
}

/* ── Info row helper ─────────────────────────── */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium break-words">{value || '—'}</dd>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────── */

export default function BookingDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  /* ── Data fetching ── */
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBooking(Number(id)),
    enabled: !!id,
  });

  /* ── Mutations ── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const checkInMutation = useMutation({
    mutationFn: () => checkIn(Number(id)),
    onSuccess: invalidate,
  });

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(Number(id)),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelBooking(Number(id), reason),
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
      setCancelReason('');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: RecordPaymentData) => recordPayment(Number(id), data),
    onSuccess: () => {
      invalidate();
      setPaymentOpen(false);
      paymentReset();
    },
  });

  const notesMutation = useMutation({
    mutationFn: (data: NotesForm) => updateBooking(Number(id), data),
    onSuccess: () => {
      invalidate();
      setEditingNotes(false);
    },
  });

  /* ── Payment form ── */
  const {
    register: paymentRegister,
    handleSubmit: handlePayment,
    setValue: setPaymentValue,
    reset: paymentReset,
    formState: { errors: paymentErrors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', payment_method: '' },
  });

  /* ── Notes form ── */
  const {
    register: notesRegister,
    handleSubmit: handleNotes,
    reset: notesReset,
  } = useForm<NotesForm>({
    resolver: zodResolver(notesSchema),
    values: booking ? { notes: booking.notes } : undefined,
  });

  /* ── Loading / Not found ── */
  if (isLoading) return <DetailSkeleton />;
  if (!booking) {
    return (
      <div className="p-6 text-muted-foreground">{t('common.noData')}</div>
    );
  }

  /* ── Derived values ── */
  const total = Number(booking.total_price_gel) || 0;
  const paid = Number(booking.paid_amount_gel) || 0;
  const remaining = Math.max(0, total - paid);

  const canCheckIn = booking.status === 'confirmed' || booking.status === 'pending';
  const canCheckOut = booking.status === 'checked_in';
  const canCancel =
    booking.status !== 'cancelled' &&
    booking.status !== 'checked_out' &&
    booking.status !== 'no_show';
  const canPay = booking.payment_status !== 'paid' && booking.status !== 'cancelled';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('/bookings')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {t('bookings.title')} #{booking.id}
        </h1>
        <StatusBadge status={booking.status} />
        <PaymentBadge status={booking.payment_status} />

        {/* Action buttons */}
        <div className="ml-auto flex flex-wrap gap-2">
          {canCheckIn && (
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
            >
              <LogIn className="mr-1 h-4 w-4" />
              {t('bookings.checkIn')}
            </Button>
          )}
          {canCheckOut && (
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={checkOutMutation.isPending}
              onClick={() => checkOutMutation.mutate()}
            >
              <LogOut className="mr-1 h-4 w-4" />
              {t('bookings.checkOut')}
            </Button>
          )}
          {canPay && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPaymentValue('amount', String(remaining));
                setPaymentOpen(true);
              }}
            >
              <Wallet className="mr-1 h-4 w-4" />
              {t('bookings.recordPayment')}
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="mr-1 h-4 w-4" />
              {t('bookings.cancelBooking')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Cancellation reason banner ── */}
      {booking.status === 'cancelled' && booking.cancellation_reason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">{t('bookings.cancellationReason')}</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{booking.cancellation_reason}</p>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — Booking info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal" />
              {t('bookings.dates')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Dates & stay row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoRow
                icon={CalendarDays}
                label={t('bookings.checkIn')}
                value={<DateDisplay date={booking.check_in} />}
              />
              <InfoRow
                icon={CalendarDays}
                label={t('bookings.checkOut')}
                value={<DateDisplay date={booking.check_out} />}
              />
              <InfoRow
                icon={Moon}
                label={t('bookings.nights')}
                value={booking.num_nights}
              />
              <InfoRow
                icon={Users}
                label={t('bookings.numGuests')}
                value={booking.num_guests}
              />
            </div>

            <Separator />

            {/* Room & source */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow
                icon={BedDouble}
                label={t('bookings.room')}
                value={booking.room_name}
              />
              <InfoRow
                label={t('bookings.source')}
                value={t(
                  `bookings.source_labels.${booking.source}`,
                  booking.source,
                )}
              />
              {booking.external_id && (
                <InfoRow label="External ID" value={booking.external_id} />
              )}
            </div>

            <Separator />

            {/* Guest info */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t('bookings.guestName')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  icon={Users}
                  label={t('bookings.guestName')}
                  value={
                    booking.guest ? (
                      <button
                        type="button"
                        className="text-teal hover:underline"
                        onClick={() => navigate(`/guests/${booking.guest}`)}
                      >
                        {booking.guest_name}
                      </button>
                    ) : (
                      booking.guest_name
                    )
                  }
                />
                <InfoRow
                  icon={Mail}
                  label={t('auth.email')}
                  value={booking.guest_email}
                />
                <InfoRow
                  icon={Phone}
                  label={t('auth.phone')}
                  value={booking.guest_phone}
                />
                <InfoRow
                  icon={Globe}
                  label={t('guests.country')}
                  value={booking.guest_country ? booking.guest_country.toUpperCase() : ''}
                />
              </div>
            </div>

            {/* Guest message */}
            {booking.guest_message && (
              <>
                <Separator />
                <InfoRow
                  icon={MessageSquare}
                  label={t('bookings.guestMessage')}
                  value={booking.guest_message}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Right column — Payment & notes */}
        <div className="space-y-5">
          {/* Payment card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-teal" />
                {t('bookings.recordPayment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('bookings.totalPrice')}
                </span>
                <span className="font-semibold">
                  <CurrencyDisplay amount={total} />
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('bookings.paidAmount')}
                </span>
                <span className="font-semibold text-green-600">
                  <CurrencyDisplay amount={paid} />
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('bookings.remaining')}
                </span>
                <span
                  className={`font-bold text-lg ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  <CurrencyDisplay amount={remaining} />
                </span>
              </div>
              {booking.payment_method && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('bookings.payment.method')}
                  </span>
                  <span className="font-medium">
                    {t(
                      `bookings.payment.${booking.payment_method}`,
                      booking.payment_method,
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal" />
                {t('bookings.notes')}
              </CardTitle>
              {!editingNotes && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEditingNotes(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <>
                  <textarea
                    rows={4}
                    className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...notesRegister('notes')}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={notesMutation.isPending}
                      onClick={handleNotes((d) => notesMutation.mutate(d))}
                    >
                      <Save className="mr-1 h-4 w-4" />
                      {t('common.save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        notesReset();
                        setEditingNotes(false);
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </>

              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {booking.notes || (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                {t('bookings.dates')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.created')}</span>
                  <DateDisplay date={booking.created_at} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.updated')}</span>
                  <DateDisplay date={booking.updated_at} />
                </div>
                {booking.status === 'cancelled' && (
                  <div className="flex justify-between">
                    <span className="text-destructive">{t('bookings.cancelledDate')}</span>
                    <span className="text-destructive"><DateDisplay date={booking.updated_at} /></span>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Record Payment Dialog ── */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bookings.recordPayment')}</DialogTitle>
            <DialogDescription>{t('bookings.remaining')}: <CurrencyDisplay amount={remaining} /></DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handlePayment((d) => paymentMutation.mutate(d as RecordPaymentData))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>{t('bookings.paidAmount')} (₾)</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                {...paymentRegister('amount')}
                aria-invalid={!!paymentErrors.amount}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('bookings.payment.method')}</Label>
              <Select
                onValueChange={(v) => setPaymentValue('payment_method', String(v ?? ''))}
              >
                <SelectTrigger className="w-full" aria-invalid={!!paymentErrors.payment_method}>
                  <SelectValue placeholder={t('bookings.payment.method')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('bookings.payment.cash')}</SelectItem>
                  <SelectItem value="bog_ipay">{t('bookings.payment.bog_ipay')}</SelectItem>
                  <SelectItem value="tbc_pay">{t('bookings.payment.tbc_pay')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('bookings.payment.bank_transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={paymentMutation.isPending}
                className="bg-teal text-white hover:bg-teal/90"
              >
                {paymentMutation.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Confirm Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={(open) => {
        setCancelOpen(open);
        if (!open) setCancelReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bookings.cancelBooking')}</DialogTitle>
            <DialogDescription>
              {t('bookings.confirmCancel')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('bookings.cancellationReason')}</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('bookings.cancellationReasonPlaceholder')}
              className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(cancelReason)}
            >
              {cancelMutation.isPending
                ? t('common.loading')
                : t('bookings.cancelBooking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
