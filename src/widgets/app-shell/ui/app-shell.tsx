import Link from 'next/link';

import { signOut } from '@/features/auth/actions';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-hd-md bg-hd-primary text-sm font-bold text-white shadow-hd-accent',
        className,
      )}
      aria-hidden
    >
      H
    </span>
  );
}

export function AppShell({
  children,
  displayName,
  email,
  isAdmin = false,
  target = 'local',
}: {
  children: React.ReactNode;
  displayName?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  target?: 'local' | 'cloud';
}) {
  const label = displayName || email || 'Conta';
  const initials = (displayName || email || 'U')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-hd-border/80 bg-hd-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-hd items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 no-underline hover:opacity-90"
            >
              <BrandMark />
              <span className="font-display text-lg font-semibold tracking-tight text-hd-ink">
                HostDime <span className="text-hd-primary">Review</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-semibold sm:flex">
              <Link
                href="/"
                className="rounded-full px-3 py-1.5 text-hd-text-strong no-underline hover:bg-hd-primary-soft hover:text-hd-primary"
              >
                Projetos
              </Link>
              <Link
                href="/account"
                className="rounded-full px-3 py-1.5 text-hd-text-strong no-underline hover:bg-hd-primary-soft hover:text-hd-primary"
              >
                Conta
              </Link>
              {isAdmin ? (
                <Link
                  href="/settings"
                  className="rounded-full px-3 py-1.5 text-hd-text-strong no-underline hover:bg-hd-primary-soft hover:text-hd-primary"
                >
                  Config
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                target === 'cloud'
                  ? 'bg-hd-secondary text-white'
                  : 'bg-hd-primary-soft text-hd-primary-strong',
              )}
              title="Supabase target ativo"
            >
              {target}
            </span>
            <div className="hidden items-center gap-2 rounded-full border border-hd-border bg-hd-surface/80 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-hd-secondary text-[11px] font-bold text-white">
                {initials || 'U'}
              </span>
              <span className="max-w-40 truncate text-sm font-medium text-hd-text-strong">
                {label}
              </span>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="secondary" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-hd px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
