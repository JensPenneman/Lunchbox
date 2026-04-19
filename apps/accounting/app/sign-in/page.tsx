'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signIn } from '@lunchbox/trpc-client';
import { AppShell, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@lunchbox/ui';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('accountant@lunchbox.test');
  const [password, setPassword] = useState('lunchbox');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? 'Sign in failed');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <AppShell brand={<Link href="/">📒 Lunchbox Accounting</Link>}>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Accountant sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <p className="rounded-md bg-stone-50 p-2 text-xs text-stone-500">
                Demo: <code>accountant@lunchbox.test</code> / <code>lunchbox</code>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
