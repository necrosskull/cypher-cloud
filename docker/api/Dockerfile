FROM python:3.12-slim-bookworm

WORKDIR /app

# Устанавливаем Poetry
RUN pip install poetry==1.8.0

# Копируем файлы Poetry для управления зависимостями Python
COPY pyproject.toml poetry.lock ./

# Устанавливаем зависимости приложения
RUN poetry config virtualenvs.create false && poetry install --no-dev

# Указываем порт, на котором будет работать приложение
EXPOSE 8000

# Запускаем приложение
CMD ["poetry", "run","uvicorn", "cypher_cloud.main:app", "--host", "0.0.0.0", "--port", "8000"]
