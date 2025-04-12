// C:\rezerv\app\server\controllers\roles.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера roles.js');

const getRoles = async (req, res) => {
  logger.debug(`Получен запрос на получение списка ролей для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Role } = models;
    logger.debug('Модель Role успешно получена');

    logger.debug('Запрос списка ролей из базы данных');
    const roles = await Role.findAll();
    const normalizedRoles = roles.map(role => ({
      ...role.toJSON(),
      name: role.name.toLowerCase(),
    }));
    logger.debug(`Получено ${roles.length} ролей`);

    logger.info(`Список ролей отправлен пользователю: ${req.user.id}, количество: ${roles.length}`);
    res.json(normalizedRoles);
  } catch (error) {
    logger.error(`Ошибка при получении списка ролей: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении списка ролей', details: error.message });
  }
};

const createRole = async (req, res) => {
  const { name, description } = req.body;
  logger.debug(`Получен запрос на создание роли: name=${name}, description=${description}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!name) {
    logger.warn(`Название роли обязательно для пользователя ${req.user?.id}`);
    return res.status(400).json({ error: 'Название роли обязательно' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Role } = models;
    logger.debug('Модель Role успешно получена');

    logger.debug(`Проверка существования роли с именем: ${name}`);
    const normalizedName = name.toLowerCase();
    const existingRole = await Role.findOne({ where: { name: normalizedName } });
    if (existingRole) {
      logger.warn(`Роль с именем ${normalizedName} уже существует, пользователь: ${req.user.id}`);
      return res.status(400).json({ error: 'Роль с таким именем уже существует' });
    }

    logger.debug('Создание новой роли в базе данных');
    const role = await Role.create({
      name: normalizedName,
      description: description || '',
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Роль создана: id=${role.id}, name=${role.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('roleCreated', role.toJSON());
        logger.debug(`Уведомление о создании роли отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Роль создана пользователем ${req.user.id}: id=${role.id}, name=${role.name}`);
    res.status(201).json({ message: 'Роль создана', role });
  } catch (error) {
    logger.error(`Ошибка при создании роли: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании роли', details: error.message });
  }
};

const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  logger.debug(`Получен запрос на обновление роли: id=${id}, name=${name}, description=${description}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Role } = models;
    logger.debug('Модель Role успешно получена');

    logger.debug(`Поиск роли с id: ${id}`);
    const role = await Role.findByPk(id);
    if (!role) {
      logger.warn(`Роль не найдена: id=${id}, пользователь: ${req.user.id}`);
      return res.status(404).json({ error: 'Роль не найдена' });
    }
    logger.debug(`Роль найдена: id=${role.id}, name=${role.name}`);

    let normalizedName = role.name;
    if (name) {
      normalizedName = name.toLowerCase();
      logger.debug(`Проверка уникальности нового имени роли: ${normalizedName}`);
      if (normalizedName !== role.name) {
        const existingRole = await Role.findOne({ where: { name: normalizedName } });
        if (existingRole) {
          logger.warn(`Роль с именем ${normalizedName} уже существует, пользователь: ${req.user.id}`);
          return res.status(400).json({ error: 'Роль с таким именем уже существует' });
        }
      }
    }

    logger.debug('Обновление роли в базе данных');
    await role.update({
      name: normalizedName,
      description: description || role.description,
      updated_at: new Date(),
    });
    logger.debug(`Роль обновлена: id=${role.id}, name=${role.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('roleUpdated', role.toJSON());
        logger.debug(`Уведомление об обновлении роли отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Роль обновлена пользователем ${req.user.id}: id=${role.id}, name=${role.name}`);
    res.json({ message: 'Роль обновлена', role });
  } catch (error) {
    logger.error(`Ошибка при обновлении роли: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении роли', details: error.message });
  }
};

const deleteRole = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление роли: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Role, User } = models;
    logger.debug('Модели Role и User успешно получены');

    logger.debug(`Поиск роли с id: ${id}`);
    const role = await Role.findByPk(id);
    if (!role) {
      logger.warn(`Роль не найдена: id=${id}, пользователь: ${req.user.id}`);
      return res.status(404).json({ error: 'Роль не найдена' });
    }
    logger.debug(`Роль найдена: id=${role.id}, name=${role.name}`);

    logger.debug('Проверка, является ли роль системной');
    const normalizedRoleName = role.name.toLowerCase();
    if (normalizedRoleName === 'admin' || normalizedRoleName === 'user') {
      logger.warn(`Попытка удалить системную роль: ${normalizedRoleName}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Нельзя удалить системные роли (admin, user)' });
    }

    logger.debug('Проверка использования роли пользователями');
    const usersWithRole = await User.count({ where: { role_id: id } });
    if (usersWithRole > 0) {
      logger.warn(`Нельзя удалить роль ${normalizedRoleName}, используемую ${usersWithRole} пользователями, пользователь: ${req.user.id}`);
      return res.status(400).json({ error: 'Нельзя удалить роль, используемую пользователями' });
    }

    logger.debug('Удаление роли из базы данных');
    await role.destroy();
    logger.debug(`Роль удалена: id=${id}`);

    logger.info(`Роль удалена пользователем ${req.user.id}: id=${id}, name=${normalizedRoleName}`);
    res.json({ message: 'Роль удалена' });
  } catch (error) {
    logger.error(`Ошибка при удалении роли: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении роли', details: error.message });
  }
};

logger.debug('Контроллер roles.js успешно инициализирован');
module.exports = { getRoles, createRole, updateRole, deleteRole };