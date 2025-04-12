// C:\rezerv\app\server\controllers\tenderbudget.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера tenderbudget.js');

const getTenderBudgets = async (req, res) => {
  logger.debug(`Получен запрос на получение списка бюджетов тендеров для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { TenderBudget } = models;
    logger.debug('Модель TenderBudget успешно получена');

    logger.debug('Формирование условий запроса для списка бюджетов');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка бюджетов из базы данных');
    const budgets = await TenderBudget.findAll({
      where: whereClause,
      order: [['id', 'DESC']],
    });
    logger.debug(`Получено ${budgets.length} записей о бюджетах тендеров`);

    logger.info(`Список бюджетов тендеров отправлен пользователю: ${req.user.id}, количество: ${budgets.length}`);
    res.json(budgets);
  } catch (error) {
    logger.error(`Ошибка при получении списка бюджетов тендеров: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении бюджета тендеров', details: error.message });
  }
};

const createTenderBudget = async (req, res) => {
  const { amount, description } = req.body;
  logger.debug(`Получен запрос на создание бюджета тендеров: amount=${amount}, description=${description}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    logger.warn(`Некорректная сумма бюджета: ${amount}, пользователь: ${req.user.id}`);
    return res.status(400).json({ error: 'Сумма бюджета должна быть положительным числом' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { TenderBudget } = models;
    logger.debug('Модель TenderBudget успешно получена');

    logger.debug('Создание новой записи о бюджете в базе данных');
    const budget = await TenderBudget.create({
      user_id: req.user.id,
      amount: parseFloat(amount),
      description: description || '',
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Бюджет создан: id=${budget.id}, amount=${budget.amount}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('tenderBudgetCreated', budget.toJSON());
        logger.debug(`Уведомление о создании бюджета отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Бюджет тендеров создан пользователем ${req.user.id}: id=${budget.id}, amount=${budget.amount}`);
    res.status(201).json(budget);
  } catch (error) {
    logger.error(`Ошибка при создании бюджета тендеров: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании бюджета тендеров', details: error.message });
  }
};

const updateTenderBudget = async (req, res) => {
  const { id } = req.params; // Исправлено на использование id из params
  const { amount, description } = req.body;
  logger.debug(`Получен запрос на обновление бюджета тендеров: id=${id}, amount=${amount}, description=${description}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    logger.warn(`Некорректная сумма бюджета: ${amount}, пользователь: ${req.user.id}`);
    return res.status(400).json({ error: 'Сумма бюджета должна быть положительным числом' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { TenderBudget } = models;
    logger.debug('Модель TenderBudget успешно получена');

    logger.debug(`Поиск бюджета с id: ${id}`);
    const budget = await TenderBudget.findByPk(id);
    if (!budget || (budget.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Бюджет не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Бюджет не найден или доступ запрещён' });
    }

    logger.debug('Обновление бюджета в базе данных');
    await budget.update({
      amount: parseFloat(amount),
      description: description || budget.description,
      updated_at: new Date(),
    });
    logger.debug(`Бюджет обновлен: id=${budget.id}, amount=${budget.amount}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('tenderBudgetUpdated', budget.toJSON());
        logger.debug(`Уведомление об обновлении бюджета отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Бюджет тендеров обновлен пользователем ${req.user.id}: id=${budget.id}, amount=${budget.amount}`);
    res.json({ message: 'Бюджет тендеров обновлен', budget });
  } catch (error) {
    logger.error(`Ошибка при обновлении бюджета тендеров: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении бюджета тендеров', details: error.message });
  }
};

const deleteTenderBudget = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление бюджета тендеров: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { TenderBudget } = models;
    logger.debug('Модель TenderBudget успешно получена');

    logger.debug(`Поиск бюджета с id: ${id}`);
    const budget = await TenderBudget.findByPk(id);
    if (!budget || (budget.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Бюджет не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Бюджет не найден или доступ запрещён' });
    }
    logger.debug(`Бюджет найден: id=${budget.id}, amount=${budget.amount}`);

    logger.debug('Удаление бюджета из базы данных');
    await budget.destroy();
    logger.debug(`Бюджет удален: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('tenderBudgetDeleted', { id });
        logger.debug(`Уведомление об удалении бюджета отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Бюджет тендеров удален пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Бюджет тендеров удален' });
  } catch (error) {
    logger.error(`Ошибка при удалении бюджета тендеров: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении бюджета тендеров', details: error.message });
  }
};

logger.debug('Контроллер tenderbudget.js успешно инициализирован');
module.exports = { getTenderBudgets, createTenderBudget, updateTenderBudget, deleteTenderBudget };