"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react";

export default function ConfirmEmailPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams?.get('token');
      
      if (!token) {
        setMessage("Недействительная ссылка подтверждения");
        setMessageType("error");
        setIsLoading(false);
        return;
      }

      try {
        await api.post("/auth/confirm-email", { token });
        setMessage("Email успешно подтвержден! Теперь вы можете войти в систему.");
        setMessageType("success");
        setIsConfirmed(true);
      } catch (error: any) {
        if (error.response?.status === 400) {
          setMessage("Недействительная или истекшая ссылка подтверждения");
        } else {
          setMessage(error.response?.data?.detail || "Ошибка подтверждения email");
        }
        setMessageType("error");
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="soft-pill mx-auto">Подтверждаем почту</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Почти готово</h1>
          <p className="text-muted-foreground">
            Проверяем ссылку и активируем ваш профиль в облаке.
          </p>
        </div>

        <Card className="glass-panel">
          <CardHeader className="text-center space-y-4">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shadow-primary/30 shadow-lg ${
              isLoading 
                ? 'bg-muted text-foreground' 
                : isConfirmed 
                  ? 'bg-gradient-to-br from-primary to-emerald-500' 
                  : 'bg-destructive/80'
            }`}>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isConfirmed ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <AlertCircle className="h-6 w-6" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isLoading ? "Подтверждение..." : isConfirmed ? "Email подтвержден" : "Ошибка подтверждения"}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 text-center">
            {isLoading ? (
              <p className="text-muted-foreground">
                Подтверждаем ваш email адрес...
              </p>
            ) : (
              <>
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
                
                <div className="pt-4 space-y-2">
                  {isConfirmed ? (
                    <Button 
                      onClick={() => router.push('/login')}
                      className="w-full rounded-full"
                    >
                      Войти в систему
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => router.push('/register')}
                        className="w-full rounded-full"
                      >
                        Повторить регистрацию
                      </Button>
                      <Button 
                        variant="link"
                        onClick={() => router.push('/login')}
                        className="w-full"
                      >
                        Вернуться к входу
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
