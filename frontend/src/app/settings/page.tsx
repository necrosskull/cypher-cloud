"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Для редиректов
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function SettingsPage() {
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageColor, setMessageColor] = useState<"text-red-500" | "text-green-500" | null>(null);
  const router = useRouter(); // Инициализация роутера

  // Проверка авторизации при загрузке страницы
  useEffect(() => {
    async function checkAuth() {
      try {
        await api.get("/auth/get-me");
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.error(error);
          window.location.href = '/login'; // Редирект на страницу входа
        } else {
          setMessage("Ошибка при проверке авторизации");
          setMessageColor("text-red-500");
        }
      }
    }

    checkAuth();
  }, [router]);

  async function handleSetup2FA() {
    try {
      const res = await api.post("/auth/setup-2fa");
      setOtpauthUrl(res.data.otpauth_url);
      setMessage(null);
      setMessageColor(null);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Error setting 2FA");
      setMessageColor("text-red-500");
    }
  }

  async function handleVerify2FA() {
    try {
      await api.post("/auth/verify-2fa", { code });
      setMessage("2FA правильный!");
      setMessageColor("text-green-500");
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Verification error";
      const errorStatus = error.response?.status;

      setMessage(errorMessage);
      setMessageColor(errorStatus === 403 ? "text-red-500" : null);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-2">Параметры</h1>
      <Button
        onClick={handleSetup2FA}
        className="w-1/2"
        variant={"secondary"}
      >
        Создать новый 2FA
      </Button>
      {otpauthUrl && (
        <div className="mt-4 p-4 border rounded space-y-2">
          <p>Отсканируйте этот QR код вашим аутентификатором:</p>
          <div className="flex justify-center bg-white p-4 rounded">
            <QRCodeSVG value={otpauthUrl} size={200} />
          </div>
          <p className="text-sm break-all">Или используйте этот URL: {otpauthUrl}</p>
        </div>
      )}
      <div>
        <Label className="block mb-4 mt-8 font-medium">
          Введите код из приложения для генерации кодов:
        </Label>
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => setCode(value)}
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
        <Button
          className="w-1/2 mt-4"
          onClick={handleVerify2FA}
          variant={"secondary"}
        >
          Тест 2FA
        </Button>
      </div>
      {message && <p className={`${messageColor} mt-2`}>{message}</p>}
    </div>
  );
}
