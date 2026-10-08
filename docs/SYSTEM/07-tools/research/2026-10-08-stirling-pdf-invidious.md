> Параноидальный разбор брейншторм-чата, 2026-10-08: Stirling-PDF и Invidious (T-45, T-51). Репозитории прочитаны только на чтение, ничего не запускалось и не ставилось. Это предложение; установка — по решению владельца, после отчёта SkillSpector. Примеры из конкретных проектов — иллюстрации.

# Stirling-PDF и Invidious: разбор для локальной установки

Оба репозитория прочитаны только на диске (`/home/user/Stirling-PDF`, `/home/user/invidious`), ничего не запускалось. Оба клона с глубиной 1, поэтому история коммитов недоступна; история берётся из CHANGELOG и кода.

---

## Часть 1. Stirling-PDF

### 1.1 Что это

| Параметр | Значение | Источник |
|---|---|---|
| Назначение | Веб-набор инструментов для PDF (слияние, сжатие, OCR, конвертация, подпись и т. п.) с REST API | README, `app/core` |
| Стек | Java 25 + Spring Boot 4.1.1 (бэкенд), React/Vite (`frontend/editor`), Python 3.13 FastAPI (`engine/`, ИИ-движок), nginx во фронт-образе | `build.gradle`, `engine/pyproject.toml`, `docker/frontend/` |
| Версия | 3.1.0 | `build.gradle:125` |
| Последний коммит | `a107174` 2026-10-08 «Redesign the workbench add-files CTA (#8381)» | `git log` |
| Размер репо | 232 МБ, 8166 файлов | `du`, `git ls-files` |
| Лицензия | Корневой `LICENSE`: MIT, но с перечнем исключений | `LICENSE` |

**Что закрыто.** В корневом `LICENSE` прямо перечислены каталоги под отдельной лицензией «Stirling PDF User License» (`app/proprietary/LICENSE`, `engine/LICENSE`, те же условия): `app/proprietary/`, `app/saas/`, `engine/`, `frontend/editor/src/{proprietary,desktop,saas,cloud,portal,portal-saas}/`. Эта лицензия разрешает только «trial, evaluation, or minimal use» и запрещает production-использование без подписки. Важно для нас: **модуль логина, API-ключей, MCP-сервера, аудита, загрузки языков OCR через UI и детекции форм лежит в `app/proprietary`**, а docker-образ по умолчанию собирается с `STIRLING_FLAVOR=proprietary` (`docker/backend/Dockerfile:46`). Чисто MIT-ядро (`app/core`, `app/common`) даёт все PDF-операции и REST API, но без авторизации. Отключение проприетарного слоя: `DISABLE_ADDITIONAL_FEATURES=true` (тогда `userService == null` и логин невозможен, `ConfigController.java:250`).

### 1.2 Устройство

Процессы в одном контейнере (`scripts/init-without-ocr.sh`, запускается через `tini`): Java-приложение на **8080**, пул `unoserver` (LibreOffice headless, внутренний порт на 127.0.0.1), опционально Python-движок ИИ на **5001** (`aiEngine.url`, выключен по умолчанию). Фронт-образ отдельно: nginx на 80 (в compose 3000), проксирует `/api/` на бэкенд. Единый образ `docker/embedded/Dockerfile` ставит всё на 8080.

Что внутри базового образа `stirlingtools/stirling-pdf-base:1.1.0` (`docker/base/Dockerfile`):

| Компонент | Откуда | Зачем |
|---|---|---|
| LibreOffice writer/calc/impress/draw/base (PPA fresh) + unoserver | apt + pip | Office→PDF |
| Tesseract 5 + языки eng/deu/fra/por/chi-sim/osd | apt | OCR |
| ocrmypdf, weasyprint, pdf2image, opencv-headless, unpaper, pngquant | pip/apt | OCR, HTML→PDF, очистка сканов |
| Ghostscript (сборка из исходников), QPDF, ImageMagick 7 | сборка | сжатие, ремонт |
| Calibre 9.15 (с Qt WebEngine = Chromium) | download.calibre-ebook.com | ebook↔PDF |
| poppler-utils, fontforge, xvfb | apt | pdftohtml, шрифты |
| ONNX-модель `ffdetr-int8.onnx` с huggingface.co (sha256 проверяется) | на этапе сборки | детекция форм |
| Шрифты Noto/DejaVu/Liberation и др. | apt | |

Варианты: `ultra-lite` (только JRE + ядро, без LibreOffice/OCR/Calibre), `standard`, `fat` (+ ИИ-движок и шрифты для air-gapped). Размеры образов в репозитории не зафиксированы; по составу: ultra-lite в сотни МБ, standard и fat в районе 1.5–3 ГБ (оценка, не измерено).

Каталоги контейнера: `/configs` (settings.yml, БД H2, heap dumps), `/logs`, `/customFiles`, `/pipeline/{watchedFolders,finishedFolders}`, `/storage` (серверное хранилище файлов пользователей), `/tmp/stirling-pdf` (временные файлы), `/usr/share/tessdata` (монтируемые языки OCR). Пользователь внутри `stirlingpdfuser` uid 1000, `PUID/PGID/UMASK` настраиваемы.

### 1.3 Сеть (исходящие соединения)

| Куда | Когда | Как отключить |
|---|---|---|
| `https://eu.i.posthog.com` (ключ `phc_fiR65u…` зашит в `application.properties:94`) | Бэкенд: `PostHogService` при старте шлёт `system_info_captured` с метриками сервера и списком настроек, затем события операций. Гейт: `system.enableAnalytics && (enablePosthog != false)`. По умолчанию `enableAnalytics: null` → **выключено до ответа админа в мастере первого запуска** (`ApplicationProperties.java:1381`). | `SYSTEM_ENABLEANALYTICS=false`, `SYSTEM_ENABLEPOSTHOG=false` |
| PostHog из браузера (`usePosthogTracking.ts`, ключ через `VITE_PUBLIC_POSTHOG_*` на этапе сборки) | Только при согласии на cookie-баннере и `enableAnalytics` | те же флаги |
| `https://static.scarf.sh/a.png?x-pxid=3c1d68de…` (трекинг-пиксель) | Из браузера при смене маршрута, гейт `enableScarf !== false` и согласие | `SYSTEM_ENABLESCARF=false` |
| `https://supabase.stirling.com/functions/v1/updates`, запасной `raw.githubusercontent.com/.../release/build.gradle` | Из браузера, проверка обновлений при старте UI, гейт `config.shouldShowUpdate` (`system.showUpdate`, по умолчанию `true`) | `SYSTEM_SHOWUPDATE=false` |
| `https://api.keygen.sh/v1/accounts` | Проверка лицензии раз в 7 дней, **только если** `premium.enabled=true` | не включать `premium` |
| `https://raw.githubusercontent.com/tesseract-ocr/tessdata/`, `api.github.com/repos/tesseract-ocr/tessdata` | Загрузка языков OCR по кнопке в админке (proprietary) | не нажимать; языки класть в том `/usr/share/tessdata` руками |
| `https://huggingface.co/` (allowlist в `FormDetectionModelManager.java:63`) | Загрузка моделей детекции форм по действию админа; базовая модель уже в образе | не запускать |
| `trustlist.adobe.com/tl.pdf`, `ec.europa.eu/tools/lotl/eu-lotl.xml` | Списки доверия при валидации подписей, `useAATL/useEUTL: false` по умолчанию | оставить false |
| OCSP/CRL/AIA | `security.validation.allowAIA: false`, `revocation.mode: none` | оставить |
| `http://timestamp.digicert.com` и другие TSA | Только при операции «timestamp-pdf» | не использовать операцию |
| Любой URL пользователя | Операции `url/pdf`, `html/pdf`: `system.enableUrlToPDF: false` по умолчанию («known security issues»); для HTML есть SSRF-фильтр `html.urlSecurity` (блок RFC1918, localhost, 169.254.169.254) | оставить false, при желании `level: MAX` |
| `accounts.google.com`, `login.microsoftonline.com`, `api.github.com/user` | OAuth2/SAML, выключены | |
| SMTP, Telegram Bot API, S3, Stripe, Google Drive Picker, `app.stirlingpdf.com` (cloud-режим ИИ, `aiEngine.mode: CLOUD`) | Всё выключено по умолчанию | |
| Python-движок: PostHog (`STIRLING_POSTHOG_ENABLED`), OpenTelemetry, API Anthropic/OpenAI/VoyageAI | Только при `aiEngine.enabled=true` | не включать движок |

Фронтенд не тянет CDN и Google Fonts: в `frontend/editor/index.html` внешних ссылок нет, шрифты лежат в образе. Скрипт старта `init-without-ocr.sh` в сеть не ходит.

### 1.4 Безопасность

| Аспект | Факт |
|---|---|
| Авторизация | Логин живёт в proprietary-модуле. Шаблон настроек: `security.enableLogin: true`, но **все compose-примеры в репо ставят `SECURITY_ENABLELOGIN: "false"`**, то есть обычная установка открыта для всех. Включение: `SECURITY_ENABLELOGIN=true` + `SECURITY_INITIALLOGIN_USERNAME/PASSWORD`. Механизм: JWT (сессии) и per-user API-ключ в заголовке `X-API-KEY` (`JwtAuthenticationFilter.java:136`). Блокировка после 5 неудач. |
| CORS | `system.corsAllowedOrigins: []` → **разрешены все origin с credentials** (предупреждение в самом шаблоне). Для локалки задать явно. |
| Файлы | Временные файлы в `/tmp/stirling-pdf` (prefix `stirling-pdf-`), `TempFileCleanupService`: чистка каждые 30 мин, возраст 24 ч, чистка при старте. Серверное хранилище `/storage` (`storage.enabled: true`, но реально работает при включённом логине); шифрование at rest `storage.encryption.enabled: false`. Heap dumps при OOM пишутся в `/configs/heap_dumps` и **могут содержать содержимое документов**. |
| Чужой код | Конвертация Office идёт в LibreOffice под seccomp-обёрткой `docker/base/lo-sandbox.c` и профилем `stirling-hardening.xcd` (макросы запрещены, OLE/активный контент выключен, обновление ссылок отключено). Calibre содержит Chromium для ebook→PDF. `show-javascript` только показывает JS из PDF, не исполняет. `html/pdf` через weasyprint с URL-фильтром. `sanitize-pdf` вырезает JS/ссылки/метаданные. Пайплайны исполняют только собственные операции, произвольного кода нет. |
| Метрики | `metrics.enabled: true` открывает `/api/v1/info/*`; `googlevisibility: false` → robots disallow. |
| История уязвимостей | `SECURITY.md`: только процедура (security@stirlingpdf.com, GitHub advisory), поддерживается только последняя версия, backport нет. В репо упомянуты подавленные CVE зависимостей в `build.gradle:248-255` (CVE-2022-25647, CVE-2024-47554, CVE-2025-48924, CVE-2025-66453) и CVE-2026-46678 в `engine/pyproject.toml`. Комментарии в коде указывают на закрытые SSRF (allowlist huggingface, фильтр HTML-URL, `s3.allowPrivateEndpoints`). ffmpeg убран из образа «due to raised CVEs». |
| Что слушать на 127.0.0.1 | Только 8080 (или 3000 у фронта). Порт 5001 движка и unoserver наружу не публиковать. |

### 1.5 Безопасная установка (один пользователь, локально)

```yaml
services:
  stirling-pdf:
    image: docker.stirlingpdf.com/stirlingtools/stirling-pdf:1.x.y   # взять точный тег+digest из релиза
    container_name: stirling-pdf
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - ./stirling/config:/configs
      - ./stirling/logs:/logs
      - ./stirling/tessdata:/usr/share/tessdata
      - ./stirling/pipeline:/pipeline
      - ./stirling/storage:/storage
    environment:
      SECURITY_ENABLELOGIN: "true"
      SECURITY_INITIALLOGIN_USERNAME: "admin"
      SECURITY_INITIALLOGIN_PASSWORD: "длинный_пароль"
      SYSTEM_ENABLEANALYTICS: "false"
      SYSTEM_ENABLEPOSTHOG: "false"
      SYSTEM_ENABLESCARF: "false"
      SYSTEM_SHOWUPDATE: "false"
      SYSTEM_ENABLEURLTOPDF: "false"
      SYSTEM_CORSALLOWEDORIGINS: "http://127.0.0.1:8080"
      METRICS_ENABLED: "false"
      SYSTEM_MAXFILESIZE: "200"
      PUID: 1000
      PGID: 1000
    deploy: { resources: { limits: { memory: 4G } } }
```

Дополнительно: `--network none` невозможен (нужен loopback между nginx и Java в split-варианте), но для единого образа можно создать внутреннюю сеть `internal: true` и тогда никакие исходящие запросы физически не пройдут; на Windows с Docker Desktop это работает. Образ Stirling для ultra-lite: тот же путь с суффиксом `-ultra-lite`; тег в репо не зафиксирован, подставить из релиза и закрепить `@sha256`.

Обновление: `docker compose pull && docker compose up -d`, перед этим прочитать CHANGELOG релиза; `settings.yml` в `/configs` мигрируется автоматически (отсутствующие ключи дописываются, закомментированные удаляются). Снятие: `docker compose down -v`, удалить каталог `./stirling`, `docker image rm`.

### 1.6 Что даёт системе Claude

**REST.** Все операции — `POST multipart/form-data` на `/api/v1/{группа}/{операция}`, файл в поле `fileInput`, параметры обычными полями формы, ответ: PDF/zip/JSON. Группы: `general`, `convert`, `misc`, `security`, `filter`, `form`, `pipeline`. Полный перечень из аннотаций `@AutoJobPostMapping` (108 штук):

`merge-pdfs, split-pages, split-by-size-or-count, split-pdf-by-chapters, split-pdf-by-sections, rotate-pdf, remove-pages, rearrange-pages, scale-pages, crop, multi-page-layout, pdf-to-single-page, booklet-imposition, split-for-poster-print, overlay-pdfs, edit-table-of-contents, edit-text, compress-pdf, decompress-pdf, repair, flatten, ocr-pdf, auto-rotate-pdf, auto-split-pdf, auto-rename, auto-redact, redact, redact-execute, remove-blanks, remove-image-pdf, replace-invert-pdf, scanner-effect, add-page-numbers, add-stamp, add-watermark, add-image, add-attachments, add-comments, extract-images, extract-image-scans, extract-bookmarks, extract-attachments, update-metadata, get-info-on-pdf, basic-info, page-count, page-dimensions, document-properties, font-info, security-info, annotation-info, form-fields, show-javascript, sanitize-pdf, add-password, remove-password, timestamp-pdf, validate-signature, verify-pdf, remove-cert-sign, unlock-pdf-forms, create-portfolio, flatten-portfolio, filter-*` и конвертеры `convert/{img,html,markdown,svg,url,eml,ebook,cbz,cbr,file,vector,text-editor}/pdf`, `convert/pdf/{img,word,xlsx,presentation,text,html,markdown,csv,xml,pdfa,epub,cbz,cbr,vector,video}`; формы: `form/fields, fill, add-fields, …`.

Асинхронно: добавить поле `async=true`, затем `GET /api/v1/general/job/{jobId}`, `GET .../job/{jobId}/result`, `DELETE .../job/{jobId}`. OpenAPI: `GET /v1/api-docs`, Swagger `/swagger-ui.html`. Авторизация: заголовок `X-API-KEY: <ключ пользователя>`.

**Пайплайны** (`POST /api/v1/pipeline/handleData`, поля `fileInput[]` и `json`), формат `PipelineConfig`:
```json
{ "name": "OCR images",
  "pipeline": [
    { "operation": "/api/v1/convert/img/pdf", "parameters": { "fitOption": "fillPage", "fileInput": "automated" } },
    { "operation": "/api/v1/general/merge-pdfs", "parameters": { "sortType": "orderProvided", "fileInput": "automated" } },
    { "operation": "/api/v1/misc/ocr-pdf", "parameters": { "languages": ["eng"], "ocrType": "skip-text", "fileInput": "automated" } } ],
  "outputDir": "{outputFolder}/{folderName}",
  "outputFileName": "{filename}-{pipelineName}-{date}-{time}" }
```
Те же JSON кладутся в `/pipeline/watchedFolders/<имя>/` для автоматической обработки (`autoPipeline`, проверка «файл дописан» 5 с, `allowedExtensions`).

**MCP.** В proprietary есть готовый Streamable-HTTP MCP-сервер `POST /mcp` (`McpServerController.java`), выключен (`mcp.enabled: false`). Режим `mcp.auth.mode: apikey` работает без внешнего IdP: Claude Desktop/Code подключается к `http://127.0.0.1:8080/mcp` с `X-API-KEY`. Инструменты сгруппированы по категориям (`stirling_convert`, `stirling_pages`, `stirling_security`, `stirling_misc`, `stirling_upload`, `stirling_download`, `stirling_ai`) плюс `describe_operation`; allow/deny-списки `mcp.allowedOperations/blockedOperations`. Подпадает под проприетарную лицензию (см. 1.1). Альтернатива без MCP: тонкий скилл поверх REST через `curl`.

**Что взять как образец.** Описание операции в одной аннотации: `@AutoJobPostMapping(value, consumes, timeout, retryCount, queueable, resourceWeight)` + `@ToolIO(accepts=[PDF, IMAGE], produces=PDF, arity=SISO|MIMO, inputExtensions=…)` + `@StandardPdfResponse`; из этого же генерируются OpenAPI, фронт и каталог MCP (`McpToolCatalog` + `SimpleSchemaGenerator` строят JSON-schema из тех же классов запросов). Перечень форматов `ToolFormat` с расширениями — удобный реестр типов для маршрутизации файлов в скиллах.

---

## Часть 2. Invidious

### 2.1 Что это

| Параметр | Значение | Источник |
|---|---|---|
| Назначение | Альтернативный фронтенд YouTube без JS Google, с JSON API, подписками и плейлистами без Google-аккаунта | README |
| Стек | Crystal 1.21 (Kemal), PostgreSQL 14, статический бинарник на Alpine 3.24; плеер video.js; OpenSSL 3.6.4 собирается вручную из-за утечки памяти | `docker/Dockerfile`, `shard.yml` |
| Версия | `2.20260804.1-dev` | `shard.yml:2` |
| Последний коммит | `381c6e8` 2026-09-30 (bump nixpkgs) | `git log` |
| Размер | 6.8 МБ, 370 файлов; итоговый образ: один бинарник + rsvg + шрифты, порядка 100 МБ | `du`, Dockerfile |
| Лицензия | AGPL-3.0 (`LICENSE`); `modified_source_code_url` в конфиге для публикации изменённого кода | |

### 2.2 Устройство

Процессы: `invidious` (порт **3000**, `host_binding: 0.0.0.0` по умолчанию внутри контейнера; dev-compose публикует `127.0.0.1:3000`), `postgres:14` (5432, только внутри сети compose), и начиная с v2.20250913.0 отдельный контейнер **invidious-companion** (порт 8282, репо `iv-org/invidious-companion`, Deno + YouTube.js). Фоновые задачи (`src/invidious/jobs/`): обновление каналов подписок, уведомления, очистка, `InstanceListRefreshJob`. Пользователь `invidious` uid 1000, `tini`. Браузеры/ffmpeg внутри нет; видео не перекодируется, а проксируется.

БД (`config/sql/`): `users` (email, пароль-хэш, подписки, настройки), `session_ids`, `playlists`, `playlist_videos`, `channels`, `channel_videos`, `videos` (кеш метаданных), `nonces`, `annotations`.

### 2.3 Сеть

| Куда | Что | Отключение |
|---|---|---|
| `www.youtube.com/youtubei/v1/*` (Innertube) | Метаданные, поиск, комментарии, субтитры; Invidious представляется клиентами WEB, MWEB, ANDROID 21.29, IOS 20.11, ANDROID_TESTSUITE, TVHTML5 (`yt_backend/youtube_api.cr`) | нельзя, это суть |
| `*.googlevideo.com` | Потоки видео через `/videoplayback` (серверный прокси) или напрямую из браузера при `disable_proxy` | `disable_proxy: false` = всё через сервер |
| `i.ytimg.com`, `yt3.ggpht.com` | Превью и аватары через `/vi/`, `/ggpht/`, `/sb/` | то же |
| `suggestqueries-clients6.youtube.com` | Подсказки поиска | не вызывать `/api/v1/search/suggestions` |
| **`https://api.invidious.io/instances.json`** | `InstanceListRefreshJob` **регистрируется безусловно** (`src/invidious.cr:212`) и опрашивает каждые 30 мин для кнопки «сменить инстанс» (`redirect.invidious.io`). Конфиг-ключа для отключения нет. | только сетевой фильтр (DNS/egress) или правка кода |
| `pubsubhubbub.appspot.com` | Подписка на push-уведомления каналов, `use_pubsub_feeds: false` | оставить false |
| `api.invidious.io` ← ваш инстанс | `statistics_enabled: false` открывает `/api/v1/stats` с числом пользователей; нужно только публичным | оставить false |
| Телеметрия/аналитика | Нет. PostHog/Sentry/GA отсутствуют; CSP строгий (`before_all.cr:46`), внешних `<script src>` нет, video.js лежит в `assets` | |
| Проверка обновлений | Нет | |
| `http_proxy` (http/socks5) и `force_resolve: ipv4/ipv6` | Исходящие к YouTube через прокси; потоки видео проксирует уже companion | |

**po_token / visitor_data.** Это токены Google-аттестации (BotGuard): `visitor_data` идентифицирует «посетителя», `po_token` (Proof-of-Origin) подтверждает, что запрос сделан реальным браузером/приложением; без них YouTube отдаёт 403 или «Sign in to confirm you're not a bot». До 2025 они задавались в `config.yml` и получались скриптом (`youtube-trusted-session-generator`), плюс `inv_sig_helper` расшифровывал подписи. В текущем коде этих ключей **нет** (grep по `config.example.yml` и `src` пуст): всё перенесено в `invidious-companion`, который сам держит сессию и генерирует токены (`invidious_companion: [{private_url}]`, `invidious_companion_key` ровно 16 символов). Без companion Invidious работает «на удачу» через мобильные клиенты, CHANGELOG v2.20250314 предупреждает, что воспроизведение без companion/po_token ненадёжно.

**Как часто ломается.** Релизы: 2024-04, 2024-08 (три подряд), 2024-11, 2025-03, 2025-05 (два), 2025-09, 2026-02, 2026-06, 2026-07, 2026-08 (два). В CHANGELOG v2.20260723.0: «fixes YouTube backend changes that broke video metadata and playback», hotfix #5819; в 2024 — серия po_token/WEB_EMBED/WEB_CREATOR переключений. Ожидать поломки раз в несколько месяцев и необходимость обновлять companion чаще, чем сам Invidious.

### 2.4 Безопасность

| Аспект | Факт |
|---|---|
| Доступ | Встроенной защиты «только для своих» нет. `registration_enabled: true`, `login_enabled: true`, `captcha_enabled: true` (собственная, без третьих сторон). Для одного человека: завести аккаунт, затем `registration_enabled: false`. Админы — список `admins` (логины). API `/api/v1/videos` и т. п. открыт всем, кто дотянется до порта → слушать только 127.0.0.1. |
| Секреты | `hmac_key` (CSRF, cookie, pubsub) и `invidious_companion_key` обязательно заменить, в compose стоит `CHANGE_ME!!`; пароль БД `kemal/kemal`. |
| Данные | Всё в PostgreSQL: подписки, история просмотров (можно отключить в настройках пользователя), плейлисты, токены API (`/api/v1/auth/tokens`). Временных файлов нет: потоки стримятся. Логи в STDOUT, `log_level: Info`; с 2026-06 поиск через POST, чтобы запросы не попадали в логи. |
| Чужой код | Не выполняется: нет конвертеров, нет браузера. Риски — парсинг ответов YouTube (XML/JSON) на Crystal и SSRF через `/videoplayback?host=` (ограничен доменами googlevideo). |
| История | `SECURITY.md` нет. CVE/GHSA в репо не упоминаются. CHANGELOG v2.20260723.0: закрыта cross-user удаление плейлистов (#5790), добавлен `disable_abusable_api`; v2.20260626.0: RSS отдавал приватные плейлисты без авторизации (исправлено), cookies на альтернативных доменах. |
| 127.0.0.1 | 3000 (Invidious), 8282 (companion), 5432 (Postgres) — наружу не публиковать вообще. |

### 2.5 Безопасная установка

```yaml
services:
  invidious:
    image: quay.io/invidious/invidious:v2.20260804.1   # пиннуть тег из релиза + @sha256
    restart: unless-stopped
    ports: ["127.0.0.1:3000:3000"]
    depends_on: { invidious-db: { condition: service_healthy } }
    environment:
      INVIDIOUS_CONFIG: |
        db: { dbname: invidious, user: kemal, password: "СЛУЧАЙНЫЙ", host: invidious-db, port: 5432 }
        check_tables: true
        hmac_key: "pwgen 32 1"
        invidious_companion:
          - private_url: "http://invidious-companion:8282/companion"
        invidious_companion_key: "ровно16символов!"
        registration_enabled: true      # после создания своего аккаунта -> false
        statistics_enabled: false
        popular_enabled: false
        use_pubsub_feeds: false
        disable_proxy: false
        log_level: Warn
    logging: { options: { max-size: "10m", max-file: "3" } }
    healthcheck: { test: "wget -nv --tries=1 --spider http://127.0.0.1:3000/api/v1/stats || exit 1", interval: 30s }
  invidious-companion:
    image: quay.io/invidious/invidious-companion:latest   # пиннуть
    restart: unless-stopped
    environment: { SERVER_SECRET_KEY: "ровно16символов!" }
    volumes: [ companioncache:/var/tmp/youtubei.js:rw ]
    cap_drop: [ALL]; read_only: true; security_opt: [no-new-privileges:true]
  invidious-db:
    image: docker.io/library/postgres:14
    restart: unless-stopped
    volumes: [ postgresdata:/var/lib/postgresql/data ]
    environment: { POSTGRES_DB: invidious, POSTGRES_USER: kemal, POSTGRES_PASSWORD: "СЛУЧАЙНЫЙ" }
    healthcheck: { test: ["CMD-SHELL","pg_isready -U kemal -d invidious"] }
volumes: { postgresdata: {}, companioncache: {} }
```
Имя образа `quay.io/invidious/invidious` берётся из docs.invidious.io (в репозитории не зафиксировано; dev-compose собирает из исходников). Обновление: `docker compose pull && up -d`, миграции схемы при `check_tables: true` выполняются сами. Снятие: `down -v`. Опрос `api.invidious.io` отключается только сетевым фильтром (например, `extra_hosts: ["api.invidious.io:127.0.0.1"]` в compose — грубый, но рабочий приём).

### 2.6 Что даёт системе Claude

JSON без ключей (`src/invidious/routing.cr:247-328`):
- `GET /api/v1/videos/{id}` — метаданные, описание, форматы, субтитры (`captions[]` с `url`), рекомендации; `?fields=` для выборки полей.
- `GET /api/v1/captions/{id}` — список дорожек; `?label=`/`?lang=` → WebVTT; `?tlang=` автоперевод.
- `GET /api/v1/transcripts/{id}`, `/storyboards/{id}`, `/comments/{id}` (`?continuation=`), `/clips/{id}`.
- `GET /api/v1/channels/{ucid}` + `/videos|shorts|streams|playlists|podcasts|releases|courses|posts|search` с `?continuation=`.
- `GET /api/v1/search?q=&type=video|channel|playlist&sort=&date=&duration=&features=`, `/search/suggestions`, `/hashtag/{tag}`.
- `GET /api/v1/playlists/{plid}`, `/mixes/{rdid}`, `/resolveurl?url=`, `/trending`, `/popular`, `/stats`.
- С токеном (`Authorization: Bearer <token>` от `/api/v1/auth/tokens/register` или cookie `SID`): `/api/v1/auth/{preferences,subscriptions,feed,history,playlists,notifications,export/invidious,import/invidious}`.
- RSS: `/feed/channel/{ucid}`, `/feed/playlist/{plid}`, `/feed/private?token=`.

Для скилла: тонкий HTTP-клиент на `http://127.0.0.1:3000/api/v1`, таймауты, повторы при 500 (YouTube сломался), кеш ответов — Invidious сам кеширует `videos`. MCP-сервера в проекте нет; написать свой через `mcp-builder` просто, схемы ответов задокументированы в docs.invidious.io/api.

Образцы из устройства: реестр экземпляров — внешний `api.invidious.io/instances.json`, в коде `InstanceListRefreshJob` раз в 30 мин фильтрует по uptime/версии и держит список в памяти; `/api/v1/stats` как единый контракт «здоровье + версия + открыта ли регистрация»; `hmac_key` как один секрет для CSRF, cookie и webhook-подписей; `disable_abusable_api` как переключатель дорогих ручек.

---

## Часть 3. Сводная таблица рисков

| Риск | Где | Как снять |
|---|---|---|
| Stirling: без логина весь API открыт | compose-примеры `SECURITY_ENABLELOGIN: "false"` | `SECURITY_ENABLELOGIN=true`, initialLogin, порт только 127.0.0.1 |
| Stirling: PostHog-ключ зашит, метрики сервера и конфиг улетают | `application.properties:94`, `PostHogService` | `SYSTEM_ENABLEANALYTICS=false`, `SYSTEM_ENABLEPOSTHOG=false`; в мастере первого запуска ответить «нет» |
| Stirling: Scarf-пиксель из браузера | `scarfTracking.ts:88` | `SYSTEM_ENABLESCARF=false` |
| Stirling: проверка обновлений к supabase.stirling.com/GitHub | `updateService.ts:44` | `SYSTEM_SHOWUPDATE=false` |
| Stirling: CORS «все origin + credentials» | `corsAllowedOrigins: []` | задать явный список |
| Stirling: URL→PDF и HTML→PDF могут ходить по сети/в LAN (SSRF) | `enableUrlToPDF`, `html.urlSecurity` | оставить false; `level: MAX`; `endpoints.toRemove: ['url/pdf']` |
| Stirling: LibreOffice/Calibre(Chromium) обрабатывают чужие документы | base image | seccomp-обёртка уже есть; лимит памяти; для ненужного — `-ultra-lite` или `groupsToRemove: ['LibreOffice']` |
| Stirling: heap dump с содержимым файлов в `/configs/heap_dumps` | `_JVM_OPTS` в Dockerfile | `JAVA_CUSTOM_OPTS="-XX:-HeapDumpOnOutOfMemoryError"`, чистить том |
| Stirling: proprietary-слой с лицензией «не для production» | `app/proprietary`, `engine/` | решить: либо `DISABLE_ADDITIONAL_FEATURES=true` (без логина, за обратным прокси с basic-auth), либо осознанно использовать в режиме «minimal use» |
| Stirling: ИИ-движок с PostHog/OTEL и внешними LLM | `engine/`, `aiEngine.enabled` | не включать |
| Stirling: лицензия/keygen | `premium.enabled` | оставить false |
| Invidious: опрос api.invidious.io каждые 30 мин без выключателя | `InstanceListRefreshJob` | `extra_hosts` в 127.0.0.1 или egress-правило |
| Invidious: `hmac_key`, companion key, пароль БД = `CHANGE_ME`/`kemal` | compose, config | сгенерировать случайные |
| Invidious: открытая регистрация и открытый API | config по умолчанию | создать аккаунт → `registration_enabled: false`; порт 127.0.0.1; при нужде `disable_abusable_api` |
| Invidious: история просмотров и подписки в Postgres | таблица `users` | том под шифрованным диском; в настройках пользователя выключить историю; `down -v` при снятии |
| Invidious: IP владельца виден YouTube при каждом запросе | Innertube, googlevideo | `http_proxy` socks5 в Invidious и прокси в companion; `force_resolve` |
| Invidious: ломается при изменениях YouTube | CHANGELOG | следить за релизами companion, автообновление по тегу запретить, обновлять руками |
| Оба: `latest`-теги и непинованные образы | compose-примеры | тег + `@sha256` |
| Оба: публикация портов на 0.0.0.0 (Docker обходит Windows Firewall) | compose | везде `127.0.0.1:` перед портом, Postgres/companion/engine не публиковать |

Ключевые файлы: `/home/user/Stirling-PDF/app/core/src/main/resources/settings.yml.template`, `/home/user/Stirling-PDF/app/core/src/main/resources/application.properties`, `/home/user/Stirling-PDF/docker/base/Dockerfile`, `/home/user/Stirling-PDF/scripts/init-without-ocr.sh`, `/home/user/Stirling-PDF/app/common/src/main/java/stirling/software/common/service/PostHogService.java`, `/home/user/Stirling-PDF/app/proprietary/src/main/java/stirling/software/proprietary/mcp/`, `/home/user/invidious/config/config.example.yml`, `/home/user/invidious/src/invidious/routing.cr`, `/home/user/invidious/src/invidious/jobs/instance_refresh_job.cr`, `/home/user/invidious/src/invidious/yt_backend/youtube_api.cr`, `/home/user/invidious/CHANGELOG.md`.
