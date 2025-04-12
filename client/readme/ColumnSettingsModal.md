
---

### 7. `README.md` для `ColumnSettingsModal.js`

```markdown
# ColumnSettingsModal.js

## Описание
`ColumnSettingsModal.js` — модальный компонент для настройки видимости колонок таблицы тендеров.

## Основные функции
- Отображение списка колонок с чекбоксами.
- Переключение видимости колонок через Redux.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **react-redux**: Для Redux.
- **../store/tenderReducer**: Редьюсер для тендеров.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: Данные колонок из Redux.
- **Обработчики**: Переключение видимости колонок.
- **UI**: Модальное окно со списком.

## Использование
Используется в `TenderMenu.js` для настройки колонок.
```jsx
import ColumnSettingsModal from './ColumnSettingsModal';
<ColumnSettingsModal open={open} onClose={handleClose} visibleColumns={columns} />