// C:\rezerv\app\server\controllers\users.js
const logger = require('../utils/logger'); // Импорт логгера для диагностики
const { getModels } = require('../config/sequelize'); // Импорт функции получения моделей
const { socketMap, onlineUsers } = require('../sockets'); // Импорт WebSocket данных для уведомлений
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

logger.debug('Инициализация контроллера users.js');

// Получение списка пользователей для выпадающего списка
const listUsers = async (req, res) => {
  logger.debug(`Получен запрос на список пользователей для выпадающего списка для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Получение списка пользователей
    logger.debug('Запрос списка пользователей из базы данных');
    const users = await User.findAll({
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
      attributes: ['id', 'username', 'telegram', 'role_id', 'is_active', 'last_login'],
      order: [['username', 'ASC']],
    });

    const userList = users.map((user) => ({
      id: user.id,
      username: user.username,
      telegram: user.telegram,
      role: user.Role.name.toLowerCase(),
      role_id: user.role_id,
      is_active: user.is_active,
      last_login: user.last_login,
    }));
    logger.debug(`Получено ${users.length} пользователей`);

    // Шаг 3: Логирование успешного получения
    logger.info(`Список пользователей отправлен: ${users.length} записей для администратора ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json(userList);
  } catch (error) {
    logger.error(`Ошибка при получении списка пользователей: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении списка пользователей', details: error.message });
  }
};

// Получение пользователей с пагинацией и поиском
const getUsers = async (req, res) => {
  logger.debug(`Получен запрос на список пользователей с пагинацией и поиском для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Формирование условий запроса
    logger.debug('Формирование условий запроса для списка пользователей');
    const { page = 1, limit = 5, search } = req.query;
    const offset = (page - 1) * limit;
    const where = search ? { username: { [Op.like]: `%${search}%` } } : {};

    // Шаг 3: Получение списка пользователей
    logger.debug('Запрос списка пользователей из базы данных');
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'username', 'telegram', 'role_id', 'is_active', 'last_login'],
      order: [['username', 'ASC']],
    });

    const totalPages = Math.ceil(count / limit);
    const users = rows.map((user) => ({
      id: user.id,
      username: user.username,
      telegram: user.telegram,
      role_id: user.role_id,
      role: user.Role.name.toLowerCase(),
      is_active: user.is_active,
      last_login: user.last_login,
    }));
    logger.debug(`Получено ${users.length} пользователей, общее количество: ${count}`);

    // Шаг 4: Логирование успешного получения
    logger.info(`Список пользователей отправлен: ${count} пользователей для администратора ${req.user.id}, role_id: ${req.user.role_id}, страница: ${page}, лимит: ${limit}`);

    // Отправка ответа
    res.json({ users, totalPages, total: count });
  } catch (error) {
    logger.error(`Ошибка при получении списка пользователей: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении списка пользователей', details: error.message });
  }
};

// Контроллер для создания нового пользователя
const createUser = async (req, res) => {
  const { username, password, telegram, role_id, is_active } = req.body;
  logger.debug(`Получен запрос на создание пользователя: username=${username}, role_id=${role_id}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  if (!username || !password || !role_id) {
    logger.warn(`Обязательные поля отсутствуют: username=${username}, password=${!!password}, role_id=${role_id} для администратора ${req.user.id}`);
    return res.status(400).json({ error: 'Username, password и role_id обязательны' });
  }

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Проверка роли
    logger.debug(`Проверка существования роли с id: ${role_id}`);
    const role = await Role.findByPk(role_id);
    if (!role) {
      logger.warn(`Роль не найдена: ID ${role_id} для администратора ${req.user.id}`);
      return res.status(400).json({ error: 'Указанная роль не существует' });
    }

    // Шаг 3: Проверка существующего пользователя
    logger.debug(`Проверка наличия пользователя с username: ${username}`);
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      logger.warn(`Пользователь с username ${username} уже существует для администратора ${req.user.id}`);
      return res.status(400).json({ error: 'Пользователь с таким username уже существует' });
    }

    // Шаг 4: Создание пользователя
    logger.debug('Создание нового пользователя в базе данных');
    const user = await User.create({
      username,
      password_hash: await bcrypt.hash(password, 10),
      telegram: telegram || null,
      role_id,
      is_active: is_active !== undefined ? is_active : true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Пользователь создан: id=${user.id}, username=${user.username}`);

    // Шаг 5: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('userCreated', { id: user.id, username: user.username, role_id: user.role_id });
        logger.debug(`Уведомление о создании пользователя отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 6: Логирование успешного создания
    logger.info(`Пользователь зарегистрирован: ${user.username}, ID: ${user.id}, role: ${role.name.toLowerCase()}, role_id: ${user.role_id} администратором ${req.user.id}`);

    // Отправка ответа
    res.status(201).json({ message: 'Пользователь создан', userId: user.id });
  } catch (error) {
    logger.error(`Ошибка при создании пользователя: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании пользователя', details: error.message });
  }
};

// Обновление роли пользователя
const updateUserRole = async (req, res) => {
  logger.debug(`Получен запрос на обновление роли пользователя для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Проверка входных данных
    const { role_id } = req.body;
    const userId = parseInt(req.params.id);
    if (!role_id) {
      logger.warn(`role_id обязателен для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(400).json({ error: 'role_id обязателен' });
    }

    // Шаг 3: Проверка роли
    logger.debug(`Проверка существования роли с id: ${role_id}`);
    const role = await Role.findByPk(role_id);
    if (!role) {
      logger.warn(`Роль не найдена: ID ${role_id} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(400).json({ error: 'Указанная роль не существует' });
    }

    // Шаг 4: Поиск пользователя
    logger.debug(`Поиск пользователя с id: ${userId}`);
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`Пользователь не найден: ID ${userId} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Шаг 5: Проверка на изменение своей роли
    if (user.id === req.user.id) {
      logger.warn(`Попытка изменить собственную роль администратором ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(403).json({ error: 'Нельзя изменить свою собственную роль' });
    }

    // Шаг 6: Обновление роли
    logger.debug('Обновление роли пользователя в базе данных');
    await user.update({ role_id, updated_at: new Date() });
    logger.debug(`Роль пользователя обновлена: id=${user.id}, role_id=${role_id}`);

    // Шаг 7: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      req.io.emit('roleUpdated', { userId: user.id, role_id });
      logger.debug(`Уведомление об обновлении роли отправлено всем клиентам`);
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 8: Логирование успешного обновления
    logger.info(`Роль пользователя обновлена: ID ${userId}, новая роль: ${role.name.toLowerCase()}, role_id: ${role_id} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json({ message: 'Роль пользователя обновлена', userId: user.id, role_id });
  } catch (error) {
    logger.error(`Ошибка при обновлении роли пользователя: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении роли пользователя', details: error.message });
  }
};

// Переключение статуса активности пользователя
const toggleUserActive = async (req, res) => {
  logger.debug(`Получен запрос на переключение статуса активности пользователя для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User } = models;
    logger.debug('Модель User успешно получена');

    // Шаг 2: Поиск пользователя
    logger.debug(`Поиск пользователя с id: ${req.params.id}`);
    const userId = parseInt(req.params.id);
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`Пользователь не найден: ID ${userId} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Шаг 3: Проверка на деактивацию самого себя
    if (user.id === req.user.id) {
      logger.warn(`Попытка деактивировать самого себя администратором ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(403).json({ error: 'Нельзя деактивировать самого себя' });
    }

    // Шаг 4: Переключение статуса активности
    logger.debug('Переключение статуса активности');
    const newStatus = !user.is_active;
    await user.update({ is_active: newStatus, updated_at: new Date() });
    logger.debug(`Статус активности изменен: id=${user.id}, новый статус: ${newStatus}`);

    // Шаг 5: Обработка статуса онлайн
    logger.debug('Обработка статуса онлайн');
    if (!newStatus && onlineUsers.has(userId)) {
      onlineUsers.delete(userId);
      const socketId = socketMap.get(userId);
      if (socketId && req.io) { // Добавлена проверка req.io
        req.io.to(socketId).emit('forceDisconnect', { reason: 'Деактивация' });
        logger.debug(`Отправлено событие forceDisconnect для socketId: ${socketId}`);
      }
      socketMap.delete(userId);
      if (req.io) {
        req.io.emit('user_status_update', { userId, status: 'offline' });
        logger.debug(`Пользователь ${userId} деактивирован и отключен`);
      } else {
        logger.warn('req.io не определён, уведомление WebSocket не отправлено');
      }
    } else if (newStatus && !onlineUsers.has(userId)) {
      onlineUsers.add(userId);
      if (req.io) {
        req.io.emit('user_status_update', { userId, status: 'online' });
        logger.debug(`Пользователь ${userId} активирован`);
      } else {
        logger.warn('req.io не определён, уведомление WebSocket не отправлено');
      }
    }

    // Шаг 6: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      req.io.emit('userStatusUpdated', { userId: user.id, is_active: newStatus });
      logger.debug(`Уведомление об обновлении статуса активности отправлено всем клиентам`);
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 7: Логирование успешного обновления
    logger.info(`Статус активности пользователя обновлён: ID ${userId}, активен: ${newStatus} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json({ message: 'Статус активности обновлён', userId: user.id, is_active: newStatus });
  } catch (error) {
    logger.error(`Ошибка при обновлении статуса активности: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении статуса активности', details: error.message });
  }
};

// Обновление данных пользователя
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, telegram, password } = req.body;
  logger.debug(`Получен запрос на обновление пользователя: id=${id}, тело запроса=${JSON.stringify(req.body)}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User } = models;
    logger.debug('Модель User успешно получена');

    // Шаг 2: Поиск пользователя
    logger.debug(`Поиск пользователя с id: ${id}`);
    const userId = parseInt(id);
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`Пользователь не найден: ID ${userId} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Шаг 3: Проверка прав доступа
    logger.debug('Проверка прав доступа');
    if (user.id === req.user.id && req.user.role !== 'admin') {
      logger.warn(`Попытка редактировать самого себя пользователем ${req.user.id}, role_id: ${req.user.role_id} через этот маршрут`);
      return res.status(403).json({ error: 'Нельзя редактировать самого себя через этот маршрут' });
    }

    // Шаг 4: Проверка уникальности username (если изменяется)
    if (username && username !== user.username) {
      logger.debug(`Проверка уникальности нового username: ${username}`);
      const existingUser = await User.findOne({ where: { username, id: { [Op.ne]: userId } } });
      if (existingUser) {
        logger.warn(`Username ${username} уже занят для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
        return res.status(400).json({ error: 'Username уже занят' });
      }
    }

    // Шаг 5: Обновление пользователя
    logger.debug('Обновление пользователя в базе данных');
    const updates = {};
    if (username) updates.username = username;
    if (telegram !== undefined) updates.telegram = telegram;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);
    updates.updated_at = new Date();

    await user.update(updates);
    logger.debug(`Пользователь обновлен: id=${user.id}, username=${user.username}`);

    // Шаг 6: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('userUpdated', { id: user.id, username: user.username, telegram: user.telegram });
        logger.debug(`Уведомление об обновлении пользователя отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 7: Логирование успешного обновления
    logger.info(`Пользователь обновлён: ID ${userId} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json({ message: 'Пользователь успешно обновлён' });
  } catch (error) {
    logger.error(`Ошибка при обновлении пользователя: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении пользователя', details: error.message });
  }
};

// Удаление пользователя
const deleteUser = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление пользователя: id=${id}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Поиск пользователя
    logger.debug(`Поиск пользователя с id: ${id}`);
    const userId = parseInt(id);
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
    });
    if (!user) {
      logger.warn(`Пользователь не найден: ID ${userId} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Шаг 3: Проверка на удаление самого себя
    if (user.id === req.user.id) {
      logger.warn(`Попытка удалить самого себя администратором ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(403).json({ error: 'Нельзя удалить самого себя' });
    }

    // Шаг 4: Проверка роли admin
    if (user.Role.name.toLowerCase() === 'admin') {
      logger.warn(`Попытка удалить пользователя с ролью admin: ID ${userId} администратором ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(403).json({ error: 'Нельзя удалить пользователя с ролью admin' });
    }

    // Шаг 5: Удаление пользователя
    logger.debug('Удаление пользователя из базы данных');
    await user.destroy();

    // Шаг 6: Обработка статуса онлайн
    logger.debug('Обработка статуса онлайн');
    if (onlineUsers.has(userId)) {
      onlineUsers.delete(userId);
      const socketId = socketMap.get(userId);
      if (socketId && req.io) { // Добавлена проверка req.io
        req.io.to(socketId).emit('forceDisconnect', { reason: 'Удаление пользователя' });
        logger.debug(`Отправлено событие forceDisconnect для socketId: ${socketId}`);
      }
      socketMap.delete(userId);
      if (req.io) {
        req.io.emit('user_status_update', { userId, status: 'offline' });
        logger.debug(`Пользователь ${userId} удален из onlineUsers`);
      } else {
        logger.warn('req.io не определён, уведомление WebSocket не отправлено');
      }
    }

    // Шаг 7: Логирование успешного удаления
    logger.info(`Пользователь удалён: ID ${userId} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Шаг 8: Отправка ответа
    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    logger.error(`Ошибка при удалении пользователя: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении пользователя', details: error.message });
  }
};

// Получение профиля текущего пользователя
const getProfile = async (req, res) => {
  logger.debug(`Получен запрос на профиль текущего пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Поиск текущего пользователя
    logger.debug(`Поиск пользователя с id: ${req.user.id}`);
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
      attributes: ['id', 'username', 'telegram', 'role_id', 'last_login'],
    });

    if (!user) {
      logger.warn(`Пользователь не найден: ID ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Шаг 3: Логирование успешного получения
    logger.info(`Профиль отправлен пользователю: ID ${req.user.id}, role: ${req.user.role}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json({
      id: user.id,
      username: user.username,
      telegram: user.telegram,
      role: user.Role.name.toLowerCase(),
      role_id: user.role_id,
      last_login: user.last_login,
    });
  } catch (error) {
    logger.error(`Ошибка при получении профиля: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении профиля', details: error.message });
  }
};

// Получение профиля другого пользователя (с возможностью входа от его имени)
const getUserProfile = async (req, res) => {
  logger.debug(`Получен запрос на профиль другого пользователя: userId=${req.params.userId}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Поиск пользователя
    logger.debug(`Поиск пользователя с id: ${req.params.userId}`);
    const userId = parseInt(req.params.userId);
    const targetUser = await User.findByPk(userId, {
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
      attributes: ['id', 'username', 'telegram', 'role_id', 'last_login'],
    });

    if (!targetUser) {
      logger.warn(`Пользователь не найден: ID ${userId} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Шаг 3: Формирование ответа
    const response = {
      id: targetUser.id,
      username: targetUser.username,
      telegram: targetUser.telegram,
      role: targetUser.Role.name.toLowerCase(),
      role_id: targetUser.role_id,
      last_login: targetUser.last_login,
    };

    // Шаг 4: Генерация токена для входа от имени пользователя (если не сам себя)
    if (userId !== req.user.id) {
      logger.debug('Генерация токена для входа от имени пользователя');
      const impersonateToken = jwt.sign(
        { id: targetUser.id, role: targetUser.Role.name.toLowerCase(), adminId: req.user.id },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
      );
      response.impersonateToken = impersonateToken;
      logger.debug(`Токен для входа от имени пользователя ${userId} сгенерирован администратором ${req.user.id}`);
    }

    // Шаг 5: Логирование успешного получения
    logger.info(`Профиль пользователя ${userId} отправлен администратору ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json(response);
  } catch (error) {
    logger.error(`Ошибка при получении профиля пользователя: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении профиля пользователя', details: error.message });
  }
};

logger.debug('Контроллер users.js успешно инициализирован');
module.exports = {
  listUsers,
  getUsers,
  createUser,
  updateUserRole,
  toggleUserActive,
  updateUser,
  deleteUser,
  getProfile,
  getUserProfile,
};