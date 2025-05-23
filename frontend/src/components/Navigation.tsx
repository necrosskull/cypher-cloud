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
  CloudUpload
} from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Левая часть - навигация */}
        <div className="flex items-center space-x-1">
          {/* Логотип/Название */}
          <div className="flex items-center space-x-2 mr-6">
            <div className="p-2 bg-primary rounded-lg">
              <CloudUpload className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">
              Облако ИИИ
            </span>
          </div>

          {/* Навигационные кнопки */}
          {!isLoading && (
            <>
              {/* Кнопка "Главная" только для неавторизованных */}
              {!isAuthorized && (
                <Button 
                  variant={isActivePath('/') ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleNavigation('/')}
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:block">Главная</span>
                </Button>
              )}

              {/* Кнопки для авторизованных */}
              {isAuthorized && (
                <>
                  <Button 
                    variant={isActivePath('/dashboard') ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleNavigation('/dashboard')}
                    className="flex items-center space-x-2"
                  >
                    <Files className="h-4 w-4" />
                    <span className="hidden sm:block">Файлы</span>
                  </Button>
                  
                  <Button 
                    variant={isActivePath('/settings') ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleNavigation('/settings')}
                    className="flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:block">Настройки</span>
                  </Button>
                </>
              )}
            </>
          )}
          
          {/* Скелетон загрузки */}
          {isLoading && (
            <div className="flex space-x-2">
              <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div>
              <div className="h-8 w-24 bg-muted rounded-md animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Правая часть - пользователь и действия */}
        <div className="flex items-center space-x-3">
          {/* Информация о пользователе */}
          {!isLoading && (
            <div className="flex items-center space-x-3">
              {isAuthorized ? (
                <Badge variant="outline" className="flex items-center space-x-2 px-3 py-1">
                  <User className="h-3 w-3" />
                  <span className="text-sm font-medium">
                    {userEmail?.split('@')[0] || 'Пользователь'}
                  </span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center space-x-2 px-3 py-1">
                  <User className="h-3 w-3" />
                  <span className="text-sm">Гость</span>
                </Badge>
              )}
            </div>
          )}

          {isLoading && (
            <div className="h-7 w-24 bg-muted rounded-full animate-pulse"></div>
          )}

          {/* Кнопки действий */}
          {!isLoading && (
            <div className="flex items-center space-x-2">
              {isAuthorized ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center space-x-2"
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
                    className="flex items-center space-x-2"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:block">Войти</span>
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleNavigation('/register')}
                    className="flex items-center space-x-2"
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

          {/* Переключатель темы */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
