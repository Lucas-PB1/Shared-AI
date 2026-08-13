'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  saveAccount,
  type AccountActionState,
} from '@/features/auth/ui/account-form-actions';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: AccountActionState = {};

export function AccountForm({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string | null;
}) {
  const [state, action, pending] = useActionState(saveAccount, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
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
      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}
