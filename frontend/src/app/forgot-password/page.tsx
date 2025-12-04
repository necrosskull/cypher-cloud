"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage("Введите email адрес");
      setMessageType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMessage("Введите корректный email адрес");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await api.post("/auth/request-password-reset", { 
        email: email.trim() 
      });
      
      setMessage("Если этот email зарегистрирован, на него будет отправлена ссылка для восстановления пароля");
      setMessageType("success");
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Ошибка при отправке запроса");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="soft-pill mx-auto">Поможем восстановить</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Сбросить пароль</h1>
          <p className="text-muted-foreground">
            Укажите почту, и мы отправим ссылку для восстановления доступа.
          </p>
        </div>

        <Card className="glass-panel">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 rounded-2xl flex items-center justify-center text-primary-foreground shadow-primary/30 shadow-lg">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
            <p className="text-sm text-muted-foreground">
              Проверьте правильность email, чтобы письмо пришло без задержек.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите ваш email"
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full rounded-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Отправить ссылку
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
            
            <div className="flex items-center justify-center">
              <Button 
                variant="link" 
                className="p-0 h-auto" 
                onClick={() => router.push('/login')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться к входу
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
