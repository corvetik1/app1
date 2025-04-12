// src/app/socket.ts
import EventEmitter from 'events';
import logger from '../utils/logger';
import { AppDispatch, RootState } from './store';
import { setSnackbar, setWebSocketStatus } from '../auth/authSlice';

/**
 * Экземпляр сокета (заглушка).
 */
let socket: SocketStub | null = null;

/**
 * Эмиттер событий для подписки на изменения сокета.
 */
const socketEvents = new EventEmitter();

/**
 * URL сервера WebSocket из переменных окружения с fallback-значением.
 * Для заглушки используется как имитация.
 */
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:5000';

/**
 * Перечисление статусов подключения WebSocket.
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Текущий статус подключения.
 */
let connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;

/**
 * Объект действий Redux, связанных с событиями WebSocket.
 */
export const socketActions = {
  SOCKET_CONNECTED: 'auth/setWebSocketStatus',
  SOCKET_DISCONNECTED: 'auth/setWebSocketStatus',
  SOCKET_ERROR: 'auth/setWebSocketStatus',
  SOCKET_RECONNECT_ATTEMPT: 'SOCKET_RECONNECT_ATTEMPT',
  SOCKET_RECONNECTED: 'SOCKET_RECONNECTED',
  SOCKET_RECONNECT_FAILED: 'SOCKET_RECONNECT_FAILED',
  USER_STATUS_UPDATE: 'USER_STATUS_UPDATE',
  TRANSACTION_UPDATED: 'finance/updateTransaction',
  TRANSACTION_DELETED: 'finance/deleteTransaction',
  ACCOUNT_ADDED: 'finance/addAccount',
  ACCOUNT_UPDATED: 'finance/updateAccount',
  ACCOUNT_DELETED: 'finance/deleteAccount',
  DEBT_ADDED: 'finance/addDebt',
  DEBT_UPDATED: 'finance/updateDebt',
  DEBT_DELETED: 'finance/deleteDebt',
  LOAN_ADDED: 'finance/addLoan',
  LOAN_UPDATED: 'finance/updateLoan',
  LOAN_DELETED: 'finance/deleteLoan',
  TENDER_ADDED: 'tenders/addTender',
  TENDER_UPDATED: 'tenders/updateTender',
  TENDER_DELETED: 'tenders/deleteTender',
  PAYMENT_UPDATED: 'accounting/updatePaymentStatus',
  PORTFOLIO_ADDED: 'investments/addPortfolio',
  PORTFOLIO_UPDATED: 'investments/updatePortfolio',
  PORTFOLIO_DELETED: 'investments/deletePortfolio',
};

/**
 * Интерфейс заглушки для WebSocket.
 */
interface SocketStub {
  on: (event: string, callback: (...args: any[]) => void) => void;
  emit: (event: string, data: any) => void;
  disconnect: () => void;
  connected: boolean;
  id?: string; // Имитация socket.id
}

/**
 * Валидация JWT-токена с проверкой формата и срока действия (заглушка).
 * @param {string} token - JWT-токен.
 * @returns {boolean} Валиден ли токен.
 */
const isTokenValid = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    logger.warn('isTokenValid: Токен не соответствует формату JWT (заглушка)', { token });
    return false;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      logger.warn('isTokenValid: Токен истёк (заглушка)', { exp: payload.exp, now });
      return false;
    }
    logger.debug('isTokenValid: Токен валиден (заглушка)');
    return true;
  } catch (e) {
    logger.warn('isTokenValid: Ошибка декодирования JWT (заглушка)', { error: (e as Error).message });
    return false;
  }
};

/**
 * Инициализация WebSocket-соединения (заглушка).
 * @param {string} token - JWT-токен для аутентификации.
 * @param {AppDispatch} dispatch - Функция диспетчера Redux.
 * @param {Partial<any>} [options] - Дополнительные опции для совместимости (игнорируются в заглушке).
 * @returns {SocketStub} Заглушка для объекта сокета.
 * @throws {Error} Если токен или dispatch не предоставлены.
 */
export const initSocket = (
  token: string,
  dispatch: AppDispatch,
  options: Partial<any> = {}
): SocketStub => {
  const startTime = Date.now();

  if (!token) {
    logger.error('initSocket: Токен не предоставлен для инициализации WebSocket');
    throw new Error('Токен обязателен для подключения WebSocket');
  }

  if (!dispatch || typeof dispatch !== 'function') {
    logger.error('initSocket: Функция dispatch не предоставлена для интеграции с Redux');
    throw new Error('Dispatch обязателен для работы с Redux');
  }

  if (!isTokenValid(token)) {
    logger.error('initSocket: Токен недействителен или истёк (заглушка)');
    dispatch(setSnackbar({ message: 'Недействительный токен для WebSocket', severity: 'error' }));
    throw new Error('Недействительный токен для WebSocket');
  }

  if (socket && socket.connected) {
    logger.warn('initSocket: Сокет уже "подключён" (заглушка)', { socketId: socket.id });
    return socket;
  }

  // Создание заглушки сокета
  const socketStub: SocketStub = {
    id: `stub-${Math.random().toString(36).substring(2, 9)}`, // Имитация socket.id
    on: (event: string, callback: (...args: any[]) => void) => {
      logger.debug('initSocket: Регистрация обработчика события (заглушка)', { event });
      // Симуляция событий
      if (event === 'connect') {
        setTimeout(() => {
          connectionStatus = ConnectionStatus.CONNECTED;
          logger.info('initSocket: "Подключение" сокета (заглушка)', {
            socketId: socketStub.id,
            duration: `${Date.now() - startTime}ms`,
          });
          socketEvents.emit('connected', socketStub.id);
          dispatch({
            type: socketActions.SOCKET_CONNECTED,
            payload: { status: ConnectionStatus.CONNECTED },
          });
          dispatch(setSnackbar({ message: 'WebSocket "подключён" (заглушка)', severity: 'success' }));
          callback();
        }, 100); // Имитация задержки подключения
      } else if (event === 'test_response') {
        setTimeout(() => callback({ message: 'Тестовый ответ от заглушки' }), 200);
      }
    },
    emit: (event: string, data: any) => {
      logger.debug('initSocket: Отправка события (заглушка)', { event, data });
      // Симуляция ответа для test_connection
      if (event === 'test_connection') {
        socketEvents.emit('test_response', { message: 'Тестовый ответ от заглушки' });
      } else if (event === 'user_online') {
        socketEvents.emit('user_status_update', { userId: data.userId, status: 'online' });
      }
    },
    disconnect: () => {
      connectionStatus = ConnectionStatus.DISCONNECTED;
      logger.info('initSocket: "Отключение" сокета (заглушка)', { socketId: socketStub.id });
      socketEvents.emit('disconnected', 'manual');
      dispatch({
        type: socketActions.SOCKET_DISCONNECTED,
        payload: { status: ConnectionStatus.DISCONNECTED, reason: 'manual' },
      });
      dispatch(setSnackbar({ message: 'WebSocket "отключён" (заглушка)', severity: 'warning' }));
      socket = null;
    },
    connected: true, // Имитация подключённого состояния
  };

  connectionStatus = ConnectionStatus.CONNECTING;
  socket = socketStub;
  logger.debug('initSocket: Socket "инициализирован" (заглушка)', {
    tokenPreview: token.substring(0, 10) + '...',
    url: SOCKET_URL,
  });

  return socketStub;
};

/**
 * Получение текущего экземпляра сокета (заглушка).
 * @returns {SocketStub | null} Экземпляр сокета или null, если не инициализирован.
 */
export const getSocket = (): SocketStub | null => {
  if (!socket) {
    logger.warn('getSocket: Сокет не инициализирован. Вызовите initSocket сначала.');
  }
  return socket;
};

/**
 * Отключение WebSocket-соединения (заглушка).
 * @param {SocketStub | null} [socketInstance] - Экземпляр сокета для отключения (по умолчанию текущий).
 */
export const disconnectSocket = (socketInstance: SocketStub | null = socket): void => {
  if (socketInstance) {
    socketInstance.disconnect();
  } else {
    logger.debug('disconnectSocket: Socket уже "отключён" или не был инициализирован (заглушка)');
  }
};

/**
 * Получение текущего статуса подключения (заглушка).
 * @returns {ConnectionStatus} Текущий статус подключения.
 */
export const getConnectionStatus = (): ConnectionStatus => connectionStatus;

/**
 * Подписка на событие WebSocket (заглушка).
 * @param {string} event - Название события.
 * @param {(...args: any[]) => void} listener - Функция-обработчик события.
 */
export const onSocketEvent = (event: string, listener: (...args: any[]) => void): void => {
  logger.debug('onSocketEvent: Подписка на событие (заглушка)', { event });
  socketEvents.on(event, listener);
};

/**
 * Отписка от события WebSocket (заглушка).
 * @param {string} event - Название события.
 * @param {(...args: any[]) => void} listener - Функция-обработчик события.
 */
export const offSocketEvent = (event: string, listener: (...args: any[]) => void): void => {
  logger.debug('offSocketEvent: Отписка от события (заглушка)', { event });
  socketEvents.off(event, listener);
};

/**
 * Отправка события через WebSocket (заглушка).
 * @param {string} event - Название события.
 * @param {any} data - Данные для отправки.
 */
export const emitSocketEvent = (event: string, data: any): void => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    logger.warn('emitSocketEvent: Нельзя отправить событие, сокет не "подключён" (заглушка)', { event });
  }
};

/**
 * Экспорт констант действий для совместимости.
 */
export const SOCKET_ACTIONS = socketActions;