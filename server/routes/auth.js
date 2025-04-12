// C:\rezerv\app\server\routes\auth.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requireAdmin, authController;
try {
  ({ authenticateToken, requireAdmin } = require('../middleware/authenticate'));
  authController = require('../controllers/auth');
  logger.debug('Middleware authenticate и контроллер auth успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера auth: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { login, logout, register } = authController;

// Логирование начала загрузки маршрутов авторизации
logger.debug('Инициализация маршрутов авторизации в auth.js');

// Маршрут для входа в систему (POST /api/auth/login)
router.post('/login', (req, res, next) => {
  logger.debug(`Получен запрос на вход: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}`);
  login(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте /login: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик ошибок
  });
});

// Маршрут для выхода из системы (POST /api/auth/logout)
router.post('/logout', authenticateToken, (req, res, next) => {
  logger.debug(`Получен запрос на выход: ${req.method} ${req.originalUrl}, пользователь: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  logout(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте /logout: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик ошибок
  });
});

// Маршрут для регистрации пользователя (POST /api/auth/register)
router.post('/register', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на регистрацию: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, администратор: id=${req.user?.id || 'неизвестен'}, role=${req.user?.role || 'неизвестно'}`);
  register(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте /register: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик ошибок
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты авторизации успешно настроены в auth.js');

module.exports = router;