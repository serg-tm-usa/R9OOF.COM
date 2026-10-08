> Параноидальный разбор брейншторм-чата, 2026-10-08: Penpot и AppFlowy (T-46, T-47). Репозитории прочитаны только на чтение, ничего не запускалось и не ставилось. Это предложение; установка — по решению владельца, после отчёта SkillSpector. Примеры из конкретных проектов — иллюстрации.

# Penpot и AppFlowy: исследование перед локальной установкой

Всё ниже взято из исходников в `/home/user/penpot` и `/home/user/AppFlowy` (ничего не запускалось и не менялось). К GitHub API (список GHSA, последние релизы) доступа из сессии нет, поэтому список уязвимостей собран по `CHANGES.md`, `SECURITY.md` и коду; его стоит дополнить вручную на страницах `/security/advisories` обоих проектов.

---

## 1. Что это

| | Penpot | AppFlowy |
|---|---|---|
| Назначение | Веб-редактор дизайна (аналог Figma), self-hosted | Заметки/базы (аналог Notion), настольное + мобильное |
| Стек | Clojure (backend, JVM) + ClojureScript/React (frontend) + Node/Playwright (exporter) + Rust/WASM рендер + PostgreSQL 15 + Valkey (Redis) + nginx | Flutter/Dart (UI) + Rust (`frontend/rust-lib`, через FFI) + RocksDB + SQLite + CRDT (yrs, библиотека AppFlowy-Collab) |
| Размер | ~297 МБ без `.git`, 6530 файлов | ~55 МБ без `.git`, 4597 файлов |
| Версия | Ветка `develop`, `CHANGES.md` → «2.19.0 (Unreleased)», последний релиз в журнале 2.18.3; compose по умолчанию тянет образы `2.18`. Тегов в клоне нет | `pubspec.yaml`: 0.11.4; теги до 0.14.8 (клон отстаёт от тегов, CHANGELOG заканчивается 0.11.4 от 09.03.2026) |
| Последний коммит | 28c576e1, 2026-10-08 «Preserve admin console URL path segments» | 5cf3a365, 2026-06-26 «chore: revert en-US i18n change» |
| Лицензия (по LICENSE) | MPL-2.0 | AGPL-3.0 |
| Закрытые/платные части | Код весь открыт, но: образ `penpotapp/admin-console` (в compose обязателен для фронтенда через `depends_on`) в репозитории отсутствует — собирается из другого источника; «remote MCP server» и Penpot Hub — облачные сервисы; флаг `is-saas` и ссылки на `penpot.app/pricing` в UI | Приложение открыто; **сервер** (AppFlowy Cloud: сайт, синхронизация, AI, публикация страниц) — отдельный репозиторий `AppFlowy-IO/AppFlowy-Cloud` (в клиенте подключён как crate `client-api`, rev `592f644`). В клиенте есть код подписок/оплаты (`createSubscription`, `PaymentLinkPB` в `lib/user/application/user_service.dart`), облачный AI и публикация на `appflowy.com/app/...` работают только через их облако |

---

## 2. Устройство и установка

### Penpot (`/home/user/penpot/docker/images/docker-compose.yaml`)

| Сервис | Образ | Порт | Роль |
|---|---|---|---|
| penpot-frontend | penpotapp/frontend:2.18 (nginx, непривилегированный) | 9001→8080 (единственный наружу) | статика + реверс-прокси на backend, exporter, admin-console, mcp |
| penpot-backend | penpotapp/backend:2.18 (JVM) | 6060 (внутри) | API (RPC), хранение файлов, worker |
| penpot-exporter | penpotapp/exporter:2.18 (Node + Playwright/Chromium) | 6061 (внутри) | экспорт PNG/PDF/SVG/WebP через headless-браузер, вызывает ImageMagick `convert` |
| penpot-admin-console | penpotapp/admin-console:2.18 | 3000 (внутри) | админка (включается флагом `enable-admin-console`) |
| penpot-mcp | penpotapp/mcp:2.18 (Node) | 4401 HTTP / 4402 WS (внутри) | MCP-сервер (флаг `enable-mcp`) |
| penpot-postgres | postgres:15 | — | БД (том `penpot_postgres_v15`) |
| penpot-valkey | valkey/valkey:8.1 | — | pub/sub, очереди экспортёра |
| penpot-mailpit | axllent/mailpit:v1 | **8025 наружу** | ловушка почты, письма в памяти |

Хранение: файлы дизайна в PostgreSQL (`file-data-backend "db"`), бинарные медиа и шрифты — в томе `penpot_assets` (`/opt/data/assets`, `PENPOT_OBJECTS_STORAGE_BACKEND: fs`), опционально S3. Тома: `penpot_postgres_v15`, `penpot_assets`. Требования: Docker + Compose; JVM-backend и Chromium экспортёра на практике требуют порядка 4 ГБ ОЗУ (в документации `docs/technical-guide/getting-started/docker.md` цифр нет).

Compose по умолчанию выставляет **небезопасные флаги для «localhost»**: `disable-email-verification enable-smtp enable-prepl-server disable-secure-session-cookies enable-mcp enable-admin-console`, `PENPOT_SECRET_KEY: change-this-insecure-key`, `PENPOT_TELEMETRY_ENABLED: "true"`.

### AppFlowy

- Настольное приложение Flutter + Rust. Сборка: `frontend/Makefile.toml` (cargo-make), Flutter ≥ 3.27.4, Rust 1.85 (`rust-toolchain.toml`). Готовые сборки: GitHub Releases (`install.sh` просто качает tar.gz в `/opt`).
- «Свой сервер» = отдельный репозиторий **AppFlowy-Cloud** (Rust-сервис + GoTrue для auth + PostgreSQL с pgvector + Redis + MinIO/S3 + nginx + admin_frontend + опциональный AI-сервис). Клиент ждёт три URL: `base_url`, `ws_base_url`, `gotrue_url` (`lib/env/backend_env.dart`). Для одного человека он **не нужен**: режим `AuthenticatorType.local` (`lib/env/cloud_env.dart`) работает полностью офлайн.
- Данные локально: `getApplicationSupportDirectory()/data` (`lib/startup/tasks/rust_sdk.dart`), т.е. Linux `~/.local/share/io.appflowy.appflowy/data` (APPLICATION_ID в `linux/CMakeLists.txt`), macOS `~/Library/Application Support/AppFlowy/data`, Windows `%APPDATA%\AppFlowy\data`. Путь можно сменить в настройках. Внутри для локального режима папка `data_anonymous` (для облака — `data_<base64 url>`, `flowy-core/src/config.rs`), далее по `uid`: `collab_db/` (**RocksDB**, внутри бинарные CRDT-обновления yrs/Yjs для документов, папок, баз), `*.db` SQLite (профиль, настройки, метаданные), `collab_db_history/` (zip-бэкапы), `indexes/` (поиск), `models/`, векторная БД (`flowy-sqlite-vec`) для эмбеддингов.
- Чтение без приложения: практически нет — RocksDB с ключами проекта и бинарные CRDT-дельты; нужен crate `collab`. Экспорт из приложения: документ → Markdown / HTML / JSON / текст (`lib/workspace/application/export/document_exporter.dart`, `DocumentExportType`), база → CSV (`lib/plugins/database/application/share_bloc.dart`). Импорт: Markdown, Notion-zip (через cloud_service — в локальном режиме через local_server).

---

## 3. Сеть (параноидально)

### Penpot — что уходит наружу

| Канал | Куда | По умолчанию | Как отключить |
|---|---|---|---|
| Телеметрия backend (`backend/src/app/tasks/telemetry.clj`) | `https://telemetry.penpot.app/` | **ВКЛ** в compose (`PENPOT_TELEMETRY_ENABLED: "true"`), по коду — выкл, если не задано | `PENPOT_TELEMETRY_ENABLED: "false"` и убрать `enable-telemetry` из флагов |
| Что именно шлёт | версия, instance-id, `public-uri`, число команд/проектов/файлов/пользователей/комментариев, **список доменов e-mail всех пользователей** (`get-email-domains`), провайдеры auth, JVM/ОС, часовой пояс, суточные счётчики событий из `audit_log` с `profile_id`; плюс **e-mail подписчиков рассылки** (`props newsletter-updates = true`) | | **Внимание**: даже при выключенной телеметрии ветка `(when (and (not (cf/telemetry-excluded?)) send? @subs) (send-legacy-data cfg nil @subs))` отправляет e-mail тех, кто поставил галочку «newsletter» в профиле. Защита: не ставить галочку, либо заблокировать `telemetry.penpot.app` на файрволе/в `/etc/hosts` контейнера |
| Google Fonts | backend проксирует `fonts.googleapis.com`/`fonts.gstatic.com` через `/internal/gfonts/*` | ВКЛ (`enable-google-fonts-provider` в `flags/default`) | `disable-google-fonts-provider` в `PENPOT_FLAGS` |
| Проверка обновлений (`frontend/.../dashboard/check_updates.cljs`) | `https://raw.githubusercontent.com/penpot/penpot/refs/heads/staging/CHANGES.md` | по действию пользователя/админа («Check updates» в дашборде, фича 2.19) | не нажимать; или заблокировать хост |
| Link unfurl (`backend/src/app/http/link_preview.clj`) | произвольные URL, которые пользователь вставил | ВКЛ (`enable-link-unfurl`) | `disable-link-unfurl`; есть SSRF-защита (`ssrf-extra-blocked-cidrs`, блок приватных сетей и NAT64) |
| Плагины | URL манифеста/UI, которые вы сами добавили; магазин `penpot.app/penpothub` | только по действию | не ставить плагины с чужих хостов |
| SMTP | что укажете | mailpit внутри сети | оставить mailpit или `disable-smtp` |
| Sentry/PostHog/GA | **нет** (grep по frontend/backend — ни одного SDK; ошибки фронтенда уходят только в собственный backend, RPC `error-reports`) | — | — |
| Exporter | обращается к `PENPOT_INTERNAL_URI` (frontend внутри docker-сети) | — | — |

### AppFlowy (настольное) — что уходит наружу

| Канал | Куда | По умолчанию | Как отключить |
|---|---|---|---|
| Облако по умолчанию | `https://beta.appflowy.cloud` (`kAppflowyCloudUrl`, `cloud_env.dart`): если тип auth не задан — выставляется AppFlowy Cloud и показывается экран входа | **ВКЛ** | Нажать «Sign in as guest» / «Continue as anonymous» → `signUpAsGuest` → `AuthType::Local`, папка `data_anonymous`; либо собрать с `.env` `AUTHENTICATOR_TYPE=0` (`lib/env/env.dart`, default 2 = cloud) |
| Автообновление (`lib/startup/tasks/auto_update_task.dart`) | `https://github.com/AppFlowy-IO/AppFlowy/releases/latest/download/appcast-{os}-{arch}.xml` — **при каждом запуске**, на macOS/Windows через `auto_updater` (Sparkle/WinSparkle), на Linux только проверка | ВКЛ, переключателя в настройках нет | блокировать `github.com` для процесса (файрвол) или собрать из исходников, убрав задачу из `startup.dart` |
| Предпросмотр ссылок (`link_preview/link_parsers/default_parser.dart`, `youtube_parser.dart`) | сам URL (GET с клиента), `https://www.faviconextractor.com/favicon/<host>`, `https://www.google.com/s2/favicons?domain=<host>`, `https://www.youtube.com/oembed` | при вставке ссылки | не использовать блок «link preview» (вставлять как текст), либо блокировать хосты |
| Unsplash (`image/unsplash_image_widget.dart`) | `api.unsplash.com`, ключ приложения **захардкожен** в исходниках | только при выборе обложки | не открывать вкладку Unsplash |
| Google Fonts (`shared/google_fonts_extension.dart`, `google_fonts` без `allowRuntimeFetching=false`) | `fonts.googleapis.com` при выборе шрифта | по действию | не менять шрифт на не-системный |
| Local AI | `http://localhost:11434` (Ollama, `flowy-ai/src/local_ai/controller.rs`), модель для эмбеддингов `nomic-embed-text` | выкл | — |
| Cloud AI, публикация, уведомления, оплата | `appflowy.cloud`, `appflowy.com`, `beta.appflowy.com` | только при входе в облако | не входить |
| Sentry | есть только поле `SENTRY_DSN` в `env.dart`, SDK в `pubspec.yaml`/Cargo нет — **не используется** | — | — |
| FCM/Firebase | в `pubspec.yaml` нет; упоминание в CHANGELOG относится к мобильной сборке | — | — |
| device_id | `device_info_plus` (Android `device`, iOS id; на десктопе — генерируется) передаётся в Rust и далее в облако при входе | — | без облака не уходит |

Итог для AppFlowy в локальном режиме без вмешательства: при каждом старте уходит запрос на `github.com` (appcast), первый запуск показывает экран облака. Остальное — только по действиям пользователя.

---

## 4. Безопасность

### Penpot

- **Регистрация**: по умолчанию `enable-registration` (`common/src/app/common/flags.cljc`). Закрыть: `PENPOT_FLAGS: disable-registration enable-login-with-password` (вход по паролю оставить). Белый список доменов: `PENPOT_REGISTRATION_DOMAIN_WHITELIST` / `PENPOT_EMAIL_DOMAIN_WHITELIST` + `enable-email-whitelist`. В 2.19 починен обход `disable-registration` через страницу share-prototype (#5164).
- **Admin**: `PENPOT_ADMINS` (список e-mail → `is-admin`, `backend/src/app/rpc/commands/auth.clj:126`). Админ-консоль — отдельный образ, включается `enable-admin-console`; для одного человека её можно не включать.
- **Защита входа**: lockout 5 попыток / 15 мин, secure cookies (compose их отключает для http), sec-fetch-metadata и проверка клиентского заголовка (`backend/src/app/http/security.clj`), nginx отдаёт `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, опционально CSP/HSTS (`nginx-security-headers.conf.template`).
- **Чужой код — плагины**: исполняются в браузере в SES-компартменте (`plugins/libs/plugins-runtime/src/lib/create-sandbox.ts`, пакет `ses`), UI — iframe с чужого origin (URL на origin Penpot запрещён, `validate-url.ts`), права объявляются в манифесте (`content:write`, `library:write`, `comment:write`, `clipboard:write`, `user:read`; `frontend/src/app/plugins/register.cljs`). В 2.19 закрыты пропуски проверок прав (#11137) и широковещательный postMessage без проверки origin (#10968). Плагин всё равно читает весь файл и шлёт куда хочет — ставить только свои.
- **MCP**: сервер `mcp/packages/server` получает от LLM **произвольный JS** и выполняет его в плагине внутри браузера (README: «The LLM is free to write and execute arbitrary code snippets within the Penpot Plugin environment»). Слушает `localhost:4401/4402` (`PENPOT_MCP_SERVER_HOST`), есть nREPL-мост (`PENPOT_MCP_REPL_ENABLE`, порт 4403) — в devenv это полный доступ к рантайму. Токены — `access_token` типа `mcp` (`backend/src/app/rpc/commands/access_token.clj`).
- **Опасные флаги compose**: `enable-prepl-server` открывает Clojure prepl backend (внутри docker-сети, но это удалённый eval); `disable-secure-session-cookies`; `PENPOT_SECRET_KEY` по умолчанию.
- **SVG/медиа**: санитайзер SVG (скрипты, namespace-префиксы — 2.18.2, импорт binfile — 2.18.3), ImageMagick с policy (`docker/images/files/imagemagick-policy.xml`), лимиты на шрифты (`font-process-mem/cpu/timeout`).
- **История уязвимостей** (`CHANGES.md`, `SECURITY.md`): GHSA-4f36-m4hj-cv86 — command injection в SVG-экспортёре через legacy fill-color; GHSA-xp3f-g8rq-9px2 — чтение произвольных файлов через `create-font-variant`; «critical path traversal» (SECURITY.md, Ali Maharramli); 2.18/2.19: webhooks без авторизации (#11028), asset-эндпоинты без проверки прав (#11035), WebSocket-подписки без проверки прав (#11052), SSRF в SSO-валидации (#11064), обход rate-limit (#11253), доступ бывших участников команды к файлам (#12106), ключи кэша без tenant (#11407).
- **Слушать только 127.0.0.1**: в compose заменить `9001:8080` на `127.0.0.1:9001:8080`, `8025:8025` → `127.0.0.1:8025:8025` или убрать. nginx внутри слушает 8080 на всех интерфейсах и отдельный 8082 (внутренний); backend/exporter/mcp портов наружу не публикуют.

### AppFlowy

- Локальный режим: без авторизации вообще (один анонимный пользователь, данные в домашней папке без шифрования). Облачный — GoTrue (e-mail/magic link/OAuth Google/GitHub/Discord) на стороне AppFlowy-Cloud; закрытие регистрации — настройка GoTrue (`GOTRUE_DISABLE_SIGNUP`) в том репозитории, здесь не проверить.
- Чужой код: системы расширений нет. Есть **MCP-клиент** (`flowy-ai/src/mcp/manager.rs`, `MCPClient::new_stdio(config.server_cmd)`) — приложение само запускает процесс из настроек AI; подключать только свои команды. Local AI = HTTP к Ollama, бинарных «плагинов» с их сервера в текущем коде не качает (только проверка `ollama_server_url` и список моделей `/api/tags`).
- `SECURITY.md` отсутствует; в `CHANGELOG.md` нет ни одной записи с security/CVE — уязвимости надо смотреть на GitHub Security Advisories (у AppFlowy-Cloud они были, здесь недоступно).
- Хардкод ключей Unsplash в исходнике — утечка ключа проекта, для вас риск только в том, что запросы идут от вашего IP.
- Сетевые слушатели: настольное приложение портов не открывает (`NetworkMonitor` только проверяет connectivity).

---

## 5. Как ставить безопасно

### Penpot: минимум для одного человека

1. Скопировать `docker/images/docker-compose.yaml`, зафиксировать `PENPOT_VERSION=2.18.3` (не `2.18`, образы-плавающие теги переезжают) и, по-хорошему, `image: ...@sha256:` после первого `docker compose pull` (`docker images --digests`).
2. Переменные:
   ```
   PENPOT_FLAGS: disable-registration enable-login-with-password disable-email-verification disable-secure-session-cookies disable-telemetry disable-google-fonts-provider disable-link-unfurl disable-onboarding disable-dashboard-templates-section
   PENPOT_TELEMETRY_ENABLED: "false"
   PENPOT_SECRET_KEY: <python3 -c "import secrets; print(secrets.token_urlsafe(64))">
   PENPOT_PUBLIC_URI: http://localhost:9001
   PENPOT_ADMINS: you@example.com
   ```
   Убрать `enable-prepl-server`, `enable-mcp`, `enable-admin-console`; удалить сервисы `penpot-mcp`, `penpot-admin-console` и их `depends_on` у frontend (либо оставить admin-console, если образ понадобится; по compose фронтенд от него зависит). Порты: `127.0.0.1:9001:8080`, mailpit — `127.0.0.1:8025:8025`. Postgres-пароль сменить (он используется и admin-console).
3. Первый пользователь при `disable-registration`: `docker compose exec penpot-backend python3 manage.py create-profile` (в образе есть `manage.py`), либо временно включить регистрацию, создать себя, выключить.
4. Обновление: `docker compose pull` с новой зафиксированной версией → `up -d`; перед мажорным апгрейдом Postgres есть `docker/postgres-upgrade.sh`. Бэкап = дамп Postgres + том `penpot_assets`.
5. Снятие: `docker compose -p penpot down -v` (удалит тома), `docker rmi penpotapp/*`.
6. Дополнительно: на хосте запретить исходящий трафик контейнерам backend/frontend кроме необходимого (в локальном варианте им не нужен интернет вообще, кроме `docker pull`).

### AppFlowy: только настольное, без облака

Возможно. Сценарий: скачать релиз с GitHub Releases, сверить SHA-256/подпись (`dsa_pub.pem` в репо — ключ для Sparkle-обновлений), запустить, выбрать «Continue as guest/anonymous». Теряется: синхронизация между устройствами, мобильная версия с теми же данными, совместная работа, публикация страниц в веб, облачный AI, уведомления, импорт из Notion через облако (локальный импорт zip/markdown остаётся). Остаётся: все документы, базы, калькуляции, локальный AI через Ollama, экспорт Markdown/HTML/CSV, поиск.

Дополнительно: запретить процессу `AppFlowy` исходящие соединения (opensnitch/LuLu/брандмауэр Windows) кроме `127.0.0.1:11434`; тогда автообновление и превью ссылок молча не работают. Обновлять руками скачиванием нового релиза; данные в `data/` переживают переустановку. Снять — удалить приложение и папку `data`.

---

## 6. Что это даёт системе Claude

### Penpot

- **Публичный API**: все RPC-методы backend доступны по HTTP с заголовком `Authorization: Token <access-token>` (токены создаются в профиле, `backend/src/app/rpc/commands/access_token.clj`), документация генерируется на `/api/_doc` и OpenAPI (`enable-backend-api-doc`, `enable-backend-openapi-doc` включены по умолчанию). Методы: `get-file` (весь документ: страницы, shapes, компоненты, цвета, типографика, токены), `update-file` (изменения, тот же протокол, что у редактора), `export-binfile`, экспорт через exporter (PNG/PDF/SVG/WebP). Webhooks (`/webhooks`, флаг `enable-webhooks`) — события файлов на ваш URL.
- **Формат `.penpot`** (v3, `backend/src/app/binfile/v3.clj`): ZIP с `manifest.json` и JSON по схемам: `files/<id>.json`, `files/<id>/pages/<page>.json`, `.../pages/<page>/<shape>.json`, `components/`, `colors/`, `typographies/`, `tokens-lib`, `media/`, `thumbnails/`. Это читаемый и собираемый без Penpot формат — Claude может генерировать/патчить макеты как JSON и импортировать.
- **Дизайн-токены**: нативная библиотека токенов (`tokens-lib`, синхронизация между файлами в 2.19), экспорт в формате DTCG JSON; CSS-инспектор в UI (`enable-inspect-styles`).
- **MCP** — официальный, в репозитории (`/home/user/penpot/mcp`): Streamable HTTP на `http://localhost:4401/mcp`, инструменты выполняют код Plugin API в открытом файле через WebSocket-плагин; для stdio-клиентов — `mcp-remote`. Для Claude Code это прямой путь «читать/писать макет», ценой запуска кода в браузере. Плагинный API (`plugins/libs/plugin-types`) — типизированный TS, по нему же можно писать собственный узкий плагин без MCP.
- Образец архитектуры: схемы данных через `malli` в `common/` разделяются backend/frontend; флаги `enable-/disable-` как единый механизм конфигурации; санитайзер SVG + SSRF-guard как готовые модули.

### AppFlowy

- **Данные**: CRDT (yrs) в RocksDB — для внешней записи нужен тот же crate `collab`/`collab-document`; «просто дописать файл» нельзя. Практичный путь для Claude: Markdown-импорт/экспорт и CSV, либо (если когда-то поднять AppFlowy-Cloud) его REST API (`client-api`). В настольном приложении HTTP API нет.
- **AI**: `flowy-ai` — чат, автодополнение, перевод/суммаризация строк БД через `langchain-rust` + `ollama-rs`; эмбеддинги документов в `flowy-sqlite-vec` (`sqlite-vec`) с `nomic-embed-text`; поиск по эмбеддингам локально. **MCP-клиент** (`af_mcp`, stdio) — приложение может подключать MCP-серверы; в теории туда можно подать MCP-сервер памяти системы Claude, но интеграция в UI на момент клона минимальна (менеджер подключений и список инструментов).
- Образец: конвейер «документ → абзацы → эмбеддинги → sqlite-vec» (`flowy-ai/src/embeddings/`) и изоляция папки данных по URL сервера (`make_user_data_folder`) — хорошие шаблоны для локальной памяти.

---

## 7. Риски

| Риск | Где | Как снять |
|---|---|---|
| Телеметрия включена в compose; шлёт домены e-mail, статистику, события audit_log | Penpot `docker-compose.yaml`, `tasks/telemetry.clj` | `PENPOT_TELEMETRY_ENABLED: "false"`, флаг `disable-telemetry` |
| E-mail подписчиков рассылки уходит даже при выключенной телеметрии | `telemetry.clj` ветка `(when-not enabled? ...)` | не ставить галочку newsletter; блок `telemetry.penpot.app` |
| Открытая регистрация | `flags/default` | `disable-registration enable-login-with-password`, `PENPOT_ADMINS` |
| Секретный ключ и пароль БД по умолчанию | compose | сгенерировать свои |
| prepl/REPL и MCP включены, nREPL-мост в MCP | compose флаги, `mcp/packages/server` | убрать `enable-prepl-server`, `enable-mcp`; MCP поднимать только на 127.0.0.1 и только на время сессии |
| LLM выполняет произвольный JS в браузере через MCP | `mcp/README.md` | использовать на копии файла; не держать в том же браузерном профиле другие сессии |
| Плагины — чужой код с доступом к файлу | `plugins-runtime` | только свои/проверенные, минимальные permissions в манифесте |
| Google Fonts через прокси, unfurl чужих ссылок | флаги `enable-google-fonts-provider`, `enable-link-unfurl` | `disable-google-fonts-provider`, `disable-link-unfurl` |
| Порты 9001/8025 на всех интерфейсах | compose | `127.0.0.1:` перед портами |
| Exporter с Chromium и ImageMagick (история command injection) | `exporter/`, GHSA-4f36 | держать актуальную версию, не давать интернет контейнеру |
| Плавающий тег образов `2.18` | compose | пин `2.18.3` + digest |
| Admin-console — образ без исходников в репо | compose | не включать (`enable-admin-console` убрать, сервис удалить) |
| AppFlowy по умолчанию заводит облако `beta.appflowy.cloud` | `cloud_env.dart` | войти как гость (local), или сборка с `AUTHENTICATOR_TYPE=0` |
| Запрос appcast на GitHub при каждом старте, авто-апдейт на macOS/Windows | `auto_update_task.dart` | файрвол для процесса; обновлять вручную |
| Превью ссылок уходит в faviconextractor.com / google.com / youtube | `link_parsers/*.dart` | не использовать блок превью, блок хостов |
| Unsplash с захардкоженным ключом, Google Fonts по выбору | `unsplash_image_widget.dart`, `google_fonts_extension.dart` | не открывать Unsplash, оставить системный шрифт |
| MCP-клиент запускает произвольные команды из настроек | `flowy-ai/src/mcp/manager.rs` | не добавлять чужие серверы |
| Нет SECURITY.md и записей об уязвимостях | AppFlowy | проверять GitHub Advisories вручную перед обновлением |
| Данные без шифрования в домашней папке, формат непрозрачный | `data/collab_db` | FDE на диске; регулярный экспорт в Markdown как читаемая копия |

Ключевые файлы: `/home/user/penpot/docker/images/docker-compose.yaml`, `/home/user/penpot/backend/src/app/config.clj`, `/home/user/penpot/common/src/app/common/flags.cljc`, `/home/user/penpot/backend/src/app/tasks/telemetry.clj`, `/home/user/penpot/mcp/README.md`, `/home/user/penpot/CHANGES.md`; `/home/user/AppFlowy/frontend/appflowy_flutter/lib/env/cloud_env.dart`, `/home/user/AppFlowy/frontend/appflowy_flutter/lib/startup/tasks/auto_update_task.dart`, `/home/user/AppFlowy/frontend/appflowy_flutter/lib/startup/tasks/rust_sdk.dart`, `/home/user/AppFlowy/frontend/rust-lib/flowy-ai/src/local_ai/controller.rs`, `/home/user/AppFlowy/frontend/rust-lib/Cargo.toml`.
