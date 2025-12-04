'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Toaster } from '@/components/ui/toaster';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <title>Облако ИИИ</title>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 opacity-70 mix-blend-screen dark:mix-blend-lighten bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.2),transparent_30%),radial-gradient(circle_at_80%_10%,hsl(var(--accent)/0.25),transparent_25%),radial-gradient(circle_at_60%_90%,hsl(var(--primary)/0.18),transparent_32%)]" />
                <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/15 via-transparent to-transparent dark:from-primary/10" />
              </div>
              <Navigation />
              <main className="relative z-10 pb-10">
                <Suspense fallback={<div>Loading...</div>}>
                  {children}
                </Suspense>
              </main>
              <Toaster />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
