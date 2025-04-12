const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, dolgTableController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  dolgTableController = require('../controllers/dolgtable');
  logger.debug('Middleware authenticate и контроллер dolgtable успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера dolgtable: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getDolgTables, createDolgTable, updateDolgTable, deleteDolgTable } = dolgTableController;

// Логирование начала загрузки маршрутов долгов
logger.debug('Инициализация маршрутов долгов в dolgtable.js');

// Маршрут для получения списка долгов (GET /api/dolg_tables)
router.get('/', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список долгов: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getDolgTables(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /dolg_tables: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания нового долга (POST /api/dolg_tables)
router.post('/', authenticateToken, requirePermission('finance', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание долга: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createDolgTable(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /dolg_tables: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления долга (PUT /api/dolg_tables/:id)
router.put('/:id', authenticateToken, requirePermission('finance', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление долга: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateDolgTable(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /dolg_tables/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления долга (DELETE /api/dolg_tables/:id)
router.delete('/:id', authenticateToken, requirePermission('finance', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление долга: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteDolgTable(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /dolg_tables/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты долгов успешно настроены в dolgtable.js');

module.exports = router;