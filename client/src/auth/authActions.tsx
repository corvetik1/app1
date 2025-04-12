// src/auth/authActions.ts
import axiosRetry from 'axios-retry';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { financeActions } from '../features/finance/financeSlice'; // Исправленный путь для сброса finance
import api from '../api'; // Единообразный импорт API
import { initSocket, disconnectSocket } from '../app/socket'; // Импорт WebSocket
import { setSnackbar } from './authSlice'; // Импорт для уведомлений
import logger from '../utils/logger';

/**
 * Интерфейс учетных данных для входа.
 */
interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Интерфейс ответа при успешном входе или проверке аутентификации.
 */
interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    permissions?: Array<{ action: string; subject: string }>;
  };
}

// Настройка повторных попыток для axios через api.js
axiosRetry(api, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error),
});

/**
 * Асинхронное действие для входа пользователя.
 * @param {LoginCredentials} credentials - Учетные данные пользователя.
 * @returns {Promise<AuthResponse>} Объект с токеном и нормализованными данными пользователя.
 */
export const login = createAsyncThunk(
  'auth/loginSuccess',
  async ({ username, password }: LoginCredentials, { dispatch, rejectWithValue }) => {
    const startTime = Date.now();
    logger.debug('login: Начало действия login', { username, password: '[скрыто]' });
    try {
      logger.debug('login: Вызов api.login');
      const response = await api.login(username, password);
      const { token, user } = response;

      if (!token || !user || !user.id || !user.username || !user.role) {
        logger.error('login: Неверный формат ответа сервера', { response });
        throw new Error('Неверный формат ответа сервера');
      }
      if (!isValidJWT(token)) {
        logger.error('login: Получен некорректный JWT-токен', { token });
        throw new Error('Получен некорректный JWT-токен');
      }

      const normalizedUser = {
        ...user,
        role: user.role.toLowerCase(),
      };

      logger.info('login: Успешный вход', {
        userId: normalizedUser.id,
        username: normalizedUser.username,
        role: normalizedUser.role,
        tokenPreview: token.substring(0, 10) + '...',
        duration: `${Date.now() - startTime}ms`,
      });

      localStorage.setItem('token', token);
      localStorage.setItem('username', normalizedUser.username);
      localStorage.setItem('role', normalizedUser.role);
      localStorage.setItem('userId', normalizedUser.id.toString());

      initSocket(token, dispatch);
      dispatch(setSnackbar({ message: `Добро пожаловать, ${normalizedUser.username}!`, severity: 'success' }));
      return { token, user: normalizedUser };
    } catch (error) {
      const errorMessage = error.message || 'Ошибка входа';
      logger.error('login: Ошибка входа', {
        message: errorMessage,
        status: error.response?.status,
        duration: `${Date.now() - startTime}ms`,
      });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Асинхронное действие для обновления токена.
 * @returns {Promise<string>} Новый токен.
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const startTime = Date.now();
    logger.debug('refreshToken: Начало обновления токена');
    const { auth } = getState() as { auth: { token: string | null } };
    const currentToken = auth.token;

    if (!currentToken) {
      logger.warn('refreshToken: Токен отсутствует, инициируется выход');
      dispatch(logout());
      throw new Error('Токен отсутствует');
    }

    try {
      logger.debug('refreshToken: Вызов api.refreshToken');
      const newToken = await api.refreshToken(currentToken);
      if (!isValidJWT(newToken)) {
        logger.error('refreshToken: Получен некорректный новый JWT-токен', { token: newToken });
        throw new Error('Получен некорректный новый JWT-токен');
      }

      logger.info('refreshToken: Токен успешно обновлён', {
        tokenPreview: newToken.substring(0, 10) + '...',
        duration: `${Date.now() - startTime}ms`,
      });
      localStorage.setItem('token', newToken);

      dispatch(setSnackbar({ message: 'Токен успешно обновлён', severity: 'info' }));
      return newToken;
    } catch (error) {
      const errorMessage = error.message || 'Ошибка обновления токена';
      logger.error('refreshToken: Ошибка обновления токена', {
        message: errorMessage,
        status: error.response?.status,
        duration: `${Date.now() - startTime}ms`,
      });
      dispatch(logout());
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Асинхронное действие для проверки аутентификации.
 * @returns {Promise<AuthResponse>} Объект с токеном и нормализованными данными пользователя.
 */
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const startTime = Date.now();
    logger.debug('checkAuth: Начало проверки аутентификации');
    const { auth } = getState() as { auth: { isAuthenticated: boolean; token: string | null } };

    if (auth.isAuthenticated && auth.token && isValidJWT(auth.token)) {
      logger.debug('checkAuth: Пользователь уже аутентифицирован');
      const { userId, currentUser, role } = getState().auth as { userId: number | null; currentUser: string | null; role: string | null };
      return { token: auth.token, user: { id: userId!, username: currentUser!, role: role! } };
    }

    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role')?.toLowerCase();
    const userId = localStorage.getItem('userId');

    if (!token || !username || !role || !userId || !isValidJWT(token)) {
      logger.warn('checkAuth: Недостаточно данных в localStorage или некорректный токен', { token, username, role, userId });
      dispatch(logout());
      throw new Error('Недостаточно данных для аутентификации');
    }

    try {
      logger.debug('checkAuth: Запрос профиля через api.getProfile');
      const user = await api.getProfile();
      const normalizedUser = {
        ...user,
        role: user.role.toLowerCase(),
      };
      logger.info('checkAuth: Успешная проверка аутентификации', {
        userId: normalizedUser.id,
        username: normalizedUser.username,
        role: normalizedUser.role,
        duration: `${Date.now() - startTime}ms`,
      });

      initSocket(token, dispatch);
      dispatch(setSnackbar({ message: `Аутентификация подтверждена, добро пожаловать, ${normalizedUser.username}!`, severity: 'success' }));
      return { token, user: normalizedUser };
    } catch (error) {
      const errorMessage = error.message || 'Ошибка проверки профиля';
      logger.error('checkAuth: Ошибка проверки профиля', {
        message: errorMessage,
        status: error.response?.status,
        duration: `${Date.now() - startTime}ms`,
      });
      dispatch(logout());
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Асинхронное действие для выхода из системы.
 * @returns {Promise<null>} null после завершения выхода.
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    const startTime = Date.now();
    logger.debug('logout: Начало выхода из системы');
    dispatch(financeActions.resetFinance());
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    logger.info('logout: Выход завершён', { duration: `${Date.now() - startTime}ms` });
    dispatch(setSnackbar({ message: 'Вы успешно вышли из системы', severity: 'info' }));
    return null;
  }
);

/**
 * Валидация JWT-токена с проверкой формата и срока действия.
 * @param {string} token - JWT-токен.
 * @returns {boolean} Валиден ли токен.
 */
const isValidJWT = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    logger.warn('isValidJWT: Токен не соответствует формату JWT', { token });
    return false;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      logger.warn('isValidJWT: Токен истёк', { exp: payload.exp, now });
      return false;
    }
    logger.debug('isValidJWT: Токен валиден');
    return true;
  } catch (e) {
    logger.warn('isValidJWT: Ошибка декодирования JWT', { error: e.message });
    return false;
  }
};

// Экспорт всех действий как объект
export default {
  login,
  logout,
  refreshToken,
  checkAuth,
};