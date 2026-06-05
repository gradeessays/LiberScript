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
      <head>
        <script
          // Set the theme class before paint to avoid a flash of the wrong theme.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
