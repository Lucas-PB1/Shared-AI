import Link from 'next/link';

import { signOut } from '@/features/auth/actions';
import { Button } from '@/shared/ui/button';

export function AppShell({
  children,
  displayName,
  email,
}: {
  children: React.ReactNode;
  displayName?: string | null;
  email?: string | null;
}) {
  const label = displayName || email || 'Conta';

  return (
    <div className="min-h-screen">
      <header className="border-b border-hd-border bg-hd-canvas">
        <div className="mx-auto flex max-w-hd items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-display text-lg font-semibold text-hd-ink no-underline hover:text-hd-primary"
            >
              HostDime <span className="text-hd-primary">Review</span>
            </Link>
            <nav className="hidden gap-4 text-sm font-medium sm:flex">
              <Link href="/" className="text-hd-text-strong no-underline hover:text-hd-primary">
                Projetos
              </Link>
              <Link
                href="/account"
                className="text-hd-text-strong no-underline hover:text-hd-primary"
              >
                Conta
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-hd-muted sm:inline">{label}</span>
            <form action={signOut}>
              <Button type="submit" variant="secondary" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-hd px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
