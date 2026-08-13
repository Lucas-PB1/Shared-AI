'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  saveAccount,
  saveAvatar,
  savePassword,
  type AccountActionState,
} from '@/features/auth/ui/account-form-actions';
import { Button } from '@/shared/ui/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: AccountActionState = {};

function initialsFrom(displayName: string | null, email: string | null) {
  return (displayName || email || 'U')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AccountForm({
  displayName,
  email,
  avatarUrl,
  isAdmin,
  createdAt,
}: {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin?: boolean;
  createdAt?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [profileState, profileAction, profilePending] = useActionState(
    saveAccount,
    initial,
  );
  const [avatarState, avatarAction, avatarPending] = useActionState(
    saveAvatar,
    initial,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    savePassword,
    initial,
  );

  useEffect(() => {
    for (const state of [profileState, avatarState, passwordState]) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
  }, [profileState, avatarState, passwordState]);

  useEffect(() => {
    if (avatarState.success) {
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [avatarState]);

  const shownAvatar = preview || avatarUrl;
  const initials = initialsFrom(displayName, email);
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card className="space-y-5">
        <div>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>
            JPEG, PNG, WebP ou GIF · até 2 MB. Aparece no header e nesta página.
          </CardDescription>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            {shownAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownAvatar}
                alt=""
                className="h-28 w-28 rounded-full border-2 border-hd-border object-cover shadow-hd-md"
              />
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-full bg-hd-secondary text-2xl font-bold text-white shadow-hd-md"
                aria-hidden
              >
                {initials || 'U'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <div>
              <p className="font-display text-xl font-semibold text-hd-ink">
                {displayName || 'Sem nome'}
              </p>
              <p className="text-sm text-hd-muted">{email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                {isAdmin ? (
                  <span className="rounded-full bg-hd-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-hd-primary-strong">
                    Admin
                  </span>
                ) : null}
                {memberSince ? (
                  <span className="rounded-full border border-hd-border px-2.5 py-1 text-[11px] font-semibold text-hd-muted">
                    Desde {memberSince}
                  </span>
                ) : null}
              </div>
            </div>
            <form action={avatarAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="avatar">Escolher imagem</Label>
                <Input
                  ref={fileRef}
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setPreview(null);
                      return;
                    }
                    setPreview(URL.createObjectURL(file));
                  }}
                />
              </div>
              <Button type="submit" disabled={avatarPending || !preview}>
                {avatarPending ? 'Enviando…' : 'Salvar foto'}
              </Button>
            </form>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardTitle>Dados da conta</CardTitle>
          <CardDescription>
            Nome usado no dashboard, convites e comentários de membership.
          </CardDescription>
          <form action={profileAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={email ?? ''} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de exibição</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={displayName ?? ''}
                minLength={2}
                required
              />
            </div>
            <Button type="submit" disabled={profilePending}>
              {profilePending ? 'Salvando…' : 'Salvar perfil'}
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Senha</CardTitle>
          <CardDescription>
            Troque a senha desta conta. Depois do save, use a nova senha no
            próximo login.
          </CardDescription>
          <form action={passwordAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Senha atual</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova senha</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar nova senha</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={passwordPending}>
              {passwordPending ? 'Atualizando…' : 'Trocar senha'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
