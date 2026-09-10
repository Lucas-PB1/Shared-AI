import type { Metadata } from 'next';
import { Nunito, Nunito_Sans } from 'next/font/google';
import { Toaster } from 'sonner';

import './globals.css';

const brandDisplay = Nunito({
  subsets: ['latin'],
  variable: '--font-brand-display',
  weight: ['300', '600', '700', '800'],
});

const brandBody = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-brand-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Shared AI',
  description: 'Repositórios ligados neste computador',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${brandDisplay.variable} ${brandBody.variable}`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
