'use client';

import { useActionState } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import {
  claimProjectOwner,
  type ClaimActionState,
} from '@/features/claim-project/actions';
import { Button } from '@/shared/ui/button';

const initial: ClaimActionState = {};

export function ClaimProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [state, action, pending] = useActionState(claimProjectOwner, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        aria-label={`Reivindicar ${projectName}`}
      >
        {pending ? '…' : 'Reivindicar'}
      </Button>
    </form>
  );
}
