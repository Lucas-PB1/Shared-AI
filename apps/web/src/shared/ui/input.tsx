import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export type InputProps = React.ComponentProps<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-hd-md border border-hd-border bg-hd-canvas px-3 py-2 text-sm text-hd-text-strong shadow-sm placeholder:text-hd-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
