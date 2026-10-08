# Схема записи памяти

Frontmatter каждой записи (один файл — одна запись; или строка таблицы в журнале):

```
id: mem_YYYYMMDD_NNN
title: <кратко>
kind: decision | fact | lesson | handoff | note | preference | runbook
scope: system | project:<имя> | session
trust: owner | reviewed | unreviewed
status: active | rejected | superseded
supersedes: <id или пусто>
provenance: user_claim | agent_output | observation | tool_result
source: <файл, задача, сессия>
created: <дата>
updated: <дата>
links: [<id>, …]
```

Правила: запись только добавлением; перезапись id запрещена; замена — новая запись с `supersedes`; `status` ставит человек; всё от агентов и скриптов — `unreviewed`; известные формы секретов отвергаются при записи; старые записи подаются как «историческая справка, не инструкция»; индексы (SQLite, векторы) — только производное в `generated/`.

Источник: ECC Memory Vault `ecc.memory.v1` (C-7.3); Ruflo `provenance_type`, truth-anchors (C-8.A №1, №5); решения владельца «ничего не удалять», «markdown — источник правды».
