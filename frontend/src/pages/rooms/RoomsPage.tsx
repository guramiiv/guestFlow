import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BedDouble,
  Users,
  Plus,
  Pencil,
  Trash2,
  Building,
  CalendarRange,
  X,
  ImagePlus,
  Loader2,
} from 'lucide-react';

import { getRooms, createRoom, updateRoom, deleteRoom, uploadPhotos } from '@/api/rooms';
import type { Room, PaginatedResponse } from '@/types';
import CurrencyDisplay from '@/components/shared/CurrencyDisplay';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const ROOM_TYPES = ['single', 'double', 'twin', 'family', 'suite', 'dorm'];

const AMENITY_OPTIONS = [
  'WiFi',
  'პარკინგი',
  'კონდიციონერი',
  'აივანი',
  'სამზარეულო',
  'TV',
  'მინიბარი',
];

const seasonalRateSchema = z.object({
  name_ka: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  price_gel: z.number().min(0),
  min_stay: z.number().min(1),
});

const roomFormSchema = z.object({
  name_ka: z.string().min(1),
  name_en: z.string(),
  room_type: z.string().min(1),
  max_guests: z.number().min(1),
  base_price_gel: z.number().min(0),
  floor: z.number().min(0),
  description_ka: z.string(),
  amenities: z.array(z.string()),
  seasonal_rates: z.array(seasonalRateSchema),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

/* ── Skeleton ────────────────────────────────── */

function RoomCardSkeleton() {
  return (
    <Card>
      <div className="h-40 bg-muted animate-pulse rounded-t-xl" />
      <CardContent className="space-y-3 pt-4">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

/* ── Room Form Sheet ─────────────────────────── */

function RoomFormSheet({
  open,
  onOpenChange,
  room,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: room
      ? {
          name_ka: room.name_ka,
          name_en: room.name_en,
          room_type: room.room_type,
          max_guests: room.max_guests,
          base_price_gel: parseFloat(room.base_price_gel),
          floor: room.floor,
          description_ka: room.description_ka,
          amenities: room.amenities,
          seasonal_rates: room.seasonal_rates.map((r) => ({
            name_ka: r.name_ka,
            start_date: r.start_date,
            end_date: r.end_date,
            price_gel: parseFloat(r.price_gel),
            min_stay: r.min_stay,
          })),
        }
      : {
          name_ka: '',
          name_en: '',
          room_type: '',
          max_guests: 1,
          base_price_gel: 0,
          floor: 1,
          description_ka: '',
          amenities: [],
          seasonal_rates: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'seasonal_rates',
  });

  const amenities = watch('amenities');

  /* ── Photo upload state ── */
  const [photos, setPhotos] = useState<string[]>(room?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadPhotos(fileArray);
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      // upload failed silently — user can retry
    } finally {
      setUploading(false);
    }
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (value: string) => {
    const current = amenities ?? [];
    if (current.includes(value)) {
      setValue(
        'amenities',
        current.filter((a) => a !== value),
      );
    } else {
      setValue('amenities', [...current, value]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data: RoomFormData) => {
      const payload = {
        ...data,
        photos,
        base_price_gel: String(data.base_price_gel),
        seasonal_rates: data.seasonal_rates.map((r) => ({
          ...r,
          price_gel: String(r.price_gel),
        })),
      };
      return room
        ? updateRoom(room.id, payload as unknown as Partial<Room>)
        : createRoom(payload as unknown as Partial<Room>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      reset();
      onOpenChange(false);
    },
  });

  const onSubmit = (data: RoomFormData) => saveMutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {room ? t('rooms.editRoom') : t('rooms.addRoom')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {room ? t('rooms.editRoom') : t('rooms.addRoom')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name_ka">{t('rooms.roomName')} (KA) *</Label>
              <Input
                id="name_ka"
                {...register('name_ka')}
                aria-invalid={!!errors.name_ka}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name_en">{t('rooms.roomName')} (EN)</Label>
              <Input id="name_en" {...register('name_en')} />
            </div>
          </div>

          {/* Type + Price + Guests + Floor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>{t('rooms.roomType')} *</Label>
              <Controller
                control={control}
                name="room_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.room_type}>
                      <SelectValue placeholder={t('rooms.roomType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`rooms.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="base_price_gel">{t('rooms.pricePerNight')} (₾) *</Label>
              <Input
                id="base_price_gel"
                type="number"
                step="0.01"
                min={0}
                {...register('base_price_gel', { valueAsNumber: true })}
                aria-invalid={!!errors.base_price_gel}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_guests">{t('rooms.maxGuests')} *</Label>
              <Input
                id="max_guests"
                type="number"
                min={1}
                {...register('max_guests', { valueAsNumber: true })}
                aria-invalid={!!errors.max_guests}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="floor">{t('rooms.floor')}</Label>
              <Input
                id="floor"
                type="number"
                min={0}
                {...register('floor', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description_ka">{t('property.description')}</Label>
            <textarea
              id="description_ka"
              rows={2}
              className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register('description_ka')}
            />
          </div>

          {/* Amenities */}
          <div className="space-y-1.5">
            <Label>{t('rooms.amenities')}</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => {
                const checked = amenities?.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <Label>{t('rooms.photos', 'ფოტოები')}</Label>

            {/* Thumbnails */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((url, i) => (
                  <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-lg border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e.dataTransfer.files); }}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-teal hover:bg-teal/5 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-teal" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
              <span>{uploading ? t('common.loading', 'იტვირთება...') : t('rooms.uploadPhotos', 'ფოტოების ატვირთვა')}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
          </div>

          {/* Seasonal Rates */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {t('rooms.seasonalRates')}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    name_ka: '',
                    start_date: '',
                    end_date: '',
                    price_gel: 0,
                    min_stay: 1,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                {t('common.add')}
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border p-3 space-y-2"
              >
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>

                <Input
                  placeholder={t('rooms.seasonalRates') + ' — ' + t('rooms.roomName')}
                  {...register(`seasonal_rates.${index}.name_ka`)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    {...register(`seasonal_rates.${index}.start_date`)}
                  />
                  <Input
                    type="date"
                    {...register(`seasonal_rates.${index}.end_date`)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="₾"
                    {...register(`seasonal_rates.${index}.price_gel`, { valueAsNumber: true })}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder={t('bookings.nights')}
                    {...register(`seasonal_rates.${index}.min_stay`, { valueAsNumber: true })}
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-teal text-white hover:bg-teal/90"
              disabled={isSubmitting || saveMutation.isPending}
            >
              {saveMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ───────────────────────────────── */

export default function RoomsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  const rooms = data?.results ?? [];

  /* Optimistic toggle active */
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateRoom(id, { is_active }),
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ['rooms'] });
      const previous =
        queryClient.getQueryData<PaginatedResponse<Room>>(['rooms']);
      queryClient.setQueryData<PaginatedResponse<Room>>(['rooms'], (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.map((r) =>
            r.id === id ? { ...r, is_active } : r,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['rooms'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  /* Optimistic delete */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRoom(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['rooms'] });
      const previous =
        queryClient.getQueryData<PaginatedResponse<Room>>(['rooms']);
      queryClient.setQueryData<PaginatedResponse<Room>>(['rooms'], (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.filter((r) => r.id !== id),
          count: old.count - 1,
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['rooms'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const openCreate = () => {
    setEditingRoom(null);
    setSheetOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setSheetOpen(true);
  };

  const handleDelete = (room: Room) => {
    if (window.confirm(`${t('common.delete')} "${room.name_ka}"?`)) {
      deleteMutation.mutate(room.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('rooms.title')}</h1>
        <Button
          onClick={openCreate}
          className="bg-teal text-white hover:bg-teal/90"
        >
          <Plus className="h-4 w-4" />
          {t('rooms.addRoom')}
        </Button>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading ? (
          <>
            <RoomCardSkeleton />
            <RoomCardSkeleton />
            <RoomCardSkeleton />
          </>
        ) : rooms.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">
            {t('common.noData')}
          </p>
        ) : (
          rooms.map((room) => (
            <Card key={room.id} className="overflow-hidden">
              {/* Photo / Placeholder */}
              {room.photos?.[0] ? (
                <img
                  src={room.photos[0]}
                  alt={room.name_ka}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-muted">
                  <BedDouble className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}

              <CardContent className="space-y-3 pt-4">
                {/* Name + Type */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">
                    {room.name_ka}
                  </h3>
                  <Badge variant="secondary">
                    {t(`rooms.types.${room.room_type}`)}
                  </Badge>
                </div>

                {/* Info row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CurrencyDisplay amount={room.base_price_gel} />
                    {' / '}
                    {t('bookings.nights')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {room.max_guests}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    {t('rooms.floor')} {room.floor}
                  </span>
                </div>

                {/* Seasonal Rates Summary */}
                {room.seasonal_rates.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {room.seasonal_rates.length}{' '}
                      {t('rooms.seasonalRates').toLowerCase()}
                    </span>
                  </div>
                )}

                {/* Active toggle + Actions */}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={room.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          id: room.id,
                          is_active: checked,
                        })
                      }
                      size="sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      {room.is_active
                        ? t('common.status')
                        : t('common.status')}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(room)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(room)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Sheet — key forces re-mount when switching between create / edit */}
      <RoomFormSheet
        key={editingRoom?.id ?? 'new'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        room={editingRoom}
      />
    </div>
  );
}
