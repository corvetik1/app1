const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');

// Кэш для разрешений (опционально, можно включить для производительности)
const permissionCache = new Map();

/**
 * Middleware для проверки разрешения с использованием токена и базы данных
 * @param {string} page - Страница (например, 'tenders')
 * @param {string} action - Действие (например, 'view', 'edit')
 * @returns {Function} Middleware-функция
 */
const requirePermission = (page, action) => {
  return async (req, res, next) => {
    // Проверка аутентификации
    if (!req.user) {
      logger.warn('Попытка доступа без аутентификации', {
        page,
        action,
        method: req.method,
        path: req.originalUrl,
        clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] || 'не указан',
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    const { id: userId, role, permissions = [], role_id } = req.user;
    const actionKey = `can_${action}`;
    const permissionString = `${actionKey}:${page}`;

    // Быстрая проверка через токен для администратора или разрешения
    if (role === 'admin') {
      logger.debug('Доступ разрешён: пользователь является администратором', {
        userId,
        role,
        page,
        action,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return next();
    }

    if (permissions.includes(permissionString)) {
      logger.debug('Доступ разрешён через токен', {
        userId,
        role,
        permission: permissionString,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return next();
    }

    // Кэширование результата проверки (опционально)
    const cacheKey = `${userId}:${permissionString}`;
    if (permissionCache.has(cacheKey)) {
      const cachedResult = permissionCache.get(cacheKey);
      if (cachedResult) {
        logger.debug('Доступ разрешён через кэш', { userId, role, permission: permissionString });
        return next();
      }
      logger.warn('Доступ запрещён через кэш', { userId, role, permission: permissionString });
      return res.status(403).json({ error: `Нет разрешения на ${action} для ${page}` });
    }

    // Проверка через базу данных
    try {
      logger.debug(`Проверка разрешения в базе: страница=${page}, действие=${action}`, {
        userId,
        role,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      const { Role, Permission } = await getModels();
      const roleData = await Role.findOne({
        where: { id: role_id },
        include: [{ model: Permission, as: 'Permissions' }],
      });

      if (!roleData) {
        logger.warn('Роль не найдена в базе данных', {
          userId,
          roleId: role_id,
          method: req.method,
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return res.status(403).json({ error: 'Роль не найдена' });
      }

      const permission = roleData.Permissions.find((p) => p.page === page);
      if (!permission || !permission[actionKey]) {
        logger.warn('Нет разрешения в базе данных', {
          userId,
          role: roleData.name,
          page,
          action,
          method: req.method,
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
        // Кэширование отрицательного результата
        permissionCache.set(cacheKey, false);
        // Уведомление через WebSocket (опционально)
        if (req.io) {
          req.io.emit('permission_denied', {
            userId,
            page,
            action,
            message: `Доступ запрещён: нет разрешения на ${action} для ${page}`,
            timestamp: new Date().toISOString(),
          });
        }
        return res.status(403).json({ error: `Нет разрешения на ${action} для ${page}` });
      }

      logger.info('Разрешение подтверждено через базу данных', {
        userId,
        role: roleData.name,
        page,
        action,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      // Кэширование положительного результата
      permissionCache.set(cacheKey, true);
      next();
    } catch (error) {
      logger.error('Ошибка проверки разрешения в базе данных', {
        message: error.message,
        stack: error.stack,
        userId,
        role,
        page,
        action,
        method: req.method,
        path: req.originalUrl,
        database: require('../config/sequelize').sequelize.config.database,
        timestamp: new Date().toISOString(),
      });
      // Передача ошибки в errorHandler (если он есть)
      const err = new Error('Ошибка сервера при проверке разрешения');
      err.statusCode = 500;
      next(err);
    }
  };
};

module.exports = requirePermission;