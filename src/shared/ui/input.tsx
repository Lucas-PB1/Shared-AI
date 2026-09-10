import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-sa-md border border-sa-border bg-sa-canvas px-3.5 py-2 text-sm text-sa-text-strong shadow-sm transition-colors placeholder:text-sa-muted focus-visible:border-sa-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sa-primary/25 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
