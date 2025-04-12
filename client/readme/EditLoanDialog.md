
---

### 16. `README.md` для `EditLoanDialog.js`

```markdown
# EditLoanDialog.js

## Описание
`EditLoanDialog.js` — модальный компонент для редактирования кредита.

## Основные функции
- Редактирование данных кредита.
- Сохранение через Redux.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **@mui/x-date-pickers**: Для выбора даты.
- **react-redux**: Для Redux.
- **../store/financeActions**: Действия для финансов.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: Локальное для формы.
- **Обработчики**: Сохранение данных.
- **UI**: Модальное окно с формой.

## Использование
Используется в `FinancePage.js` для редактирования кредитов.
```jsx
import EditLoanDialog from './EditLoanDialog';
<EditLoanDialog open={open} onClose={handleClose} editedLoan={loan} />