import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enUS } from './locales/en-US';
import { esES } from './locales/es-ES';
import { ptBR } from './locales/pt-BR';

export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES';

export const LANGUAGE_STORAGE_KEY = 'pm_language';
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  'pt-BR',
  'en-US',
  'es-ES',
];

function isSupportedLanguage(val: string | null | undefined): val is SupportedLanguage {
  return val === 'pt-BR' || val === 'en-US' || val === 'es-ES';
}

function readInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors in private mode
  }
  return 'pt-BR';
}

function syncHtmlLang(lang: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

const initialLanguage = readInitialLanguage();
syncHtmlLang(initialLanguage);

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
      'es-ES': { translation: esES },
    },
    lng: initialLanguage,
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
  });
}

i18n.on('languageChanged', (lng) => {
  syncHtmlLang(lng);
  if (isSupportedLanguage(lng)) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      // Ignore storage access errors
    }
  }
});

export function setAppLanguage(lang: SupportedLanguage): void {
  if (!isSupportedLanguage(lang)) return;
  void i18n.changeLanguage(lang);
}

export function getActiveLocale(): SupportedLanguage {
  const current = i18n.language;
  return isSupportedLanguage(current) ? current : 'pt-BR';
}

export default i18n;
