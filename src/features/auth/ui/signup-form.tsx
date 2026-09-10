'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signUp, type AuthActionState } from '@/features/auth/actions';
import { Button } from '@/shared/ui/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: AuthActionState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);

  return (
    <Card className="w-full max-w-md">
      <CardTitle>Criar conta</CardTitle>
      <CardDescription>
        Acesso imediato — confirmação de e-mail desligada.
      </CardDescription>

      <form action={action} className="mt-6 flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Nome</Label>
          <Input
            id="display_name"
            name="display_name"
            autoComplete="name"
            minLength={2}
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
        {state.error ? (
          <p className="text-sm text-sa-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-sa-muted">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
