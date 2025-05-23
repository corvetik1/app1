# UserManagementPage.js

## Описание
`UserManagementPage.js` — страница управления пользователями и ролями, доступная только администраторам. Позволяет создавать, редактировать, удалять пользователей и роли, а также настраивать разрешения.

## Основные функции
- Отображение списка пользователей с пагинацией и поиском.
- Создание, редактирование, удаление пользователей и ролей.
- Настройка разрешений для ролей.
- Переключение профиля пользователя.
- Отправка сообщений через WebSocket.

## Зависимости
- **React**: Для UI.
- **@mui/material**: Компоненты Material-UI.
- **react-redux**: Для Redux.
- **react-router-dom**: Для навигации.
- **lodash**: Для `debounce`.
- **jwt-decode**: Для декодирования токенов.
- **../socket**: WebSocket-соединение.
- **../api**: API-запросы.
- **../store/authReducer**: Действия авторизации.
- **../utils/logger**: Логирование.

## Структура
- **Состояние**: Локальное для управления диалогами, пользователей, ролей, разрешений.
- **Обработчики**: Создание/редактирование/удаление пользователей и ролей, управление разрешениями.
- **UI**: Таблицы, диалоги, переключатели.

## Использование
Используется как страница администратора:
```jsx
import UserManagementPage from './UserManagementPage';
<UserManagementPage />