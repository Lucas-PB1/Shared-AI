'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';

import { signIn, type AuthActionState } from '@/features/auth/actions';
import { Button } from '@/shared/ui/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <Card className="w-full max-w-md">
      <CardTitle>Entrar</CardTitle>
      <CardDescription>
        Review store HostDime — e-mail e senha, sem confirmação.
      </CardDescription>

      <form action={action} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
          />
        </div>
        {state.error ? (
          <p className="text-sm text-hd-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-hd-muted">
        Não tem conta?{' '}
        <Link href="/signup" className="font-semibold">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}
