import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from cypher_cloud.auth import router as auth_router
from cypher_cloud.config import settings
from cypher_cloud.database import Base, engine
from cypher_cloud.files import router as files_router

app = FastAPI(  # Создаем экземпляр FastAPI
    title="Cypher Cloud",
    description="Simple cloud storage with encryption",
    version="0.1",
    root_path="/api/v1",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.site_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(files_router, prefix="/files", tags=["files"])
app.mount("/", StaticFiles(directory="./build", html=True), name="frontend")


@app.on_event("startup")
async def startup_event():
    # Создаем таблицы при старте (в реальном проекте - миграции)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
