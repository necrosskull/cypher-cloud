'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordInput } from '@/components/ui/password-input';
import { Loader2, Key, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Все поля обязательны для заполнения');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Новые пароли не совпадают');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('Новый пароль должен содержать минимум 8 символов');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await api.post('/auth/change-password', {
        old_password: currentPassword,
        new_password: newPassword,
      });

      setMessage('Пароль успешно изменен');
      setMessageType('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Ошибка при смене пароля');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>Смена пароля</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Обновляйте пароль регулярно и добавляйте символы, цифры и буквы.
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current-password">Текущий пароль</Label>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Введите текущий пароль"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="new-password">Новый пароль</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Введите новый пароль"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">Подтвердите новый пароль</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Подтвердите новый пароль"
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full rounded-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Изменение...
              </>
            ) : (
              'Изменить пароль'
            )}
          </Button>

          {message && (
            <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
              {messageType === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
