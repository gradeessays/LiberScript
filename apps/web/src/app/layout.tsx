import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TRPCProvider } from '@/lib/trpc/Provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Liberscript',
  description: 'Write, analyze, format, and export your book — all under one roof.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
