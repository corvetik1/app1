const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware для аутентификации пользователя через JWT-токен
 * @param {Object} req - Объект запроса Express
 * @param {Object} res - Объект ответа Express
 * @param {Function} next - Функция для передачи управления следующему middleware
 */
const authenticate = (req, res, next) => {
  // Извлечение токена из заголовка Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Попытка доступа без токена или с неверным форматом заголовка', {
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({ error: 'Токен не предоставлен или неверный формат' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Проверка и декодирование токена
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username,
    };
    logger.debug('Аутентификация успешна', {
      userId: decoded.id,
      role: decoded.role,
      method: req.method,
      path: req.path,
    });
    next();
  } catch (error) {
    logger.error('Ошибка аутентификации', {
      message: error.message,
      method: req.method,
      path: req.path,
    });
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истёк' });
    }
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

module.exports = authenticate;