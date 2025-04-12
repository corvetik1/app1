// C:\rezerv\app\server\controllers\creditcard.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера creditcard.js');

const getCreditCards = async (req, res) => {
  logger.debug(`Получен запрос на получение списка кредитных карт для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { CreditCard } = models;
    logger.debug('Модель CreditCard успешно получена');

    logger.debug('Формирование условий запроса для списка кредитных карт');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка кредитных карт из базы данных');
    const creditCards = await CreditCard.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });
    logger.debug(`Получено ${creditCards.length} кредитных карт`);

    logger.info(`Список кредитных карт сформирован для пользователя: ${req.user.id}, количество: ${creditCards.length}`);
    res.json(creditCards);
  } catch (error) {
    logger.error(`Ошибка при получении списка кредитных карт: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении списка кредитных карт', details: error.message });
  }
};

const createCreditCard = async (req, res) => {
  const { name, credit_limit, debt = 0 } = req.body;
  logger.debug(`Получен запрос на создание кредитной карты: name=${name}, credit_limit=${credit_limit}, debt=${debt}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!name || !credit_limit || isNaN(parseFloat(credit_limit)) || parseFloat(credit_limit) <= 0) {
    logger.warn(`Некорректные данные для создания кредитной карты: name=${name}, credit_limit=${credit_limit}`);
    return res.status(400).json({ error: 'Название и положительный кредитный лимит обязательны' });
  }
  const parsedDebt = parseFloat(debt);
  if (isNaN(parsedDebt) || parsedDebt < 0) {
    logger.warn(`Долг не может быть отрицательным: debt=${debt}`);
    return res.status(400).json({ error: 'Долг не может быть отрицательным' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { CreditCard } = models;
    logger.debug('Модель CreditCard успешно получена');

    logger.debug('Создание новой кредитной карты в базе данных');
    const creditCard = await CreditCard.create({
      user_id: req.user.id,
      name,
      credit_limit: parseFloat(credit_limit),
      debt: parsedDebt,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Кредитная карта создана: id=${creditCard.id}, name=${creditCard.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('creditCardCreated', creditCard.toJSON());
        logger.debug(`Уведомление о создании кредитной карты отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Кредитная карта создана пользователем ${req.user.id}: id=${creditCard.id}, name=${creditCard.name}`);
    res.status(201).json(creditCard);
  } catch (error) {
    logger.error(`Ошибка при создании кредитной карты: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании кредитной карты', details: error.message });
  }
};

const updateCreditCard = async (req, res) => {
  const { id } = req.params;
  const { name, credit_limit, debt, status } = req.body;
  logger.debug(`Получен запрос на обновление кредитной карты: id=${id}, name=${name}, credit_limit=${credit_limit}, debt=${debt}, status=${status}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { CreditCard } = models;
    logger.debug('Модель CreditCard успешно получена');

    logger.debug(`Поиск кредитной карты с id: ${id}`);
    const creditCard = await CreditCard.findByPk(id);
    if (!creditCard || (creditCard.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Кредитная карта не найдена или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Кредитная карта не найдена или доступ запрещён' });
    }
    logger.debug(`Кредитная карта найдена: id=${creditCard.id}, name=${creditCard.name}`);

    const updates = {};
    if (name) updates.name = name;
    if (credit_limit !== undefined) {
      const parsedLimit = parseFloat(credit_limit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        logger.warn(`Некорректный кредитный лимит: ${credit_limit}`);
        return res.status(400).json({ error: 'Кредитный лимит должен быть положительным числом' });
      }
      updates.credit_limit = parsedLimit;
    }
    if (debt !== undefined) {
      const parsedDebt = parseFloat(debt);
      if (isNaN(parsedDebt) || parsedDebt < 0) {
        logger.warn(`Долг не может быть отрицательным: debt=${debt}`);
        return res.status(400).json({ error: 'Долг не может быть отрицательным' });
      }
      updates.debt = parsedDebt;
    }
    if (status) updates.status = status;
    updates.updated_at = new Date();

    logger.debug('Обновление кредитной карты в базе данных');
    await creditCard.update(updates);
    logger.debug(`Кредитная карта обновлена: id=${creditCard.id}, name=${creditCard.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('creditCardUpdated', creditCard.toJSON());
        logger.debug(`Уведомление об обновлении кредитной карты отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Кредитная карта обновлена пользователем ${req.user.id}: id=${creditCard.id}, name=${creditCard.name}`);
    res.json({ message: 'Кредитная карта обновлена', creditCard });
  } catch (error) {
    logger.error(`Ошибка при обновлении кредитной карты: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении кредитной карты', details: error.message });
  }
};

const deleteCreditCard = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление кредитной карты: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { CreditCard } = models;
    logger.debug('Модель CreditCard успешно получена');

    logger.debug(`Поиск кредитной карты с id: ${id}`);
    const creditCard = await CreditCard.findByPk(id);
    if (!creditCard || (creditCard.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Кредитная карта не найдена или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Кредитная карта не найдена или доступ запрещён' });
    }
    logger.debug(`Кредитная карта найдена: id=${creditCard.id}, name=${creditCard.name}`);

    logger.debug('Удаление кредитной карты из базы данных');
    await creditCard.destroy();
    logger.debug(`Кредитная карта удалена: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('creditCardDeleted', { id });
        logger.debug(`Уведомление об удалении кредитной карты отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Кредитная карта удалена пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Кредитная карта удалена', id });
  } catch (error) {
    logger.error(`Ошибка при удалении кредитной карты: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении кредитной карты', details: error.message });
  }
};

logger.debug('Контроллер creditcard.js успешно инициализирован');
module.exports = { getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard };