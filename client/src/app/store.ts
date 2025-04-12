// src/app/store.ts
import { configureStore, combineReducers, Middleware } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { createLogger } from 'redux-logger';
import { thunk } from 'redux-thunk'; // Исправляем импорт на именованный
import logger from '../utils/logger'; // Используем исправленный logger
import rootReducer from './rootReducer';
import financeReducer from '../features/finance/financeSlice';
import authReducer from '../auth/authSlice';
import { initSocket, disconnectSocket } from './socket'; // Импорт WebSocket-функций

/**
 * Интерфейс состояния приложения.
 */
export interface RootState {
  auth: ReturnType<typeof authReducer>;
  finance: ReturnType<typeof financeReducer>;
  // Добавьте другие редьюсеры по мере их появления
}

/**
 * Тип для диспетчера Redux.
 */
export type AppDispatch = typeof store.dispatch;

/**
 * Конфигурация для redux-persist.
 */
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth'], // Сохраняем только auth в localStorage
};

/**
 * Создание промежуточного слоя для обработки WebSocket.
 * @param {ReturnType<typeof configureStore>} store - Redux store.
 * @returns {Middleware} Middleware функция для обработки WebSocket-событий.
 */
const socketMiddleware: Middleware = (store) => (next) => (action) => {
  const { dispatch, getState } = store;
  const { auth } = getState() as RootState;

  try {
    switch (action.type) {
      case 'auth/loginSuccess':
      case 'auth/checkAuth/fulfilled': {
        const token = action.payload?.token;
        if (!token) {
          logger.warn('socketMiddleware: Токен отсутствует в действии', { actionType: action.type });
          break;
        }
        logger.debug('socketMiddleware: Инициализация WebSocket после входа или проверки', {
          tokenPreview: token.substring(0, 10) + '...',
        });
        initSocket(token, dispatch);
        break;
      }
      case 'auth/logout': {
        logger.debug('socketMiddleware: Отключение WebSocket при выходе');
        disconnectSocket(); // Исправляем closeSocket на disconnectSocket
        break;
      }
      case 'auth/setWebSocketStatus': {
        logger.debug('socketMiddleware: Обновление статуса WebSocket', action.payload);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    logger.error('socketMiddleware: Ошибка в обработке действия', {
      actionType: action.type,
      error: (error as Error).message,
    });
  }

  return next(action);
};

/**
 * Создание промежуточного слоя для логирования с фильтрацией действий.
 */
const reduxLogger = createLogger({
  predicate: () => (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || false, // Логирование только в development
  collapsed: true,
  duration: true,
  diff: true,
  logger: {
    log: (...args: any[]) => logger.debug('Redux Logger:', ...args),
    warn: (...args: any[]) => logger.warn('Redux Logger:', ...args),
    error: (...args: any[]) => logger.error('Redux Logger:', ...args),
  },
});

/**
 * Конфигурация и создание Redux store.
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(thunk, socketMiddleware, reduxLogger),
  devTools: (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') || true, // DevTools только в development
});

/**
 * Создание persistor для управления сохранением состояния.
 */
export const persistor = persistStore(store);

/**
 * Инициализация store с логированием.
 */
const initializeStore = () => {
  logger.info('store: Инициализация Redux store', {
    environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown',
    persistedKeys: persistConfig.whitelist,
  });

  store.subscribe(() => {
    const state = store.getState() as RootState;
    logger.debug('store: Состояние обновлено', {
      isAuthenticated: state.auth.isAuthenticated,
      financeAccountsCount: state.finance.accounts.allIds.length,
      lastUpdated: state.finance.lastUpdated,
    });
  });

  // Проверка начальной аутентификации
  try {
    store.dispatch({ type: 'auth/checkAuth' });
  } catch (error) {
    logger.error('initializeStore: Ошибка при проверке начальной аутентификации', {
      error: (error as Error).message,
    });
  }
};

initializeStore();

export default store;