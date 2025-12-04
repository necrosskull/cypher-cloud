"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, Key, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (!tokenParam) {
      setMessage("Недействительная ссылка восстановления");
      setMessageType("error");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!token) {
      setMessage("Недействительная ссылка восстановления");
      setMessageType("error");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setMessage("Заполните все поля");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Пароли не совпадают");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Пароль должен содержать минимум 8 символов");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await api.post("/auth/reset-password", { 
        token,
        new_password: newPassword 
      });
      
      setMessage("Пароль успешно изменен! Перенаправление на страницу входа...");
      setMessageType("success");
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Ошибка при сбросе пароля");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="soft-pill mx-auto">Новый пароль</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Обновите доступ</h1>
          <p className="text-muted-foreground">
            Задайте надёжный пароль и вернитесь в облако с усиленной защитой.
          </p>
        </div>

        <Card className="glass-panel">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 rounded-2xl flex items-center justify-center text-primary-foreground shadow-primary/30 shadow-lg">
              <Key className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Новый пароль</CardTitle>
            <p className="text-sm text-muted-foreground">
              Убедитесь, что пароли совпадают и содержат минимум 8 символов.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  disabled={isLoading || !token}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Подтвердите новый пароль"
                  disabled={isLoading || !token}
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full rounded-full"
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Сохранить пароль
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
