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
        'flex flex-col items-start gap-3 rounded-hd-xl border border-dashed border-hd-border bg-hd-canvas p-6',
        className,
      )}
    >
      <div>
        <h3 className="text-base font-semibold text-hd-ink">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-hd-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
