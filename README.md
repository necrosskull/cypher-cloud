# Cypher Cloud

Cypher Cloud — полнофункциональное облачное хранилище с шифрованием файлов, подтверждением почты и двухфакторной аутентификацией. Проект состоит из:

- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL. Обрабатывает регистрацию/логин, e-mail подтверждения, TOTP 2FA и шифрование файлов с Fernet.
- **Frontend**: Next.js (App Router) + shadcn/ui. Предоставляет SPA-интерфейс с формами регистрации/логина, загрузчиком файлов и настройками безопасности.
- **Secrets**: HashiCorp Vault + Vault Agent Proxy. Fernet-ключи больше не попадают в БД, а живут в отдельном секрет-хранилище.

Ниже собран подробный обзор архитектуры, основных сценариев и примеров кода.

---

## Быстрый старт

```bash
# 1. Подготовка переменных окружения
cp .env.example .env     # (заполните SMTP, JWT и доступ к БД)

# Минимально необходимый набор переменных:
cat <<'EOF' > .env
db_host=postgres
db_port=5432
db_user=cypher
db_password=cypher
db_name=cypher_cloud
db_ext_port=5432
site_url=http://localhost:8080
NEXT_PUBLIC_BASE_URL=http://localhost:8080/api/v1
SECRET_KEY=change-me
ALGORITHM=HS256
ISSUER_NAME=cypher-cloud
ACCESS_TOKEN_EXPIRE_SECONDS=3600
MAIL_USERNAME=example@example.com
MAIL_PASSWORD=password
MAIL_FROM=example@example.com
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_STARTTLS=true
MAIL_SSL_TLS=false
VAULT_ADDR=http://vault-proxy:8100
VAULT_TOKEN=dev-root-token
VAULT_KV_MOUNT=secret
VAULT_HTTP_PORT=8200
VAULT_PROXY_PORT=8201
VAULT_ADMIN_USERNAME=admin
VAULT_ADMIN_PASSWORD=change-me
VAULT_ADMIN_POLICY=admin-ui
APP_PORT=8080
EOF

# Убедитесь, что docker/vault/root_token содержит тот же VAULT_TOKEN.

# 2. Запуск инфраструктуры (PostgreSQL, Vault(+proxy), backend, frontend, nginx)
docker compose up --build

# SPA и API одновременно доступны по http://localhost:${APP_PORT:-8080}
# HashiCorp Vault UI – http://localhost:${VAULT_HTTP_PORT:-8200} (логин: ${VAULT_ADMIN_USERNAME}, пароль: ${VAULT_ADMIN_PASSWORD})
```

Docker Compose поднимает шесть сервисов: `postgres`, `vault`, `vault-proxy`, `backend`, `frontend`, `nginx`. Все внешние запросы идут через `nginx`: фронтенд доступен по `/`, а backend — по `/api/v1`, поэтому CORS работает «из коробки». Backend по-прежнему общается с Vault только через proxy (порт 8100 внутри сети `application`), поэтому секреты не выходят наружу.

Переменные `VAULT_ADMIN_USERNAME/VAULT_ADMIN_PASSWORD` создают учётную запись для входа в Vault UI. Политика `VAULT_ADMIN_POLICY` (по умолчанию `admin-ui`) выдаёт этой учётке полный доступ к указанному KV-монту (`${VAULT_KV_MOUNT}`), поэтому при необходимости сузьте права или переопределите политику.

Backend также можно поднять вручную:

```bash
uv sync
uv run uvicorn cypher_cloud.main:app --reload --port 8000
```

> Примечание: для локального запуска вне docker требуется доступный Vault (можно оставить контейнеры `vault` и `vault-proxy`) и корректно выставленные `VAULT_ADDR/VAULT_TOKEN`.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## Архитектура

```
┌────────────┐      JWT + cookies      ┌────────────────────┐
│  Next.js   │  ───────────────────▶   │ FastAPI /auth,files │
│  frontend  │  ◀───────────────────   │  Fernet encryption  │
└────────────┘  JSON/API + files      └──────────┬──────────┘
        │                                         │
        │ REST                                    │ SQLAlchemy async
        ▼                                         ▼
 локальная FS (files/)                    PostgreSQL (users, files metadata)
                                                  │
                                                  ▼
                                      HashiCorp Vault (KV v2 via Agent Proxy)
```

- Авторизация через JWT, токен хранится в HTTP-only cookie `access_token`.
- Для каждого файла генерируется собственный ключ Fernet: ciphertext хранится локально в `files/`, а секретный ключ попадает в HashiCorp Vault.
- Email-потоки (подтверждение, сброс пароля) отправляются через FastMail и SMTP.
- Frontend хранит «теневое» состояние авторизации в `localStorage`, но всегда синхронизируется с `/auth/get-me`.

### Почему здесь появился Vault

Ранее ключ шифрования (`encrypted_key`) лежал в таблице `files`. Такой подход прост, но компрометация БД автоматически раскрывает все файлы. Теперь схема разнесена:

1. **Файловая система** содержит только шифротекст.
2. **PostgreSQL** хранит путь `vault_key_path`, т.е. ссылку вида `files/<user_id>/<file_id>`.
3. **HashiCorp Vault (KV v2)** хранит собственно ключ (`secret["key"]`).

Vault инициализируется через Docker Compose. Контейнер `vault` запускается в dev-режиме с root-токеном, а `vault-proxy` — это Vault Agent в конфигурации `docker/vault/agent.hcl`. Агент:

- читает root токен из `docker/vault/root_token`;
- получает собственный short-lived токен и кеширует его;
- слушает порт `8100` и просто проксирует запросы в основной Vault (`proxy { upstream = "http://vault:8200" }`).

Backend никогда не знает реального root токена и стучится только по `VAULT_ADDR=http://vault-proxy:8100`. Даже если украдут переменные окружения контейнера, злоумышленник получит ограниченный токен агента. В продакшене вместо dev root токена можно использовать AppRole/Token, выданный исключительно на `secret/data/files/*` с правами `create, read, delete`.

---

## Backend: ключевые модули

### Инициализация приложения

`cypher_cloud/main.py` подключает маршруты и мигрирует схему при старте:

```python
app = FastAPI(
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

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(files_router, prefix="/files", tags=["files"])
```

### Конфигурация и база

`Settings` (см. `cypher_cloud/config.py`) собирает переменные окружения: `db_*`, `SECRET_KEY`, почтовые креды, сроки действия токенов. URL БД строится функцией `get_db_url`, а `cypher_cloud/database.py` создает асинхронный движок SQLAlchemy и `AsyncSession`.

Модели (`cypher_cloud/models.py`):

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    email_confirmed = Column(Boolean, default=False)

class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    filename = Column(String, nullable=False)
    vault_key_path = Column(String, nullable=False)  # ссылка на секрет в Vault
    storage_path = Column(String, nullable=False)
```

### Аутентификация и безопасность

`cypher_cloud/auth.py` покрывает весь цикл пользователя.

- **Регистрация** — проверка уникальности и письмо-приглашение:

```python
@router.post("/register")
async def register_user(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if await get_user_by_email(db, req.email):
        raise HTTPException(400, "User with this email already exists.")

    hashed = bcrypt.hash(req.password)
    new_user = User(email=req.email, hashed_password=hashed)
    db.add(new_user)
    await db.commit()

    token = jwt.encode(
        {"sub": new_user.email, "exp": now + settings.EMAIL_CONFIRM_EXPIRE_SECONDS,
         "type": "email_confirm"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    confirm_url = f"{settings.NEXT_PUBLIC_BASE_URL.rstrip('/api/v1')}/confirm-email?token={token}"
    await fm.send_message(MessageSchema(..., body=f"...{confirm_url}", ...))
```

- **Login + 2FA** — проверка пароля, e-mail статуса и TOTP:

```python
@router.post("/login")
async def login_user(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, req.email)
    if not user or not bcrypt.verify(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if user.totp_secret:
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.code):
            raise HTTPException(401, "Invalid 2FA code")

    token = jwt.encode({"sub": str(user.id), "exp": now + ACCESS_TOKEN_EXPIRE_SECONDS}, SECRET_KEY, algorithm=ALGORITHM)
    response.set_cookie("access_token", token, httponly=True, expires=ACCESS_TOKEN_EXPIRE_SECONDS)
    return {"status": "ok"}
```

- **TOTP** — генерация QR (`/setup-2fa`), проверка кода (`/verify-2fa`), отключение (`/disable-2fa`).
- **Пароли** — `/request-password-reset` отправляет письмо со ссылкой, `/reset-password` валидирует токен и обновляет `hashed_password`, `/change-password` проверяет текущий пароль.
- **Сессии** — `/auth/get-me` возвращает `UserResponse`, `/logout` удаляет cookie.

### Шифрование файлов

`cypher_cloud/files.py` принимает несколько файлов, валидирует лимиты, шифрует и сохраняет результаты для отчета на фронтенде:

```python
MAX_FILES_COUNT = 10
MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500MB
MAX_FILE_SIZE = 100 * 1024 * 1024   # 100MB per file

@router.post("/upload")
async def upload_multiple_files(files: List[UploadFile] = File(...),
                                db: AsyncSession = Depends(get_db),
                                user: User = Depends(get_current_user)):
    key = Fernet.generate_key()
    f = Fernet(key)
    encrypted_content = f.encrypt(await file.read())

    async with aiofiles.open(storage_path, "wb") as f_out:
        await f_out.write(encrypted_content)

    new_file = FileModel(owner_id=user.id,
                         filename=file.filename,
                         vault_key_path="",
                         storage_path=str(storage_path))
    db.add(new_file)
    await db.flush()

    vault_path = f"files/{user.id}/{new_file.id}"
    await store_file_key(vault_path, key.decode())
    new_file.vault_key_path = vault_path
```

- `/files/list` возвращает файлы пользователя (схема `FileItem`).
- `/files/download/{id}` читает зашифрованный blob, расшифровывает и отдает через `StreamingResponse`.
- `/files/{id}` удаляет запись и физический файл.

### HashiCorp Vault и ключи

Fernet-ключи не попадают в базу данных. Вместо этого используется слой `cypher_cloud/vault_client.py`, который общается с HashiCorp Vault (KV v2) через официальную библиотеку `hvac`:

```python
async def store_file_key(path: str, key: str) -> None:
    def _store() -> None:
        client = hvac.Client(url=settings.vault_addr, token=settings.vault_token)
        client.secrets.kv.v2.create_or_update_secret(
            mount_point=settings.vault_kv_mount,
            path=path,
            secret={"key": key},
        )
    await asyncio.to_thread(_store)

async def fetch_file_key(path: str) -> str:
    def _read() -> str:
        client = hvac.Client(url=settings.vault_addr, token=settings.vault_token)
        secret = client.secrets.kv.v2.read_secret_version(
            mount_point=settings.vault_kv_mount, path=path
        )
        return secret["data"]["data"]["key"]
    return await asyncio.to_thread(_read)
```

- Для каждого файла генерируется путь `files/{user_id}/{file_id}`. Он сохраняется в столбце `vault_key_path`.
- При скачивании ключ считывается `fetch_file_key`, декодируется и используется для расшифровки.
- При удалении файла вызывается `delete_file_key`, чтобы почистить все версии секрета.
- В docker-compose разворачивается `hashicorp/vault` + `vault agent` (proxy), а backend общается только с прокси: `VAULT_ADDR=http://vault-proxy:8100`.
- Таблица `files` теперь содержит поле `vault_key_path`. При обновлении существующей БД создайте миграцию или пересоберите таблицу.
- `asyncio.to_thread` используется, чтобы не блокировать event loop во время общения с Vault, ведь `hvac` синхронный.
- Если Vault временно упал, API отдаст 500 и откатит транзакцию — зашифрованный файл удаляется с диска, чтобы не образовалось «висячих» записей.
- Для скачивания по `/files/download/{id}` ключ извлекается на лету, и объект `Fernet` существует только в рамках запроса; backend ничего не кеширует в памяти/диске.

---

## Frontend: ключевые элементы

### Корневая раскладка

`frontend/src/app/layout.tsx` включает темизацию, контекст аутентификации и глобальную навигацию:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class">
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Navigation />
              <main>
                <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
              </main>
              <Toaster />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Axios-клиент и обработка 401

`frontend/src/lib/api.ts` создает API-обертку:

```ts
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (!isPublicRoute(currentPath) && typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
```

### Контекст авторизации

`frontend/src/contexts/AuthContext.tsx` синхронизирует пользователя и хранит кэш:

```tsx
const fetchUser = useCallback(async () => {
  try {
    setIsLoading(true);
    const res = await api.get('/auth/get-me');
    setUserEmail(res.data.email);
    setIsAuthorized(true);
    saveAuthData(res.data.email, true);
  } catch (error: any) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      setIsAuthorized(false);
      setUserEmail(null);
      saveAuthData(null, false);
    }
  } finally {
    setIsLoading(false);
  }
}, [saveAuthData]);
```

Middleware (`frontend/src/app/middleware.ts`) дополнительно блокирует доступ к `/dashboard` и `/settings`, если в cookies нет `access_token`.

### UI-потоки

- **Главная** (`app/page.tsx`) — включает CTA «Войти/Регистрация» и блок с информацией об авторе.
- **Login** (`app/login/page.tsx`) — поля email/пароль, OTP-инпут, обработка ошибок:

```tsx
const res = await api.post("/auth/login", { 
  email: email.trim(), 
  password, 
  code: code.trim() || undefined
});
await refetchUser();
router.push("/dashboard");
```

- **Register** (`app/register/page.tsx`) — валидации, генератор сильного пароля:

```tsx
function generateStrongPassword() {
  const length = 12;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  setPassword(password);
}
```

- Middleware (`frontend/src/app/middleware.ts`) гарантирует, что защищенные маршруты (`/dashboard`, `/settings`) доступны только с cookie `access_token`:

```ts
const protectedPaths = ['/dashboard', '/settings'];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const token = req.cookies.get('access_token')?.value;

  if (protectedPaths.some(path => url.pathname.startsWith(path)) && !token) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  return NextResponse.next();
}
```

Если пользователь удаляет cookies или токен истекает, любой запрос к защищенному роуту мгновенно редиректится на `/login`, а клиент (AuthContext + interceptors) очищает локальное состояние.
- **Email confirmation**, **Forgot/Reset password** — страницы с friendly UI и alert-состояниями.
- **Dashboard** (`app/dashboard/page.tsx`) — drag-and-drop загрузчик, список файлов, операции скачивания/удаления:

```tsx
const { getRootProps, getInputProps } = useDropzone({
  onDrop: setSelectedFiles,
  multiple: true,
  maxSize: 100 * 1024 * 1024,
});

async function handleUpload() {
  for (const file of selectedFiles) {
    const formData = new FormData();
    formData.append('files', file);
    await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  await loadFiles();
}
```

- **Settings** (`app/settings/page.tsx`) — комбинирует компонент смены пароля и мастера 2FA: генерация QR через `qrcode.react`, копирование otpauth URL, проверка кода, UI для отключения 2FA с подтверждением. Toast-уведомления приходят из `useToast`.

- **Navigation** (`src/components/Navigation.tsx`) показывает кнопки «Файлы», «Настройки», индикатор пользователя и кнопку выхода, переключатель темы, skeleton-состояния на время загрузки.

---

## Пользовательские сценарии

1. **Регистрация и подтверждение почты**
   - Заполнить форму `/register`.
   - Получить письмо `Подтвердите ваш email` с ссылкой `/confirm-email?token=...`.
   - После подтверждения доступен вход.

2. **Вход с 2FA**
   - На `/login` ввести email/пароль.
   - Если 2FA включена, ввести код из приложения (Google Authenticator и др.).
   - JWT сохраняется в cookie; фронтенд перенаправляет в `/dashboard`.

3. **Загрузка и управление файлами**
   - В `/dashboard` перетащить один или несколько файлов.
   - Backend шифрует каждый файл, хранит ключ в БД и encrypted blob в `files/`.
   - Таблица «Ваши файлы» позволяет скачивать (декрипт через API) и удалять файлы.

4. **Восстановление доступа**
   - На `/forgot-password` отправляется email.
   - Письмо ведет на `/reset-password?token=...`, где можно задать новый пароль.

5. **Настройка безопасности**
   - На `/settings` можно сменить пароль и включить 2FA: backend выдает `otpauth_url`, фронт отображает QR + manual key, пользователь подтверждает кодом.
   - Доступна форма отключения 2FA (требует пароль и TOTP-код).

---

## Тестирование и расширение

- **Unit/интеграционные тесты** можно добавлять в `tests/` — сейчас директория пустая.
- **Инфраструктура** — рядом лежат `docker-compose.yml` и `docker/` (при необходимости адаптируйте под Kubernetes/S3 и т.п.).
- **Безопасность** — при разворачивании в проде уберите `print(Settings())` в `get_settings`, настройте HTTPS и S3-хранилище вместо локальной директории.
- **Фронтенд** — легко добавляет новые разделы (например, просмотр превью файлов) через App Router.
