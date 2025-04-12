
---

### 17. `README.md` для `HistoryDialog.js`

```markdown
# HistoryDialog.js

## Описание
`HistoryDialog.js` — модальный компонент для отображения истории финансовых операций.

## Основные функции
- Отображение операций с фильтрацией по счету, категории и дате.
- Группировка операций по категориям.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **@mui/x-date-pickers**: Для выбора даты.
- **react-redux**: Для Redux.
- **../store/financeReducer**: Данные операций.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: Локальное для фильтров и раскрытия категорий.
- **Обработчики**: Фильтрация операций.
- **UI**: Модальное окно с таблицей.

## Использование
Используется в `FinancePage.js` для просмотра истории.
```jsx
import HistoryDialog from './HistoryDialog';
<HistoryDialog open={open} onClose={handleClose} />