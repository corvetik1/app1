// C:\rezerv\app\server\routes\users.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

let authenticateToken, requireAdmin, requirePermission, usersController;
try {
  ({ authenticateToken, requireAdmin } = require('../middleware/authenticate'));
  requirePermission = require('../middleware/requirePermission'); // Исправлен импорт
  usersController = require('../controllers/users');
  logger.debug('Middleware authenticate, requirePermission и контроллер users успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера users: ${error.message}, стек: ${error.stack}`);
  throw error;
}

const {
  listUsers,
  getUsers,
  createUser,
  updateUserRole,
  toggleUserActive,
  updateUser,
  deleteUser,
  getProfile,
  getUserProfile,
} = usersController;

logger.debug('Инициализация маршрутов пользователей в users.js');

router.get('/list', authenticateToken, requirePermission('users', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список пользователей для выпадающего списка: ${req.method} ${req.originalUrl}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  listUsers(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /users/list: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.get('/', authenticateToken, requirePermission('users', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список пользователей: ${req.method} ${req.originalUrl}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  getUsers(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /users: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.post('/', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на создание пользователя: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  createUser(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /users: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.put('/:id/role', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на обновление роли пользователя: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  updateUserRole(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /users/:id/role: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.put('/:id/toggle-active', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на переключение статуса активности пользователя: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  toggleUserActive(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /users/:id/toggle-active: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.put('/:id', authenticateToken, requirePermission('users', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление пользователя: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  updateUser(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /users/:id: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на удаление пользователя: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  deleteUser(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /users/:id: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.get('/profile', authenticateToken, (req, res, next) => {
  logger.debug(`Получен запрос на профиль текущего пользователя: ${req.method} ${req.originalUrl}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  getProfile(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /users/profile: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

router.get('/:userId/profile', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на профиль пользователя: ${req.method} ${req.originalUrl}, userId: ${req.params.userId}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  getUserProfile(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /users/:userId/profile: ${error.message}, стек: ${error.stack}`);
    next(error);
  });
});

logger.debug('Маршруты пользователей успешно настроены в users.js');

module.exports = router;