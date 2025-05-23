'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api from '@/lib/api';

interface AuthContextType {
  userEmail: string | null;
  isAuthorized: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'auth_data';

interface AuthData {
  userEmail: string;
  isAuthorized: boolean;
  timestamp: number;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Загрузка данных из localStorage при инициализации
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
          const authData: AuthData = JSON.parse(storedAuth);
          // Проверяем, что данные не старше 1 часа
          const isExpired = Date.now() - authData.timestamp > 60 * 60 * 1000;
          
          if (!isExpired) {
            setUserEmail(authData.userEmail);
            setIsAuthorized(authData.isAuthorized);
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Ошибка при чтении данных авторизации:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  // Сохранение данных в localStorage
  const saveAuthData = useCallback((email: string | null, authorized: boolean) => {
    if (typeof window !== 'undefined') {
      if (email && authorized) {
        const authData: AuthData = {
          userEmail: email,
          isAuthorized: authorized,
          timestamp: Date.now()
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  // Получение данных пользователя
  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/auth/get-me');
      setUserEmail(res.data.email);
      setIsAuthorized(true);
      saveAuthData(res.data.email, true);
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setIsAuthorized(false);
        setUserEmail(null);
        saveAuthData(null, false);
      } else {
        console.error("Ошибка при получении пользователя:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthData]);

  // Выход из системы - обновленный метод
  const logout = useCallback(async () => {
    try {
      // Вызываем эндпоинт логаута на бэкенде
      await api.post('/auth/logout');
      console.log('Успешный выход с сервера');
    } catch (error: any) {
      console.error('Ошибка при выходе:', error);
      // Продолжаем выход даже если сервер вернул ошибку
    } finally {
      // Очищаем локальное состояние в любом случае
      setUserEmail(null);
      setIsAuthorized(false);
      saveAuthData(null, false);
      
      // Дополнительная очистка localStorage
      localStorage.clear();
      
      // Перенаправляем на главную страницу
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [saveAuthData]);

  // Переполучение данных пользователя
  const refetchUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Первичная загрузка данных
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ 
      userEmail, 
      isAuthorized, 
      isLoading, 
      logout, 
      refetchUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
