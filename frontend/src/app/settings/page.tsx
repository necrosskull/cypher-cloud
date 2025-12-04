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
  Trash2,
  Fingerprint,
  KeyRound
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
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);

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

  const setupPasskey = async () => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      setPasskeyMessage("Passkey не поддерживается в этом браузере.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setPasskeyMessage("Passkey можно создать только в защищённом контексте (https/localhost). Откройте страницу по https.");
      return;
    }
    try {
      const supported = await (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.() || Promise.resolve(false));
      if (!supported) {
        setPasskeyMessage("На этом устройстве нет поддержки платформенных ключей.");
        return;
      }
    } catch {
      setPasskeyMessage("Не удалось проверить поддержку passkey в браузере.");
      return;
    }
    setIsPasskeyLoading(true);
    setPasskeyMessage(null);
    try {
      const { data } = await api.get("/auth/passkey/register-options");
      const opts = data.options;

      const options: PublicKeyCredentialCreationOptions = {
        ...opts,
        challenge: decode(opts.challenge),
        user: {
          ...opts.user,
          id: decode(opts.user.id),
        },
        excludeCredentials: opts.excludeCredentials?.map((cred: any) => ({
          ...cred,
          id: decode(cred.id),
        })),
      };

      const cred = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
      const response = cred.response as AuthenticatorAttestationResponse;

      const payload = {
        nickname: "Основной passkey",
        credential: {
          id: cred.id,
          rawId: encode(cred.rawId),
          type: cred.type,
          transports: (cred as any).transports,
          response: {
            attestationObject: encode(response.attestationObject),
            clientDataJSON: encode(response.clientDataJSON),
          },
          clientExtensionResults: cred.getClientExtensionResults(),
        },
      };

      await api.post("/auth/passkey/register-verify", payload);
      setPasskeyMessage("Passkey успешно добавлен. Теперь можно входить без пароля.");
    } catch (error: any) {
      console.error(error);
      setPasskeyMessage(error.response?.data?.detail || "Не удалось создать passkey");
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary" className="soft-pill inline-flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Безопасность аккаунта
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Настройки и защита</h1>
          <p className="text-muted-foreground max-w-2xl">
            Управляйте паролем, двухфакторной аутентификацией и кодами доступа в минималистичном зелёном стиле.
          </p>
      </div>

        <Card className="glass-panel">
          <CardHeader className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground flex items-center justify-center shadow-primary/30 shadow-lg">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Настройки безопасности</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Рекомендуем включить 2FA и регулярно обновлять пароль.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Passkey вход</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Создайте passkey, чтобы входить без пароля. Работает на поддерживаемых устройствах.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="rounded-full"
                onClick={setupPasskey}
                disabled={isPasskeyLoading}
              >
                {isPasskeyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Создать passkey
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {passkeyMessage && (
            <CardContent>
              <Alert variant={passkeyMessage.includes("не") ? "destructive" : "default"}>
                <AlertDescription>{passkeyMessage}</AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Смена пароля */}
        <ChangePassword />

        {/* Настройка 2FA */}
        <Card className="glass-panel">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Shield className="h-5 w-5" />
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
                className="flex items-center space-x-2 rounded-full"
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
              className="w-full sm:w-auto rounded-full shadow-primary/20 shadow-md"
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
                      className="rounded-full"
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
                      className="rounded-full"
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
                  
                  <div className="inline-block p-4 bg-background rounded-lg border border-border/70">
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
        <Card className="glass-panel">
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
              className="w-full sm:w-auto rounded-full"
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
