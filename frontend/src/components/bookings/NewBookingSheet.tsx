import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { createBooking } from '@/api/bookings';
import { getRooms, checkAvailability } from '@/api/rooms';
import type { Booking, Room } from '@/types';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

const SOURCES = ['direct', 'booking_com', 'airbnb', 'phone', 'walkin'];
const PAYMENT_METHODS = ['cash', 'bog_ipay', 'tbc_pay', 'bank_transfer', 'channel'];

const bookingFormSchema = z.object({
  room: z.number().min(1, 'Required'),
  check_in: z.string().min(1, 'Required'),
  check_out: z.string().min(1, 'Required'),
  num_guests: z.number().min(1),
  source: z.string().min(1),
  guest_name: z.string().min(1),
  guest_phone: z.string(),
  guest_email: z.string(),
  guest_country: z.string(),
  notes: z.string(),
  payment_method: z.string(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface NewBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the room field */
  initialRoom?: number;
  /** Pre-fill the check-in date (yyyy-MM-dd) */
  initialCheckIn?: string;
  /** Extra query keys to invalidate on success (e.g. ['calendar', ...]) */
  extraInvalidateKeys?: string[][];
}

export default function NewBookingSheet({
  open,
  onOpenChange,
  initialRoom,
  initialCheckIn,
  extraInvalidateKeys,
}: NewBookingSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  const rooms = roomsData?.results ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      room: 0,
      check_in: '',
      check_out: '',
      num_guests: 1,
      source: 'direct',
      guest_name: '',
      guest_phone: '',
      guest_email: '',
      guest_country: 'GE',
      notes: '',
      payment_method: '',
    },
  });

  // Apply initial values when sheet opens
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Sheet just opened — apply initial values
      if (initialRoom) setValue('room', initialRoom);
      if (initialCheckIn) setValue('check_in', initialCheckIn);
    }
    if (!open && prevOpenRef.current) {
      // Sheet just closed — reset form
      reset();
    }
    prevOpenRef.current = open;
  }, [open, initialRoom, initialCheckIn, setValue, reset]);

  const watchCheckIn = watch('check_in');
  const watchCheckOut = watch('check_out');
  const watchRoom = watch('room');

  const nights =
    watchCheckIn && watchCheckOut
      ? Math.max(differenceInCalendarDays(parseISO(watchCheckOut), parseISO(watchCheckIn)), 0)
      : 0;

  const selectedRoom = rooms.find((r: Room) => r.id === watchRoom);
  const estimatedTotal = selectedRoom ? nights * parseFloat(selectedRoom.base_price_gel) : 0;

  // Check availability for all rooms when dates are selected
  const [unavailableRooms, setUnavailableRooms] = useState<Record<number, string[]>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const prevDatesRef = useRef('');
  useEffect(() => {
    const key = `${watchCheckIn}|${watchCheckOut}`;
    if (key === prevDatesRef.current) return;
    prevDatesRef.current = key;

    if (!watchCheckIn || !watchCheckOut || nights <= 0 || rooms.length === 0) {
      setUnavailableRooms({});
      return;
    }
    setCheckingAvailability(true);
    const activeRooms = rooms.filter((r: Room) => r.is_active);
    Promise.all(
      activeRooms.map((r: Room) =>
        checkAvailability(r.id, watchCheckIn, watchCheckOut).then((res) => ({
          id: r.id,
          available: res.available,
          dates: res.occupied_dates ?? [],
        }))
      )
    )
      .then((results) => {
        const map: Record<number, string[]> = {};
        for (const r of results) {
          if (!r.available) map[r.id] = r.dates;
        }
        setUnavailableRooms(map);
      })
      .catch(() => {})
      .finally(() => setCheckingAvailability(false));
  }, [watchCheckIn, watchCheckOut, nights, rooms]);

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (extraInvalidateKeys) {
        for (const key of extraInvalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      reset();
      onOpenChange(false);
    },
  });

  function onSubmit(data: BookingFormData) {
    const payload: Record<string, unknown> = {
      ...data,
      total_price_gel: estimatedTotal.toFixed(2),
    };
    if (!payload.payment_method) delete payload.payment_method;
    createMutation.mutate(payload as unknown as Partial<Booking>);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('bookings.newBooking')}</DialogTitle>
          <DialogDescription>{t('bookings.selectRoom')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Dates + Room row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t('common.from')}</Label>
              <Input type="date" {...register('check_in')} />
              {errors.check_in && <p className="text-xs text-destructive">{errors.check_in.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('common.to')}</Label>
              <Input type="date" {...register('check_out')} />
              {errors.check_out && <p className="text-xs text-destructive">{errors.check_out.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('bookings.numGuests')}</Label>
              <Input type="number" min={1} {...register('num_guests', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label>{t('bookings.room')}{checkingAvailability && <span className="ml-2 text-xs text-muted-foreground">({t('common.loading')})</span>}</Label>
            <Controller
              name="room"
              control={control}
              render={({ field }) => {
                const selected = rooms.find((r: Room) => r.id === field.value);
                return (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('bookings.selectRoom')}>
                      {selected ? `${selected.name_ka} — ₾${selected.base_price_gel}` : t('bookings.selectRoom')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rooms
                      .filter((r: Room) => r.is_active)
                      .map((r: Room) => {
                        const isUnavailable = r.id in unavailableRooms;
                        return (
                          <SelectItem key={r.id} value={String(r.id)} disabled={isUnavailable}>
                            <span className={isUnavailable ? 'text-muted-foreground line-through' : ''}>
                              {r.name_ka} — ₾{r.base_price_gel}
                            </span>
                            {isUnavailable && (
                              <span className="ml-2 text-xs text-destructive">{t('bookings.roomOccupied')}</span>
                            )}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              );
              }}
            />
            {errors.room && <p className="text-xs text-destructive">{errors.room.message}</p>}
            {watchRoom > 0 && unavailableRooms[watchRoom] && (
              <p className="text-xs text-destructive">{t('bookings.roomOccupied')}</p>
            )}
          </div>

          {/* Nights / estimated total */}
          {nights > 0 && (
            <div className="flex items-center gap-6 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <span>
                {t('bookings.nights')}: <strong>{nights}</strong>
              </span>
              <span>
                {t('bookings.totalPrice')}: <strong><CurrencyDisplay amount={estimatedTotal} /></strong>
              </span>
            </div>
          )}

          <hr className="border-border/50" />

          {/* Guest info section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('bookings.guestName')}</Label>
              <Input {...register('guest_name')} />
              {errors.guest_name && <p className="text-xs text-destructive">{errors.guest_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('auth.phone')}</Label>
              <Input {...register('guest_phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('auth.email')}</Label>
              <Input type="email" {...register('guest_email')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('guests.country')}</Label>
              <Input {...register('guest_country')} />
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Source + Payment row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('bookings.source')}</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`bookings.source_labels.${s}`, s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('bookings.payment.method')}</Label>
              <Controller
                name="payment_method"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="—" />
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
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('bookings.notes')}</Label>
            <Input {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" className="px-8" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
