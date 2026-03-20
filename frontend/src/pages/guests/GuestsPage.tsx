import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { getGuests } from '@/api/guests';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';

import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function GuestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['guests', search],
    queryFn: () => getGuests(search ? { search } : undefined),
  });

  const guests = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('guests.title')}</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('guests.searchGuests')}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bookings.guestName')}</TableHead>
              <TableHead>{t('auth.email')}</TableHead>
              <TableHead>{t('auth.phone')}</TableHead>
              <TableHead>{t('guests.country')}</TableHead>
              <TableHead className="text-center">{t('guests.totalStays')}</TableHead>
              <TableHead className="text-right">{t('guests.totalSpent')}</TableHead>
              <TableHead>{t('common.date')}</TableHead>
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
            ) : guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              guests.map((g) => (
                <TableRow
                  key={g.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/guests/${g.id}`)}
                >
                  <TableCell className="font-medium">{g.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{g.phone || '—'}</TableCell>
                  <TableCell>
                    {g.country ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-base leading-none">{countryFlag(g.country)}</span>
                        <span className="text-xs text-muted-foreground uppercase">{g.country}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-center">{g.total_stays}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={g.total_spent_gel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {g.updated_at ? new Date(g.updated_at).toLocaleDateString('ka-GE') : '—'}
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
    </div>
  );
}

/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji.
 */
function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return '';
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
