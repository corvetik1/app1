# AppBarAndMenu.js

## Описание
`AppBarAndMenu.js` — компонент верхней панели навигации с меню и настройками для приложения.

## Основные функции
- Навигация по страницам через вкладки и мобильное меню.
- Отображение информации о текущем пользователе из Redux.
- Управление локальными настройками (размер шрифта, масштаб, тёмная тема, анимации) с сохранением в `localStorage`.
- Выход из системы через Redux-действие.

## Зависимости
- **React**: Для построения UI.
- **@mui/material**: Компоненты Material-UI (AppBar, Tabs, Drawer, Dialog и т.д.).
- **react-router-dom**: Для навигации (`Link`, `useLocation`).
- **react-redux**: Для интеграции с Redux (`useDispatch`, `useSelector`).
- **framer-motion**: Для анимаций (переходы страниц, эффекты hover/tap).
- **../store/authReducer**: Редьюсер авторизации для получения данных пользователя и выхода.
- **../utils/logger**: Утилита логирования.

## Структура
- **Состояние**:
  - Локальное: `settingsModalOpen`, `mobileMenuOpen`, `isLoggingOut`, `settings` (содержит `fontSize`, `scale`, `isDarkMode`, `isAnimationsEnabled`).
  - Redux: `isAuthenticated`, `user`, `permissions`.
- **Обработчики**:
  - `handleSettingsClick`, `handleSettingsClose`: Открытие/закрытие настроек.
  - `handleFontSizeChange`, `handleScaleChange`, `handleDarkModeToggle`, `handleAnimationsToggle`: Управление настройками.
  - `handleMobileMenuToggle`: Переключение мобильного меню.
  - `handleLogout`: Выход из системы.
- **UI**: Навигационная панель, мобильное меню, модальное окно настроек.

## Использование
Компонент используется как основная навигационная панель в приложении. Требует передачи функции `onLogout` для обработки выхода:
```jsx
import AppBarAndMenu from './AppBarAndMenu';
<AppBarAndMenu onLogout={handleLogout} />