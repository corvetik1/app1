// C:\rezerv\app\server\routes\tenderbudget.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

let authenticateToken, requirePermission, tenderBudgetController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  tenderBudgetController = require('../controllers/tenderbudget');
  logger.debug('Middleware authenticate и контроллер tenderbudget успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера tenderbudget: ${error.message}, стек: ${error.stack}`);
  throw error;
}

const { getTenderBudgets, createTenderBudget, updateTenderBudget, deleteTenderBudget } = tenderBudgetController;

logger.debug('Инициализация маршрутов бюджета тендеров в tenderbudget.js');

router.get('/', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список бюджетов тендеров: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getTenderBudgets(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /tender_budget: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.post('/', authenticateToken, requirePermission('finance', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание бюджета тендеров: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createTenderBudget(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /tender_budget: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.put('/:id', authenticateToken, requirePermission('finance', 'edit'), (req, res, next) => { // Исправлено на PUT /:id
  logger.debug(`Получен запрос на обновление бюджета тендеров: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateTenderBudget(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /tender_budget/:id: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.delete('/:id', authenticateToken, requirePermission('finance', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление бюджета тендеров: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteTenderBudget(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /tender_budget/:id: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

logger.debug('Маршруты бюджета тендеров успешно настроены в tenderbudget.js');

module.exports = router;