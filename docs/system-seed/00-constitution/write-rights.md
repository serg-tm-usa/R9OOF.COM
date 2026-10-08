# Права записи по каталогам системы

Правило: у каждого каталога записано, кто может в него писать. Всё, что записал агент или скрипт, по умолчанию `trust: unreviewed`; в правила попадает только через ворота и слово владельца.

| Каталог | Владелец | Оркестратор | Агент | Скрипт | Никто |
| --- | --- | --- | --- | --- | --- |
| `00-constitution/` | пишет | — | — | — | — |
| `01-rules/` | утверждает | — | предлагает через `05-gates/` | — | — |
| `02-agents/*/CONTEXT.md`, `CONTROL.md` | пишет | — | — | — | — |
| `02-agents/*/MEMORY.md` | — | — | сам агент, только добавление | — | — |
| `02-agents/*/TASKS.md` | — | пишет | — | — | — |
| `03-memory/anchors/` | пишет | по слову владельца с пометкой | — | — | — |
| `03-memory/sessions/` | — | пишет в конце сессии | — | — | — |
| `03-memory/observations/` | — | — | пишут | пишут | — |
| `03-memory/generated/` | — | — | — | только скрипт | — |
| `04-projects/<p>/brief, voice, glossary, facts` | пишет / чат проекта | — | читают | — | — |
| `05-gates/candidates/` | — | — | rules-analyst | — | — |
| `05-gates/approved-pending.md` | ставит решение | — | — | — | — |
| `06-checks/reports/`, `baselines/`, `witness/` | — | — | — | только скрипт | — |
| `07-tools/consents.md` | пишет | — | — | — | — |
| `07-tools/security-reports/` | — | — | — | скрипт | — |
| `09-exchange/local/` | хранит | — | — | — | не копируется |
| `10-archive/` | — | — | — | скрипт по команде владельца | — |
| `11-journal/` | — | брейншторм-чат и чаты | — | `costs/` скрипт | — |

---
Источник: Ruflo `guidance/src/memory-gate.ts` (роли и флаги canDelete/canOverwrite, C-8.A №2), ECC Memory Vault (`trust`, C-7.A №1), вопрос владельца о p-layers.
