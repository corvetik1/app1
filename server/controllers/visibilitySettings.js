const logger = require('../utils/logger'); // Импорт логгера для диагностики
const { getModels } = require('../config/sequelize'); // Импорт функции получения моделей
const { socketMap } = require('../sockets'); // Импорт WebSocket данных для уведомлений

logger.debug('Инициализация контроллера visibilitySettings.js');

// Получение списка настроек видимости
const getVisibilitySettings = async (req, res) => {
  logger.debug(`Получен запрос на получение списка настроек видимости для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { VisibilitySettings, Role } = models;
    logger.debug('Модели VisibilitySettings и Role успешно получены');

    // Шаг 2: Получение списка настроек видимости
    logger.debug('Запрос списка настроек видимости из базы данных');
    const settings = await VisibilitySettings.findAll({
      include: [{ model: Role, as: 'Role', attributes: ['name'] }],
      order: [['role_id', 'ASC'], ['page', 'ASC']],
    });
    logger.debug(`Получено ${settings.length} настроек видимости`);

    const formattedSettings = settings.map(setting => ({
      id: setting.id,
      role_id: setting.role_id,
      role: setting.Role.name.toLowerCase(),
      page: setting.page,
      is_visible: setting.is_visible,
    }));

    // Шаг 3: Логирование успешного получения
    logger.info(`Список настроек видимости отправлен: ${settings.length} записей для администратора ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json(formattedSettings);
  } catch (error) {
    logger.error(`Ошибка при получении списка настроек видимости: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении настроек видимости', details: error.message });
  }
};

// Создание новой настройки видимости
const createVisibilitySetting = async (req, res) => {
  const { role_id, page, is_visible } = req.body;
  logger.debug(`Получен запрос на создание настройки видимости: role_id=${role_id}, page=${page}, is_visible=${is_visible}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  if (!role_id || !page || is_visible === undefined) {
    logger.warn(`Обязательные поля отсутствуют: role_id=${role_id}, page=${page}, is_visible=${is_visible} для администратора ${req.user.id}`);
    return res.status(400).json({ error: 'role_id, page и is_visible обязательны' });
  }

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { VisibilitySettings, Role } = models;
    logger.debug('Модели VisibilitySettings и Role успешно получены');

    // Шаг 2: Проверка роли
    logger.debug(`Проверка существования роли с id: ${role_id}`);
    const role = await Role.findByPk(role_id);
    if (!role) {
      logger.warn(`Роль не найдена: ID ${role_id} для администратора ${req.user.id}`);
      return res.status(400).json({ error: 'Указанная роль не существует' });
    }

    // Шаг 3: Проверка существующей настройки
    logger.debug(`Проверка наличия настройки для role_id: ${role_id}, page: ${page}`);
    const existingSetting = await VisibilitySettings.findOne({ where: { role_id, page } });
    if (existingSetting) {
      logger.warn(`Настройка видимости для роли ${role_id} и страницы ${page} уже существует для администратора ${req.user.id}`);
      return res.status(400).json({ error: 'Настройка видимости для этой роли и страницы уже существует' });
    }

    // Шаг 4: Создание настройки
    logger.debug('Создание новой настройки видимости в базе данных');
    const setting = await VisibilitySettings.create({
      role_id,
      page,
      is_visible,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Настройка видимости создана: id=${setting.id}, role_id=${setting.role_id}, page=${setting.page}`);

    // Шаг 5: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('visibilitySettingCreated', { id: setting.id, role_id: setting.role_id, page: setting.page, is_visible: setting.is_visible });
        logger.debug(`Уведомление о создании настройки видимости отправлено для socketId: ${socketId}`);
      }
    }

    // Шаг 6: Логирование успешного создания
    logger.info(`Настройка видимости создана: role_id=${role_id}, page=${page}, is_visible=${is_visible} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.status(201).json({ message: 'Настройка видимости создана', settingId: setting.id });
  } catch (error) {
    logger.error(`Ошибка при создании настройки видимости: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании настройки видимости', details: error.message });
  }
};

// Обновление настройки видимости
const updateVisibilitySetting = async (req, res) => {
  const { id } = req.params;
  const { role_id, page, is_visible } = req.body;
  logger.debug(`Получен запрос на обновление настройки видимости: id=${id}, тело запроса=${JSON.stringify(req.body)}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { VisibilitySettings, Role } = models;
    logger.debug('Модели VisibilitySettings и Role успешно получены');

    // Шаг 2: Поиск настройки
    logger.debug(`Поиск настройки видимости с id: ${id}`);
    const setting = await VisibilitySettings.findByPk(id);
    if (!setting) {
      logger.warn(`Настройка видимости не найдена: ID ${id} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Настройка видимости не найдена' });
    }

    // Шаг 3: Проверка роли (если изменяется)
    if (role_id && role_id !== setting.role_id) {
      logger.debug(`Проверка существования роли с id: ${role_id}`);
      const role = await Role.findByPk(role_id);
      if (!role) {
        logger.warn(`Роль не найдена: ID ${role_id} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
        return res.status(400).json({ error: 'Указанная роль не существует' });
      }
    }

    // Шаг 4: Проверка уникальности (если изменяются role_id или page)
    if ((role_id && role_id !== setting.role_id) || (page && page !== setting.page)) {
      logger.debug(`Проверка уникальности комбинации role_id: ${role_id || setting.role_id}, page: ${page || setting.page}`);
      const existingSetting = await VisibilitySettings.findOne({
        where: {
          role_id: role_id || setting.role_id,
          page: page || setting.page,
          id: { [Op.ne]: id }, // Исключаем текущую запись
        },
      });
      if (existingSetting) {
        logger.warn(`Настройка видимости для роли ${role_id || setting.role_id} и страницы ${page || setting.page} уже существует для администратора ${req.user.id}`);
        return res.status(400).json({ error: 'Настройка видимости для этой роли и страницы уже существует' });
      }
    }

    // Шаг 5: Обновление настройки
    logger.debug('Обновление настройки видимости в базе данных');
    const updates = {
      updated_at: new Date(),
    };
    if (role_id !== undefined) updates.role_id = role_id;
    if (page !== undefined) updates.page = page;
    if (is_visible !== undefined) updates.is_visible = is_visible;

    await setting.update(updates);
    logger.debug(`Настройка видимости обновлена: id=${setting.id}, role_id=${setting.role_id}, page=${setting.page}`);

    // Шаг 6: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('visibilitySettingUpdated', { id: setting.id, role_id: setting.role_id, page: setting.page, is_visible: setting.is_visible });
        logger.debug(`Уведомление об обновлении настройки видимости отправлено для socketId: ${socketId}`);
      }
    }

    // Шаг 7: Логирование успешного обновления
    logger.info(`Настройка видимости обновлена: ID ${setting.id}, role_id=${setting.role_id}, page=${setting.page}, is_visible=${setting.is_visible} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json({ message: 'Настройка видимости обновлена', settingId: setting.id });
  } catch (error) {
    logger.error(`Ошибка при обновлении настройки видимости: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении настройки видимости', details: error.message });
  }
};

// Удаление настройки видимости
const deleteVisibilitySetting = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление настройки видимости: id=${id}, пользователь: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { VisibilitySettings } = models;
    logger.debug('Модель VisibilitySettings успешно получена');

    // Шаг 2: Поиск настройки
    logger.debug(`Поиск настройки видимости с id: ${id}`);
    const setting = await VisibilitySettings.findByPk(id);
    if (!setting) {
      logger.warn(`Настройка видимости не найдена: ID ${id} для администратора ${req.user.id}, role_id: ${req.user.role_id}`);
      return res.status(404).json({ error: 'Настройка видимости не найдена' });
    }

    // Шаг 3: Удаление настройки
    logger.debug('Удаление настройки видимости из базы данных');
    await setting.destroy();
    logger.debug(`Настройка видимости удалена: id=${id}`);

    // Шаг 4: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('visibilitySettingDeleted', { id });
        logger.debug(`Уведомление об удалении настройки видимости отправлено для socketId: ${socketId}`);
      }
    }

    // Шаг 5: Логирование успешного удаления
    logger.info(`Настройка видимости удалена: ID ${id} администратором ${req.user.id}, role_id: ${req.user.role_id}`);

    // Отправка ответа
    res.json({ message: 'Настройка видимости удалена', id });
  } catch (error) {
    logger.error(`Ошибка при удалении настройки видимости: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении настройки видимости', details: error.message });
  }
};

logger.debug('Контроллер visibilitySettings.js успешно инициализирован');
module.exports = { getVisibilitySettings, createVisibilitySetting, updateVisibilitySetting, deleteVisibilitySetting };