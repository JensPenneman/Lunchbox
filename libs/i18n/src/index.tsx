'use client';

import * as React from 'react';
import { en } from './messages/en';
import { nl } from './messages/nl';
import { fr } from './messages/fr';

export type Locale = 'nl' | 'fr' | 'en';
export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = { nl, fr, en };

export const availableLocales: { code: Locale; label: string }[] = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

const LOCALE_STORAGE_KEY = 'lunchbox-locale';
const DEFAULT_LOCALE: Locale = 'nl';

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const raw = navigator.language.slice(0, 2).toLowerCase();
  if (raw === 'nl' || raw === 'fr' || raw === 'en') return raw;
  return DEFAULT_LOCALE;
}

interface I18nContextValue {
  locale: Locale;
  t: Messages;
  setLocale: (l: Locale) => void;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    if (stored === 'nl' || stored === 'fr' || stored === 'en') {
      setLocaleState(stored);
    } else {
      setLocaleState(detectBrowserLocale());
    }
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
      document.documentElement.setAttribute('lang', l);
    }
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, t: dictionaries[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export function useT(): Messages {
  return useI18n().t;
}
