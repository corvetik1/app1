const logger = require('../utils/logger');

/**
 * Middleware для проверки административных прав пользователя
 * @param {Object} req - Объект запроса Express
 * @param {Object} res - Объект ответа Express
 * @param {Function} next - Функция для передачи управления следующему middleware
 */
const requireAdmin = (req, res, next) => {
  // Предполагается, что req.user уже установлен в authenticate.js
  if (!req.user) {
    logger.warn('Попытка доступа к маршруту администратора без аутентификации', {
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  const { role, id: userId } = req.user;

  // Проверка роли администратора
  if (role !== 'admin') {
    logger.warn('Попытка доступа к маршруту администратора без прав', {
      userId,
      role,
      method: req.method,
      path: req.path,
    });
    return res.status(403).json({ error: 'Доступ запрещён: требуется роль администратора' });
  }

  logger.debug('Проверка прав администратора пройдена успешно', {
    userId,
    role,
    method: req.method,
    path: req.path,
  });
  next();
};

module.exports = requireAdmin;