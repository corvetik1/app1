// C:\rezerv\app\server\controllers\loans.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера loans.js');

const getLoans = async (req, res) => {
  logger.debug(`Получен запрос на получение списка займов для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Loan } = models;
    logger.debug('Модель Loan успешно получена');

    logger.debug('Формирование условий запроса для списка займов');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка займов из базы данных');
    const loans = await Loan.findAll({
      where: whereClause,
    });
    logger.debug(`Получено ${loans.length} записей о займах`);

    logger.info(`Список займов отправлен пользователю: ${req.user.id}, количество: ${loans.length}`);
    res.json(loans);
  } catch (error) {
    logger.error(`Ошибка при получении списка займов: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении займов', details: error.message });
  }
};

const createLoan = async (req, res) => {
  const { name, amount, monthly_payment, interest_rate } = req.body;
  logger.debug(`Получен запрос на создание займа: name=${name}, amount=${amount}, monthly_payment=${monthly_payment}, interest_rate=${interest_rate}, пользователь: ${req.user?.id || 'неизвестен'}`);

  if (!name || !amount || parseFloat(amount) <= 0) {
    logger.warn(`Название и положительная сумма займа обязательны для пользователя ${req.user?.id}`);
    return res.status(400).json({ error: 'Название и положительная сумма займа обязательны' });
  }

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Loan } = models;
    logger.debug('Модель Loan успешно получена');

    logger.debug('Валидация данных для создания займа');
    const parsedAmount = parseFloat(amount);
    const parsedMonthlyPayment = monthly_payment ? parseFloat(monthly_payment) : null;
    const parsedInterestRate = interest_rate ? parseFloat(interest_rate) : null;

    if (parsedMonthlyPayment && parsedMonthlyPayment <= 0) {
      logger.warn(`Ежемесячный платеж должен быть положительным для пользователя ${req.user?.id}`);
      return res.status(400).json({ error: 'Ежемесячный платеж должен быть положительным' });
    }
    if (parsedInterestRate && parsedInterestRate < 0) {
      logger.warn(`Процентная ставка не может быть отрицательной для пользователя ${req.user?.id}`);
      return res.status(400).json({ error: 'Процентная ставка не может быть отрицательной' });
    }

    logger.debug('Создание новой записи о займе в базе данных');
    const loan = await Loan.create({
      user_id: req.user.id,
      name,
      amount: parsedAmount,
      monthly_payment: parsedMonthlyPayment,
      interest_rate: parsedInterestRate,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logger.debug(`Запись о займе создана: id=${loan.id}, name=${loan.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('loanCreated', loan.toJSON());
        logger.debug(`Уведомление о создании займа отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Займ создан пользователем ${req.user.id}: id=${loan.id}, name=${loan.name}`);
    res.status(201).json(loan);
  } catch (error) {
    logger.error(`Ошибка при создании займа: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании займа', details: error.message });
  }
};

const updateLoan = async (req, res) => {
  const { id } = req.params;
  const { name, amount, monthly_payment, interest_rate } = req.body;
  logger.debug(`Получен запрос на обновление займа: id=${id}, name=${name}, amount=${amount}, monthly_payment=${monthly_payment}, interest_rate=${interest_rate}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Loan } = models;
    logger.debug('Модель Loan успешно получена');

    logger.debug(`Поиск займа с id: ${id}`);
    const loan = await Loan.findByPk(id);
    if (!loan || (loan.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Займ не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Займ не найден или доступ запрещён' });
    }
    logger.debug(`Займ найден: id=${loan.id}, name=${loan.name}`);

    logger.debug('Валидация данных для обновления займа');
    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        logger.warn(`Сумма займа должна быть положительной: ${amount}, пользователь: ${req.user.id}`);
        return res.status(400).json({ error: 'Сумма займа должна быть положительной' });
      }
      updates.amount = parsedAmount;
    }
    if (monthly_payment !== undefined) {
      const parsedMonthlyPayment = parseFloat(monthly_payment);
      if (!isNaN(parsedMonthlyPayment) && parsedMonthlyPayment <= 0) {
        logger.warn(`Ежемесячный платеж должен быть положительным: ${monthly_payment}, пользователь: ${req.user.id}`);
        return res.status(400).json({ error: 'Ежемесячный платеж должен быть положительным' });
      }
      updates.monthly_payment = parsedMonthlyPayment;
    }
    if (interest_rate !== undefined) {
      const parsedInterestRate = parseFloat(interest_rate);
      if (!isNaN(parsedInterestRate) && parsedInterestRate < 0) {
        logger.warn(`Процентная ставка не может быть отрицательной: ${interest_rate}, пользователь: ${req.user.id}`);
        return res.status(400).json({ error: 'Процентная ставка не может быть отрицательной' });
      }
      updates.interest_rate = parsedInterestRate;
    }

    logger.debug('Обновление записи о займе в базе данных');
    await loan.update(updates);
    logger.debug(`Займ обновлен: id=${loan.id}, name=${loan.name}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('loanUpdated', loan.toJSON());
        logger.debug(`Уведомление об обновлении займа отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Займ обновлен пользователем ${req.user.id}: id=${loan.id}, name=${loan.name}`);
    res.json({ message: 'Займ обновлен', loan });
  } catch (error) {
    logger.error(`Ошибка при обновлении займа: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении займа', details: error.message });
  }
};

const deleteLoan = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление займа: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Loan } = models;
    logger.debug('Модель Loan успешно получена');

    logger.debug(`Поиск займа с id: ${id}`);
    const loan = await Loan.findByPk(id);
    if (!loan || (loan.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Займ не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Займ не найден или доступ запрещён' });
    }
    logger.debug(`Займ найден: id=${loan.id}, name=${loan.name}`);

    logger.debug('Удаление записи о займе из базы данных');
    await loan.destroy();
    logger.debug(`Займ удален: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('loanDeleted', { id });
        logger.debug(`Уведомление об удалении займа отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Займ удален пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Займ удален' });
  } catch (error) {
    logger.error(`Ошибка при удалении займа: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении займа', details: error.message });
  }
};

logger.debug('Контроллер loans.js успешно инициализирован');
module.exports = { getLoans, createLoan, updateLoan, deleteLoan };