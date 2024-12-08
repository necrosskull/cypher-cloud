# Этап 1: Сборка frontend
FROM node:18-bullseye-slim as frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm install

# Copy the entire frontend directory including `next.config.js` for the build
COPY frontend ./

# Run Next.js build using the config
RUN npm run build

# Cleanup if needed
RUN rm -rf /app/frontend

# Этап 2: Итоговый контейнер
FROM python:3.12-slim-bullseye

WORKDIR /app

# Устанавливаем Poetry
RUN pip install poetry

# Копируем файлы Poetry для управления зависимостями Python
COPY pyproject.toml poetry.lock ./

# Устанавливаем зависимости приложения
RUN poetry config virtualenvs.create false && poetry install --no-dev

# Копируем статические файлы из этапа сборки frontend
COPY --from=frontend-builder /app/build /app/build

# Копируем файлы приложения на Python
COPY cypher_cloud /app/cypher_cloud

# Указываем порт, на котором будет работать приложение
EXPOSE 8082

# Запускаем приложение
CMD ["uvicorn", "cypher_cloud.main:app", "--host", "0.0.0.0", "--port", "8082"]
