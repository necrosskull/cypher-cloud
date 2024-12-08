"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";

type FileItem = {
  id: number;
  filename: string;
};

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter(); // Next.js роутер для редиректов

  async function loadFiles() {
    try {
      const res = await api.get('/files/list');
      setFiles(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login'; // Редирект на страницу входа
      } else {
        setMessage(error.response?.data?.detail || 'Error loading files');
      }
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
    },
    multiple: false,
  });

  async function handleUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('Файл успешно загружен!');
      setFile(null);
      await loadFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login'; // Редирект на страницу входа
      } else {
        setMessage(error.response?.data?.detail || 'Upload error');
      }
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
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login'; // Редирект на страницу входа
      } else {
        setMessage('Download error');
      }
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/files/${id}`);
      setMessage('Файл удалён!');
      await loadFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login'; // Редирект на страницу входа
      } else {
        setMessage(error.response?.data?.detail || 'Delete error');
      }
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Файлы</h1>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-4 text-center cursor-pointer ${
          isDragActive ? 'border-blue-500' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Отпустите файл здесь...</p>
        ) : (
          <p>Перетащите файл сюда или нажмите чтобы выбрать</p>
        )}
      </div>
      {file && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">Выбран файл: {file.name}</p>
          <Button onClick={handleUpload} className="mt-2">Загрузить</Button>
        </div>
      )}
      {message && <p className="text-green-600">{message}</p>}
      {files.length > 0 && <h2 className="text-xl font-semibold">Ваши файлы</h2>}
      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between border p-2 rounded">
            <span>{f.filename}</span>
            <div className="flex space-x-2">
              <Button variant="secondary" onClick={() => handleDownload(f.id, f.filename)}>
                Скачать
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(f.id)}>
                Удалить
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
