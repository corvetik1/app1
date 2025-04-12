// C:\rezerv\app\server\middleware\authenticate.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username,
      role_id: decoded.role_id, // Добавлено для совместимости с controllers/auth.js
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

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    logger.warn('Попытка доступа к маршруту администратора без аутентификации', {
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  const { role, id: userId } = req.user;
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

module.exports = { authenticateToken, requireAdmin };