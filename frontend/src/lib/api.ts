"use client";
import axios from 'axios';
import { BASE_URL } from '@/shared/constants';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Важно для работы с куками
  headers: {
    'Content-Type': 'application/json',
  },
});

// Список незащищенных роутов, которые не требуют авторизации
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/forgot-password',
  '/reset-password',
  '/confirm-email',
];

// Функция для проверки, является ли роут публичным
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some(route => {
    // Точное совпадение для корневых роутов
    if (route === pathname) return true;
    
    // Проверка для вложенных роутов (например, /login/forgot-password)
    if (route !== '/' && pathname.startsWith(route + '/')) return true;
    
    return false;
  });
};

// Интерсептор для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Проверяем статус ошибки
    if (error.response?.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // Если мы находимся на публичном роуте, не перенаправляем
      if (isPublicRoute(currentPath)) {
        console.log('401 ошибка на публичном роуте:', currentPath);
        return Promise.reject(error);
      }
      
      // Очищаем локальное хранилище только для защищенных роутов
      if (typeof window !== 'undefined') {
        localStorage.clear();
        
        // Перенаправляем на страницу входа только с защищенных роутов
        console.log('401 ошибка на защищенном роуте, перенаправление на /login');
        window.location.href = '/';
      }
    }
    
    // Обработка других ошибок авторизации/доступа
    if (error.response?.status === 403) {
      console.log('403 ошибка: Доступ запрещен');
      // Можно добавить уведомление пользователю
    }
    
    return Promise.reject(error);
  }
);

// Интерсептор для добавления токена из localStorage (если нужно)
api.interceptors.request.use(
  (config) => {
    // Можно добавить токен из localStorage, если он используется
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
