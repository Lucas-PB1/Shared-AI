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
  {
    href: '/settings',
    label: 'Config',
    match: (path: string) => path.startsWith('/settings'),
    adminOnly: true,
  },
] as const;

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm font-semibold sm:flex">
      {links.map((link) => {
        if ('adminOnly' in link && link.adminOnly && !isAdmin) return null;
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1.5 no-underline transition-colors',
              active
                ? 'bg-hd-primary-soft text-hd-primary'
                : 'text-hd-text-strong hover:bg-hd-primary-soft hover:text-hd-primary',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
