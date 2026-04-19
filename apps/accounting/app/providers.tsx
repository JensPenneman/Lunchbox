'use client';
import { TRPCProvider } from '@lunchbox/trpc-client';
export function Providers({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
