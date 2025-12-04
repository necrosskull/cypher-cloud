"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, LogIn, ShieldCheck, KeyRound, Fingerprint } from "lucide-react";
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
  const [messageTone, setMessageTone] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"password" | "passkey">("password");
  
  const { refetchUser } = useAuth();
  const router = useRouter();

  const isPasskeySupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!(window.PublicKeyCredential && typeof window.PublicKeyCredential === "function");
  }, []);

  const isSecureCtx = typeof window !== "undefined" ? window.isSecureContext : false;

  const encode = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

  const decode = (value: string) => {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const str = atob(normalized);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes.buffer;
  };

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setMessage("Почта и пароль обязательны для заполнения.");
      setMessageTone("error");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setMessageTone(null);

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
        setMessageTone("success");
        
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        setMessage("Неожиданный ответ сервера");
        setMessageTone("error");
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
      setMessageTone("error");
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  const startPasskeyLogin = async () => {
    if (!email.trim()) {
      setMessage("Введите email для входа с passkey.");
      setMessageTone("error");
      return;
    }
    if (!isSecureCtx) {
      setMessage("Passkey работает только в защищённом контексте (https/localhost). Откройте сайт по https.");
      setMessageTone("error");
      return;
    }
    try {
      if (!isPasskeySupported) {
        const supported = await (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.() || Promise.resolve(false));
        if (!supported) {
          setMessage("Passkey не поддерживается на этом устройстве/браузере.");
          setMessageTone("error");
          return;
        }
      }
    } catch {
      setMessage("Не удалось проверить поддержку passkey в браузере.");
      setMessageTone("error");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setMessageTone(null);

    try {
      const { data } = await api.post("/auth/passkey/login-options", { email: email.trim() });
      const opts = data.options;

      const request: PublicKeyCredentialRequestOptions = {
        ...opts,
        challenge: decode(opts.challenge),
        allowCredentials: opts.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: decode(cred.id),
        })),
      };

      const assertion = (await navigator.credentials.get({ publicKey: request })) as PublicKeyCredential;
      const response = assertion.response as AuthenticatorAssertionResponse;

      const payload = {
        email: email.trim(),
        credential: {
          id: assertion.id,
          rawId: encode(assertion.rawId),
          type: assertion.type,
          response: {
            authenticatorData: encode(response.authenticatorData),
            clientDataJSON: encode(response.clientDataJSON),
            signature: encode(response.signature),
            userHandle: response.userHandle ? encode(response.userHandle) : null,
          },
          clientExtensionResults: assertion.getClientExtensionResults(),
        },
      };

      await api.post("/auth/passkey/login-verify", payload);
      await refetchUser();
      setMessage("Вход с passkey выполнен!");
      setMessageTone("success");
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (error: any) {
      console.error(error);
      setMessage(error.response?.data?.detail || "Не удалось выполнить вход с passkey");
      setMessageTone("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Вход в облако</h1>
          <p className="text-muted-foreground">
            Загрузите и управляйте файлами в минималистичном зелёном окружении.
          </p>
        </div>

        <Card className="glass-panel">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground flex items-center justify-center shadow-primary/30 shadow-lg">
              {authMode === "passkey" ? <Fingerprint className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
            </div>
            <CardTitle className="text-2xl">
              {authMode === "passkey" ? "Вход с Passkey" : "Вход в систему"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {authMode === "passkey"
                ? "Используйте сохранённый passkey, чтобы войти без пароля. При необходимости включите 2FA в настройках."
                : "Используйте почту, пароль и при необходимости код из приложения аутентификации."}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 rounded-full bg-secondary/70 p-1 text-sm">
              <button
                type="button"
                onClick={() => setAuthMode("password")}
                className={`rounded-full px-3 py-2 transition ${authMode === "password" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
              >
                Пароль
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("passkey")}
                className={`rounded-full px-3 py-2 transition ${authMode === "passkey" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
              >
                Passkey
              </button>
            </div>

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
            
            {authMode === "password" && (
              <>
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
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="code">2FA Код (опционально)</Label>
                    <span className="text-xs text-muted-foreground">6 цифр</span>
                  </div>
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
                  className="w-full rounded-full"
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
              </>
            )}

            {authMode === "passkey" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Убедитесь, что passkey настроен в настройках вашего аккаунта.
                </div>
                <Button
                  onClick={startPasskeyLogin}
                  className="w-full rounded-full"
                  disabled={isLoading || !isPasskeySupported}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 mr-2" />
                      Войти с Passkey
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {message && (
              <Alert variant={messageTone === "error" ? "destructive" : "default"}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="text-muted-foreground">
                Нет аккаунта?{" "}
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href="/register">Зарегистрироваться</a>
                </Button>
              </div>
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
