// C:\rezerv\app\server\controllers\permissions.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера permissions.js');

const getPermissions = async (req, res) => {
  logger.debug(`Получен запрос на получение списка разрешений для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Permission, Role } = models;
    logger.debug('Модели Permission и Role успешно получены');

    logger.debug('Запрос списка разрешений из базы данных');
    const permissions = await Permission.findAll({
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
    });
    const normalizedPermissions = permissions.map(perm => ({
      ...perm.toJSON(),
      Role: {
        ...perm.Role.toJSON(),
        name: perm.Role.name.toLowerCase(),
      },
    }));
    logger.debug(`Получено ${permissions.length} разрешений`);

    logger.info(`Список разрешений отправлен пользователю: ${req.user.id}, количество: ${permissions.length}`);
    res.json(normalizedPermissions);
  } catch (error) {
    logger.error(`Ошибка при получении списка разрешений: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении разрешений', details: error.message });
  }
};

const createPermission = async (req, res) => {
  const { role_id, page, can_view, can_edit, can_delete, can_create } = req.body;
  logger.debug(`Получен запрос на создание разрешения: role_id=${role_id}, page=${page}, can_view=${can_view}, can_edit=${can_edit}, can_delete=${can_delete}, can_create=${can_create}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!role_id || !page) {
    logger.warn(`role_id и page обязательны для пользователя ${req.user?.id}`);
    return res.status(400).json({ error: 'role_id и page обязательны' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Permission, Role } = models;
    logger.debug('Модели Permission и Role успешно получены');

    logger.debug(`Проверка существования роли с id: ${role_id}`);
    const role = await Role.findByPk(role_id);
    if (!role) {
      logger.warn(`Роль не найдена: id=${role_id}, пользователь: ${req.user.id}`);
      return res.status(400).json({ error: 'Указанная роль не существует' });
    }

    logger.debug(`Проверка наличия разрешения для role_id: ${role_id}, page: ${page}`);
    const existingPermission = await Permission.findOne({ where: { role_id, page } });
    if (existingPermission) {
      logger.warn(`Разрешение для роли ${role_id} и страницы ${page} уже существует, пользователь: ${req.user.id}`);
      return res.status(400).json({ error: 'Разрешение для этой роли и страницы уже существует' });
    }

    logger.debug('Создание нового разрешения в базе данных');
    const permission = await Permission.create({
      role_id,
      page,
      can_view: can_view || false,
      can_edit: can_edit || false,
      can_delete: can_delete || false,
      can_create: can_create || false,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Разрешение создано: id=${permission.id}, role_id=${permission.role_id}, page=${permission.page}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      req.io.emit('permissionsUpdated', { roleId: role_id, page, ...req.body });
      logger.debug(`Уведомление о создании разрешения отправлено всем клиентам`);
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Разрешение создано пользователем ${req.user.id}: id=${permission.id}, role_id=${role_id}, page=${page}`);
    res.status(201).json({ message: 'Разрешение создано', permission });
  } catch (error) {
    logger.error(`Ошибка при создании разрешения: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании разрешения', details: error.message });
  }
};

const updatePermission = async (req, res) => {
  const { roleId, page } = req.params;
  const { can_view, can_edit, can_delete, can_create, ip_stages, ta_stages, zero_purchases } = req.body;
  logger.debug(`Получен запрос на обновление разрешения: roleId=${roleId}, page=${page}, can_view=${can_view}, can_edit=${can_edit}, can_delete=${can_delete}, can_create=${can_create}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Permission, Role } = models;
    logger.debug('Модели Permission и Role успешно получены');

    logger.debug(`Проверка существования роли с id: ${roleId}`);
    const role = await Role.findByPk(roleId);
    if (!role) {
      logger.warn(`Роль не найдена: id=${roleId}, пользователь: ${req.user.id}`);
      return res.status(404).json({ error: 'Роль не найдена' });
    }

    logger.debug(`Поиск разрешения для role_id: ${roleId}, page: ${page}`);
    let permission = await Permission.findOne({ where: { role_id: roleId, page } });
    if (permission) {
      logger.debug('Обновление существующего разрешения');
      await permission.update({
        can_view: can_view ?? permission.can_view,
        can_edit: can_edit ?? permission.can_edit,
        can_delete: can_delete ?? permission.can_delete,
        can_create: can_create ?? permission.can_create,
        ip_stages: ip_stages ?? permission.ip_stages,
        ta_stages: ta_stages ?? permission.ta_stages,
        zero_purchases: zero_purchases ?? permission.zero_purchases,
        updated_at: new Date(),
      });
    } else {
      logger.debug('Создание нового разрешения, так как оно не найдено');
      permission = await Permission.create({
        role_id: roleId,
        page,
        can_view: can_view || false,
        can_edit: can_edit || false,
        can_delete: can_delete || false,
        can_create: can_create || false,
        ip_stages: ip_stages || {},
        ta_stages: ta_stages || {},
        zero_purchases: zero_purchases || false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    logger.debug(`Разрешение обновлено/создано: id=${permission.id}, role_id=${permission.role_id}, page=${permission.page}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      req.io.emit('permissionsUpdated', { roleId, pageId: page, ...req.body });
      logger.debug(`Уведомление об обновлении разрешения отправлено всем клиентам`);
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Разрешение обновлено пользователем ${req.user.id}: role_id=${roleId}, page=${page}`);
    res.json({ message: 'Разрешение обновлено', permission });
  } catch (error) {
    logger.error(`Ошибка при обновлении разрешения: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении разрешения', details: error.message });
  }
};

const deletePermission = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление разрешения: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Permission } = models;
    logger.debug('Модель Permission успешно получена');

    logger.debug(`Поиск разрешения с id: ${id}`);
    const permission = await Permission.findByPk(id);
    if (!permission) {
      logger.warn(`Разрешение не найдено: id=${id}, пользователь: ${req.user.id}`);
      return res.status(404).json({ error: 'Разрешение не найдено' });
    }
    logger.debug(`Разрешение найдено: id=${permission.id}, role_id=${permission.role_id}, page=${permission.page}`);

    logger.debug('Удаление разрешения из базы данных');
    await permission.destroy();
    logger.debug(`Разрешение удалено: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      req.io.emit('permissionsUpdated', { roleId: permission.role_id, page: permission.page });
      logger.debug(`Уведомление об удалении разрешения отправлено всем клиентам`);
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Разрешение удалено пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Разрешение удалено' });
  } catch (error) {
    logger.error(`Ошибка при удалении разрешения: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении разрешения', details: error.message });
  }
};

logger.debug('Контроллер permissions.js успешно инициализирован');
module.exports = { getPermissions, createPermission, updatePermission, deletePermission };