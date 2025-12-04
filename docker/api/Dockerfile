FROM ghcr.io/astral-sh/uv:python3.12-bookworm

WORKDIR /app

# Копируем файлы зависимостей и ставим их через uv (без установ­ки проекта для кэширования слоя)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Копируем исходники и ставим проект в editable-режиме
COPY . .
RUN uv sync --frozen --no-dev

# Указываем порт приложения и команду запуска
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "cypher_cloud.main:app", "--host", "0.0.0.0", "--port", "8000"]
