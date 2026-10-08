> Параноидальный разбор брейншторм-чата, 2026-10-08: MiroFish и Cloudflare Radar MCP (T-48, T-23). Репозитории прочитаны только на чтение, ничего не запускалось и не ставилось. Это предложение; установка — по решению владельца, после отчёта SkillSpector. Примеры из конкретных проектов — иллюстрации.

# Часть 1. MiroFish (666ghj) — аудит по коду, без запуска

Источники: локальная копия `/home/user/MiroFish` (shallow-clone, 1 коммит), страница репозитория и сырые файлы зависимостей (camel-oasis 0.2.5, camel-ai 0.2.78) на GitHub. Ничего не ставилось и не запускалось.

## 1. Что это

| Параметр | Значение |
|---|---|
| Проект | MiroFish — «群体智能引擎，预测万物» / «Swarm Intelligence Engine, Predicting Anything». Загружаешь «зерно» (отчёт, новость, роман), описываешь вопрос — движок строит граф знаний, порождает агентов-персон, гоняет их в симуляции Twitter+Reddit и пишет отчёт-прогноз |
| Автор / оригинал | `github.com/666ghj/MiroFish`, создан 2025-11-26, homepage mirofish.ai, спонсор Shanda (логотип в README), Discord/X/Instagram. 77,1k звёзд, 11,8k форков, 322 коммита |
| Версия | `package.json`/`pyproject.toml`: 0.1.0; релизы V0.1.0 (22 дек 2025), V0.1.1 (22 янв 2026), V0.1.2 (7 мар 2026, latest) |
| Последний коммит | `7657031` 2026-10-02 (+08:00), `github-actions[bot]`, «chore: update Star History (#832)». Последний коммит человека — 666ghj, 3 авг 2026 (CI). Последние правки кода — 22–23 июля 2026 (ontology JSON hardening, zep-cloud audit) |
| Стек | Backend: Python 3.11–3.12, Flask 3 + flask-cors, openai SDK, zep-cloud 3.25.0, camel-oasis 0.2.5 / camel-ai 0.2.78, PyMuPDF; менеджер uv (`uv.lock`, 185 пакетов). Frontend: Vue 3, Vite 7, axios, d3, vue-i18n. Node ≥18. Порты 5001 (API) и 3000 (UI) |
| Размер | локально 9,1 МБ без `.git`; на GitHub 16,8 МБ; backend ~30 .py-файлов + 19 тестов |
| Лицензия | `LICENSE` = полный текст GNU AGPL v3 (2007); в `package.json` и `pyproject` — `AGPL-3.0` |
| SECURITY.md | нет («This project has not set up a SECURITY.md file yet») |

## 2. Устройство

**Движок — OASIS (camel-ai), не своя реализация.** Backend Flask запускает подпроцесс `python backend/scripts/run_parallel_simulation.py --config <json>` (`simulation_runner.py:539`, `sys.executable`, без shell). Внутри: `oasis.make(platform=TWITTER)` и `oasis.make(platform=REDDIT)` параллельно, агенты — `generate_twitter_agent_graph`/`generate_reddit_agent_graph` из профилей, `semaphore=30` одновременных LLM-запросов на платформу.

**Пайплайн:** загрузка файлов (pdf/md/txt, ≤50 МБ) → текст режется на чанки 500 символов (overlap 50) → LLM генерирует онтологию (типы сущностей/рёбер) → чанки уходят в **Zep Cloud** как эпизоды, Zep сам извлекает сущности и граф → для каждой сущности LLM генерирует персону (`oasis_profile_generator.py`) → LLM генерирует конфиг симуляции (раунды, часы пик, активность) → симуляция → действия агентов батчами возвращаются в тот же граф Zep (`zep_graph_memory_updater.py`, `graph.add(type="text", source_description="MiroFish simulation activity batch")`) → ReportAgent с инструментами `panorama_search`, `quick_search`, `interview_agents` (опрос агентов через `ManualAction(INTERVIEW)`) пишет отчёт.

**Сколько агентов.** Фиксированного числа нет: население = число сущностей, извлечённых Zep из зерна (README говорит «тысячи», код — «сколько сущностей»). За раунд активируется случайная выборка: `agents_per_hour_min..max` (по умолчанию N/15..N/5, не более 0,9·N) × множитель (пик 1,5; ночь 0,3), с фильтром `active_hours` и вероятностью `activity_level` на агента (`run_parallel_simulation.py:1040`). Раунд = 60 симулируемых минут. README/.env: «расход большой, пробуйте <40 раундов».

**Память агентов — два слоя:**
1. **Zep Cloud** (`api.getzep.com/api/v2`, адрес зашит в `utils/zep.py:21`). Темпоральный граф: сущности, рёбра с `valid_at/invalid_at/expired` (в `zep_tools.py` есть `is_expired()/is_invalid()`), эпизоды с метаданными (simulation_id, platform, round, agent_ids, action_types). Поиск ограничен 400 символами запроса и 50 результатами. `ZEP_API_URL` **явно запрещён** («MiroFish 仅连接 Zep Cloud») — self-hosted Zep/Graphiti нельзя без правки кода. Neo4j в самом MiroFish не используется (библиотека `neo4j` в lock — транзитивно от camel-ai).
2. **В процессе симуляции**: каждый агент — camel `ChatAgent`; история сообщений копится в RAM без окна (`message_window_size=None`), состояние платформы — SQLite `twitter_simulation.db` / `reddit_simulation.db` в `backend/uploads/simulations/<id>/`, логи действий `actions.jsonl`.

**LLM-провайдеры.** Только OpenAI-совместимый Chat Completions: `openai.OpenAI(base_url=LLM_BASE_URL)` в backend и `ModelPlatformType.OPENAI` + `OPENAI_API_BASE_URL` в подпроцессе. Anthropic — нет. Ollama — нет нативно, но работает через его OpenAI-совместимый `http://127.0.0.1:11434/v1` при условии, что модель поддерживает tool calling (OASIS действует через function calls). Опциональный второй провайдер `LLM_BOOST_*` для второй платформы. **Офлайн-режима нет**: Zep Cloud обязателен (`Config.validate` падает без `ZEP_API_KEY`), плюс OASIS для Twitter-платформы ставит `recsys_type="twhin-bert"` и при первом шаге скачивает модель `Twitter/twhin-bert-base` с HuggingFace через `transformers` (а для рекомендаций «twitter» — `paraphrase-MiniLM-L6-v2`).

**Оценка расхода токенов (по коду).** За шаг активного агента: `env.step` → `perform_action_by_llm` → один `ChatAgent.astep` с инструментами; camel выполняет tool call и **снова вызывает модель**, пока модель не перестанет вызывать инструменты (`max_iteration=None`, то есть без лимита). Практически ≥2 запроса на агента на раунд, промпт = системная персона + свежая лента (`env.to_text_prompt()`) + вся накопленная история агента (растёт линейно с раундами). Формула: запросов ≈ раунды × активных агентов × 2 платформы × (2…k). Пример: 40 раундов × 20 агентов × 2 × 2 = ~3 200 запросов; при контексте 3–8k токенов к концу прогона это порядка 10–25 млн токенов на один прогон, не считая подготовки (онтология: несколько вызовов; персоны: 1–3 вызова на сущность при `temperature 0.7`; конфиг: несколько), отчёта (до 5 tool calls × 2 раунда рефлексии, `REPORT_AGENT_*`) и интервью (1 вызов на агента на платформу). Отдельно Zep тратит **свою** LLM-квоту на извлечение сущностей из каждого чанка и каждого батча действий.

## 3. Сеть (параноидально)

Прямых `requests`/`aiohttp` в backend нет; `httpx` только для настройки клиента Zep. Телеметрии, аналитики, веб-поиска новостей **в коде MiroFish не найдено** (grep по `https://`, `requests`, `httpx`, `aiohttp`, `anthropic`, `openai`). Действия агентов (`SEARCH_POSTS`, `TREND`) — поиск внутри локальной SQLite, не в интернете.

| Куда | Откуда | Что уходит | Ключ/переменная |
|---|---|---|---|
| `LLM_BASE_URL` (по умолч. `https://api.openai.com/v1`; в примере `dashscope.aliyuncs.com`) | backend (`llm_client.py`, генераторы онтологии/персон/конфига, ReportAgent) и подпроцесс симуляции (camel) | фрагменты зерна (обрезанные, `MAX_TEXT_LENGTH_FOR_LLM`), контексты сущностей из Zep, персоны, ленты постов, история каждого агента, текст отчёта | `LLM_API_KEY`, `LLM_MODEL_NAME`; подпроцесс пишет ключ в `OPENAI_API_KEY` |
| `LLM_BOOST_BASE_URL` (опц.) | подпроцесс, вторая платформа | то же | `LLM_BOOST_API_KEY`, `LLM_BOOST_MODEL_NAME` |
| `https://api.getzep.com/api/v2` (зашито) | backend | **весь текст зерна целиком** (все чанки), онтология, все действия агентов с текстами постов/комментариев, метаданные | `ZEP_API_KEY` |
| `huggingface.co` | подпроцесс (OASIS twhin-bert) при первом шаге | запрос модели (твой IP, UA) | — (`HF_HUB_OFFLINE=1` после предзагрузки) |
| `fonts.googleapis.com`, `fonts.gstatic.com` | браузер (`frontend/index.html`) | IP/UA пользователя UI | — |
| `ghcr.io/666ghj/mirofish:latest`, `ghcr.nju.edu.cn`, `ghcr.io/astral-sh/uv:0.9.26`, PyPI/npm | установка/Docker | — | — |
| `api.github.com` | только CI (`scripts/fetch_star_count.py`) | — | `GITHUB_TOKEN` в Actions |

Прочие переменные: `SECRET_KEY` (дефолт `mirofish-secret-key`), `FLASK_DEBUG`, `FLASK_HOST` (дефолт **0.0.0.0**), `FLASK_PORT=5001`, `OASIS_DEFAULT_MAX_ROUNDS`, `REPORT_AGENT_MAX_TOOL_CALLS/REFLECTION_ROUNDS/TEMPERATURE`. `.env` в `.gitignore`.

## 4. Безопасность

| Область | Находка |
|---|---|
| Выполнение кода | `eval/exec/pickle/shell=True` нет. Единственный subprocess — свой скрипт через `sys.executable`. `ontology_generator.generate_python_code()` собирает текст Python-модуля из имён сущностей, но только возвращает строку, не исполняет |
| Запись файлов | `backend/uploads/projects/<id>/files` (имена заменяются на uuid — хорошо), `backend/uploads/simulations/<id>/` (SQLite, jsonl, log), `backend/logs/`. При `FLASK_DEBUG` тела запросов пишутся в лог |
| Доступ к API | **59 маршрутов без какой-либо аутентификации**, `CORS(origins="*")`, слушает `0.0.0.0`. Любой в той же сети может грузить файлы, запускать симуляции (тратить твои токены), читать граф, удалять проекты |
| Путь из URL | `project_id`/`simulation_id` не валидируются: `_get_project_dir` = `os.path.join(PROJECTS_DIR, project_id)`, `delete_project` делает `shutil.rmtree`. `DELETE /api/graph/project/..` снесёт родительский каталог `uploads` |
| Парсинг PDF | PyMuPDF (нативный MuPDF) — классическая поверхность атаки для вредоносного PDF; парсится прямо в процессе Flask |
| Зависимости | Жёстко пиннованы только `zep-cloud==3.25.0`, `camel-oasis==0.2.5`, `camel-ai==0.2.78`; остальное `>=` (flask, openai, httpx, PyMuPDF, pydantic…). `uv.lock` фиксирует 185 пакетов с хэшами (openai 1.109.1, flask 3.1.2, httpx 0.28.1, pymupdf 1.26.7) — ставить только `uv sync --frozen`. `requirements.txt` — дубликат без пинов, не использовать. Транзитивно через camel-ai: **torch + 15 пакетов nvidia-*-cu12**, transformers, sentence-transformers, huggingface-hub, neo4j, slack-sdk, mcp, unstructured, jupyter/nbconvert/ipython, pre-commit, pywin32, uvicorn, websockets — гигабайты кода, не нужного MiroFish. Frontend: caret-диапазоны (`vite ^7.3.6`, `axios ^1.18.1`), есть lock |
| Docker | образ `python:3.11` (полный), root, в контейнере крутится `npm run dev` (dev-режим Vite + Flask), тег `latest` изменяемый, `.env` целиком передаётся в контейнер |
| CI | `docker-publish.yml` (сборка по тегу в ghcr), `star-history` по расписанию. Экшены по мажорным тегам (`@v4`, `@v5`), не по SHA |

**Оригинал vs перезаливы.** В поиске GitHub десятки репозиториев с именем MiroFish, и почти все они **не форки** (`fork: false` — перезалиты заново, история связи потеряна): `nikmcfly/MiroFish-Offline` (2,6k звёзд, Neo4j+Ollama, создан 2026-03-14), `SCTY-Inc/mirofish-cli`, `tt-a1i/MiroFish-local` (Graphiti+Neo4j), `enpixeles-ai/MiroFish-ESP`, `BEKO2210/MiroFish-DE`, `pgarvie/MiroFish-Offline`, `jwc19890114/MiroFishOpt`. Признаки оригинала: владелец `666ghj`, дата создания 2025-11-26, 322 коммита с историей от ноября 2025, номера PR в сообщениях (#742, #832), образ `ghcr.io/666ghj/mirofish`, релизы V0.1.0–V0.1.2, homepage mirofish.ai. Локальная копия — shallow (1 коммит), историю проверить нельзя без `git fetch --unshallow`; сравнивать стоит по SHA `7657031ac01184afe2cb220f5ee3545573b5e843`.

## 5. Как ставить безопасно (если всё же решишь) и как снять

Ставить только в изолированную VM/контейнер без твоих ключей и данных, не на рабочую машину.

1. Клон по SHA: `git clone https://github.com/666ghj/MiroFish && git checkout 7657031ac01184afe2cb220f5ee3545573b5e843`; сверить `uv.lock` с оригиналом.
2. Python 3.12 отдельно, `cd backend && uv sync --frozen` (только по lock с хэшами; `requirements.txt` не трогать). Node: `npm ci` в корне и в `frontend/` (по lock), а не `npm install`.
3. `.env` не хранить в репозитории: ключи подать через переменные окружения из менеджера секретов при запуске; `FLASK_HOST=127.0.0.1`, свой `SECRET_KEY`, `FLASK_DEBUG=False`.
4. Ollama вместо облака: `LLM_BASE_URL=http://127.0.0.1:11434/v1`, `LLM_API_KEY=ollama`, `LLM_MODEL_NAME=<модель с tool calling, напр. qwen2.5 14b+>`. Это убирает утечку в LLM-провайдер, **но не в Zep**: оригинал без Zep Cloud не работает; «офлайновые» форки с Neo4j/Graphiti — чужой неаудированный код.
5. Сетевой allowlist для хоста: только Ollama (localhost), `api.getzep.com`, и на один раз `huggingface.co` для `Twitter/twhin-bert-base`; потом `HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1`. В UI заменить Google Fonts на локальные или заблокировать домены.
6. В Zep завести отдельный проект/ключ только под эту игрушку; не загружать в зерно ничего личного — текст уходит целиком.

Снятие: удалить `backend/.venv`, `node_modules` (корень и frontend), `backend/uploads`, `backend/logs`, `./models`, `~/.cache/huggingface`, `~/.cache/uv`; `docker compose down -v` и `docker rmi ghcr.io/666ghj/mirofish`; отозвать ключи у LLM-провайдера и в Zep; удалить графы в Zep (дашборд или `graph.delete`); удалить VM.

## 6. Что взять для универсальной системы Claude (без установки)

- **Идея «население как модель аудитории»**: сущности из текста → персоны → каждая реагирует на материал в своём стиле → сводный отчёт. Для R9OOF это проверка статьи/решения на «панели» из 10–30 персон (новичок-SWL, опытный DX-мен, администратор RDA, сосед-«не-радиолюбитель») без OASIS: Claude сам генерирует персоны по схеме ниже и сам же отыгрывает реакции по раундам.
- **Схема персоны** (`OasisAgentProfile`, `oasis_profile_generator.py:181`): `user_id, user_name, name, bio (≤200 симв.), persona (длинный текст характера и мотивов), karma, friend_count, follower_count, statuses_count, age, gender, mbti, country, profession, interested_topics[], source_entity_uuid, source_entity_type` + в конфиге симуляции `active_hours[], activity_level (0–1)`. Для групп/организаций генерируется «официальный аккаунт» с иным системным промптом. Twitter-формат — CSV, Reddit — JSON.
- **Модель активности по времени** (`time_config`): `minutes_per_round`, `agents_per_hour_min/max`, `peak_hours` [9–11,14–15,20–22] ×1,5, `off_peak_hours` [0–5] ×0,3 — простой способ сделать «реалистичный ритм» без движка.
- **Память на графе**: шаблон «факт с интервалом действительности» — узлы-сущности, рёбра (subject, predicate, object, `valid_at`, `invalid_at`, `expired`, `source_episode`), эпизоды с метаданными (кто, когда, какой раунд, тип действия) и текстовая сериализация действия (`to_episode_text`). Как образец годится, но реализация полностью привязана к Zep Cloud; для своей системы это воспроизводится в SQLite/JSON с теми же полями. Полезный приём: ограничение запроса к памяти (400 симв., ≤50 результатов) и явный барьер «дождаться обработки эпизодов до отчёта» (`_wait_for_pending_episodes`).
- **Цикл ReportAgent**: лимит 5 вызовов инструментов, 2 раунда рефлексии, три инструмента (широкий поиск / точечная проверка / опрос персон), очистка результатов инструментов от инъекций (`test_report_tool_result_sanitizer.py`).
- **Утилиты**: ремонт обрезанного JSON от LLM (`_fix_truncated_json`), снятие `<think>` и ```json-обёрток (`_clean_chat_text`), откат, если провайдер не поддерживает `response_format` (`openai_chat_compat.py`).

## 7. Риски MiroFish

| Риск | Где | Как снять |
|---|---|---|
| Весь текст зерна и все действия агентов уходят в Zep Cloud | `graph_builder.py`, `zep_graph_memory_updater.py`, адрес зашит | Не грузить ничего личного; отдельный проект Zep; удалять графы после прогона; либо не ставить вовсе |
| Тексты и персоны уходят LLM-провайдеру | все генераторы + camel | Ollama через OpenAI-совместимый эндпоинт |
| Неконтролируемый расход токенов (цикл tool calls без лимита, растущий контекст) | camel `max_iteration=None`, история без окна | Лимит раундов (<40), лимиты на ключе у провайдера, локальная модель |
| API без аутентификации на 0.0.0.0, CORS * | `run.py`, `app/__init__.py` | `FLASK_HOST=127.0.0.1`, файрвол, не выставлять в сеть |
| Traversal `..` → `rmtree` каталога uploads | `models/project.py:238`, маршруты `/project/<id>` | Только localhost; при желании — валидировать id regex `^[A-Za-z0-9_-]+$` |
| Вредоносный PDF в нативном парсере | `file_parser.py` (PyMuPDF) | Парсить в песочнице, грузить только свои файлы |
| Скрытая загрузка модели с HuggingFace, torch+CUDA в зависимостях | camel-oasis recsys | Предзагрузка + `HF_HUB_OFFLINE=1`; allowlist сети |
| Непиннованные `>=` в pyproject, огромное транзитивное дерево | `pyproject.toml`, `uv.lock` | Только `uv sync --frozen`; изолированная VM |
| Google Fonts в UI | `frontend/index.html` | Локальные шрифты / блок доменов |
| Docker: root, dev-режим, `latest` | `Dockerfile`, `docker-compose.yml` | Не использовать образ; собирать самому по SHA |
| Нет SECURITY.md, нет канала для уязвимостей | репозиторий | Считать неподдерживаемым с точки зрения безопасности |
| Перезаливы под тем же именем | GitHub | Только `666ghj/MiroFish`, сверка SHA и даты создания |

---

# Часть 2. Cloudflare Radar MCP и URL Scanner

Источники: `cloudflare/mcp-server-cloudflare` (README, `apps/radar/src/radar.app.ts`, `src/tools/url-scanner.tools.ts`, `src/types/url-scanner.ts`, `packages/mcp-common/src/scopes.ts`), документация Cloudflare из репозитория `cloudflare-docs` (`radar/investigate/url-scanner.mdx`, `security-center/investigate/scan-limits.mdx`). Сайт developers.cloudflare.com из этой среды заблокирован прокси, читал исходники доков.

## Что это

Удалённый MCP-сервер Cloudflare `https://radar.mcp.cloudflare.com/mcp` (Streamable HTTP; старый `/sse` отвечает 410 Gone). Отдаёт данные Cloudflare Radar (трафик, BGP, DDoS, DNS, боты, рейтинги доменов) и обёртку над **URL Scanner** (Security Center). **В README репозитория сервер помечен как deprecated**: Cloudflare просит переходить на единый `https://mcp.cloudflare.com/mcp` (репо `cloudflare/mcp`, «Code Mode» — выполнение кода против всего API). Инструменты Radar пока работают, новых не будет.

## Инструменты

Около 60. Инструмента `scan_url` **нет**; сканер — пять инструментов:

| Инструмент | Параметры | Вызов API | Возвращает |
|---|---|---|---|
| `create_url_scan` | `url` (обязателен, с протоколом), `visibility` ∈ {`Public`,`Unlisted`}, **по умолчанию `Public`**; `screenshotResolution` ∈ {desktop,mobile,tablet} | `POST /accounts/{id}/urlscanner/v2/scan` | `scanId`, `url`, `visibility` |
| `get_url_scan` | `scanId` | `GET …/v2/result/{scanId}` (404 пока идёт) | `verdicts`, `page`, `stats`, `lists` (IP, ASN, домены, сертификаты) |
| `get_url_scan_screenshot` | `scanId`, `resolution` | `HEAD …/v2/screenshots/{scanId}.png` | ссылку на PNG (скачивать с Authorization) |
| `get_url_scan_har` | `scanId` | `GET …/v2/har/{scanId}` | полный HAR |
| `search_url_scans` | `query` (ES-синтаксис: `page.domain:example.com`, `verdicts.malicious:true`, `date:[…]`), `size` ≤100 | `GET …/v2/search` | список чужих публичных и своих скрытых сканов |

Остальные группы: `get_ai_data`, `get_annotations/get_outages/get_traffic_anomalies*`, `get_as112_data`, `list_autonomous_systems/get_as_details/get_as_set/get_as_relationships`, BGP (`get_bgp_hijacks`, `get_bgp_leaks`, `get_bgp_routes_realtime`, `get_bgp_pfx2as`, …), боты (`get_bots_data`, `list_bots`, `get_bots_crawlers_data`), CT-логи, Cloud Observatory, `get_domains_ranking*`, `get_dns_queries_data`, email routing/security, `get_http_data`, `get_ip_details`, качество/скорость интернета, `get_l3_attack_data`/`get_l7_attack_data`, `get_leaked_credentials_data`, `get_netflows_data`, `get_robots_txt_data`, `get_tcp_resets_timeouts_data`, `list_tlds`.

## Подключение к Claude Code

```
claude mcp add --transport http cloudflare-radar https://radar.mcp.cloudflare.com/mcp
```
затем в сессии `/mcp` → выбрать сервер → пройти OAuth Cloudflare в браузере. Единый сервер (рекомендуемый Cloudflare путь): `claude mcp add --transport http cloudflare https://mcp.cloudflare.com/mcp`. Вариант через `npx mcp-remote …` существует для клиентов без поддержки удалённых серверов — параноидально **не нужен**: это выполнение скачанного npm-кода; у Claude Code есть нативный `--transport http`.

## Авторизация и права

Аккаунт Cloudflare обязателен (бесплатного достаточно). Сервер запрашивает OAuth-scopes (из `radar.app.ts` + `RequiredScopes`): `user:read` («имя, e-mail, членство в аккаунтах»), `offline_access` (**refresh-токен для долгоживущего доступа**), `account:read`, `radar:read`, `url_scanner:write`. Альтернатива для единого сервера — API-токен как Bearer: custom token с правом «Account → URL Scanner: Edit» (+ Radar Read). Токены/refresh хранятся локально у Claude Code.

## Что уходит в Cloudflare при сканировании и что хранится

- Уходит: полный URL (включая query-строку — токены, подписи, id сессий), `account_id`, выбранное разрешение. Дальше безголовый браузер Cloudflare сам заходит на сайт со своих IP.
- В отчёте: скриншот(ы), хэш структуры DOM (`page.domStructHash`), **HAR со всеми запросами и заголовками**, `data.cookies` (куки, выставленные страницей), `data.console`, нестандартные JS-глобалы, тайминги, TLS-сертификаты, списки IP/ASN/доменов, определённые технологии, категории, вердикты.
- **Видимость: по умолчанию Public** — отчёт попадает в список недавних сканов и в поиск для всех. `Unlisted` доступен по ID, но **на Free/Radar-плане квота Unlisted = 0**, то есть с бесплатного аккаунта каждый скан публичный. Cloudflare сам переводит в Unlisted, если заподозрит персональные данные — не гарантия.
- Хранение: успешные сканы — 12 месяцев, неудачные удаляются через 30 дней; **документированного endpoint для удаления скана нет**.

## Лимиты (scan-limits)

| План | История поиска | Public/мес | Unlisted/мес | Частота |
|---|---|---|---|---|
| Free / Radar | последние 50 сканов | 5 000 | 0 | 1 запрос / 10 с |
| Self-serve (Pro/Business) | 30 дней | 5 000 | 500 | 1 / 10 с |
| Enterprise | 12 мес | 10 000 | 5 000 | 12 / с |
| Cloudforce One | без ограничений | 75 000 | 20 000 | 12 / с |

Превышение — HTTP 429. Пакетная отправка до 100 URL. Сканирование из выбранной страны — только Enterprise.

## Как отключить

`claude mcp remove cloudflare-radar` (и `cloudflare`, если ставился единый); в дашборде Cloudflare: Profile → API Tokens — удалить токен; отозвать OAuth-авторизацию приложения MCP; при желании сменить пароль/2FA. Проверить, что в `~/.claude` не осталось сохранённых токенов сервера (`claude mcp list` должен не показывать сервер).

## Риски и как снять

| Риск | Суть | Как снять |
|---|---|---|
| Публичность по умолчанию | Скан URL с токеном, staging-адрес, неопубликованная страница — в общий поиск на 12 месяцев без удаления | Сканировать только публичные адреса; всегда явно `visibility: "Unlisted"` (нужен платный план); правило в CLAUDE.md: «Radar scan — только Public-сайтов, никогда ссылок с параметрами» |
| `offline_access` | Долгоживущий refresh-токен на машине; при компрометации — доступ к аккаунту Cloudflare в объёме scopes | Отдельный аккаунт Cloudflare без зон/биллинга под сканер; удалять сервер после использования |
| Инъекция через результаты | Текст страницы (title, console, HAR) возвращается Claude как данные; злой сайт может вписать «инструкции» | Трактовать результат как данные; не давать агенту автоматически вызывать `create_url_scan` по ссылкам из непроверенного контента (иначе экфильтрация: агент «сканирует» URL с вшитыми данными → публичный отчёт) |
| Deprecated | Сервер могут выключить | Ставить единый `mcp.cloudflare.com/mcp`, но у него шире поверхность (всё API) |
| Клоны серверов | Сторонние «Radar MCP» на чужих доменах (mcpbundles и т.п.) | Только `*.mcp.cloudflare.com` |
| Квоты | 1 запрос/10 с на бесплатном | Ждать `get_url_scan` 10–30 с, не долбить |

## Что даёт универсальной системе

1. **Проверка внешних адресов до перехода агента**: `create_url_scan` → `get_url_scan` → смотреть `verdicts.malicious`, цепочку редиректов, конечный домен/IP/ASN, сертификат, технологии — агент (или Claude) не открывает ссылку сам, пока вердикт не чистый. Подходит для ссылок из писем, QRZ, комментариев, чужих README.
2. **Проверка своих сайтов после выкладки** (r9oof.com на Astro): скриншот desktop/mobile, HAR → список всех внешних запросов (CDN, шрифты, трекеры — ловить утечки вроде Google Fonts), сертификат, смешанный контент, консольные ошибки, `get_robots_txt_data` для AI-краулеров. Сайт и так публичный — публичность скана не вредит.
3. **Контекст сети**: `get_ip_details`, `get_as_details`, `get_bgp_routes_realtime`, `get_outages` — для диагностики «почему не открывается» и для трансляций.
4. `search_url_scans page.domain:r9oof.com` — увидеть, сканировал ли кто-то твой сайт.

Ключевые файлы MiroFish для ссылок: `/home/user/MiroFish/backend/app/config.py`, `/home/user/MiroFish/backend/app/utils/zep.py`, `/home/user/MiroFish/backend/scripts/run_parallel_simulation.py`, `/home/user/MiroFish/backend/app/services/oasis_profile_generator.py`, `/home/user/MiroFish/backend/app/services/zep_graph_memory_updater.py`, `/home/user/MiroFish/backend/app/models/project.py`, `/home/user/MiroFish/backend/pyproject.toml`, `/home/user/MiroFish/backend/uv.lock`, `/home/user/MiroFish/frontend/index.html`, `/home/user/MiroFish/Dockerfile`.
