"use client";
import { BASE_URL } from '@/shared/constants';
import axios from 'axios';

let isUnauthorized = false; // Глобальный флаг
const publicRoutes = ['/login', '/register', '/', '/forgot-password'];
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export function resetUnauthorizedFlag() {
  isUnauthorized = false;
}

export default api;
