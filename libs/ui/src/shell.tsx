import * as React from 'react';
import { cn } from './cn';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  brand: React.ReactNode;
  nav?: React.ReactNode;
  actions?: React.ReactNode;
}

export function AppShell({ brand, nav, actions, className, children, ...props }: AppShellProps) {
  return (
    <div className={cn('min-h-screen bg-stone-50 text-stone-900', className)} {...props}>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">{brand}</div>
          {nav && <nav className="flex flex-1 items-center gap-4 text-sm">{nav}</nav>}
          {!nav && <div className="flex-1" />}
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
