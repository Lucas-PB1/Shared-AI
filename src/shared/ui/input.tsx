import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-hd-md border border-hd-border bg-hd-canvas px-3.5 py-2 text-sm text-hd-text-strong shadow-sm transition-colors placeholder:text-hd-muted focus-visible:border-hd-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/25 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
