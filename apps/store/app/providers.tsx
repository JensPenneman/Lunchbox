'use client';

import { TRPCProvider } from '@lunchbox/trpc-client';
import { I18nProvider } from '@lunchbox/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </I18nProvider>
  );
}
