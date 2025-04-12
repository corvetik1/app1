const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, analyticsController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  analyticsController = require('../controllers/analytics');
  logger.debug('Middleware authenticate и контроллер analytics успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера analytics: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getTransactionsAnalytics } = analyticsController;

// Логирование начала загрузки маршрутов аналитики
logger.debug('Инициализация маршрутов аналитики в analytics.js');

// Маршрут для получения аналитики транзакций (GET /api/analytics/transactions)
router.get('/transactions', authenticateToken, requirePermission('analytics', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на аналитику транзакций: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getTransactionsAnalytics(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте /transactions: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик ошибок
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты аналитики успешно настроены в analytics.js');

module.exports = router;