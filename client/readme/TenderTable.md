
---

### 2. `README.md` для `TenderTable.js`

```markdown
# TenderTable.js

## Описание
`TenderTable.js` — React-компонент, отображающий таблицу тендеров с возможностью редактирования, выбора цвета меток, сортировки, фильтрации и управления заметками/рисками.

## Основные функции
- Отображение тендеров с фильтрацией и сортировкой через Redux.
- Редактирование ячеек (текст, числа, выбор из списка).
- Выбор цвета метки через всплывающее окно.
- Управление заметками и карточками рисков в модальном окне с WYSIWYG-редактором.
- Поддержка перетаскивания для прокрутки.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **react-draft-wysiwyg**: WYSIWYG-редактор.
- **draft-js**: Управление заметками.
- **redux**: Для состояния.
- **@reduxjs/toolkit**: `useDispatch`, `useSelector`.
- **../store/tenderActions**: Асинхронные действия.
- **../store/tenderReducer**: Редьюсер и селекторы.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: 
  - Локальное: `noteModalOpen`, `editorStates`, `colorAnchorEls`.
  - Redux: `tenders`, `selectedRows`, `errors`, `visibleColumns`, `sortConfig`, `filters`.
- **Обработчики**: Редактирование ячеек, выбор цвета, сортировка, фильтрация.
- **UI**: Таблица, модальное окно с редактором.

## Использование
Компонент самодостаточен, данные берутся из Redux. Требуется настройка `tenderReducer` и загрузка тендеров через `fetchTenders`.
```jsx
import TenderTable from './TenderTable';
<TenderTable />