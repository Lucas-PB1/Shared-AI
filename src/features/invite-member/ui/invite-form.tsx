'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  inviteMember,
  type InviteActionState,
} from '@/features/invite-member/actions';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: InviteActionState = {};

export function InviteMemberForm({
  projectId,
  projectSlug,
}: {
  projectId: string;
  projectSlug: string;
}) {
  const [state, action, pending] = useActionState(inviteMember, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="email">Convidar por e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="usuario@hostdime.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          defaultValue="member"
          className="flex h-10 rounded-hd-md border border-hd-border bg-hd-canvas px-3 text-sm"
        >
          <option value="member">member</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Convidando…' : 'Convidar'}
      </Button>
    </form>
  );
}
