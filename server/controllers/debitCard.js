// C:\rezerv\app\server\controllers\debitcard.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера debitcard.js');

const getDebitCards = async (req, res) => {
  logger.debug(`Получен запрос на получение списка дебетовых карт для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DebitCard } = models;
    logger.debug('Модель DebitCard успешно получена');

    logger.debug('Формирование условий запроса для списка дебетовых карт');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка дебетовых карт из базы данных');
    const debitCards = await DebitCard.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });
    logger.debug(`Получено ${debitCards.length} дебетовых карт`);

    logger.info(`Список дебетовых карт сформирован для пользователя: ${req.user.id}, количество: ${debitCards.length}`);
    res.json(debitCards);
  } catch (error) {
    logger.error(`Ошибка при получении списка дебетовых карт: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении списка дебетовых карт', details: error.message });
  }
};

const createDebitCard = async (req, res) => {
  const { name, balance = 0 } = req.body;
  logger.debug(`Получен запрос на создание дебетовой карты: name=${name}, balance=${balance}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!name) {
    logger.warn(`Название обязательно для создания дебетовой карты: name=${name}`);
    return res.status(400).json({ error: 'Название обязательно' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DebitCard } = models;
    logger.debug('Модель DebitCard успешно получена');

    logger.debug('Создание новой дебетовой карты в базе данных');
    const debitCard = await DebitCard.create({
      user_id: req.user.id,
      name,
      balance: parseFloat(balance),
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Дебетовая карта создана: id=${debitCard.id}, name=${debitCard.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('debitCardCreated', debitCard.toJSON());
        logger.debug(`Уведомление о создании дебетовой карты отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Дебетовая карта создана пользователем ${req.user.id}: id=${debitCard.id}, name=${debitCard.name}`);
    res.status(201).json(debitCard);
  } catch (error) {
    logger.error(`Ошибка при создании дебетовой карты: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании дебетовой карты', details: error.message });
  }
};

const deleteDebitCard = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление дебетовой карты: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DebitCard } = models;
    logger.debug('Модель DebitCard успешно получена');

    logger.debug(`Поиск дебетовой карты с id: ${id}`);
    const debitCard = await DebitCard.findByPk(id);
    if (!debitCard || (debitCard.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Дебетовая карта не найдена или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Дебетовая карта не найдена или доступ запрещён' });
    }
    logger.debug(`Дебетовая карта найдена: id=${debitCard.id}, name=${debitCard.name}`);

    if (req.user.role === 'admin' && (debitCard.name === 'Тбанк' || debitCard.name === 'Кубышка')) {
      logger.warn(`Попытка удалить системную карту: ${debitCard.name}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Нельзя удалить системные карты "Тбанк" или "Кубышка"' });
    }

    logger.debug('Удаление дебетовой карты из базы данных');
    await debitCard.destroy();
    logger.debug(`Дебетовая карта удалена: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('debitCardDeleted', { id });
        logger.debug(`Уведомление об удалении дебетовой карты отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Дебетовая карта удалена пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Дебетовая карта удалена', id });
  } catch (error) {
    logger.error(`Ошибка при удалении дебетовой карты: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении дебетовой карты', details: error.message });
  }
};

logger.debug('Контроллер debitcard.js успешно инициализирован');
module.exports = { getDebitCards, createDebitCard, deleteDebitCard };