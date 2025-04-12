const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, tendersController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  tendersController = require('../controllers/tenders');
  logger.debug('Middleware authenticate и контроллер tenders успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера tenders: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getTenders, getTenderById, createTender, updateTender, deleteTender } = tendersController;

// Логирование начала загрузки маршрутов тендеров
logger.debug('Инициализация маршрутов тендеров в tenders.js');

// Маршрут для получения списка тендеров (GET /api/tenders)
router.get('/', authenticateToken, requirePermission('tenders', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список тендеров: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getTenders(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /tenders: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для получения тендера по ID (GET /api/tenders/:id)
router.get('/:id', authenticateToken, requirePermission('tenders', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на тендер по ID: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getTenderById(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /tenders/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания нового тендера (POST /api/tenders)
router.post('/', authenticateToken, requirePermission('tenders', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание тендера: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createTender(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /tenders: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления тендера (PUT /api/tenders/:id)
router.put('/:id', authenticateToken, requirePermission('tenders', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление тендера: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateTender(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /tenders/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления тендера (DELETE /api/tenders/:id)
router.delete('/:id', authenticateToken, requirePermission('tenders', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление тендера: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteTender(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /tenders/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты тендеров успешно настроены в tenders.js');

module.exports = router;