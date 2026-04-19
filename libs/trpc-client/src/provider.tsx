'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import superjson from 'superjson';
import { useState } from 'react';
import type { AppRouter } from '@lunchbox/trpc-server';

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getApiUrl()}/trpc`,
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'include' });
      },
    }),
  ],
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const { TRPCProvider: RawTRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export { useTRPC, useTRPCClient };

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => queryClient);
  return (
    <QueryClientProvider client={qc}>
      <RawTRPCProvider trpcClient={trpcClient} queryClient={qc}>
        {children}
      </RawTRPCProvider>
    </QueryClientProvider>
  );
}
