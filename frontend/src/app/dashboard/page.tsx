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
      return <Image className="h-5 w-5 text-blue-500" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return <Video className="h-5 w-5 text-purple-500" />;
    case 'mp3':
    case 'wav':
    case 'flac':
      return <Music className="h-5 w-5 text-green-500" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <Archive className="h-5 w-5 text-orange-500" />;
    case 'txt':
    case 'doc':
    case 'docx':
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    default:
      return <File className="h-5 w-5 text-gray-500" />;
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
    <div className="flex justify-center pt-8 px-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Заголовок */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Files className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Мои файлы</CardTitle>
          </CardHeader>
        </Card>

        {/* Зона загрузки */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <CloudUpload className="h-5 w-5" />
              <span>Загрузка файлов</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6" />
                </div>
                {isDragActive ? (
                  <p className="text-lg">Отпустите файлы здесь...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg">Перетащите файлы сюда или нажмите для выбора</p>
                    <p className="text-sm text-muted-foreground">
                      Поддерживается загрузка нескольких файлов (до 100МБ каждый)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">Выбранные файлы:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.name)}
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(file.size)}
                        </Badge>
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
                  className="w-full"
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

        {/* Список файлов */}
        <Card>
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
              <div className="space-y-2">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
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
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Скачать
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(file.id, file.filename)}
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
