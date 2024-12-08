import os
import urllib.parse
from typing import List

import aiofiles
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from cypher_cloud.auth import get_current_user
from cypher_cloud.database import get_db
from cypher_cloud.models import File as FileModel
from cypher_cloud.models import User
from cypher_cloud.schemas import FileItem

router = APIRouter()

FILES_DIR = "files"
os.makedirs(FILES_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    key = Fernet.generate_key()
    f = Fernet(key)
    content = await file.read()
    encrypted_content = f.encrypt(content)

    filename = file.filename
    storage_path = os.path.join(FILES_DIR, f"{user.id}_{filename}")

    async with aiofiles.open(storage_path, "wb") as f_out:
        await f_out.write(encrypted_content)

    new_file = FileModel(
        owner_id=user.id,
        filename=filename,
        encrypted_key=key,
        storage_path=storage_path,
    )
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)

    return {"status": "ok", "file_id": new_file.id}


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
    async with aiofiles.open(db_file.storage_path, "rb") as f_in:
        encrypted_content = await f_in.read()
    decrypted_content = f.decrypt(encrypted_content)

    safe_filename = urllib.parse.quote(db_file.filename)

    return StreamingResponse(
        iter([decrypted_content]),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
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
