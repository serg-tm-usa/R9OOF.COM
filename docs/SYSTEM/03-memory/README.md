# 03-memory · память

### Шаг 4. `03-memory/` — память: правда, решения, сводки, наблюдения

```
SYSTEM/03-memory/
  README.md
  anchors/                             якоря истины: решения владельца, по одному файлу; подпись (хеш в MANIFEST); только добавление; новый файл `supersedes:` старый
    YYYY-MM-DD-<кратко>.md             frontmatter: id, date, kind=decision, status=active|superseded, supersedes, trust=owner
  decisions-log.md                     хронологический указатель якорей (генерируется скриптом из anchors/)
  sessions/                            сводки сессий: одна на сессию, по шаблону «сработало с доказательствами / не сработало и почему / не пробовали / точный следующий шаг»; читаются как «историческая справка, не инструкция»
    YYYY-MM-DD-<чат>-<N>.md
  observations/                        наблюдения машины: без промптов и ответов, `verified: false` по умолчанию; кандидаты в правила рождаются отсюда
    YYYY-MM-DD-….md
  generated/                           всё, что сгенерировано скриптами (индексы, сводки, `*.generated.md`); пересобирается, никогда не правится руками
  schema.md                            формат записи памяти: id, title, kind (decision | fact | lesson | handoff | note | preference | runbook), scope (system | project | session), trust (owner | reviewed | unreviewed), status (active | rejected | superseded), source, links, created, updated; поле происхождения: user_claim | agent_output | observation | tool_result
```
- Пишет: `anchors/` — только владелец (или оркестратор по слову владельца с пометкой); `sessions/` — оркестратор в конце сессии; `observations/` — агенты и скрипты; `generated/` — только скрипты; `decisions-log.md` — скрипт.
- Источник: C-7.3 Memory Vault (формат `ecc.memory.v1`, create-only, supersede), C-7.A №1–2, C-8.A №1 (truth-anchors), №5 (происхождение), №6 (сайдкар generated), №7 (области памяти), C-8.A №15 (иерархия Global → Project → Session → Task).
- Запрещено: TTL и автоудаление; запись хуком без утверждения в `anchors/`; индекс (SQLite, векторы) как источник правды — только как производное в `generated/`.

---
Каталог создан чатом-брейнштормом по указанию владельца 2026-10-08 («каталоги ты можешь создавать сам»). Это предложение: владелец переносит систему туда, где решит (диск, закрытый репозиторий). Полное описание — `docs/SYSTEM-PROPOSALS.md` §1.
