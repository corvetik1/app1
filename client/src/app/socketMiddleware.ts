// src/app/socketMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from './store';
import { initSocket, disconnectSocket } from './socket'; // Исправлен импорт: используем именованные экспорты
import logger from '../utils/logger'; // Импорт логгера для отслеживания событий
import { setWebSocketStatus, setSnackbar } from '../auth/authSlice'; // Действия для управления статусом WebSocket и уведомлениями
import { login, checkAuth, logout } from '../auth/authActions'; // Действия аутентификации
import { addTransaction, deleteTransaction } from '../features/finance/financeActions'; // Действия для транзакций
import { addTenderRealtime, updateTenderRealtime, deleteTenderRealtime } from '../features/tenders/tendersSlice'; // Действия для тендеров
import { updatePaymentStatus } from '../features/accounting/accountingSlice'; // Действия для бухгалтерии
import { updatePortfolio } from '../features/investments/investmentsSlice'; // Действия для инвестиций
import { addCategory, addMedia, deleteCategory, deleteMedia } from '../features/gallery/gallerySlice'; // Действия для галереи

/**
 * Middleware для управления WebSocket-соединением.
 * Обрабатывает подключение, отключение и события WebSocket, синхронизируя их с состоянием Redux.
 * @param store - Redux store.
 * @returns Middleware функция.
 */
export const socketMiddleware: Middleware = (store) => {
  let ws: ReturnType<typeof initSocket> | null = null; // WebSocket-инстанс, изначально null
  let reconnectAttempts = 0; // Счётчик попыток переподключения
  const maxReconnectAttempts = parseInt(process.env.REACT_APP_WS_RECONNECT_ATTEMPTS || '5', 10); // Максимальное количество попыток переподключения
  const reconnectDelay = parseInt(process.env.REACT_APP_WS_RECONNECT_DELAY || '2000', 10); // Задержка между попытками в миллисекундах

  /**
   * Функция для попытки переподключения WebSocket.
   */
  const attemptReconnect = () => {
    const { dispatch, getState } = store;
    const { token, userId } = getState().auth;

    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.error('socketMiddleware: Превышено максимальное количество попыток переподключения WebSocket', { maxReconnectAttempts });
      dispatch(setWebSocketStatus({ status: 'failed' }));
      dispatch(setSnackbar({ message: 'Не удалось восстановить соединение с WebSocket', severity: 'error' }));
      return;
    }

    reconnectAttempts++;
    logger.info(`socketMiddleware: Попытка переподключения WebSocket #${reconnectAttempts} через ${reconnectDelay / 1000} сек`, {
      attemptsRemaining: maxReconnectAttempts - reconnectAttempts,
    });

    setTimeout(() => {
      if (token && userId && !ws?.connected) {
        logger.debug('socketMiddleware: Вызов initSocket для переподключения');
        ws = initSocket(token, dispatch);
      } else {
        logger.warn('socketMiddleware: Переподключение отменено - нет токена/userId или сокет уже подключён', { token, userId, connected: ws?.connected });
      }
    }, reconnectDelay);
  };

  /**
   * Middleware-функция, обрабатывающая действия Redux.
   * @param next - Следующий middleware в цепочке.
   * @returns Функция обработки действия.
   */
  return (next) => (action) => {
    const { dispatch, getState } = store as { dispatch: AppDispatch; getState: () => RootState };
    const { token, userId } = getState().auth;
    const startTime = Date.now();

    // Подключение WebSocket после успешного логина или проверки авторизации
    if ((login.fulfilled.match(action) || checkAuth.fulfilled.match(action)) && token && userId && !ws) {
      logger.debug('socketMiddleware: Инициализация WebSocket после входа или проверки', { actionType: action.type });
      ws = initSocket(token, dispatch);

      ws.on('connect', () => {
        logger.info('socketMiddleware: WebSocket подключён', {
          userId,
          socketId: ws!.id,
          duration: `${Date.now() - startTime}ms`,
        });
        dispatch(setWebSocketStatus({ status: 'connected' }));
        ws!.emit('user_online', { userId });
        reconnectAttempts = 0; // Сброс счётчика попыток переподключения
      });

      // Обработчики событий WebSocket
      ws.on('connect_error', (err: Error) => {
        logger.error('socketMiddleware: Ошибка подключения WebSocket', {
          message: err.message,
          stack: err.stack,
          duration: `${Date.now() - startTime}ms`,
        });
        dispatch(setWebSocketStatus({ status: 'error', error: err.message }));
        if (reconnectAttempts < maxReconnectAttempts) {
          attemptReconnect();
        }
      });

      ws.on('disconnect', (reason: string) => {
        logger.warn('socketMiddleware: WebSocket отключён', { reason, socketId: ws!.id });
        dispatch(setWebSocketStatus({ status: 'disconnected', reason }));
        if (reason === 'io server disconnect' || reason === 'transport close') {
          if (ws) {
            disconnectSocket(ws);
            ws = null;
          }
          attemptReconnect();
        }
      });

      // События финансов (Finance Events)
      ws.on('transactionAdded', (newTransaction: any) => {
        if (newTransaction?.user_id === userId) {
          logger.debug('socketMiddleware: Получено событие transactionAdded', { transactionId: newTransaction.id });
          dispatch(addTransaction(newTransaction));
          dispatch(setSnackbar({ message: `Новая транзакция #${newTransaction.id} добавлена`, severity: 'success' }));
        }
      });

      ws.on('transactionDeleted', (data: any) => {
        const transactionId = data?.id;
        const transactions = getState().finance.transactions.byId;
        if (transactionId && transactions[transactionId]?.user_id === userId) {
          logger.debug('socketMiddleware: Получено событие transactionDeleted', { transactionId });
          dispatch(deleteTransaction(transactionId));
          dispatch(setSnackbar({ message: `Транзакция #${transactionId} удалена`, severity: 'warning' }));
        }
      });

      // События тендеров (Tenders Events)
      ws.on('tenderAdded', (newTender: any) => {
        if (newTender && (newTender.user_id === userId || !newTender.user_id)) {
          logger.debug('socketMiddleware: Получено событие tenderAdded', { tenderId: newTender.id });
          dispatch(addTenderRealtime(newTender));
          dispatch(setSnackbar({ message: `Новый тендер #${newTender.id} добавлен`, severity: 'success' }));
        }
      });

      ws.on('tenderUpdated', (updatedTender: any) => {
        if (updatedTender && (updatedTender.user_id === userId || !updatedTender.user_id)) {
          logger.debug('socketMiddleware: Получено событие tenderUpdated', { tenderId: updatedTender.id });
          dispatch(updateTenderRealtime(updatedTender));
          dispatch(setSnackbar({ message: `Тендер #${updatedTender.id} обновлён`, severity: 'info' }));
        }
      });

      ws.on('tenderDeleted', (data: any) => {
        const tenderId = data?.id;
        const tenders = getState().tenders.tenders.byId;
        if (tenderId && (tenders[tenderId]?.user_id === userId || !tenders[tenderId]?.user_id)) {
          logger.debug('socketMiddleware: Получено событие tenderDeleted', { tenderId });
          dispatch(deleteTenderRealtime(tenderId));
          dispatch(setSnackbar({ message: `Тендер #${tenderId} удалён`, severity: 'warning' }));
        }
      });

      // События бухгалтерии (Accounting Events)
      ws.on('paymentUpdated', (updatedPayment: any) => {
        if (updatedPayment && (updatedPayment.user_id === userId || !updatedPayment.user_id)) {
          logger.debug('socketMiddleware: Получено событие paymentUpdated', { paymentId: updatedPayment.id });
          dispatch(updatePaymentStatus({ tenderId: updatedPayment.tender_id, paidAmount: updatedPayment.paid_amount }));
          dispatch(setSnackbar({ message: `Статус оплаты #${updatedPayment.id} обновлён`, severity: 'info' }));
        }
      });

      // События инвестиций (Investments Events)
      ws.on('portfolioUpdated', (updatedPortfolio: any) => {
        if (updatedPortfolio?.user_id === userId) {
          logger.debug('socketMiddleware: Получено событие portfolioUpdated', { portfolioId: updatedPortfolio.id });
          dispatch(updatePortfolio(updatedPortfolio));
          dispatch(setSnackbar({ message: `Портфель #${updatedPortfolio.id} обновлён`, severity: 'info' }));
        }
      });

      // События галереи (Gallery Events)
      ws.on('categoryAdded', (newCategory: any) => {
        logger.debug('socketMiddleware: Получено событие categoryAdded', { categoryId: newCategory?.id });
        dispatch(addCategory(newCategory));
        dispatch(setSnackbar({ message: `Новая категория #${newCategory?.id} добавлена`, severity: 'success' }));
      });

      ws.on('mediaAdded', (data: any) => {
        logger.debug('socketMiddleware: Получено событие mediaAdded', { categoryId: data?.categoryId });
        dispatch(addMedia(data));
        dispatch(setSnackbar({ message: 'Медиа добавлено в галерею', severity: 'success' }));
      });

      ws.on('categoryDeleted', (data: any) => {
        const categoryId = data?.id;
        if (categoryId) {
          logger.debug('socketMiddleware: Получено событие categoryDeleted', { categoryId });
          dispatch(deleteCategory(categoryId));
          dispatch(setSnackbar({ message: `Категория #${categoryId} удалена`, severity: 'warning' }));
        }
      });

      ws.on('mediaDeleted', (data: any) => {
        logger.debug('socketMiddleware: Получено событие mediaDeleted', { categoryId: data?.categoryId, mediaId: data?.mediaId });
        dispatch(deleteMedia(data));
        dispatch(setSnackbar({ message: `Медиа #${data?.mediaId} удалено`, severity: 'warning' }));
      });
    }

    // Отключение WebSocket при выходе пользователя
    if (logout.fulfilled.match(action) && ws) {
      disconnectSocket(ws);
      ws = null;
      reconnectAttempts = 0;
      logger.info('socketMiddleware: WebSocket отключён при выходе', { duration: `${Date.now() - startTime}ms` });
    }

    return next(action); // Передача действия дальше в цепочку middleware
  };
};