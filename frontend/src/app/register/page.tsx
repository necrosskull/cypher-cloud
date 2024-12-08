"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function handleRegister() {
    if (!email.trim() || !password.trim()) {
      setMessage("Почта и Пароль обязательны для заполнения.");
      return;
    }

    try {
      const res = await api.post("/auth/register", { email, password });
      setMessage("Успешная регистрация, перенаправляю на страницу входа...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    } catch (error: any) {
      console.error(error);
      setMessage(error.response?.data?.detail || "Ошибка регистрации");
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Регистрация</h1>
      <div className="mb-2">
        <Label>Email</Label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Введите почту"
        />
      </div>
      <div className="mb-2">
        <Label>Password</Label>
        <div className="relative flex items-center space-x-4">
          <Input
            placeholder="Введите пароль"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="w-1/3"
          >
            {showPassword ? "Скрыть" : "Показать"}
          </Button>
        </div>
        <div className="flex justify-between mt-2">
          <Button onClick={generateStrongPassword} variant={"secondary"}>
            Сгенерировать надёжный пароль
          </Button>
        </div>
      </div>
      <Button onClick={handleRegister} variant={"secondary"}>
        Регистрация
      </Button>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </div>
  );
}
