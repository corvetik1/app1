
---

### 13. `README.md` для `AddDebtDialog.js`

```markdown
# AddDebtDialog.js

## Описание
`AddDebtDialog.js` — модальный компонент для добавления нового долга.

## Основные функции
- Ввод данных долга (сумма, кредитор, срок и т.д.).
- Сохранение через Redux.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **react-redux**: Для Redux.
- **../store/financeActions**: Действия для финансов.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: Локальное для формы.
- **Обработчики**: Сохранение данных.
- **UI**: Модальное окно с формой.

## Использование
Используется в `FinancePage.js` для добавления долгов.
```jsx
import AddDebtDialog from './AddDebtDialog';
<AddDebtDialog open={open} onClose={handleClose} />