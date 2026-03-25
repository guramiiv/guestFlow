import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Check,
  ExternalLink,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  Phone,
} from 'lucide-react';
import { getShareInfo, getQrCodeUrl, trackShare } from '@/api/share';
import type { ShareInfo } from '@/types/share';

const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

type CaptionPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'viber';
type CaptionLang = 'ka' | 'en';

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for older browsers / Android webviews
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return { copied, copy };
}

const SHARE_PLATFORMS = [
  { key: 'facebook', color: '#1877F2', icon: 'FB' },
  { key: 'whatsapp', color: '#25D366', icon: 'WA' },
  { key: 'viber', color: '#7360F2', icon: 'V' },
  { key: 'telegram', color: '#0088CC', icon: <Send className="size-5" /> },
  { key: 'sms', color: '#6B7280', icon: <Phone className="size-5" /> },
  { key: 'email', color: '#0D2137', icon: <Mail className="size-5" /> },
] as const;

function getShareUrl(
  platform: string,
  data: ShareInfo,
  lang: CaptionLang
) {
  const url = encodeURIComponent(data.booking_url);
  const captions = data.social_captions;
  const fbCaption = lang === 'ka' ? captions.facebook_ka : captions.facebook_en;
  const waCaption = lang === 'ka' ? captions.whatsapp_ka : captions.whatsapp_en;
  const name = lang === 'ka' ? data.property_name_ka : data.property_name_en;

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(fbCaption)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(waCaption)}`;
    case 'viber':
      return `viber://forward?text=${encodeURIComponent(captions.viber_ka)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${url}&text=${encodeURIComponent(fbCaption)}`;
    case 'sms':
      return `sms:?body=${encodeURIComponent(captions.sms_ka)}`;
    case 'email':
      return `mailto:?subject=${encodeURIComponent(`${name} - Book Online`)}&body=${encodeURIComponent(`${fbCaption}\n\n${data.booking_url}`)}`;
    default:
      return '#';
  }
}

function getCaptionForPlatform(
  data: ShareInfo,
  platform: CaptionPlatform,
  lang: CaptionLang
): string {
  const captions = data.social_captions;
  const key = `${platform}_${lang}` as keyof typeof captions;
  if (key in captions) return captions[key];
  // Fallback for platforms without English variant
  const kaKey = `${platform}_ka` as keyof typeof captions;
  return captions[kaKey] ?? '';
}

export default function ShareModal({ open, onClose }: ShareModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'en' ? 'en' : 'ka';

  const { data, isLoading } = useQuery<ShareInfo>({
    queryKey: ['shareInfo'],
    queryFn: getShareInfo,
    enabled: open,
  });

  const linkCopy = useCopyFeedback();
  const captionCopy = useCopyFeedback();
  const [captionLang, setCaptionLang] = useState<CaptionLang>(currentLang as CaptionLang);
  const [captionPlatform, setCaptionPlatform] = useState<CaptionPlatform>('facebook');
  const [tipsOpen, setTipsOpen] = useState(false);

  const handleNativeShare = useCallback(async () => {
    if (!data) return;
    const name = currentLang === 'ka' ? data.property_name_ka : data.property_name_en;
    const caption = currentLang === 'ka'
      ? data.social_captions.facebook_ka
      : data.social_captions.facebook_en;
    try {
      await navigator.share({ title: name, text: caption, url: data.booking_url });
      trackShare('native_share');
      toast.success(`✓ ${t('share.shared')}`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error(t('share.shareError'));
    }
  }, [data, currentLang, t]);

  const handleCopyLink = useCallback(async () => {
    if (!data) return;
    try {
      await linkCopy.copy(data.booking_url);
      trackShare('copy_link');
      toast.success(`✓ ${t('share.copied')}`);
    } catch {
      toast.error(t('share.shareError'));
    }
  }, [data, linkCopy, t]);

  const handleCopyCaption = useCallback(async () => {
    if (!data) return;
    try {
      await captionCopy.copy(getCaptionForPlatform(data, captionPlatform, captionLang));
      toast.success(`✓ ${t('share.captionCopied')}`);
    } catch {
      toast.error(t('share.shareError'));
    }
  }, [data, captionCopy, captionPlatform, captionLang, t]);

  const slug = data?.booking_url.split('/').filter(Boolean).pop() || '';
  const qrUrl = getQrCodeUrl(slug || undefined);

  const handleDownloadQr = useCallback(async () => {
    if (!data) return;
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `guestflow-qr-${slug || 'property'}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    trackShare('qr_download');
  }, [data, qrUrl, slug]);

  const handlePrintQr = useCallback(() => {
    if (!data) return;
    const nameKa = data.property_name_ka || data.property_name_en;
    const nameEn = data.property_name_en || data.property_name_ka;
    const location = [data.city, data.region].filter(Boolean).join(', ');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="ka"><head><meta charset="UTF-8"><title>QR - ${nameKa}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'BPG Nino Mtavruli', 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
  .card { width: 100%; max-width: 420px; border: 3px dashed #117A65; border-radius: 20px; padding: 40px 32px; text-align: center; }
  .header { font-size: 13px; color: #117A65; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  .name-ka { font-size: 26px; font-weight: 700; color: #0D2137; margin-bottom: 4px; }
  .name-en { font-size: 16px; color: #666; margin-bottom: 4px; }
  .location { font-size: 14px; color: #999; margin-bottom: 28px; }
  .qr-wrap { display: inline-block; padding: 12px; border: 2px solid #eee; border-radius: 12px; margin-bottom: 20px; }
  .qr-wrap img { display: block; width: 280px; height: 280px; }
  .cta { font-size: 20px; font-weight: 700; color: #117A65; margin-bottom: 8px; }
  .url { font-size: 12px; color: #999; word-break: break-all; margin-bottom: 24px; }
  .footer { font-size: 11px; color: #bbb; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { background: none; } .card { border-color: #117A65; } }
</style></head>
<body>
  <div class="card">
    <div class="header">GuestFlow.ge</div>
    <div class="name-ka">${nameKa}</div>
    ${nameEn !== nameKa ? `<div class="name-en">${nameEn}</div>` : ''}
    ${location ? `<div class="location">📍 ${location}</div>` : ''}
    <div class="qr-wrap"><img src="${qrUrl}" alt="QR" /></div>
    <div class="cta">დაჯავშნეთ ონლაინ!</div>
    <div class="url">${data.booking_url}</div>
    <div class="footer">Scan QR code or visit the link above to book online<br/>QR კოდი დაასკანერეთ ან ეწვიეთ ბმულს ონლაინ დაჯავშნისთვის</div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print()},600)}</script>
</body></html>`);
    w.document.close();
    trackShare('qr_print');
  }, [data, qrUrl]);

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('share.title')}</DialogTitle>
          <DialogDescription>{t('share.subtitle')}</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-4 pb-6">
            {/* Native Share (mobile only) */}
            {canNativeShare && (
              <Button
                size="lg"
                className="w-full bg-[#117A65] hover:bg-[#117A65]/90 text-white text-base"
                onClick={handleNativeShare}
              >
                {t('share.nativeShare')}
              </Button>
            )}

            {/* SECTION 1 — Booking URL */}
            <section className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t('share.bookingPageUrl')}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0 rounded-lg border bg-muted/50 px-3 py-2 font-mono text-sm select-all truncate">
                  {data.booking_url}
                </div>
                <Button
                  variant={linkCopy.copied ? 'secondary' : 'outline'}
                  size="default"
                  onClick={handleCopyLink}
                  className={linkCopy.copied ? 'text-green-600' : ''}
                >
                  {linkCopy.copied ? (
                    <><Check className="size-4" /> {t('share.copied')}</>
                  ) : (
                    <><Copy className="size-4" /> {t('share.copyLink')}</>
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => window.open(data.booking_url, '_blank')}
              >
                <ExternalLink className="size-4" />
                {t('share.previewLink')}
              </Button>
            </section>

            {/* SECTION 2 — Quick share buttons */}
            <section className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t('share.shareOn')}
              </label>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {SHARE_PLATFORMS.map(({ key, color, icon }) => (
                  <a
                    key={key}
                    href={getShareUrl(key, data, currentLang as CaptionLang)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 shrink-0"
                    onClick={() => trackShare(key)}
                  >
                    <div
                      className="flex items-center justify-center size-12 rounded-full text-white text-sm font-bold transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      {typeof icon === 'string' ? icon : icon}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t(`share.${key}`)}
                    </span>
                  </a>
                ))}
              </div>
            </section>

            {/* SECTION 3 — Social media caption */}
            <section className="flex flex-col gap-3">
              <label className="text-sm font-medium text-muted-foreground">
                {t('share.socialCaption')}
              </label>

              {/* Language toggle */}
              <div className="flex gap-1">
                <Button
                  variant={captionLang === 'ka' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setCaptionLang('ka')}
                >
                  {t('share.georgian')}
                </Button>
                <Button
                  variant={captionLang === 'en' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setCaptionLang('en')}
                >
                  {t('share.english')}
                </Button>
              </div>

              {/* Platform tabs */}
              <div className="flex gap-1 flex-wrap">
                {(['facebook', 'instagram', 'whatsapp', 'viber'] as CaptionPlatform[]).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={captionPlatform === p ? 'secondary' : 'ghost'}
                      size="xs"
                      onClick={() => setCaptionPlatform(p)}
                    >
                      {t(`share.${p}`)}
                    </Button>
                  )
                )}
              </div>

              {/* Caption preview */}
              <textarea
                readOnly
                rows={4}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none"
                value={getCaptionForPlatform(data, captionPlatform, captionLang)}
              />

              <Button
                variant={captionCopy.copied ? 'secondary' : 'outline'}
                size="sm"
                className={captionCopy.copied ? 'text-green-600' : ''}
                onClick={handleCopyCaption}
              >
                {captionCopy.copied ? (
                  <><Check className="size-4" /> {t('share.captionCopied')}</>
                ) : (
                  <><Copy className="size-4" /> {t('share.copyCaption')}</>
                )}
              </Button>
            </section>

            {/* SECTION 4 — QR Code */}
            <section className="flex flex-col gap-3 items-center">
              <label className="text-sm font-medium text-muted-foreground self-start">
                {t('share.qrCode')}
              </label>
              <img
                src={qrUrl}
                alt="QR Code"
                className="size-[200px] rounded-lg border"
                crossOrigin="anonymous"
              />
              <p className="text-xs text-muted-foreground text-center">
                {t('share.qrDescription')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                  <Download className="size-4" />
                  {t('share.downloadQr')}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintQr}>
                  <Printer className="size-4" />
                  {t('share.printQr')}
                </Button>
              </div>
            </section>

            {/* SECTION 5 — Tips (collapsible) */}
            <section className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTipsOpen(!tipsOpen)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                💡 {t('share.tips')}
                {tipsOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {tipsOpen && (
                <ul className="flex flex-col gap-1.5 pl-6 text-sm text-muted-foreground list-disc">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <li key={n}>{t(`share.tip${n}`)}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
