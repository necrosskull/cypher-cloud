"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  File, 
  Download, 
  Trash2, 
  Files, 
  CloudUpload,
  FileText,
  Image,
  Archive,
  Music,
  Video,
  Loader2,
  AlertCircle,
  CheckCircle,
  FolderOpen
} from "lucide-react";

type FileItem = {
  id: number;
  filename: string;
  size?: number;
  created_at?: string;
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <Image className="h-5 w-5 text-primary" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return <Video className="h-5 w-5 text-primary" />;
    case 'mp3':
    case 'wav':
    case 'flac':
      return <Music className="h-5 w-5 text-primary" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <Archive className="h-5 w-5 text-primary" />;
    case 'txt':
    case 'doc':
    case 'docx':
    case 'pdf':
      return <FileText className="h-5 w-5 text-primary" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Неизвестно';
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  async function loadFiles() {
    setIsLoading(true);
    try {
      const res = await api.get('/files/list');
      setFiles(res.data.files || res.data || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        setMessage(error.response?.data?.detail || 'Ошибка загрузки файлов');
        setMessageType("error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setMessage(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setMessage(null);
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('files', file);
        
        await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      setMessage(`Успешно загружено ${selectedFiles.length} файл(ов)!`);
      setMessageType("success");
      setSelectedFiles([]);
      await loadFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        setMessage(error.response?.data?.detail || 'Ошибка загрузки');
        setMessageType("error");
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(id: number, filename: string) {
    try {
      const res = await api.get(`/files/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        setMessage('Ошибка скачивания файла');
        setMessageType("error");
      }
    }
  }

  async function handleDelete(id: number, filename: string) {
    if (!confirm(`Удалить файл "${filename}"?`)) return;
    
    try {
      await api.delete(`/files/${id}`);
      setMessage('Файл успешно удален!');
      setMessageType("success");
      await loadFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        setMessage(error.response?.data?.detail || 'Ошибка удаления');
        setMessageType("error");
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary" className="soft-pill inline-flex items-center gap-2">
            <Files className="h-3 w-3" />
            Файлы в облаке
          </Badge>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Мои файлы</h1>
              <p className="text-muted-foreground">
                Перетаскивайте файлы, отслеживайте загрузку и управляйте списком без лишнего шума.
              </p>
            </div>
            {!isLoading && (
              <Badge variant="outline" className="soft-pill border-primary/40 text-primary">
                Всего файлов: {files.length}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Зона загрузки */}
          <Card className="glass-panel">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center space-x-2">
                <CloudUpload className="h-5 w-5" />
                <span>Загрузка файлов</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div
                {...getRootProps()}
                className={`group border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-primary/80 bg-primary/5 shadow-inner shadow-primary/10' 
                    : 'border-border/80 hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  {isDragActive ? (
                    <p className="text-lg">Отпустите файлы здесь...</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">Перетащите файлы сюда или нажмите для выбора</p>
                      <p className="text-sm text-muted-foreground">
                        Поддерживается загрузка нескольких файлов
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Выбранные файлы</h4>
                    <Badge variant="secondary">{selectedFiles.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/70 border border-border/70">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.name)}
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{file.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {formatFileSize(file.size)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    className="w-full rounded-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Загрузить {selectedFiles.length} файл(ов)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Сводка */}
          <Card className="glass-panel">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center space-x-2">
                <FolderOpen className="h-5 w-5" />
                <span>Сводка</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground">Всего файлов</p>
                  <p className="text-2xl font-semibold flex items-center gap-2">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : files.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-secondary/70 p-4">
                  <p className="text-xs text-muted-foreground">Выбрано к загрузке</p>
                  <p className="text-2xl font-semibold flex items-center gap-2">
                    {selectedFiles.length}
                    <Badge variant="outline" className="text-xs">готово</Badge>
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Советы</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Храните важные файлы в защищённых папках.</li>
                  <li>• Включите 2FA в настройках для лучших практик безопасности.</li>
                  <li>• Обновляйте список, если загружаете большие объёмы.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Сообщения */}
        {message && (
          <Alert variant={messageType === "error" ? "destructive" : "default"} className="glass-panel border border-border/70">
            {messageType === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Список файлов */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>Ваши файлы</span>
              {!isLoading && <Badge variant="secondary">{files.length}</Badge>}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Файлы не найдены</p>
                <p className="text-sm">Загрузите файлы чтобы начать работу</p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.filename)}
                      <div>
                        <p className="font-medium">{file.filename}</p>
                        {file.size && (
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(file.id, file.filename)}
                        className="rounded-full"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Скачать
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(file.id, file.filename)}
                        className="rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
