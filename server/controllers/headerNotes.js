// C:\rezerv\app\server\controllers\headernotes.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера headernotes.js');

const getHeaderNotes = async (req, res) => {
  logger.debug(`Получен запрос на получение списка заметок в заголовке для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { HeaderNote } = models;
    logger.debug('Модель HeaderNote успешно получена');

    logger.debug('Формирование условий запроса для списка заметок');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка заметок из базы данных');
    const headerNotes = await HeaderNote.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });
    logger.debug(`Получено ${headerNotes.length} заметок в заголовке`);

    logger.info(`Список заметок в заголовке отправлен пользователю: ${req.user.id}, количество: ${headerNotes.length}`);
    res.json(headerNotes);
  } catch (error) {
    logger.error(`Ошибка при получении списка заметок в заголовке: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении заметок в заголовке', details: error.message });
  }
};

const createHeaderNote = async (req, res) => {
  const { content } = req.body;
  logger.debug(`Получен запрос на создание заметки в заголовке: content=${content}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!content) {
    logger.warn(`Содержимое заметки обязательно для пользователя ${req.user?.id}`);
    return res.status(400).json({ error: 'Содержимое заметки обязательно' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { HeaderNote } = models;
    logger.debug('Модель HeaderNote успешно получена');

    logger.debug('Создание новой заметки в базе данных');
    const headerNote = await HeaderNote.create({
      user_id: req.user.id,
      content,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Заметка создана: id=${headerNote.id}, content=${headerNote.content}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('headerNoteCreated', headerNote.toJSON());
        logger.debug(`Уведомление о создании заметки отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Заметка в заголовке создана пользователем ${req.user.id}: id=${headerNote.id}`);
    res.status(201).json(headerNote);
  } catch (error) {
    logger.error(`Ошибка при создании заметки в заголовке: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании заметки', details: error.message });
  }
};

const updateHeaderNote = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  logger.debug(`Получен запрос на обновление заметки в заголовке: id=${id}, content=${content}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!content) {
    logger.warn(`Содержимое заметки обязательно для пользователя ${req.user?.id}`);
    return res.status(400).json({ error: 'Содержимое заметки обязательно' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { HeaderNote } = models;
    logger.debug('Модель HeaderNote успешно получена');

    logger.debug(`Поиск заметки с id: ${id}`);
    const headerNote = await HeaderNote.findByPk(id);
    if (!headerNote || (headerNote.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Заметка не найдена или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Заметка не найдена или доступ запрещён' });
    }
    logger.debug(`Заметка найдена: id=${headerNote.id}, content=${headerNote.content}`);

    logger.debug('Обновление заметки в базе данных');
    await headerNote.update({
      content,
      updated_at: new Date(),
    });
    logger.debug(`Заметка обновлена: id=${headerNote.id}, content=${headerNote.content}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('headerNoteUpdated', headerNote.toJSON());
        logger.debug(`Уведомление об обновлении заметки отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Заметка в заголовке обновлена пользователем ${req.user.id}: id=${headerNote.id}`);
    res.json({ message: 'Заметка обновлена', headerNote });
  } catch (error) {
    logger.error(`Ошибка при обновлении заметки в заголовке: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении заметки', details: error.message });
  }
};

const deleteHeaderNote = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление заметки в заголовке: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { HeaderNote } = models;
    logger.debug('Модель HeaderNote успешно получена');

    logger.debug(`Поиск заметки с id: ${id}`);
    const headerNote = await HeaderNote.findByPk(id);
    if (!headerNote || (headerNote.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Заметка не найдена или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Заметка не найдена или доступ запрещён' });
    }
    logger.debug(`Заметка найдена: id=${headerNote.id}, content=${headerNote.content}`);

    logger.debug('Удаление заметки из базы данных');
    await headerNote.destroy();
    logger.debug(`Заметка удалена: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('headerNoteDeleted', { id });
        logger.debug(`Уведомление об удалении заметки отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Заметка в заголовке удалена пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Заметка удалена' });
  } catch (error) {
    logger.error(`Ошибка при удалении заметки в заголовке: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении заметки', details: error.message });
  }
};

logger.debug('Контроллер headernotes.js успешно инициализирован');
module.exports = { getHeaderNotes, createHeaderNote, updateHeaderNote, deleteHeaderNote };