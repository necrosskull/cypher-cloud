"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QRCodeSVG } from "qrcode.react";
import { PasswordInput } from "@/components/ui/password-input";
import { ChangePassword } from "@/components/auth/ChangePassword";
import { 
  Settings, 
  Shield, 
  QrCode, 
  Smartphone, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Trash2
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function checkAuth() {
      try {
        await api.get("/auth/get-me");
      } catch (error: any) {
        if (error.response?.status === 401) {
          router.push('/login');
        }
      }
    }
    checkAuth();
  }, [router]);

  async function handleSetup2FA() {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const res = await api.post("/auth/setup-2fa");
      setOtpauthUrl(res.data.otpauth_url);
      setMessage("QR код сгенерирован! Отсканируйте его в приложении аутентификатора.");
      setMessageType("success");
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Ошибка при настройке 2FA");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify2FA() {
    if (!code || code.length !== 6) {
      setMessage("Введите 6-значный код");
      setMessageType("error");
      return;
    }

    setIsVerifying(true);
    setMessage(null);

    try {
      await api.post("/auth/verify-2fa", { code });
      setMessage("2FA успешно настроена!");
      setMessageType("success");
      toast({
        title: "Успех",
        description: "Двухфакторная аутентификация настроена",
      });
      setCode("");
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Неверный код");
      setMessageType("error");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleDisable2FA() {
    if (!disableCode || disableCode.length !== 6) {
      setMessage("Введите 6-значный код для отключения 2FA");
      setMessageType("error");
      return;
    }

    if (!disablePassword) {
      setMessage("Введите пароль для отключения 2FA");
      setMessageType("error");
      return;
    }

    setIsDisabling(true);
    setMessage(null);

    try {
      await api.post("/auth/disable-2fa", { 
        code: disableCode,
        password: disablePassword 
      });
      
      setMessage("2FA успешно отключена!");
      setMessageType("success");
      toast({
        title: "Успех",
        description: "Двухфакторная аутентификация отключена",
      });
      setDisableCode("");
      setDisablePassword("");
      setShowDisableForm(false);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Ошибка при отключении 2FA");
      setMessageType("error");
    } finally {
      setIsDisabling(false);
    }
  }

  const copyToClipboard = async () => {
    if (otpauthUrl) {
      await navigator.clipboard.writeText(otpauthUrl);
      toast({
        title: "Скопировано",
        description: "URL скопирован в буфер обмена",
      });
    }
  };

  return (
    <div className="flex justify-center pt-8 px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Заголовок */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Settings className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Настройки безопасности</CardTitle>
          </CardHeader>
        </Card>

        {/* Смена пароля */}
        <ChangePassword />

        {/* Настройка 2FA */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Двухфакторная аутентификация</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Дополнительный уровень защиты для вашего аккаунта
                </p>
              </div>
              
              {/* Кнопка отключения 2FA */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDisableForm(!showDisableForm)}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:block">Отключить 2FA</span>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSetup2FA}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Создать новый 2FA
                </>
              )}
            </Button>

            {/* Форма отключения 2FA */}
            {showDisableForm && (
              <div className="space-y-4 p-4 border rounded-lg bg-destructive/5">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Отключение 2FA</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label>Пароль</Label>
                    <PasswordInput
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Введите пароль"
                      disabled={isDisabling}
                    />
                  </div>
                  
                  <div>
                    <Label>Код из приложения</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={disableCode}
                        onChange={(value) => setDisableCode(value)}
                        disabled={isDisabling}
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
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={isDisabling || disableCode.length !== 6 || !disablePassword}
                    >
                      {isDisabling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Отключение...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Отключить 2FA
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisableCode("");
                        setDisablePassword("");
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {otpauthUrl && (
              <div className="space-y-4">
                <Separator />
                
                {/* QR Code */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">
                      Отсканируйте QR код
                    </Label>
                  </div>
                  
                  <div className="inline-block p-4 bg-white rounded-lg border">
                    <QRCodeSVG value={otpauthUrl} size={200} />
                  </div>
                  
                  <Badge variant="secondary" className="text-xs">
                    Используйте Google Authenticator или похожее приложение
                  </Badge>
                </div>

                {/* Manual URL */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Или введите код вручную:
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUrl(!showUrl)}
                    >
                      {showUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {showUrl && (
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                        {otpauthUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Верификация кода */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Проверка кода</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Введите код из приложения аутентификатора:</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                  disabled={isVerifying}
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
            </div>
            
            <Button 
              onClick={handleVerify2FA}
              disabled={isVerifying || code.length !== 6}
              className="w-full sm:w-auto"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Проверить код
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Сообщения */}
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
      </div>
    </div>
  );
}
