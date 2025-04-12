// C:\rezerv\app\server\routes\permissions.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

let authenticateToken, requirePermission, permissionsController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  permissionsController = require('../controllers/permissions');
  logger.debug('Middleware authenticate и контроллер permissions успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера permissions: ${error.message}, стек: ${error.stack}`);
  throw error;
}

const { getPermissions, createPermission, updatePermission, deletePermission } = permissionsController;

logger.debug('Инициализация маршрутов разрешений в permissions.js');

router.get('/', authenticateToken, requirePermission('users', 'view'), (req, res, next) => { // Добавлено requirePermission
  logger.debug(`Получен запрос на список разрешений: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getPermissions(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /permissions: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.post('/', authenticateToken, requirePermission('users', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание разрешения: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createPermission(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /permissions: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.put('/:roleId/:page', authenticateToken, requirePermission('users', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление разрешения: ${req.method} ${req.originalUrl}, roleId: ${req.params.roleId}, page: ${req.params.page}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updatePermission(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /permissions/:roleId/:page: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.delete('/:id', authenticateToken, requirePermission('users', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление разрешения: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deletePermission(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /permissions/:id: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

logger.debug('Маршруты разрешений успешно настроены в permissions.js');

module.exports = router;