# Rosema

Учебный мессенджер. Практика ПМ.02, группа ИСП-43.
Кононов К.А., Артюхин А.Н.

## Модули

- `src/` — storage, events, session, contacts, profile, messages, reactions
- `tests/` — unit и интеграционные тесты
- `web/` — экран
- `docs/` — стандарты, дневники, инспекция, метрики, руководства

```bash
npm test
```

## Веб-версия

```bash
cd web
npm install
npm run dev
```

Данные хранятся в браузере, без сервера. Как пользоваться: docs/user-guide.md. Как поставить: docs/install-guide.md.

## Git

История на ветке `master`, осмысленные коммиты (`feat`, `test`, `docs`, `chore`).
Ветка `feature/web-messenger` влита в `master`. Итог помечен тегом `v1.0`.
