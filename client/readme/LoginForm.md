# LoginForm.js

## Описание
`LoginForm.js` — React-компонент формы авторизации для входа пользователей в систему.

## Основные функции
- Ввод логина и пароля с валидацией пустых полей.
- Переключение видимости пароля.
- Асинхронная авторизация через Redux-действие `authActions.login`.
- Отображение сообщений об успехе или ошибке с анимацией.
- Перенаправление на последнюю посещённую страницу после входа.

## Зависимости
- **React**: Для построения UI.
- **@mui/material**: Компоненты Material-UI (TextField, Button, Paper и т.д.).
- **react-router-dom**: Для навигации (`useNavigate`).
- **react-redux**: Для интеграции с Redux (`useDispatch`).
- **../store/authReducer**: Действия авторизации (`authActions`).
- **../utils/logger**: Утилита логирования.
- **../assets/logo.png**: Логотип приложения.

## Структура
- **Состояние**:
  - `username`, `password`: Значения полей ввода.
  - `showPassword`: Видимость пароля.
  - `message`, `messageSeverity`, `showMessage`: Сообщения для пользователя.
  - `usernameError`, `passwordError`: Ошибки валидации полей.
  - `isLoading`: Состояние загрузки.
- **Обработчики**:
  - `handleLoginClick`: Обработка входа.
  - `handleTogglePassword`: Переключение видимости пароля.
  - `handleKeyPress`: Обработка нажатия Enter.
- **UI**: Форма с логотипом, полями ввода и кнопкой.

## Использование
Компонент используется как самостоятельная форма входа:
```jsx
import LoginForm from './LoginForm';
<LoginForm />