const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, financeController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  financeController = require('../controllers/finance');
  logger.debug('Middleware authenticate и контроллер finance успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера finance: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getFinancialOverview } = financeController;

// Логирование начала загрузки маршрутов финансов
logger.debug('Инициализация маршрутов финансов в finance.js');

// Маршрут для получения общего финансового обзора (GET /api/finance/overview)
router.get('/overview', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на финансовый обзор: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getFinancialOverview(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /finance/overview: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты финансов успешно настроены в finance.js');

module.exports = router;