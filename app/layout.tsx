import type { Metadata } from 'next';
import { Nunito, Nunito_Sans } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';

import './globals.css';

const hostdimeDisplay = Nunito({
  subsets: ['latin'],
  variable: '--font-hostdime-display',
  weight: ['300', '600', '700', '800'],
});

const hostdimeBody = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-hostdime-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'HostDime Review',
  description: 'Dashboard do review store HostDime',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${hostdimeDisplay.variable} ${hostdimeBody.variable}`}>
        <NuqsAdapter>
          {children}
          <Toaster richColors position="top-right" />
        </NuqsAdapter>
      </body>
    </html>
  );
}
