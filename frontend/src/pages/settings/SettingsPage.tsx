import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  Clock,
  FileText,
  Pencil,
  Save,
  X,
  User as UserIcon,
  Share2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { getQrCodeUrl } from '@/api/share';

import { getProperty, updateProperty } from '@/api/property';
import { updateMe } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import type { Property } from '@/types';

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
import { Separator } from '@/components/ui/separator';

/* ── Schemas ─────────────────────────────────── */

const propertySchema = z.object({
  name_ka: z.string().min(1),
  name_en: z.string().optional(),
  property_type: z.string().min(1),
  description_ka: z.string().optional(),
  description_en: z.string().optional(),
  address_ka: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  house_rules_ka: z.string().optional(),
  house_rules_en: z.string().optional(),
  tax_id: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const profileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
  language: z.string().min(1),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/* ── Constants ───────────────────────────────── */

const PROPERTY_TYPES = ['guesthouse', 'hotel', 'apartment', 'villa'] as const;

const REGIONS = [
  'tbilisi', 'kakheti', 'imereti', 'adjara', 'svaneti',
  'mtskheta_mtianeti', 'guria', 'samegrelo', 'racha',
  'kvemo_kartli', 'shida_kartli', 'samtskhe_javakheti',
] as const;

const LANGUAGES = [
  { code: 'ka', label: 'ქართული' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
] as const;

/* ── Skeleton ────────────────────────────────── */

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-1.5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── InfoRow helper ──────────────────────────── */

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────── */

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user, fetchUser } = useAuthStore();
  const { openShareModal } = useOutletContext<{ openShareModal: () => void }>();

  const [editingProperty, setEditingProperty] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const copyBookingUrl = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }, []);

  /* ── Property query ── */
  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ['property'],
    queryFn: getProperty,
  });

  /* ── Property form ── */
  const {
    register: regProp,
    handleSubmit: handlePropSubmit,
    reset: resetProp,
    setValue: setPropValue,
    watch: watchProp,
    formState: { isSubmitting: propSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    values: property
      ? {
          name_ka: property.name_ka,
          name_en: property.name_en ?? '',
          property_type: property.property_type ?? 'guesthouse',
          description_ka: property.description_ka ?? '',
          description_en: property.description_en ?? '',
          address_ka: property.address_ka ?? '',
          city: property.city ?? '',
          region: property.region ?? 'tbilisi',
          phone: property.phone ?? '',
          whatsapp: property.whatsapp ?? '',
          email: property.email ?? '',
          check_in_time: property.check_in_time ?? '14:00',
          check_out_time: property.check_out_time ?? '12:00',
          house_rules_ka: property.house_rules_ka ?? '',
          house_rules_en: property.house_rules_en ?? '',
          tax_id: property.tax_id ?? '',
        }
      : {
          name_ka: '',
          name_en: '',
          property_type: 'guesthouse',
          description_ka: '',
          description_en: '',
          address_ka: '',
          city: '',
          region: 'tbilisi',
          phone: '',
          whatsapp: '',
          email: '',
          check_in_time: '14:00',
          check_out_time: '12:00',
          house_rules_ka: '',
          house_rules_en: '',
          tax_id: '',
        },
  });

  const propertyMutation = useMutation({
    mutationFn: (data: PropertyFormData) => updateProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property'] });
      setEditingProperty(false);
      toast.success(t('settings.propertySaved'));
    },
    onError: () => toast.error(t('common.error')),
  });

  /* ── Profile form ── */
  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    formState: { isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone ?? '',
          language: user.language,
        }
      : undefined,
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const updated = await updateMe(data);
      // Sync app language with user preference
      if (data.language !== i18n.language) {
        i18n.changeLanguage(data.language);
      }
      return updated;
    },
    onSuccess: () => {
      fetchUser();
      setEditingProfile(false);
      toast.success(t('settings.profileSaved'));
    },
    onError: () => toast.error(t('common.error')),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-semibold">{t('nav.settings')}</h1>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{t('nav.settings')}</h1>

      {/* ═══ Booking Page Card ═══ */}
      {property?.slug && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              {t('settings.bookingPage')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('settings.bookingPageUrl')}</p>
              <a
                href={`${window.location.origin}/book/${property.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#117A65] underline underline-offset-2 break-all"
              >
                {`${window.location.origin}/book/${property.slug}`}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={urlCopied ? 'secondary' : 'outline'}
                className={urlCopied ? 'text-green-600' : ''}
                onClick={() => copyBookingUrl(`${window.location.origin}/book/${property.slug}`)}
              >
                {urlCopied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {urlCopied ? t('share.copied') : t('share.copyLink')}
              </Button>
              <Button size="sm" variant="outline" onClick={openShareModal}>
                <Share2 className="mr-1 h-4 w-4" />
                {t('nav.share')}
              </Button>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <img
                src={getQrCodeUrl()}
                alt="QR Code"
                className="size-[100px] rounded-lg border"
                crossOrigin="anonymous"
              />
              <p className="text-xs text-muted-foreground max-w-[200px]">
                {t('share.qrDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Profile Card ═══ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {t('settings.profile')}
          </CardTitle>
          {!editingProfile && (
            <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProfile ? (
            <form
              onSubmit={handleProfileSubmit((d) => profileMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('auth.firstName')}</Label>
                  <Input {...regProfile('first_name')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('auth.lastName')}</Label>
                  <Input {...regProfile('last_name')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('auth.phone')}</Label>
                <Input {...regProfile('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('settings.language')}</Label>
                <Select
                  value={user?.language}
                  onValueChange={(v) => setProfileValue('language', String(v ?? ''))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lng) => (
                      <SelectItem key={lng.code} value={lng.code}>
                        {lng.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button type="submit" disabled={profileSubmitting}>
                  <Save className="mr-1 h-4 w-4" />
                  {t('common.save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProfile(false)}
                >
                  <X className="mr-1 h-4 w-4" />
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-1">
              <InfoRow icon={UserIcon} label={t('settings.name')} value={user ? `${user.first_name} ${user.last_name}` : ''} />
              <InfoRow icon={Mail} label={t('auth.email')} value={user?.email} />
              <InfoRow icon={Phone} label={t('auth.phone')} value={user?.phone} />
              <InfoRow
                icon={Globe}
                label={t('settings.language')}
                value={LANGUAGES.find((l) => l.code === user?.language)?.label}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Property Card ═══ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('settings.propertyInfo')}
          </CardTitle>
          {!editingProperty && (
            <Button size="sm" variant="outline" onClick={() => setEditingProperty(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProperty ? (
            <form
              onSubmit={handlePropSubmit((d) => propertyMutation.mutate(d))}
              className="space-y-4"
            >
              {/* Names */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('property.propertyName')} (KA)</Label>
                  <Input {...regProp('name_ka')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('property.propertyName')} (EN)</Label>
                  <Input {...regProp('name_en')} />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>{t('settings.propertyType')}</Label>
                <Select
                  value={watchProp('property_type') || 'guesthouse'}
                  onValueChange={(v) => setPropValue('property_type', String(v ?? ''))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {t(`settings.propertyTypes.${pt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('property.description')} (KA)</Label>
                  <textarea
                    {...regProp('description_ka')}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('property.description')} (EN)</Label>
                  <textarea
                    {...regProp('description_en')}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label>{t('property.address')} (KA)</Label>
                <Input {...regProp('address_ka')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('settings.city')}</Label>
                  <Input {...regProp('city')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('property.region')}</Label>
                  <Select
                    value={watchProp('region') || 'tbilisi'}
                    onValueChange={(v) => setPropValue('region', String(v ?? ''))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`regions.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('property.phone')}</Label>
                  <Input {...regProp('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('property.whatsapp')}</Label>
                  <Input {...regProp('whatsapp')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('auth.email')}</Label>
                <Input type="email" {...regProp('email')} />
              </div>

              {/* Times */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('property.checkInTime')}</Label>
                  <Input type="time" {...regProp('check_in_time')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('property.checkOutTime')}</Label>
                  <Input type="time" {...regProp('check_out_time')} />
                </div>
              </div>

              {/* House Rules */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('property.houseRules')} (KA)</Label>
                  <textarea
                    {...regProp('house_rules_ka')}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('property.houseRules')} (EN)</Label>
                  <textarea
                    {...regProp('house_rules_en')}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Tax ID */}
              <div className="space-y-1.5">
                <Label>{t('property.taxId')}</Label>
                <Input {...regProp('tax_id')} />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button type="submit" disabled={propSubmitting}>
                  <Save className="mr-1 h-4 w-4" />
                  {t('common.save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetProp();
                    setEditingProperty(false);
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-1">
              <InfoRow icon={Building2} label={t('property.propertyName')} value={property?.name_ka} />
              {property?.name_en && (
                <InfoRow icon={Building2} label={t('property.propertyName') + ' (EN)'} value={property.name_en} />
              )}
              <InfoRow
                icon={FileText}
                label={t('settings.propertyType')}
                value={property?.property_type ? t(`settings.propertyTypes.${property.property_type}`) : undefined}
              />
              <InfoRow icon={MapPin} label={t('property.address')} value={property?.address_ka} />
              <InfoRow
                icon={MapPin}
                label={t('property.region')}
                value={property?.region ? t(`regions.${property.region}`) : undefined}
              />
              <InfoRow icon={Phone} label={t('property.phone')} value={property?.phone} />
              <InfoRow icon={Phone} label={t('property.whatsapp')} value={property?.whatsapp} />
              <InfoRow icon={Mail} label={t('auth.email')} value={property?.email} />
              <InfoRow icon={Clock} label={t('property.checkInTime')} value={property?.check_in_time} />
              <InfoRow icon={Clock} label={t('property.checkOutTime')} value={property?.check_out_time} />
              <InfoRow icon={FileText} label={t('property.taxId')} value={property?.tax_id} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
