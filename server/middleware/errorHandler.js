const logger = require('../utils/logger');

/**
 * Middleware для обработки ошибок в Express
 * @param {Error} err - Ошибка, переданная в next(err)
 * @param {Object} req - Объект запроса
 * @param {Object} res - Объект ответа
 * @param {Function} next - Следующий middleware (не используется)
 */
const errorHandler = (err, req, res, next) => {
  // Логирование ошибки с деталями запроса
  logger.error('Необработанная ошибка в приложении', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id || 'не авторизован',
    role: req.user?.role || 'неизвестно',
    clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] || 'не указан',
    timestamp: new Date().toISOString(),
  });

  // Определение статуса ошибки
  const statusCode = err.statusCode || 500; // По умолчанию 500, если статус не указан

  // Формирование ответа клиенту
  const response = {
    error: err.message || 'Внутренняя ошибка сервера',
    status: statusCode,
    timestamp: new Date().toISOString(),
  };

  // В продакшене скрываем стек ошибки
  if (process.env.NODE_ENV !== 'development') {
    delete response.stack;
  } else {
    response.stack = err.stack; // Включаем стек для отладки в разработке
  }

  // Отправка ответа
  res.status(statusCode).json(response);
};

module.exports = errorHandler;