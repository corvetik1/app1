
---

### 12. `README.md` для `AddCreditCardDialog.js`

```markdown
# AddCreditCardDialog.js

## Описание
`AddCreditCardDialog.js` — модальный компонент для добавления новой кредитной карты.

## Основные функции
- Ввод данных кредитной карты (лимит, долг, период и т.д.).
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
Используется в `FinancePage.js` для добавления кредитных карт.
```jsx
import AddCreditCardDialog from './AddCreditCardDialog';
<AddCreditCardDialog open={open} onClose={handleClose} />