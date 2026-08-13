'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { switchTarget } from '@/features/settings/actions';
import { cn } from '@/shared/lib/cn';

export function TargetToggle({
  target,
  disabled = false,
}: {
  target: 'local' | 'cloud';
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isCloud = target === 'cloud';

  function setTarget(next: 'local' | 'cloud') {
    if (disabled || pending || next === target) return;
    const formData = new FormData();
    formData.set('target', next);
    startTransition(async () => {
      const result = await switchTarget({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.success) toast.success(result.success);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-hd-border bg-hd-surface/80 p-1',
        (pending || disabled) && 'opacity-70',
      )}
      title="Ambiente Supabase"
    >
      <span
        className={cn(
          'hidden px-1.5 text-[11px] font-bold uppercase tracking-wide sm:inline',
          !isCloud ? 'text-hd-primary' : 'text-hd-muted',
        )}
      >
        Local
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isCloud}
        aria-label={isCloud ? 'Usar local' : 'Usar cloud'}
        disabled={disabled || pending}
        onClick={() => setTarget(isCloud ? 'local' : 'cloud')}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/40',
          isCloud ? 'bg-hd-secondary' : 'bg-hd-primary',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            isCloud && 'translate-x-5',
          )}
        />
      </button>
      <span
        className={cn(
          'hidden px-1.5 text-[11px] font-bold uppercase tracking-wide sm:inline',
          isCloud ? 'text-hd-secondary' : 'text-hd-muted',
        )}
      >
        Cloud
      </span>
    </div>
  );
}
