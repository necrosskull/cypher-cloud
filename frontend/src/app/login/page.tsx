"use client";

import { useState } from "react";
import api, { resetUnauthorizedFlag } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setMessage("Почта и Пароль обязательны для заполнения.");
      return;
    }

    try {
      const res = await api.post("/auth/login", { email, password, code });
      setMessage("Успешный вход!");
      resetUnauthorizedFlag(); // Сбросим флаг после успешного логина
      window.location.href = "/dashboard";
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Ошибка входа");
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Вход</h1>
      <div className="mb-2">
        <Label>Почта</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Введите почту" />
      </div>
      <div className="mb-2">
        <Label>Пароль</Label>
        <Input
          placeholder="Введите пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <Label>2FA Код (если включен)</Label>
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
      </div>
      <Button onClick={handleLogin} variant={"secondary"}>Войти</Button>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </div>
  );
}
