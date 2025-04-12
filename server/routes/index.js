// C:\rezerv\app\server\routes\index.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/authenticate'); // Исправлен импорт
const setSyncingHeader = require('../middleware/setSyncingHeader'); // Исправлено имя

// Логирование начала загрузки маршрутов
logger.debug('Инициализация маршрутов в index.js начата', {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  pid: process.pid,
  memoryUsage: process.memoryUsage(),
});

// Экспорт как функция для передачи io из server.js
module.exports = (io) => {
  // Middleware для логирования всех запросов и передачи io
  router.use((req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    req.io = io; // Передача io для использования в контроллерах
    logger.debug(`Входящий запрос: ${req.method} ${req.originalUrl} от IP: ${clientIp}`, {
      userAgent: req.headers['user-agent'] || 'не указан',
      userId: req.user?.id || 'не авторизован',
      role: req.user?.role || 'неизвестно',
      timestamp: new Date().toISOString(),
      headers: { authorization: req.headers['authorization'] ? 'provided' : 'not provided' },
    });
    next();
  });

  // Применение глобального middleware
  router.use(setSyncingHeader);

  // Корневой маршрут для проверки API
  router.get('/', (req, res) => {
    logger.info('Запрос к корневому маршруту API', {
      method: req.method,
      path: req.path,
      userId: req.user?.id || 'unauthenticated',
    });
    res.json({
      message: 'API сервера работает',
      version: '1.0.0',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Подключение маршрутов с обработкой ошибок
  const routes = {
    auth: '/auth',
    users: '/users',
    roles: '/roles',
    permissions: '/permissions',
    tenders: '/tenders',
    finance: '/finance',
    headernotes: '/header-notes',
    analytics: '/analytics',
    documents: '/documents',
    visibilitySettings: '/visibility_settings',
    tenderbudget: '/tender_budget',
    dolgtable: '/dolg_table',
    accounts: '/accounts', // Дублирование для совместимости
    loans: '/loans',
    debitcard: '/debit_cards',
    creditcard: '/credit_cards',
    transaction: '/transactions',
  };

  Object.entries(routes).forEach(([routeName, routePath]) => {
    try {
      const routeModule = (routeName === 'creditcard') 
        ? require('../controllers/creditCard') // Прямой путь к контроллеру
        : require(`./${routeName}`);
      if (routeName === 'auth') {
        router.use(routePath, routeModule); // Для /auth не применяем authenticateToken
      } else if (routeName === 'accounts') {
        // Дублируем /accounts на /dolg_table
        router.use(routePath, authenticateToken, require('./dolgtable'));
      } else {
        router.use(routePath, authenticateToken, routeModule);
      }
      logger.debug(`Маршрут ${routePath} подключён`, {
        routeName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn(`Маршрут ${routePath} не найден: ${error.message}`, {
        stack: error.stack,
        routeName,
      });
    }
  });

  // Обработка неподдерживаемых маршрутов
  router.use((req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.warn(`Маршрут не найден: ${req.method} ${req.originalUrl} от IP: ${clientIp}`, {
      userAgent: req.headers['user-agent'] || 'не указан',
      userId: req.user?.id || 'не авторизован',
      role: req.user?.role || 'неизвестно',
      timestamp: new Date().toISOString(),
    });
    res.status(404).json({
      error: 'Маршрут не найден',
      method: req.method,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      hint: 'Проверьте правильность пути или наличие соответствующего файла маршрута',
    });
  });

  // Логирование завершения настройки маршрутов
  logger.debug('Все маршруты успешно подключены в index.js', {
    timestamp: new Date().toISOString(),
    loadedRoutes: router.stack.length - 2, // Минус middleware логирования и 404
    pid: process.pid,
    memoryUsage: process.memoryUsage(),
  });

  return router;
};