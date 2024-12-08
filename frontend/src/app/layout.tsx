"use client";

import './globals.css';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/get-me');
      setUserEmail(res.data.email);
    } catch (error) {
      setUserEmail(null);
    }
  };

  if (!userEmail) {
    fetchUser();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <nav className="p-4 border-b flex justify-between items-center">
            <div className="space-x-4">
              <Button variant="secondary">
                <a className="hover:underline" href="/">
                  Главная
                </a>
              </Button>
              <Button variant="secondary">
                <a className="hover:underline" href="/dashboard">
                  Файлы
                </a>
              </Button>
              <Button variant="secondary">
                <a className="hover:underline" href="/settings">
                  Параметры
                </a>
              </Button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-4">
              <Badge variant="secondary">
                {userEmail ? `${userEmail}` : 'Гость'}
              </Badge>
              <Button variant="secondary">
                <a className="hover:underline" href="/login">
                  Войти
                </a>
              </Button>
              <Button variant="secondary">
                <a className="hover:underline" href="/register">
                  Регистрация
                </a>
              </Button>
              <ThemeToggle />
            </div>
          </nav>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
