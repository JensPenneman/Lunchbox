'use client';

import { availableLocales, useI18n } from '@lunchbox/i18n';

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex rounded-md border border-stone-200 bg-white p-0.5 text-xs">
      {availableLocales.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code)}
          className={`rounded px-2 py-1 font-medium transition ${
            locale === l.code
              ? 'bg-amber-600 text-white'
              : 'text-stone-600 hover:text-stone-900'
          }`}
          aria-pressed={locale === l.code}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
