// src/app/socket.ts
import io, { Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import EventEmitter from 'events';
import logger from '../utils/logger';
import { AppDispatch, RootState } from './store';
import { setSnackbar, setWebSocketStatus } from '../auth/authSlice';

/**
 * Экземпляр сокета.
 */
let socket: Socket | null = null;

/**
 * Эмиттер событий для подписки на изменения сокета.
 */
const socketEvents = new EventEmitter();

/**
 * URL сервера WebSocket из переменных окружения с fallback-значением.
 * Используется process.env с безопасным доступом для кастомного Webpack.
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
 * Используется для диспетчеризации событий в store.
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
 * Валидация JWT-токена с проверкой формата и срока действия.
 * @param {string} token - JWT-токен для проверки.
 * @returns {boolean} Валиден ли токен.
 */
const isTokenValid = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    logger.warn('isTokenValid: Токен не соответствует формату JWT', { token });
    return false;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      logger.warn('isTokenValid: Токен истёк', { exp: payload.exp, now });
      return false;
    }
    logger.debug('isTokenValid: Токен валиден', { userId: payload.id || payload.sub });
    return true;
  } catch (e) {
    logger.warn('isTokenValid: Ошибка декодирования JWT', { error: (e as Error).message });
    return false;
  }
};

/**
 * Инициализация WebSocket-соединения.
 * @param {string} token - JWT-токен для аутентификации.
 * @param {AppDispatch} dispatch - Функция диспетчера Redux.
 * @param {Partial<ManagerOptions & SocketOptions>} [options] - Дополнительные опции для сокета.
 * @returns {Socket} Экземпляр сокета.
 * @throws {Error} Если токен или dispatch не предоставлены, или токен недействителен.
 */
export const initSocket = (
  token: string,
  dispatch: AppDispatch,
  options: Partial<ManagerOptions & SocketOptions> = {}
): Socket => {
  const startTime = Date.now();

  // Проверка входных параметров
  if (!token) {
    logger.error('initSocket: Токен не предоставлен для инициализации WebSocket');
    throw new Error('Токен обязателен для подключения WebSocket');
  }

  if (!dispatch || typeof dispatch !== 'function') {
    logger.error('initSocket: Функция dispatch не предоставлена для интеграции с Redux');
    throw new Error('Dispatch обязателен для работы с Redux');
  }

  if (!isTokenValid(token)) {
    logger.error('initSocket: Токен недействителен или истёк');
    dispatch(setSnackbar({ message: 'Недействительный токен для WebSocket', severity: 'error' }));
    throw new Error('Недействительный токен для WebSocket');
  }

  // Проверка существующего подключения
  if (socket && socket.connected) {
    logger.warn('initSocket: Сокет уже подключён', { socketId: socket.id });
    return socket;
  }

  // Настройки сокета с использованием переменных окружения
  const socketOptions: ManagerOptions & SocketOptions = {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_ATTEMPTS || '10', 10),
    reconnectionDelay: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_DELAY || '1000', 10),
    reconnectionDelayMax: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_DELAY_MAX || '5000', 10),
    randomizationFactor: 0.5,
    timeout: parseInt(process.env.REACT_APP_SOCKET_TIMEOUT || '20000', 10),
    ...options,
  };

  connectionStatus = ConnectionStatus.CONNECTING;
  socket = io(SOCKET_URL, socketOptions);
  logger.debug('initSocket: Socket инициализирован', {
    tokenPreview: token.substring(0, 10) + '...',
    url: SOCKET_URL,
    options: socketOptions,
  });

  // Извлечение userId из токена
  let userId: number | null = null;
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    userId = decoded.id || decoded.sub || null;
    logger.debug('initSocket: Извлечён userId из токена', { userId });
  } catch (err) {
    logger.error('initSocket: Ошибка декодирования токена для userId', { message: (err as Error).message });
    userId = null;
  }

  // Обработчик успешного подключения
  socket.on('connect', () => {
    connectionStatus = ConnectionStatus.CONNECTED;
    logger.info('initSocket: Socket подключён', {
      socketId: socket.id,
      duration: `${Date.now() - startTime}ms`,
    });
    socketEvents.emit('connected', socket.id);
    dispatch({
      type: socketActions.SOCKET_CONNECTED,
      payload: { status: ConnectionStatus.CONNECTED },
    });
    dispatch(setSnackbar({ message: 'WebSocket подключён', severity: 'success' }));

    socket.emit('test_connection', { message: 'Client connected', token });
    if (userId) {
      socket.emit('user_online', { userId });
      logger.debug('initSocket: Отправлено событие user_online', { userId });
    }
  });

  // Обработчик ошибки подключения
  socket.on('connect_error', (err: Error) => {
    connectionStatus = ConnectionStatus.ERROR;
    logger.error('initSocket: Ошибка подключения', {
      message: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`,
    });
    socketEvents.emit('connect_error', err);
    dispatch({
      type: socketActions.SOCKET_ERROR,
      payload: { status: ConnectionStatus.ERROR, error: `Ошибка подключения: ${err.message}` },
    });
    dispatch(setSnackbar({ message: `Ошибка подключения WebSocket: ${err.message}`, severity: 'error' }));
  });

  // Обработчик отключения
  socket.on('disconnect', (reason: string) => {
    connectionStatus = ConnectionStatus.DISCONNECTED;
    logger.warn('initSocket: Socket отключён', { reason, socketId: socket?.id });
    socketEvents.emit('disconnected', reason);
    dispatch({
      type: socketActions.SOCKET_DISCONNECTED,
      payload: { status: ConnectionStatus.DISCONNECTED, reason },
    });
    dispatch(setSnackbar({ message: `WebSocket отключён: ${reason}`, severity: 'warning' }));
  });

  // Обработчик тестового ответа
  socket.on('test_response', (data: any) => {
    logger.debug('initSocket: Получен тестовый ответ от сервера', { data });
    socketEvents.emit('test_response', data);
  });

  // Обработчик попытки переподключения
  socket.on('reconnect_attempt', (attempt: number) => {
    logger.debug('initSocket: Попытка переподключения', { attempt });
    socketEvents.emit('reconnect_attempt', attempt);
    dispatch({ type: socketActions.SOCKET_RECONNECT_ATTEMPT, payload: { attempt } });
  });

  // Обработчик успешного переподключения
  socket.on('reconnect', (attempt: number) => {
    if (!isTokenValid(token)) {
      logger.error('initSocket: Токен истёк во время переподключения, требуется повторная аутентификация');
      disconnectSocket(socket);
      dispatch(setSnackbar({ message: 'Токен истёк, требуется повторный вход', severity: 'error' }));
      return;
    }
    connectionStatus = ConnectionStatus.CONNECTED;
    logger.info('initSocket: WebSocket успешно переподключён', { attempt, socketId: socket.id });
    socketEvents.emit('reconnected', attempt);
    dispatch({ type: socketActions.SOCKET_RECONNECTED, payload: { attempt } });
    dispatch(setSnackbar({ message: `WebSocket переподключён после ${attempt} попыток`, severity: 'success' }));

    if (userId) {
      socket.emit('user_online', { userId });
      logger.debug('initSocket: Отправлено событие user_online после переподключения', { userId });
    }
  });

  // Обработчик неудачного переподключения
  socket.on('reconnect_failed', () => {
    connectionStatus = ConnectionStatus.ERROR;
    logger.error('initSocket: Не удалось переподключить WebSocket после исчерпания попыток');
    socketEvents.emit('reconnect_failed');
    dispatch({ type: socketActions.SOCKET_RECONNECT_FAILED });
    dispatch(setSnackbar({ message: 'Не удалось переподключить WebSocket', severity: 'error' }));
  });

  // Обработчик общей ошибки
  socket.on('error', (err: Error) => {
    logger.error('initSocket: Общая ошибка Socket.IO', { message: err.message });
    socketEvents.emit('error', err);
    dispatch({
      type: socketActions.SOCKET_ERROR,
      payload: { status: ConnectionStatus.ERROR, error: err.message },
    });
    dispatch(setSnackbar({ message: `Ошибка WebSocket: ${err.message}`, severity: 'error' }));
  });

  // Обработчики событий приложения
  socket.on('user_status_update', (data: any) => {
    logger.debug('initSocket: Получено обновление статуса пользователя', { data });
    socketEvents.emit('user_status_update', data);
    dispatch({ type: socketActions.USER_STATUS_UPDATE, payload: data });
  });

  socket.on('transactionAdded', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено добавление транзакции', { transactionId: data.id, userId: data.user_id });
      socketEvents.emit('transactionAdded', data);
      dispatch({ type: socketActions.TRANSACTION_UPDATED, payload: data });
      dispatch(setSnackbar({ message: `Добавлена транзакция #${data.id}`, severity: 'info' }));
    }
  });

  socket.on('transactionUpdated', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено обновление транзакции', { transactionId: data.id, userId: data.user_id });
      socketEvents.emit('transactionUpdated', data);
      dispatch({ type: socketActions.TRANSACTION_UPDATED, payload: data });
      dispatch(setSnackbar({ message: `Обновлена транзакция #${data.id}`, severity: 'info' }));
    }
  });

  socket.on('transactionDeleted', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено удаление транзакции', { transactionId: data.id, userId: data.user_id });
      socketEvents.emit('transactionDeleted', data);
      dispatch({ type: socketActions.TRANSACTION_DELETED, payload: data.id });
      dispatch(setSnackbar({ message: `Удалена транзакция #${data.id}`, severity: 'info' }));
    }
  });

  socket.on('accountAdded', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено добавление счёта', { accountId: data.id, userId: data.user_id });
      socketEvents.emit('accountAdded', data);
      dispatch({ type: socketActions.ACCOUNT_ADDED, payload: data });
      dispatch(setSnackbar({ message: `Добавлен счёт: ${data.name}`, severity: 'info' }));
    }
  });

  socket.on('accountUpdated', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено обновление счёта', { accountId: data.id, userId: data.user_id });
      socketEvents.emit('accountUpdated', data);
      dispatch({ type: socketActions.ACCOUNT_UPDATED, payload: data });
      dispatch(setSnackbar({ message: `Обновлён счёт: ${data.name}`, severity: 'info' }));
    }
  });

  socket.on('accountDeleted', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено удаление счёта', { accountId: data.id, userId: data.user_id });
      socketEvents.emit('accountDeleted', data);
      dispatch({ type: socketActions.ACCOUNT_DELETED, payload: data.id });
      dispatch(setSnackbar({ message: `Удалён счёт #${data.id}`, severity: 'info' }));
    }
  });

  socket.on('debtAdded', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено добавление долга', { debtId: data.id, userId: data.user_id });
      socketEvents.emit('debtAdded', data);
      dispatch({ type: socketActions.DEBT_ADDED, payload: data });
      dispatch(setSnackbar({ message: `Добавлен долг: ${data.name}`, severity: 'info' }));
    }
  });

  socket.on('debtUpdated', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено обновление долга', { debtId: data.id, userId: data.user_id });
      socketEvents.emit('debtUpdated', data);
      dispatch({ type: socketActions.DEBT_UPDATED, payload: data });
      dispatch(setSnackbar({ message: `Обновлён долг: ${data.name}`, severity: 'info' }));
    }
  });

  socket.on('debtDeleted', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено удаление долга', { debtId: data.id, userId: data.user_id });
      socketEvents.emit('debtDeleted', data);
      dispatch({ type: socketActions.DEBT_DELETED, payload: data.id });
      dispatch(setSnackbar({ message: `Удалён долг #${data.id}`, severity: 'info' }));
    }
  });

  socket.on('loanAdded', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено добавление займа', { loanId: data.id, userId: data.user_id });
      socketEvents.emit('loanAdded', data);
      dispatch({ type: socketActions.LOAN_ADDED, payload: data });
      dispatch(setSnackbar({ message: `Добавлен займ: ${data.name}`, severity: 'info' }));
    }
  });

  socket.on('loanUpdated', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено обновление займа', { loanId: data.id, userId: data.user_id });
      socketEvents.emit('loanUpdated', data);
      dispatch({ type: socketActions.LOAN_UPDATED, payload: data });
      dispatch(setSnackbar({ message: `Обновлён займ: ${data.name}`, severity: 'info' }));
    }
  });

  socket.on('loanDeleted', (data: any) => {
    if (data.user_id === userId) {
      logger.debug('initSocket: Получено удаление займа', { loanId: data.id, userId: data.user_id });
      socketEvents.emit('loanDeleted', data);
      dispatch({ type: socketActions.LOAN_DELETED, payload: data.id });
      dispatch(setSnackbar({ message: `Удалён займ #${data.id}`, severity: 'info' }));
    }
  });

  socket.on('tenderAdded', (data: any) => {
    logger.debug('initSocket: Получено добавление тендера', { tenderId: data.id, userId: data.user_id });
    socketEvents.emit('tenderAdded', data);
    dispatch({ type: socketActions.TENDER_ADDED, payload: data });
    dispatch(setSnackbar({ message: `Добавлен тендер #${data.id}`, severity: 'info' }));
  });

  socket.on('tenderUpdated', (data: any) => {
    logger.debug('initSocket: Получено обновление тендера', { tenderId: data.id, userId: data.user_id });
    socketEvents.emit('tenderUpdated', data);
    dispatch({ type: socketActions.TENDER_UPDATED, payload: data });
    dispatch(setSnackbar({ message: `Обновлён тендер #${data.id}`, severity: 'info' }));
  });

  socket.on('tenderDeleted', (data: any) => {
    logger.debug('initSocket: Получено удаление тендера', { tenderId: data.id, userId: data.user_id });
    socketEvents.emit('tenderDeleted', data);
    dispatch({ type: socketActions.TENDER_DELETED, payload: data.id });
    dispatch(setSnackbar({ message: `Удалён тендер #${data.id}`, severity: 'info' }));
  });

  socket.on('paymentUpdated', (data: any) => {
    logger.debug('initSocket: Получено обновление оплаты', { paymentId: data.id, tenderId: data.tender_id });
    socketEvents.emit('paymentUpdated', data);
    dispatch({ type: socketActions.PAYMENT_UPDATED, payload: data });
    dispatch(setSnackbar({ message: `Обновлена оплата #${data.id}`, severity: 'info' }));
  });

  socket.on('portfolioAdded', (data: any) => {
    logger.debug('initSocket: Получено добавление портфеля', { portfolioId: data.id, userId: data.user_id });
    socketEvents.emit('portfolioAdded', data);
    dispatch({ type: socketActions.PORTFOLIO_ADDED, payload: data });
    dispatch(setSnackbar({ message: `Добавлен портфель: ${data.name}`, severity: 'info' }));
  });

  socket.on('portfolioUpdated', (data: any) => {
    logger.debug('initSocket: Получено обновление портфеля', { portfolioId: data.id, userId: data.user_id });
    socketEvents.emit('portfolioUpdated', data);
    dispatch({ type: socketActions.PORTFOLIO_UPDATED, payload: data });
    dispatch(setSnackbar({ message: `Обновлён портфель: ${data.name}`, severity: 'info' }));
  });

  socket.on('portfolioDeleted', (data: any) => {
    logger.debug('initSocket: Получено удаление портфеля', { portfolioId: data.id, userId: data.user_id });
    socketEvents.emit('portfolioDeleted', data);
    dispatch({ type: socketActions.PORTFOLIO_DELETED, payload: data.id });
    dispatch(setSnackbar({ message: `Удалён портфель #${data.id}`, severity: 'info' }));
  });

  return socket;
};

/**
 * Получение текущего экземпляра сокета.
 * @returns {Socket | null} Экземпляр сокета или null, если не инициализирован.
 */
export const getSocket = (): Socket | null => {
  if (!socket) {
    logger.warn('getSocket: Сокет не инициализирован. Вызовите initSocket сначала.');
  }
  return socket;
};

/**
 * Отключение WebSocket-соединения.
 * @param {Socket | null} [socketInstance] - Экземпляр сокета для отключения (по умолчанию текущий).
 */
export const disconnectSocket = (socketInstance: Socket | null = socket): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    logger.info('disconnectSocket: Socket отключён вручную', { socketId: socketInstance.id });
    socket = null;
    connectionStatus = ConnectionStatus.DISCONNECTED;
    socketEvents.emit('disconnected', 'manual');
  } else {
    logger.debug('disconnectSocket: Socket уже отключён или не был инициализирован');
  }
};

/**
 * Получение текущего статуса подключения.
 * @returns {ConnectionStatus} Текущий статус подключения.
 */
export const getConnectionStatus = (): ConnectionStatus => connectionStatus;

/**
 * Подписка на событие WebSocket.
 * @param {string} event - Название события.
 * @param {(...args: any[]) => void} listener - Функция-обработчик события.
 */
export const onSocketEvent = (event: string, listener: (...args: any[]) => void): void => {
  logger.debug('onSocketEvent: Подписка на событие', { event });
  socketEvents.on(event, listener);
};

/**
 * Отписка от события WebSocket.
 * @param {string} event - Название события.
 * @param {(...args: any[]) => void} listener - Функция-обработчик события.
 */
export const offSocketEvent = (event: string, listener: (...args: any[]) => void): void => {
  logger.debug('offSocketEvent: Отписка от события', { event });
  socketEvents.off(event, listener);
};

/**
 * Отправка события через WebSocket.
 * @param {string} event - Название события.
 * @param {any} data - Данные для отправки.
 */
export const emitSocketEvent = (event: string, data: any): void => {
  if (socket && socket.connected) {
    socket.emit(event, data);
    logger.debug('emitSocketEvent: Событие отправлено', { event, data });
  } else {
    logger.warn('emitSocketEvent: Нельзя отправить событие, сокет не подключён', { event });
  }
};

/**
 * Экспорт констант действий для совместимости.
 */
export const SOCKET_ACTIONS = socketActions;