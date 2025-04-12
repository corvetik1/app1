const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requireAdmin, rolesController;
try {
  ({ authenticateToken, requireAdmin } = require('../middleware/authenticate'));
  rolesController = require('../controllers/roles');
  logger.debug('Middleware authenticate и контроллер roles успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера roles: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getRoles, createRole, updateRole, deleteRole } = rolesController;

// Логирование начала загрузки маршрутов ролей
logger.debug('Инициализация маршрутов ролей в roles.js');

// Маршрут для получения списка ролей (GET /api/roles)
router.get('/', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на список ролей: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getRoles(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /roles: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания новой роли (POST /api/roles)
router.post('/', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на создание роли: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createRole(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /roles: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления роли (PUT /api/roles/:id)
router.put('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на обновление роли: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateRole(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /roles/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления роли (DELETE /api/roles/:id)
router.delete('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на удаление роли: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteRole(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /roles/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты ролей успешно настроены в roles.js');

module.exports = router;