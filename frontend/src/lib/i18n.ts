import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ka from '../locales/ka.json';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const STORAGE_KEY = 'guestflow_lang';
const SUPPORTED = ['ka', 'en', 'ru'] as const;

function detectLanguage(): string {
  // 1. Saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (SUPPORTED as readonly string[]).includes(saved)) return saved;

  // 2. Browser language
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && (SUPPORTED as readonly string[]).includes(browserLang)) return browserLang;

  // 3. Fallback
  return 'ka';
}

i18n.use(initReactI18next).init({
  resources: {
    ka: { translation: ka },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
