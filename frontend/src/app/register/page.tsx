"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, UserPlus, RefreshCw, Mail, CheckCircle, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const router = useRouter();

  function generateStrongPassword() {
    const length = 12;
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    setPassword(password);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setMessage("Почта и пароль обязательны для заполнения.");
      setMessageType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMessage("Введите корректный email адрес.");
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage("Пароль должен содержать минимум 8 символов.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await api.post("/auth/register", { 
        email: email.trim(), 
        password 
      });
      
      setMessage("Регистрация успешна! Проверьте почту для подтверждения аккаунта.");
      setMessageType("success");
      setIsRegistered(true);
    } catch (error: any) {
      console.error("Ошибка регистрации:", error);
      
      if (error.response?.status === 400) {
        setMessage("Пользователь с такой почтой уже существует.");
      } else if (error.response?.status === 422) {
        setMessage("Проверьте правильность введенных данных.");
      } else {
        setMessage(error.response?.data?.detail || "Ошибка регистрации");
      }
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  if (isRegistered) {
    return (
      <div className="flex justify-center pt-12 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Проверьте почту</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Мы отправили письмо с подтверждением на адрес:
              </p>
              <p className="font-semibold">{email}</p>
              <p className="text-sm text-muted-foreground">
                Перейдите по ссылке в письме для активации аккаунта
              </p>
              
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Перейти к входу
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center pt-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <UserPlus className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Регистрация</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  disabled={isLoading}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateStrongPassword}
                  disabled={isLoading}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Сгенерировать надёжный пароль
                </Button>
              </div>
              
              <Button 
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Зарегистрироваться
                  </>
                )}
              </Button>
            </form>

            {message && (
              <Alert variant={messageType === "error" ? "destructive" : "default"}>
                {messageType === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Button variant="link" className="p-0 h-auto" asChild>
                <a href="/login">Войти</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
