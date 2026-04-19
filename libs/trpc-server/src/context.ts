import { auth } from '@lunchbox/auth';
import { prisma } from '@lunchbox/db';
import type { IncomingHttpHeaders } from 'node:http';

export interface ContextOptions {
  headers: Headers | IncomingHttpHeaders;
}

function toWebHeaders(input: Headers | IncomingHttpHeaders): Headers {
  if (input instanceof Headers) return input;
  const h = new Headers();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) h.append(key, v);
    } else {
      h.set(key, String(value));
    }
  }
  return h;
}

export async function createContext(opts: ContextOptions) {
  const headers = toWebHeaders(opts.headers);
  const authSession = await auth.api.getSession({ headers });
  return {
    db: prisma,
    user: authSession?.user ?? null,
    session: authSession?.session ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
