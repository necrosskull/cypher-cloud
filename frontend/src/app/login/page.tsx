"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { refetchUser } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setMessage("Почта и пароль обязательны для заполнения.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await api.post("/auth/login", { 
        email: email.trim(), 
        password, 
        code: code.trim() || undefined
      });

      if (res.status === 200 && res.data) {
        console.log("Успешный вход:", res.data);
        await refetchUser();
        setMessage("Успешный вход! Перенаправление...");
        
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        setMessage("Неожиданный ответ сервера");
      }
    } catch (error: any) {
      console.error("Ошибка входа:", error);
      
      if (error.response?.status === 401) {
        setMessage("Неверные учетные данные");
      } else if (error.response?.status === 422) {
        setMessage("Требуется 2FA код или проверьте правильность данных");
      } else {
        setMessage(error.response?.data?.detail || "Ошибка входа");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <div className="flex justify-center pt-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <LogIn className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Вход в систему</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Почта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите почту"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите пароль"
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">2FA Код (опционально)</Label>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <Button 
              onClick={handleLogin} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
            
            {message && (
              <Alert variant={message.includes("Успешный") ? "default" : "destructive"}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Button variant="link" className="p-0 h-auto" asChild>
                <a href="/register">Зарегистрироваться</a>
              </Button>
            </div>
            <div className="text-center text-sm">
              <Button variant="link" className="p-0 h-auto" asChild>
                <a href="/forgot-password">Забыли пароль?</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
