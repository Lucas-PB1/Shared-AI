import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export function Card({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-sa-2xl border border-sa-border bg-sa-canvas p-5 shadow-sa-md',
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
      className={cn('font-display text-lg font-semibold text-sa-ink', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p className={cn('mt-1 text-sm text-sa-muted', className)} {...props} />
  );
}
