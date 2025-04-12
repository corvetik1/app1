const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, loansController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  loansController = require('../controllers/loans');
  logger.debug('Middleware authenticate и контроллер loans успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера loans: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getLoans, createLoan, updateLoan, deleteLoan } = loansController;

// Логирование начала загрузки маршрутов займов
logger.debug('Инициализация маршрутов займов в loans.js');

// Маршрут для получения списка займов (GET /api/loans)
router.get('/', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список займов: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getLoans(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /loans: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания нового займа (POST /api/loans)
router.post('/', authenticateToken, requirePermission('finance', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание займа: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createLoan(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /loans: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления займа (PUT /api/loans/:id)
router.put('/:id', authenticateToken, requirePermission('finance', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление займа: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateLoan(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /loans/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления займа (DELETE /api/loans/:id)
router.delete('/:id', authenticateToken, requirePermission('finance', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление займа: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteLoan(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /loans/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты займов успешно настроены в loans.js');

module.exports = router;