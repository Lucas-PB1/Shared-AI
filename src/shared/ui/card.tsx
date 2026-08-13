import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export function Card({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-hd-2xl border border-hd-border bg-hd-canvas p-5 shadow-hd-md',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('font-display text-lg font-semibold text-hd-ink', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p className={cn('mt-1 text-sm text-hd-muted', className)} {...props} />
  );
}
