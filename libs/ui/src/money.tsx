import * as React from 'react';

export function Money({ cents, locale = 'nl-BE' }: { cents: number; locale?: string }) {
  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100)}
    </span>
  );
}
