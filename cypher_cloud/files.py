import os
import time
import urllib.parse
import uuid
from pathlib import Path
from typing import List

import aiofiles
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from cypher_cloud.auth import get_current_user
from cypher_cloud.database import get_db
from cypher_cloud.models import File as FileModel
from cypher_cloud.models import User
from cypher_cloud.schemas import FileItem, FileUploadResult

router = APIRouter()

FILES_DIR = "files"
os.makedirs(FILES_DIR, exist_ok=True)


@router.post("/upload")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не выбраны файлы для загрузки",
        )

    # Ограничения
    MAX_FILES_COUNT = 10
    MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500MB общий размер
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB на файл

    if len(files) > MAX_FILES_COUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Максимальное количество файлов: {MAX_FILES_COUNT}",
        )

    results = []
    total_size = 0
    successful_files = []

    try:
        # Создание директории если её нет
        files_dir = Path(FILES_DIR)
        files_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(files_dir, 0o755)

        # Предварительная валидация всех файлов
        file_data = []
        for file in files:
            if not file.filename:
                results.append(
                    FileUploadResult(
                        status="error",
                        filename="",
                        error="Имя файла не может быть пустым",
                    )
                )
                continue

            content = await file.read()
            file_size = len(content)

            if file_size > MAX_FILE_SIZE:
                results.append(
                    FileUploadResult(
                        status="error",
                        filename=file.filename,
                        size=file_size,
                        error=f"Файл слишком большой (макс. {MAX_FILE_SIZE // (1024*1024)}MB)",
                    )
                )
                continue

            total_size += file_size
            if total_size > MAX_TOTAL_SIZE:
                results.append(
                    FileUploadResult(
                        status="error",
                        filename=file.filename,
                        size=file_size,
                        error="Превышен общий лимит размера файлов",
                    )
                )
                continue

            file_data.append({"file": file, "content": content, "size": file_size})

        # Обработка файлов
        for data in file_data:
            try:
                file = data["file"]
                content = data["content"]
                file_size = data["size"]

                # Генерация ключа шифрования
                key = Fernet.generate_key()
                f = Fernet(key)
                encrypted_content = f.encrypt(content)

                # Создание безопасного имени файла
                timestamp = int(time.time())
                file_extension = Path(file.filename).suffix
                safe_filename = (
                    f"{user.id}_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
                )
                storage_path = files_dir / safe_filename

                # Сохранение файла
                async with aiofiles.open(storage_path, "wb") as f_out:
                    await f_out.write(encrypted_content)

                os.chmod(storage_path, 0o644)

                # Создание записи в БД
                new_file = FileModel(
                    owner_id=user.id,
                    filename=file.filename,
                    encrypted_key=key,
                    storage_path=str(storage_path),
                )

                db.add(new_file)
                successful_files.append(new_file)

                results.append(
                    FileUploadResult(
                        status="success",
                        file_id=None,  # Установим после commit
                        filename=file.filename,
                        size=file_size,
                    )
                )

            except Exception as e:
                print(f"Ошибка при обработке файла {file.filename}: {e}")
                results.append(
                    FileUploadResult(
                        status="error",
                        filename=file.filename,
                        error=f"Ошибка при сохранении: {str(e)}",
                    )
                )

        # Сохранение в базу данных
        if successful_files:
            await db.commit()

            # Обновление ID файлов в результатах
            success_index = 0
            for i, result in enumerate(results):
                if result.status == "success":
                    await db.refresh(successful_files[success_index])
                    result.file_id = successful_files[success_index].id
                    success_index += 1

        return {
            "status": "completed",
            "total_files": len(files),
            "successful": len(successful_files),
            "failed": len(results) - len(successful_files),
            "results": results,
        }

    except Exception as e:
        await db.rollback()
        print(f"Критическая ошибка при загрузке файлов: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Критическая ошибка при загрузке файлов",
        )


@router.get("/list", response_model=List[FileItem])
async def list_files(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    result = await db.execute(select(FileModel).where(FileModel.owner_id == user.id))
    files = result.scalars().all()
    return files


@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FileModel).where(FileModel.id == file_id, FileModel.owner_id == user.id)
    )
    db_file = result.scalars().first()
    if not db_file:
        raise HTTPException(404, "File not found")

    f = Fernet(db_file.encrypted_key)

    # Читаем и декриптируем весь файл
    async with aiofiles.open(db_file.storage_path, "rb") as f_in:
        encrypted_content = await f_in.read()

    decrypted_content = f.decrypt(encrypted_content)

    # Создаем генератор для отправки данных чанками
    async def content_iterator(data: bytes, chunk_size: int = 1024 * 1024):
        for i in range(0, len(data), chunk_size):
            yield data[i : i + chunk_size]

    safe_filename = urllib.parse.quote(db_file.filename)

    return StreamingResponse(
        content_iterator(decrypted_content),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}",
            "Content-Length": str(len(decrypted_content)),
        },
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FileModel).where(FileModel.id == file_id, FileModel.owner_id == user.id)
    )
    db_file = result.scalars().first()
    if not db_file:
        raise HTTPException(404, "File not found")

    # Удаляем запись из БД
    await db.delete(db_file)
    await db.commit()

    # Удаляем файл с диска
    if os.path.exists(db_file.storage_path):
        os.remove(db_file.storage_path)

    return {"status": "ok"}
