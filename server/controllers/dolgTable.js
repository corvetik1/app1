// C:\rezerv\app\server\controllers\dolgtable.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера dolgtable.js');

const getDolgTables = async (req, res) => {
  logger.debug(`Получен запрос на получение списка долгов для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DolgTable } = models;
    logger.debug('Модель DolgTable успешно получена');

    logger.debug('Формирование условий запроса для списка долгов');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка долгов из базы данных');
    const dolgTables = await DolgTable.findAll({
      where: whereClause,
    });
    logger.debug(`Получено ${dolgTables.length} записей о долгах`);

    logger.info(`Список долгов отправлен пользователю: ${req.user.id}, количество: ${dolgTables.length}`);
    res.json(dolgTables);
  } catch (error) {
    logger.error(`Ошибка при получении списка долгов: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении долгов', details: error.message });
  }
};

const createDolgTable = async (req, res) => {
  const { amount, description } = req.body;
  logger.debug(`Получен запрос на создание долга: amount=${amount}, description=${description}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!amount || parseFloat(amount) <= 0) {
    logger.warn(`Сумма долга обязательна и должна быть положительной для пользователя ${req.user?.id}`);
    return res.status(400).json({ error: 'Сумма долга обязательна и должна быть положительной' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DolgTable } = models;
    logger.debug('Модель DolgTable успешно получена');

    logger.debug('Создание новой записи о долге в базе данных');
    const dolgTable = await DolgTable.create({
      user_id: req.user.id,
      amount: parseFloat(amount),
      description: description || '',
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Запись о долге создана: id=${dolgTable.id}, amount=${dolgTable.amount}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('dolgCreated', dolgTable.toJSON());
        logger.debug(`Уведомление о создании долга отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Долг создан пользователем ${req.user.id}: id=${dolgTable.id}, amount=${dolgTable.amount}`);
    res.status(201).json(dolgTable);
  } catch (error) {
    logger.error(`Ошибка при создании долга: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании долга', details: error.message });
  }
};

const updateDolgTable = async (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  logger.debug(`Получен запрос на обновление долга: id=${id}, amount=${amount}, description=${description}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DolgTable } = models;
    logger.debug('Модель DolgTable успешно получена');

    logger.debug(`Поиск долга с id: ${id}`);
    const dolgTable = await DolgTable.findByPk(id);
    if (!dolgTable || (dolgTable.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Долг не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Долг не найден или доступ запрещён' });
    }
    logger.debug(`Долг найден: id=${dolgTable.id}, amount=${dolgTable.amount}`);

    logger.debug('Валидация данных для обновления');
    const updates = { updated_at: new Date() };
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        logger.warn(`Сумма долга должна быть положительным числом: ${amount}, пользователь: ${req.user.id}`);
        return res.status(400).json({ error: 'Сумма долга должна быть положительным числом' });
      }
      updates.amount = parsedAmount;
    }
    if (description !== undefined) updates.description = description;

    logger.debug('Обновление записи о долге в базе данных');
    await dolgTable.update(updates);
    logger.debug(`Долг обновлен: id=${dolgTable.id}, amount=${dolgTable.amount}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('dolgUpdated', dolgTable.toJSON());
        logger.debug(`Уведомление об обновлении долга отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Долг обновлен пользователем ${req.user.id}: id=${dolgTable.id}, amount=${dolgTable.amount}`);
    res.json({ message: 'Долг обновлен', dolg: dolgTable });
  } catch (error) {
    logger.error(`Ошибка при обновлении долга: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении долга', details: error.message });
  }
};

const deleteDolgTable = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление долга: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DolgTable } = models;
    logger.debug('Модель DolgTable успешно получена');

    logger.debug(`Поиск долга с id: ${id}`);
    const dolgTable = await DolgTable.findByPk(id);
    if (!dolgTable || (dolgTable.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Долг не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Долг не найден или доступ запрещён' });
    }
    logger.debug(`Долг найден: id=${dolgTable.id}, amount=${dolgTable.amount}`);

    logger.debug('Удаление записи о долге из базы данных');
    await dolgTable.destroy();
    logger.debug(`Долг удален: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('dolgDeleted', { id });
        logger.debug(`Уведомление об удалении долга отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Долг удален пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Долг удален' });
  } catch (error) {
    logger.error(`Ошибка при удалении долга: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении долга', details: error.message });
  }
};

logger.debug('Контроллер dolgtable.js успешно инициализирован');
module.exports = { getDolgTables, createDolgTable, updateDolgTable, deleteDolgTable };