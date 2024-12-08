// components/ThemeToggle.tsx
"use client";

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from './button';
import { FaSun, FaMoon } from 'react-icons/fa'; // Иконки луны и солнца

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <Button
      variant="secondary"
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
    >
      {currentTheme === 'dark' ? <FaSun /> : <FaMoon />}
    </Button>
  );
}
