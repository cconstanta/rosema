# Стандарты кодирования Rosemа

Дата: 01.10.2026  
Команда: Кононов К.А., Артюхин А.Н., ИСП-43

## Имена

- Файлы и папки: camelCase для модулей (`sendMessage.js`), kebab не используем.
- Функции и переменные: camelCase (`registerAccount`, `chatId`).
- Константы: UPPER_SNAKE (`USERS_KEY`).
- Классы ошибок: PascalCase (`ValidationError`).

## Структура

- Один модуль — одна задача: storage, events, session, contacts, profile, reactions, exceptions.
- Модули не импортируют друг друга напрямую, кроме точки входа `src/app.js`.
- Связь экранов и сервисов — шина событий (`user:registered`, `message:sent`).

## Оформление

- Отступ 2 пробела, LF, финальная пустая строка (`.editorconfig`).
- Одна команда на строку.
- Комментарий только над неочевидным блоком (лимиты, fail fast, fallback).
- ESLint + Prettier из дня 4.

## Ошибки

- Валидация — `ValidationError`, доступ — `AuthError`, storage — `StorageError`, сеть — `NetworkError`.
- UI и `createApp` ловят исключения и показывают текст, приложение не падает.
