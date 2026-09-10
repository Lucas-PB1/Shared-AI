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
        'flex flex-col items-start gap-3 rounded-sa-2xl border border-dashed border-sa-border bg-sa-canvas/70 px-6 py-8',
        className,
      )}
    >
      <div>
        <h3 className="font-display text-base font-semibold text-sa-ink">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-lg text-sm text-sa-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
