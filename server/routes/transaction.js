const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, transactionController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  transactionController = require('../controllers/transaction');
  logger.debug('Middleware authenticate и контроллер transaction успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера transaction: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getTransactions, createTransaction, updateTransaction, deleteTransaction } = transactionController;

// Логирование начала загрузки маршрутов транзакций
logger.debug('Инициализация маршрутов транзакций в transaction.js');

// Маршрут для получения списка транзакций (GET /api/transactions)
router.get('/', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список транзакций: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getTransactions(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /transactions: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания новой транзакции (POST /api/transactions)
router.post('/', authenticateToken, requirePermission('finance', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание транзакции: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createTransaction(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /transactions: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления транзакции (PUT /api/transactions/:id)
router.put('/:id', authenticateToken, requirePermission('finance', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление транзакции: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateTransaction(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /transactions/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления транзакции (DELETE /api/transactions/:id)
router.delete('/:id', authenticateToken, requirePermission('finance', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление транзакции: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteTransaction(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /transactions/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты транзакций успешно настроены в transaction.js');

module.exports = router;