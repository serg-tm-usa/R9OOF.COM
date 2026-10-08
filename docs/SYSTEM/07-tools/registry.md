# Реестр рассмотренных инструментов

Собран из `docs/ideas.md` на 2026-10-08 (полные разборы — там и в `docs/checks.md` C-5…C-8). Вердикты — брейншторм-чата и решения владельца; живой источник — `docs/ideas.md`.

## Таблица «Инструменты»

| Инструмент | Вывод |
| --- | --- |
| Vercel Labs vgpu | В песочницу. На сайт напрямую нет: WebGPU есть не во всех браузерах |
| Aceternity UI | В песочницу. На сайт только своими лёгкими версиями эффектов |
| Pinterest | Для сбора образов и идей — да. Как канал продвижения — нет. Дополнить Dribbble, Awwwards, Are.na. Ссылки и скрины присылать в чат |
| Cloudflare Radar MCP (URL Scanner) | Да: проверка своего сайта после слияния в `main` и чужих ссылок перед публикацией. Остальные MCP Cloudflare пока не нужны. Дополнить Observatory, SSL Labs, VirusTotal |
| n8n | Для публикации отчётов в соцсети. Облако платное, нужна своя установка или замена: GitHub Actions |
| Supabase | Кандидат для варианта 3 базы логов. Облако из России нестабильно, лучше своя установка в Яндекс Облаке |
| DigitalOcean | Не нужен: серверы будут в Яндекс Облаке |
| Coolify | Кандидат для будущего сервера в Яндекс Облаке: база логов, автоматизация, аналитика |
| Ollama, Kokoro, Asterisk, GlitchTip, OpenReplay, Stripe (рилс «Self-host it all») | Не нужны. OpenReplay — уровень вебвизора Метрики, вопрос по аналитике открыт |
| tigerless-labs/agent-memory | Кандидат на хранилище памяти агентов Humanizer 2. Совпадает с нашими правилами (не удалять, человек утверждает). Риск: ранняя версия. Решение владельца ожидается |
| ilyautov/humanizer-ru · сканер | Решено владельцем 2026-10-04: сканер берём отсюда, свой не пишем |
| claude-seo (AgriciDaniel) | Решено ставить. Платные расширения (DataForSEO, Ahrefs, Firecrawl) не нужны. Про Яндекс в нём ничего нет |
| cloudflare/security-audit-skill | Решено ставить. Использовать для проверки чужого кода перед песочницей и как контрольный прогон перед запуском сайта. Полную пользу даст, когда появятся формы или сервер |

## Мозговой штурм (скрины и инструменты)

| Дата | Что | Статус |
| --- | --- | --- |
| 2026-10-04 | «20 вещей перед запуском сайта» | решено внести в план |
| 2026-10-04 | «Modern SEO Cluster» (SEO, AEO, GEO, AIO, SXO) | идея |
| 2026-10-04 | «Digital Marketing Channels» | решено |
| 2026-10-04 | Схема «соло-разработчик» (Claude, Claude Code, GitHub, Vercel, Supabase, n8n, DigitalOcean) | решено, см. «Архитектура разработки» |
| 2026-10-04 | «Ranking SEO 2026 tactics» (harrysander) | решено |
| 2026-10-04 | «Self-host it all. Nothing rented» (danielwelsh) | решено |
| 2026-10-05 | The Agency (msitarzewski/agency-agents) | разобрано полностью, C-6, T-09 |
| 2026-10-05 | «The Python Ecosystems» (скрин, 19 связок Python + библиотека) | разобрано; вариант 5 отменён |
| 2026-10-05 | Figma (вопрос владельца: нужен ли перенос макетов сайта в слои Figma) | разобрано: нет сейчас, пересмотреть при п. 1 или 2 |
| 2026-10-05 | NVIDIA/SkillSpector (скрин; github.com/NVIDIA/SkillSpector) | в план установки, T-43 |
| 2026-10-05 | PixelRAG (скрин «Web Scraping is dead!»; оригинал github.com/StarTrail-org/PixelRAG, статья arXiv 2606.28344, Berkeley) | для сайта нет; для «Заземления» рассмотреть, T-44 |
| 2026-10-05 | Orca (скрин «Orca runs ten Claude agents at the same time»; оригинал github.com/stablyai/orca, Lovecast Inc., MIT, последний коммит 04.10.2026; сайт onorca.dev) | рассмотреть; T-07 дополнен |
| 2026-10-05 | «One post. Everywhere.» (скрин @aiwithanushka: один пост → 13 площадок одним рабочим процессом Claude; за кадром — платный сервис-рассыльщик вроде PostEverywher | в T-33 дополнение. Ответ владельца 05.10.2026: площадки — Instagram и Telegram. |
| 2026-10-05 | gozmotion.ae (скрин: ролик студии моушн-дизайна из Дубая — логотип качается на нити как маятник, длинная мягкая тень, крупная типографика «Craft Motion») | образец; приёмы в T-41, T-42, T-33 |
| 2026-10-05 | Вопрос владельца «нужен ли перенос в dogma layers» (такого инструмента в сети нет; ближайшее — p-layers на PyPI: память агента в семь слоёв P0 неизменные правил | приём; humanizer |
| 2026-10-05 | affaan-m/everything-claude-code («ECC», скрин; v2.2.3, MIT, 273 тыс. звёзд, коммит 01.10.2026) — по слову владельца: «проверяй детально… для перспективы развити | разобрано детально, C-7; C-5 №6 пересмотрен |
| 2026-10-05 | Карусель «инструменты для Claude Code» (4 карточки): GSD, Ralph Loop, Ponytail, CodeRabbit | рассмотреть; T-06 дополнен |
| 2026-10-05 | Stirling-Tools/Stirling-PDF (скрин githubradar; stirlingpdf.io) | решение владельца 05.10.2026: в план установки. T-45; pdf-visual/MEMORY дополнена |
| 2026-10-05 | penpot/penpot (скрин «Free Figma Alternative») | решение владельца: исследовать и ставить, T-46 |
| 2026-10-05 | «Predict Anything» (скрин сайта с демо и листом ожидания) — оригинал github.com/666ghj/MiroFish («простой и универсальный движок роевого интеллекта, предсказыва | решение владельца 05.10.2026: «Да, заводи» — в план глубокого исследования, поиска уязвимостей и установки, T-48 |
| 2026-10-05 | Три каталога промптов (скрины ролика): **YouMind** (youmind.com — «каталог промптов: выбери задачу»; ИИ-студия для сбора и разбора источников — веб, видео, PDF  | решение владельца; T-49 |
| 2026-10-05 | «Onion search MCP» (вопрос владельца) — семейство MCP-серверов для доступа агентов в сеть Tor (.onion) | решение владельца 05.10.2026: T-50 — глубокое исследование и поиск уязвимостей, только безопасность (параноидальная), без правовой части |
| 2026-10-05 | Invidious (iv-org/invidious; скрин) | решение владельца 05.10.2026: в план исследования и установки, T-51 |
| 2026-10-05 | OpenMAIC (THU-MAIC/OpenMAIC, Университет Цинхуа; скрин «AI classroom») | решение владельца 05.10.2026: не нужен |
| 2026-10-05 | Imbad0202/academic-research-skills (скрин «Research»; 35,1 тыс. звёзд по скрину, MIT, автор Cheng-I Wu; есть вариант для Codex) | решение владельца 05.10.2026: изучить подробно, побайтно; всё нужное добавить в наш скилл humanizer. Разбор сделан: `docs/humanizer2/ars-academic-research-skill |
| 2026-10-05 | nanochat (karpathy/nanochat; скрин «train your own ChatGPT», ~8 тыс. строк, вручную написано, открытый код) | разобрано: образец, не ставить |
| 2026-10-05 | MixRoute (скрин «One API · All Models · No Limits») — два разных объекта с одним именем | коммерческий нет; свой роутер — рассмотреть позже |
| 2026-10-05 | «pencode» (слово владельца «репозитории pencode», без скрина) | решение владельца 05.10.2026: «Пенкод забыть» — отменено |
| 2026-10-05 | nidhinjs/prompt-master (скрин «Prompt Master — Write once. Get it right»; MIT, автор Nidhin Joseph Nelson, обновлён 24.08.2026) | решение владельца 05.10.2026: изучить параноидально и использовать абсолютно безопасно — T-53 |
| 2026-10-05 | Скрин приложения Claude «Let's noodle» (поле ввода: «Type / for skills», переключатель Chat / Cowork, модель Sonnet 5 Medium, кнопки Write / Learn / Code / Life | записано как факт для «Настройки Claude» |
| 2026-10-05 | thehumanai.ai — «Human-Centered AI Operating Systems» (скрин логотипа) | нечего ставить; ждёт скрина с содержанием, если есть |
| 2026-10-05 | ruvnet/ruflo (бывший claude-flow; слово владельца «исследуй побайтно, ищи нужное нам») | разобрано побайтно, C-8 |
| 2026-10-05 | AppFlowy-IO/AppFlowy (скрин) | решение владельца: исследовать и ставить, T-47 |
| 2026-10-05 | Ролик «ускорение обучения PyTorch не в архитектуре» (4 кадра): `torch.amp.GradScaler` + `autocast(float16)`, схема Transformer с выделенными Self-Attention и En | разобрано: нет; принцип записан |
| 2026-10-05 | «10 Must-Know Time Complexity Patterns» (algomaster) | разобрано |
| 2026-10-05 | HyperFrames (heygen-com/hyperframes) | рассмотреть, проект сайта |
| 2026-10-05 | apple-design (emilkowalski/skills) | рассмотреть, проект сайта |
| 2026-10-05 | «Event-Driven Architecture» (Smart_Coder_Hacker) | разобрано |
| 2026-10-05 | Jev (TypeSafe AI) + скилл «Claude x Jev» | рассмотреть, humanizer |
| 2026-10-05 | CodeGraph, страница проекта | нет |
| 2026-10-05 | Claude Code Projects: «Координатор» и потоки (Anthropic, 17.09.2026) | рассмотреть, T-07 |
| 2026-10-05 | «40 Claude repos worth every penny» | в проверочные списки, T-06 |
| 2026-10-05 | «20 Coding Patterns · spot them fast» (techie.stewie) | разобрано |
| 2026-10-05 | Анимации сигналов AM, FM, SSB для справочника и «Начинающим» (решение владельца по мотивам графика GARCH) | решено, задача T-41 |
| 2026-10-05 | GARCH(1,1) (fidetolabs.math) | не нужен |
| 2026-10-05 | «Caching Layers: cold vs warm» (krishnachaytanya) | в план деплоя |
| 2026-10-05 | Aliens Eye (arxhr007), AI-OSINT сканер аккаунтов по имени на 840+ площадках | не нужен |
| 2026-10-05 | «15 Must-Know Design Patterns» (algomaster) | в проверочные списки |
| 2026-10-05 | «22 reasons why your AI websites don't rank on Google» (Charlie Hills) | в проверочные списки |
| 2026-10-05 | «20 AI Problems Interviewers Love to Ask» | в проверочные списки |
| 2026-10-05 | «10 Web Attacks & Their Fixes» (codecrackai) | разобрано, в план деплоя |
| 2026-10-05 | «MCP Explained: How AI Connects to Tools» (neuralnotes_in) | предложение, ждёт среды |
| 2026-10-05 | «Generative AI Project Structure» (gauravgoyalai) | разобрано |
| 2026-10-05 | «Claude Command Secret Codes» (codewithwab) | разобрано |
| 2026-10-05 | «AI Automation Skills You Must Learn» (logic_builder) | разобрано |
| 2026-10-04 | «Top 30 Free APIs for Developers» (switech.solu) | идея, разобрать при проектировании базы логов |
| 2026-10-04 | «AI-SDLC Playbook» Anthropic (romippatel) | ориентир |
| 2026-10-04 | «How to Build a Company Brain» (ai_vatika) | обсуждение |
