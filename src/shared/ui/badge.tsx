import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export function Badge({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-hd-primary-soft px-2.5 py-0.5 text-xs font-semibold text-hd-primary-strong',
        className,
      )}
      {...props}
    />
  );
}
