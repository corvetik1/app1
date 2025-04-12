
---

### 14. `README.md` для `AddLoanDialog.js`

```markdown
# AddLoanDialog.js

## Описание
`AddLoanDialog.js` — модальный компонент для добавления нового кредита.

## Основные функции
- Ввод данных кредита (сумма, ставка, срок и т.д.).
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
Используется в `FinancePage.js` для добавления кредитов.
```jsx
import AddLoanDialog from './AddLoanDialog';
<AddLoanDialog open={open} onClose={handleClose} />