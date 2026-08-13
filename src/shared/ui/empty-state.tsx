import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export function EmptyState({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-hd-2xl border border-dashed border-hd-border bg-hd-canvas/70 px-6 py-8',
        className,
      )}
    >
      <div>
        <h3 className="font-display text-base font-semibold text-hd-ink">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-lg text-sm text-hd-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
