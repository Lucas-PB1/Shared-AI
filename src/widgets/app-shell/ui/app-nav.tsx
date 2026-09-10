'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/cn';

const links = [
  {
    href: '/',
    label: 'Dashboard',
    match: (path: string) => path === '/',
  },
  {
    href: '/projects',
    label: 'Projetos',
    match: (path: string) => path.startsWith('/projects'),
  },
  {
    href: '/account',
    label: 'Conta',
    match: (path: string) => path.startsWith('/account'),
  },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm font-semibold sm:flex">
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1.5 no-underline transition-colors',
              active
                ? 'bg-sa-primary-soft text-sa-primary'
                : 'text-sa-text-strong hover:bg-sa-primary-soft hover:text-sa-primary',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
