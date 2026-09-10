import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export function Badge({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-sa-primary/15 bg-sa-primary-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sa-primary-strong',
        className,
      )}
      {...props}
    />
  );
}
