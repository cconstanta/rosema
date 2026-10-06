# Руководство по установке

## Что нужно
- Node.js 22
- npm

## Запуск у себя
```
cd rosemapractise
npm install
npm run dev
```
Клиент открывается на http://127.0.0.1:8080/

Проверка правил:
```
node --experimental-strip-types --test src/lib/rosema/logic.test.ts
npx tsc --noEmit
```

Данные чатов лежат в localStorage браузера, сервер переписки не нужен.

## Выкладка на Git
```
cd rosemapractise
git remote add origin <адрес-репозитория>
git push -u origin main
git push origin v1.0
```
Если origin уже есть, первая команда не нужна.
