// C:\rezerv\app\server\routes\dbStatus.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getDatabaseStatus } = require('../config/sequelize');
const authenticateToken = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');

// Middleware для логирования запросов
router.use((req, res, next) => {
  logger.debug(`Запрос к маршруту db-status: ${req.method} ${req.originalUrl} от пользователя id=${req.user?.id || 'неизвестно'}, role=${req.user?.role || 'неизвестно'}`, {
    timestamp: new Date().toISOString(),
  });
  next();
});

// Маршрут для получения статуса базы данных
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = await getDatabaseStatus();
    logger.info(`Статус базы данных отправлен пользователю ${req.user.id}`);
    res.json(status);
  } catch (error) {
    logger.error(`Ошибка при получении статуса базы данных: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении статуса базы данных', details: error.message });
  }
});

module.exports = router;