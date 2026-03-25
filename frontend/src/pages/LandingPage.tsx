import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarCheck,
  BarChart3,
  Globe,
  QrCode,
  Users,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Star,
  Smartphone,
  Share2,
  ShieldCheck,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'ka', label: 'KA' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
] as const;

export default function LandingPage() {
  const { t, i18n } = useTranslation();

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: '"BPG Nino Mtavruli", "DejaVu Sans", "Segoe UI", sans-serif' }}
    >
      {/* ══════ HEADER ══════ */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold" style={{ color: '#0D2137' }}>
            GuestFlow<span style={{ color: '#117A65' }}>.ge</span>
          </Link>

          <div className="flex items-center gap-3">
            <nav aria-label="Language" className="flex items-center gap-1">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => i18n.changeLanguage(code)}
                  aria-label={`Switch to ${code === 'ka' ? 'Georgian' : code === 'en' ? 'English' : 'Russian'}`}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                  style={
                    i18n.language === code
                      ? { backgroundColor: '#117A65', color: '#fff' }
                      : { backgroundColor: '#F0F0F0', color: '#2C3E50' }
                  }
                >
                  {label}
                </button>
              ))}
            </nav>

            <Link
              to="/login"
              className="text-sm font-medium hover:underline"
              style={{ color: '#117A65' }}
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/register"
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#117A65' }}
            >
              {t('landing.getStartedFree')}
            </Link>
          </div>
        </div>
      </header>

      {/* ══════ HERO ══════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D2137 0%, #117A65 100%)' }}
      >
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:py-28 md:py-36">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
              {t('landing.heroTitle')}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-white/80 sm:text-xl">
              {t('landing.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#F39C12' }}
              >
                {t('landing.getStartedFree')}
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/book/guramis-hotel"
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-7 py-3.5 text-base font-medium text-white transition-colors hover:border-white/60"
              >
                {t('landing.seeDemo')}
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('landing.freeForever')}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('landing.noCard')}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('landing.setupMinutes')}
              </span>
            </div>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full">
            <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:py-24" id="features">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: '#0D2137' }}>
            {t('landing.featuresTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base" style={{ color: '#666' }}>
            {t('landing.featuresSubtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Globe, key: 'bookingPage' },
            { icon: CalendarCheck, key: 'calendar' },
            { icon: Users, key: 'guestManagement' },
            { icon: CreditCard, key: 'payments' },
            { icon: BarChart3, key: 'reports' },
            { icon: QrCode, key: 'qrShare' },
          ].map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="rounded-xl border p-6 transition-shadow hover:shadow-md"
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ backgroundColor: '#E8F5F1' }}
              >
                <Icon size={24} style={{ color: '#117A65' }} />
              </div>
              <h3 className="text-base font-bold" style={{ color: '#0D2137' }}>
                {t(`landing.features.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: '#666' }}>
                {t(`landing.features.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section style={{ backgroundColor: '#F8F9FA' }} className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: '#0D2137' }}>
              {t('landing.howItWorksTitle')}
            </h2>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: 1, icon: Smartphone, key: 'register' },
              { step: 2, icon: Share2, key: 'share' },
              { step: 3, icon: CalendarCheck, key: 'manage' },
            ].map(({ step, icon: Icon, key }) => (
              <div key={key} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
                  <span className="text-2xl font-bold" style={{ color: '#117A65' }}>
                    {step}
                  </span>
                </div>
                <Icon size={32} className="mx-auto mb-3" style={{ color: '#117A65' }} />
                <h3 className="text-base font-bold" style={{ color: '#0D2137' }}>
                  {t(`landing.steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm" style={{ color: '#666' }}>
                  {t(`landing.steps.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ WHY GUESTFLOW ══════ */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:py-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: '#0D2137' }}>
            {t('landing.whyTitle')}
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            { icon: Star, key: 'georgian' },
            { icon: Globe, key: 'multilang' },
            { icon: ShieldCheck, key: 'free' },
            { icon: Smartphone, key: 'mobile' },
          ].map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-start gap-4 rounded-xl border p-5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: '#E8F5F1' }}
              >
                <Icon size={20} style={{ color: '#117A65' }} />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: '#0D2137' }}>
                  {t(`landing.why.${key}.title`)}
                </h3>
                <p className="mt-1 text-sm" style={{ color: '#666' }}>
                  {t(`landing.why.${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section
        className="py-16 sm:py-24"
        style={{ background: 'linear-gradient(135deg, #0D2137 0%, #117A65 100%)' }}
      >
        <div className="mx-auto max-w-[700px] px-4 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {t('landing.ctaTitle')}
          </h2>
          <p className="mt-4 text-base text-white/80">
            {t('landing.ctaSubtitle')}
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F39C12' }}
          >
            {t('landing.getStartedFree')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-4 py-8 text-sm sm:flex-row sm:justify-between" style={{ color: '#666' }}>
          <div className="font-medium" style={{ color: '#0D2137' }}>
            GuestFlow<span style={{ color: '#117A65' }}>.ge</span>
            <span className="ml-2 font-normal" style={{ color: '#888' }}>
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:underline">{t('auth.login')}</Link>
            <Link to="/register" className="hover:underline">{t('auth.register')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
