import { GraduationCap, CloudUpload, ShieldCheck, Lock, Gauge, Zap, CheckCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const highlights = [
    {
      title: "Безопасные файлы",
      description: "Шифрование на сервере и строгие политики доступа.",
      icon: ShieldCheck,
    },
    {
      title: "Двухфакторная защита",
      description: "2FA, контроль сессий и уведомления о входах.",
      icon: Lock,
    },
    {
      title: "Скорость и простота",
      description: "Удобная загрузка, предпросмотр и управление файлами.",
      icon: Gauge,
    },
  ];

  return (
    <div className="relative px-4 py-12 lg:py-16">
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-start">
        <Card className="glass-panel relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
          <CardContent className="relative p-10 space-y-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="soft-pill border border-border/60">
                <GraduationCap className="h-3 w-3" />
                выпускная квалификационная работа
              </Badge>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
                Облачное хранилище с зелёной айдентикой и заботой о безопасности
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Минималистичный, но выразительный интерфейс. Быстрая работа с файлами, двухфакторная защита и комфортный режим для света и тьмы.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="w-full sm:w-auto text-base px-6 py-2.5 rounded-full shadow-primary/30 shadow-lg">
                  <a href="/login" className="flex items-center gap-2">
                    <CloudUpload className="h-4 w-4" />
                    Перейти к файлам
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto text-base px-6 py-2.5 rounded-full border-primary/30">
                  <a href="/register">Создать аккаунт</a>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-border/70 bg-secondary/60 p-4 space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                <CheckCircle className="h-4 w-4" />
                Безопасное хранение файлов
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm">
                <Lock className="h-4 w-4" />
                2FA готово к работе
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="glass-panel overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30">
                  <CloudUpload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Следующий шаг</p>
                  <p className="text-lg font-semibold">Авторизуйтесь и загрузите первый файл</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <CloudUpload className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">Всего три шага</p>
                    <p className="text-sm text-muted-foreground">Выберите файлы, перетащите их сюда и отслеживайте прогресс.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-background border border-primary/20 p-3">
                    <p className="text-xs text-muted-foreground">Размер</p>
                    <p className="text-base font-semibold">до 100 МБ</p>
                  </div>
                  <div className="rounded-xl bg-background border border-primary/20 p-3">
                    <p className="text-xs text-muted-foreground">Режим</p>
                    <p className="text-base font-semibold">Drag & Drop</p>
                  </div>
                  <div className="rounded-xl bg-background border border-primary/20 p-3">
                    <p className="text-xs text-muted-foreground">Загрузка</p>
                    <p className="text-base font-semibold text-primary">Мгновенно</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Шифрование включено
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Запросите код подтверждения и включите 2FA для учётной записи.
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="h-4 w-4 text-primary" />
                    Готовность 24/7
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Интерфейс адаптируется под светлую и тёмную темы автоматически.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
