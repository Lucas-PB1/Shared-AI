'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  saveAccount,
  saveAvatar,
  savePassword,
  type AccountActionState,
} from '@/features/auth/ui/account-form-actions';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
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

function Avatar({
  src,
  initials,
  size = 'md',
}: {
  src: string | null;
  initials: string;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-sm';
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} rounded-full border border-hd-border object-cover`}
      />
    );
  }
  return (
    <div
      className={`flex ${dim} items-center justify-center rounded-full bg-hd-secondary font-bold text-white`}
      aria-hidden
    >
      {initials || 'U'}
    </div>
  );
}

function DetailRow({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hd-border/70 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-hd-muted">
          {label}
        </p>
        <div className="mt-0.5 truncate text-sm font-medium text-hd-ink">
          {value}
        </div>
      </div>
      {action}
    </div>
  );
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

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
      setPhotoOpen(false);
    }
  }, [avatarState]);

  useEffect(() => {
    if (profileState.success) setProfileOpen(false);
  }, [profileState]);

  useEffect(() => {
    if (passwordState.success) setPasswordOpen(false);
  }, [passwordState]);

  const initials = initialsFrom(displayName, email);
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={avatarUrl} initials={initials} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-hd-ink">
                {displayName || 'Sem nome'}
              </h2>
              {isAdmin ? <Badge>Admin</Badge> : null}
            </div>
            <p className="truncate text-sm text-hd-muted">{email}</p>
            {memberSince ? (
              <p className="mt-1 text-xs text-hd-muted">Desde {memberSince}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <DetailRow
            label="Foto"
            value={avatarUrl ? 'Definida' : 'Usando iniciais'}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPhotoOpen(true)}
              >
                Alterar
              </Button>
            }
          />
          <DetailRow
            label="Nome de exibição"
            value={displayName || '—'}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setProfileOpen(true)}
              >
                Editar
              </Button>
            }
          />
          <DetailRow label="E-mail" value={email || '—'} />
          <DetailRow
            label="Senha"
            value="••••••••"
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPasswordOpen(true)}
              >
                Trocar
              </Button>
            }
          />
        </div>
      </Card>

      <Dialog
        open={photoOpen}
        onOpenChange={(open) => {
          setPhotoOpen(open);
          if (!open) {
            setPreview(null);
            if (fileRef.current) fileRef.current.value = '';
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>
              JPEG, PNG, WebP ou GIF · até 2 MB.
            </DialogDescription>
          </DialogHeader>
          <form action={avatarAction}>
            <DialogBody className="space-y-4">
              <div className="flex justify-center">
                <Avatar
                  src={preview || avatarUrl}
                  initials={initials}
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Arquivo</Label>
                <Input
                  ref={fileRef}
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={avatarPending || !preview}>
                {avatarPending ? 'Enviando…' : 'Salvar foto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Nome usado no dashboard e nos convites.
            </DialogDescription>
          </DialogHeader>
          <form action={profileAction}>
            <DialogBody className="space-y-4">
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
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={profilePending}>
                {profilePending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
            <DialogDescription>
              Use a nova senha no próximo login.
            </DialogDescription>
          </DialogHeader>
          <form action={passwordAction}>
            <DialogBody className="space-y-4">
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
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? 'Atualizando…' : 'Trocar senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
