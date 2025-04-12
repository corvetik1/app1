
---

### 18. `README.md` для `ReportDialog.js`

```markdown
# ReportDialog.js

## Описание
`ReportDialog.js` — модальный компонент для отображения финансового отчёта по доходам и расходам.

## Основные функции
- Отображение доходов и расходов по категориям.
- Фильтрация по месяцам.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **react-redux**: Для Redux.
- **../store/financeReducer**: Данные транзакций.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: Локальное для выбранного месяца.
- **Обработчики**: Фильтрация данных.
- **UI**: Модальное окно с таблицами.

## Использование
Используется в `FinancePage.js` для создания отчётов.
```jsx
import ReportDialog from './ReportDialog';
<ReportDialog open={open} onClose={handleClose} />