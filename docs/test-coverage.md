# Отчёт о покрытии тестами

## Дата: 01.10.2026
## Команда: Кононов К.А., Артюхин А.Н.

Инструмент: node:test (аналог unit-раннера, без Vitest — в кабинете npm часто недоступен).

| Функция | Файл | Тестов | Статус |
|---------|------|--------|--------|
| registerUser | validation/register.js | 5 | ✅ |
| validateOutgoing / sendMessage | chat/sendMessage.js | 3 | ✅ |
| createApp сценарий | app.js | 2 | ✅ |
| исключения guard | core/exceptions.js | 3 | ✅ |
| addReaction | chat/reactions.js | 1 | ✅ |
| updateProfile | profile.js | 1 в интеграции | ✅ |

## Непокрытые
- initApp и DOM — вручную через index.html
- TURN / звонок — нет в учебном ядре

## Оценка
Критические функции: 100%. Функции ядра: около 75%.

## Прогон
`node --test tests/*.test.js` — все зелёные.
