// C:\rezerv\app\server\controllers\auth.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger'); // Импорт логгера для диагностики
const { getModels } = require('../config/sequelize'); // Импорт функции получения моделей
const { onlineUsers, socketMap } = require('../sockets'); // Импорт WebSocket данных

logger.debug('Инициализация контроллера auth.js');

const secretKey = process.env.SECRET_KEY; // Получение секретного ключа из переменных окружения

// Контроллер для входа в систему
const login = async (req, res) => {
  const { username, password } = req.body;
  logger.debug(`Получен запрос на логин: username=${username}`);

  if (!username || !password) {
    logger.warn('Логин и пароль обязательны');
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  try {
    logger.info(`Попытка входа для пользователя: ${username}`);

    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role } = models;
    logger.debug('Модели User и Role успешно получены');

    // Шаг 2: Поиск пользователя
    logger.debug(`Поиск пользователя с username: ${username}`);
    const user = await User.findOne({
      where: { username },
      include: { model: Role, as: 'Role' },
    });
    if (!user || !user.is_active) {
      logger.warn(`Пользователь не найден или заблокирован: ${username}`);
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }
    logger.debug(`Пользователь найден: id=${user.id}, username=${user.username}`);

    // Шаг 3: Проверка пароля
    logger.debug('Сравнение пароля с хэшем');
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logger.warn(`Неверный пароль для пользователя: ${username}`);
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }
    logger.debug('Пароль успешно проверен');

    // Шаг 4: Генерация JWT-токена
    logger.debug('Генерация JWT-токена');
    const token = jwt.sign(
      { id: user.id, role: user.Role.name.toLowerCase(), role_id: user.role_id, username: user.username }, // Добавлен username для совместимости
      secretKey,
      { expiresIn: '1h' }
    );
    logger.debug('Токен успешно сгенерирован');

    // Шаг 5: Обновление времени последнего входа
    logger.debug('Обновление времени последнего входа');
    await user.update({ last_login: new Date(), updated_at: new Date() });
    logger.info(`Успешный вход для пользователя: ${user.id}, role: ${user.Role.name.toLowerCase()}, role_id: ${user.role_id}`);

    // Шаг 6: Обновление статуса пользователя в WebSocket
    logger.debug('Проверка статуса пользователя в WebSocket');
    if (!onlineUsers.has(user.id)) {
      onlineUsers.add(user.id);
      socketMap.set(user.id, null);
      if (req.io) {
        req.io.emit('user_status_update', { userId: user.id, status: 'online' });
        logger.debug(`Пользователь ${user.id} добавлен в onlineUsers и отправлено событие`);
      } else {
        logger.warn('req.io не определён, событие WebSocket не отправлено');
      }
    }

    // Отправка ответа
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        telegram: user.telegram,
        role: user.Role.name.toLowerCase(),
        role_id: user.role_id,
      },
    });
  } catch (error) {
    logger.error(`Ошибка при входе: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при входе', details: error.message });
  }
};

// Контроллер для выхода из системы
const logout = async (req, res) => {
  logger.debug(`Получен запрос на выход для пользователя: ${req.user?.id || 'неизвестен'}`);
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User } = models;
    logger.debug('Модель User успешно получена');

    // Шаг 2: Поиск пользователя
    logger.debug(`Поиск пользователя с id: ${req.user.id}`);
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.warn(`Пользователь не найден: ID ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    logger.debug(`Пользователь найден: id=${user.id}`);

    // Шаг 3: Обновление статуса в WebSocket
    logger.debug('Обновление статуса пользователя в WebSocket');
    if (onlineUsers.has(req.user.id)) {
      onlineUsers.delete(req.user.id);
      const socketId = socketMap.get(req.user.id);
      if (socketId && req.io) {
        req.io.to(socketId).emit('forceDisconnect', { reason: 'Выход из системы' });
        logger.debug(`Отправлено событие forceDisconnect для socketId: ${socketId}`);
      }
      socketMap.delete(req.user.id);
      if (req.io) {
        req.io.emit('user_status_update', { userId: req.user.id, status: 'offline' });
        logger.debug(`Событие user_status_update отправлено: пользователь ${req.user.id} оффлайн`);
      } else {
        logger.warn('req.io не определён, событие WebSocket не отправлено');
      }
      logger.info(`Пользователь ${req.user.id}, role: ${req.user.role}, role_id: ${req.user.role_id} успешно вышел из системы`);
    }

    // Отправка ответа
    res.json({ message: 'Выход из системы успешно выполнен' });
  } catch (error) {
    logger.error(`Ошибка при выходе: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при выходе', details: error.message });
  }
};

// Контроллер для регистрации пользователя
const register = async (req, res) => {
  const { username, password, telegram, role_id } = req.body;
  logger.debug(`Получен запрос на регистрацию: username=${username}, role_id=${role_id}, администратор: ${req.user?.id || 'неизвестен'}`);

  if (!username || !password || !role_id) {
    logger.warn(`Обязательные поля отсутствуют: username=${username}, password=${!!password}, role_id=${role_id} для администратора ${req.user?.id || 'неизвестен'}, role_id: ${req.user?.role_id || 'неизвестно'}`);
    return res.status(400).json({ error: 'Username, password и role_id обязательны' });
  }

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { User, Role, VisibilitySetting } = models;
    logger.debug('Модели User, Role и VisibilitySetting успешно получены');

    // Шаг 2: Проверка роли
    logger.debug(`Поиск роли с id: ${role_id}`);
    const role = await Role.findByPk(role_id);
    if (!role) {
      logger.warn(`Роль не найдена: ID ${role_id} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(400).json({ error: 'Указанная роль не существует' });
    }
    logger.debug(`Роль найдена: id=${role.id}, name=${role.name}`);

    // Шаг 3: Проверка существующего пользователя
    logger.debug(`Проверка наличия пользователя с username: ${username}`);
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      logger.warn(`Пользователь с username ${username} уже существует для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(400).json({ error: 'Пользователь с таким username уже существует' });
    }
    logger.debug('Пользователь с таким username не найден, регистрация возможна');

    // Шаг 4: Создание нового пользователя
    logger.debug('Создание нового пользователя');
    const user = await User.create({
      username,
      password_hash: await bcrypt.hash(password, 10),
      telegram: telegram || null,
      role_id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Пользователь создан: id=${user.id}, username=${user.username}`);

    // Шаг 5: Создание настроек видимости
    logger.debug('Создание настроек видимости для нового пользователя');
    const visibilitySettings = [
      'В работе ИП', 'В работе ТА', 'Исполнение ТА', 'Исполнено ИП', 'Исполнено ТА',
      'Нулевые закупки', 'Ожидание оплаты ИП', 'Ожидание оплаты ТА', 'Отправил ТА',
      'Подал ИП', 'Подписание контракта', 'Проиграл ИП', 'Проиграл ТА', 'Просчет ЗМО',
      'Просчет ИП', 'Участвую ИП', 'Участвую ТА', 'Выиграл ИП', 'Выиграл ТА',
    ].map((stage) => ({
      user_id: user.id,
      stage,
      visible: false,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    await VisibilitySetting.bulkCreate(visibilitySettings, { ignoreDuplicates: true });
    logger.debug(`Настройки видимости созданы для пользователя: id=${user.id}`);

    // Шаг 6: Логирование успешной регистрации
    logger.info(`Пользователь зарегистрирован: ${user.username}, ID: ${user.id}, role: ${role.name.toLowerCase()}, role_id: ${user.role_id} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.status(201).json({ message: 'Пользователь зарегистрирован', userId: user.id });
  } catch (error) {
    logger.error(`Ошибка при регистрации: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при регистрации пользователя', details: error.message });
  }
};

logger.debug('Контроллер auth.js успешно инициализирован');
module.exports = { login, logout, register };