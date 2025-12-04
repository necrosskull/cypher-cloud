'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogOut, 
  User, 
  Loader2, 
  Home,
  Files,
  Settings,
  UserPlus,
  LogIn,
  CloudUpload,
  Sparkles
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export const Navigation = () => {
  const { userEmail, isAuthorized, isLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActivePath = (path: string) => pathname === path;

  const links = useMemo(
    () =>
      isAuthorized
        ? [
            { label: 'Файлы', icon: Files, path: '/dashboard' },
            { label: 'Настройки', icon: Settings, path: '/settings' },
          ]
        : [{ label: 'Главная', icon: Home, path: '/' }],
    [isAuthorized]
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary via-primary/85 to-emerald-500 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">облако иии</p>
            </div>
          </div>

          {!isLoading && (
            <div className="hidden md:flex items-center gap-1 rounded-full bg-secondary/60 px-1.5 py-1">
              {links.map(({ label, icon: Icon, path }) => (
                <Button
                  key={path}
                  variant={isActivePath(path) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleNavigation(path)}
                  className={cn(
                    'rounded-full px-3',
                    isActivePath(path)
                      ? 'shadow-sm shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex space-x-2">
              <div className="h-8 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && (
            <Badge variant="outline" className="hidden sm:inline-flex items-center gap-2 px-3 py-1">
              <User className="h-3 w-3" />
              <span className="text-sm font-medium">
                {isAuthorized ? userEmail?.split('@')[0] || 'Пользователь' : 'Гость'}
              </span>
            </Badge>
          )}

          {isLoading && <div className="h-7 w-24 bg-muted rounded-full animate-pulse" />}

          {!isLoading && (
            <div className="flex items-center space-x-2">
              {isAuthorized ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center space-x-2 rounded-full border-border/70"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span className="hidden sm:block">
                    {isLoggingOut ? 'Выход...' : 'Выйти'}
                  </span>
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleNavigation('/login')}
                    className="flex items-center space-x-2 rounded-full"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:block">Войти</span>
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleNavigation('/register')}
                    className="flex items-center space-x-2 rounded-full shadow-primary/30 shadow-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:block">Регистрация</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex space-x-2">
              <div className="h-8 w-16 bg-muted rounded-md animate-pulse"></div>
              <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
