import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Pencil, X, Save } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { getGuest, updateGuest } from '@/api/guests';
import type { Guest } from '@/types';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';
import StatusBadge from '@/components/shared/StatusBadge';
import DateDisplay from '@/components/shared/DateDisplay';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/* ── Zod schema ──────────────────────────────── */

const guestFormSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string(),
  phone: z.string(),
  country: z.string(),
  language: z.string(),
  id_type: z.string(),
  id_number: z.string(),
  notes: z.string(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

/* ── Skeleton ────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg col-span-2" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="h-48 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}

/* ── Country flag helper ─────────────────────── */

function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return '';
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/* ── Main Page ───────────────────────────────── */

export default function GuestDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', id],
    queryFn: () => getGuest(Number(id)),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    values: guest
      ? {
          first_name: guest.first_name,
          last_name: guest.last_name,
          email: guest.email,
          phone: guest.phone,
          country: guest.country,
          language: guest.language,
          id_type: guest.id_type,
          id_number: guest.id_number,
          notes: guest.notes,
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: GuestFormData) => updateGuest(Number(id), data as Partial<Guest>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest', id] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setEditing(false);
    },
  });

  function onSubmit(data: GuestFormData) {
    updateMutation.mutate(data);
  }

  function cancelEdit() {
    reset();
    setEditing(false);
  }

  if (isLoading) return <DetailSkeleton />;
  if (!guest) return <p className="p-6 text-muted-foreground">{t('common.noData')}</p>;

  const avgPerStay =
    guest.total_stays > 0
      ? parseFloat(guest.total_spent_gel) / guest.total_stays
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/guests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{guest.full_name}</h1>
        {guest.country && (
          <span className="text-2xl">{countryFlag(guest.country)}</span>
        )}
        <div className="ml-auto">
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="mr-1 h-4 w-4" />
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || updateMutation.isPending}
              >
                <Save className="mr-1 h-4 w-4" />
                {updateMutation.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('guests.totalStays')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{guest.total_stays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('guests.totalSpent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <CurrencyDisplay amount={guest.total_spent_gel} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ₾ / {t('guests.totalStays').toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <CurrencyDisplay amount={avgPerStay} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guest info card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.guestList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('auth.firstName')}</Label>
                <Input {...register('first_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('auth.lastName')}</Label>
                <Input {...register('last_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('auth.email')}</Label>
                <Input type="email" {...register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('auth.phone')}</Label>
                <Input {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('guests.country')}</Label>
                <Input {...register('country')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('guests.language')}</Label>
                <Input {...register('language')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('guests.idDocument')}</Label>
                <div className="flex gap-2">
                  <Input placeholder="Type" className="w-24" {...register('id_type')} />
                  <Input placeholder="Number" {...register('id_number')} />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>{t('bookings.notes')}</Label>
                <Input {...register('notes')} />
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label={t('auth.email')} value={guest.email} />
              <InfoRow label={t('auth.phone')} value={guest.phone} />
              <InfoRow
                label={t('guests.country')}
                value={
                  guest.country
                    ? `${countryFlag(guest.country)} ${guest.country.toUpperCase()}`
                    : ''
                }
              />
              <InfoRow label={t('guests.language')} value={guest.language} />
              <InfoRow
                label={t('guests.idDocument')}
                value={
                  guest.id_type || guest.id_number
                    ? `${guest.id_type} ${guest.id_number}`.trim()
                    : ''
                }
              />
              <InfoRow label={t('bookings.notes')} value={guest.notes} />
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Booking history */}
      <Card>
        <CardHeader>
          <CardTitle>{t('guests.bookingHistory')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {guest.recent_bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm px-6 py-4">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bookings.room')}</TableHead>
                  <TableHead>{t('common.from')}</TableHead>
                  <TableHead>{t('common.to')}</TableHead>
                  <TableHead className="text-center">{t('bookings.nights')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guest.recent_bookings.map((b) => {
                  const nights = differenceInCalendarDays(
                    parseISO(b.check_out),
                    parseISO(b.check_in),
                  );
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/bookings/${b.id}`)}
                    >
                      <TableCell className="font-medium">{b.room_name}</TableCell>
                      <TableCell><DateDisplay date={b.check_in} /></TableCell>
                      <TableCell><DateDisplay date={b.check_out} /></TableCell>
                      <TableCell className="text-center">{nights}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
