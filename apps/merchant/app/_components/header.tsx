'use client';

import Link from 'next/link';
import { useSession, signOut } from '@lunchbox/trpc-client';
import { Button } from '@lunchbox/ui';

export function HeaderActions() {
  const { data: session, isPending } = useSession();
  if (isPending) return <span className="text-sm text-stone-400">…</span>;
  if (!session?.user)
    return (
      <Link href="/sign-in">
        <Button size="sm">Sign in</Button>
      </Link>
    );
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-stone-600">{session.user.name ?? session.user.email}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}
      >
        Sign out
      </Button>
    </div>
  );
}
