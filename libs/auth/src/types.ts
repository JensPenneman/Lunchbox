import type { auth } from './server';

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
