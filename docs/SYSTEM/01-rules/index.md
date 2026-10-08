# Какой пакет когда подключается

| Пакет | Подключается, когда | Источник материалов |
| --- | --- | --- |
| `common/` | всегда, во всех чатах | ECC rules/common, Ruflo, ARS, решения владельца |
| `packs/text-ru/` | brief: `packs: text-ru`; любой текст на русском для людей | скилл humanizer, `docs/humanizer2/rules-ru.md`, `ars-academic-research-skills.md` |
| `packs/documents/` | `*.pdf`, сканы, стандарты | скилл pdf-markitdown, engineering-source-discipline, `docs/pdf-visual/` |
| `packs/knowledge-base/` | файлы базы знаний проекта | скилл kb-protocol |
| `packs/drawings/` | `*.dxf`, схемы, чертежи | скилл eskd-drawings |
| `packs/web/` | `*.astro, *.html, *.css, *.js`, сайты | checks.md C-1, C-3, C-4; C-6 (seo, aeo, a11y); C-7 web/*; указание T-54 |
| `packs/data/` | `*.sql, *.sqlite, *.adi, *.csv` | C-8 ruflo-migrations; C-7 database |
| `packs/publishing/` | brief: `packs: publishing` | ideas.md («One post», T-33); C-7 content-engine, crosspost |
| `packs/automation/` | `*.yml` в `.github/workflows`, расписания | ideas.md «План по деплою»; C-7 deployment; C-8 ops-cicd-github |
