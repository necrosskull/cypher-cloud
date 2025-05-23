import { GraduationCap, CloudUpload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="flex items-start justify-center pt-16 pb-8 px-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            {/* Иконка */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-muted">
                <CloudUpload className="h-10 w-10" />
              </div>
            </div>

            {/* Заголовок */}
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Облачное хранилище
            </h1>
            <p className="text-muted-foreground mb-8">
              Безопасное хранение ваших файлов
            </p>

            {/* Кнопки */}
            <div className="space-y-3 mb-8">
              <Button asChild className="w-full">
                <a href="/login">Войти</a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href="/register">Регистрация</a>
              </Button>
            </div>

            {/* Информация об авторе */}
            <div className="border-t pt-6 space-y-3">
              <Badge variant="secondary" className="inline-flex items-center gap-2">
                <GraduationCap className="h-3 w-3" />
                Научно-исследовательская работа
              </Badge>
              
              <div className="space-y-1">
                <p className="text-sm">
                  Выполнена <span className="font-semibold">Куряевым В.А.</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Группа КТСО-04-20
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
