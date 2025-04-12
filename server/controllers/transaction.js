// C:\rezerv\app\server\controllers\transaction.js
const logger = require('../utils/logger'); // Импорт логгера для диагностики
const { getModels } = require('../config/sequelize'); // Импорт функции получения моделей
const { socketMap } = require('../sockets'); // Импорт WebSocket данных для уведомлений
const { v4: uuidv4 } = require('uuid'); // Импорт UUID для генерации уникальных ID транзакций
const { Sequelize, Op } = require('sequelize');

logger.debug('Инициализация контроллера transaction.js');

// Контроллер для получения списка транзакций
const getTransactions = async (req, res) => {
  logger.debug(`Получен запрос на получение списка транзакций для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Transaction, CreditCard, DebitCard } = models;
    logger.debug('Модели Transaction, CreditCard, DebitCard успешно получены');

    // Шаг 2: Формирование условий запроса
    logger.debug('Формирование условий запроса для списка транзакций');
    const { page = 1, limit = 10, type, category } = req.query;
    const offset = (page - 1) * limit;
    const where = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    if (type) where.type = type;
    if (category) where.category = category;

    // Шаг 3: Получение списка транзакций
    logger.debug('Запрос списка транзакций из базы данных');
    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: CreditCard, as: 'CreditCard', attributes: ['name'] },
        { model: DebitCard, as: 'DebitCard', attributes: ['name'] },
        { model: CreditCard, as: 'TransferToCreditCard', attributes: ['name'] },
        { model: DebitCard, as: 'TransferToDebitCard', attributes: ['name'] },
      ],
    });
    const totalPages = Math.ceil(count / limit);
    logger.debug(`Получено ${transactions.length} транзакций, общее количество: ${count}`);

    // Шаг 4: Логирование успешного получения
    logger.info(`Транзакции отправлены пользователю ${req.user.id}: ${count} транзакций`);

    // Отправка ответа
    res.json({ transactions, totalPages, total: count });
  } catch (error) {
    logger.error(`Ошибка при получении списка транзакций: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении транзакций', details: error.message });
  }
};

// Контроллер для создания новой транзакции
const createTransaction = async (req, res) => {
  const transactions = Array.isArray(req.body) ? req.body : [req.body];
  logger.debug(`Создание транзакций для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}, тело запроса=${JSON.stringify(transactions)}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Transaction, CreditCard, DebitCard, sequelize } = models;
    logger.debug('Модели Transaction, CreditCard, DebitCard, sequelize успешно получены');

    // Шаг 2: Получение текущих данных карт
    logger.debug('Получение данных дебетовых и кредитных карт');
    const creditCards = await CreditCard.findAll({ where: { user_id: req.user.id } });
    const debitCards = await DebitCard.findAll({ where: { user_id: req.user.id } });

    // Шаг 3: Выполнение транзакций в одной базе транзакции
    logger.debug('Начало транзакции для создания записей');
    const result = await sequelize.transaction(async (t) => {
      const createdTransactions = [];

      if (req.user.role === 'admin') {
        const tbank = debitCards.find((dc) => dc.name === 'Тбанк');
        const kubyshka = debitCards.find((dc) => dc.name === 'Кубышка');
        const KUBYSHKA_LIMIT = 50000;

        if (!tbank || !kubyshka) {
          logger.warn(`Отсутствуют системные карты Тбанк или Кубышка для администратора ${req.user.id}`);
          throw new Error('Дебетовые карты "Тбанк" и "Кубышка" должны быть созданы');
        }

        let kubyshkaBalance = parseFloat(kubyshka.balance) || 0;
        let tbankBalance = parseFloat(tbank.balance) || 0;

        for (const tx of transactions) {
          const { credit_card_id, debit_card_id, type, amount, description, category, date, transfer_to_credit_card_id, transfer_to_debit_card_id } = tx;

          if (!type || !amount || parseFloat(amount) <= 0) {
            logger.warn(`Некорректные данные транзакции: ${JSON.stringify(tx)} для администратора ${req.user.id}`);
            throw new Error('Некорректные данные транзакции: тип и положительная сумма обязательны');
          }

          const totalAmount = parseFloat(amount);
          let fromCard = credit_card_id ? creditCards.find((cc) => cc.id === credit_card_id) : debitCards.find((dc) => dc.id === debit_card_id);

          if (!fromCard || fromCard.user_id !== req.user.id) {
            logger.warn(`Карта-отправитель не найдена или не принадлежит администратору: ID ${credit_card_id || debit_card_id}`);
            throw new Error('Карта-отправитель не найдена или не принадлежит пользователю');
          }
          if (fromCard.status !== 'active') throw new Error('Карта неактивна');

          if (type === 'income') {
            if (!debit_card_id || (debit_card_id !== tbank.id && debit_card_id !== kubyshka.id)) {
              logger.warn(`Доход для администратора можно зачислять только на Тбанк или Кубышку, выбрана карта ID ${debit_card_id}`);
              throw new Error('Доход можно зачислять только на Тбанк или Кубышку');
            }

            if (debit_card_id === kubyshka.id) {
              if (kubyshkaBalance + totalAmount > KUBYSHKA_LIMIT) {
                logger.warn(`Попытка превысить лимит Кубышки: текущий баланс ${kubyshkaBalance}, сумма ${totalAmount}`);
                throw new Error(`Сумма превышает лимит Кубышки (50,000 рублей), доступно: ${KUBYSHKA_LIMIT - kubyshkaBalance}`);
              }
              kubyshkaBalance += totalAmount;
              await DebitCard.update(
                { balance: kubyshkaBalance, updated_at: new Date() },
                { where: { id: kubyshka.id }, transaction: t }
              );
            } else if (debit_card_id === tbank.id) {
              tbankBalance += totalAmount;
              await DebitCard.update(
                { balance: tbankBalance, updated_at: new Date() },
                { where: { id: tbank.id }, transaction: t }
              );
            }

            const incomeTransaction = await Transaction.create(
              {
                id: uuidv4(),
                user_id: req.user.id,
                debit_card_id,
                type: 'income',
                amount: totalAmount,
                description: description || (debit_card_id === kubyshka.id ? 'Пополнение Кубышки: Доход' : 'Доход'),
                category: category || 'Прочее',
                date: date || new Date(),
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
              },
              { transaction: t }
            );
            createdTransactions.push(incomeTransaction);
          } else if (type === 'expense') {
            if (fromCard instanceof DebitCard) {
              if (fromCard.id === tbank.id) {
                const totalAvailable = tbankBalance + kubyshkaBalance;
                if (totalAvailable < totalAmount) {
                  logger.warn(`Недостаточно средств на Тбанке и Кубышке для расхода: ${totalAvailable} < ${totalAmount}`);
                  throw new Error('Недостаточно средств на Тбанке и Кубышке');
                }

                let tbankAmount = Math.min(totalAmount, tbankBalance);
                let kubyshkaAmount = totalAmount - tbankAmount;

                if (tbankAmount > 0) {
                  tbankBalance -= tbankAmount;
                  await DebitCard.update(
                    { balance: tbankBalance, updated_at: new Date() },
                    { where: { id: tbank.id }, transaction: t }
                  );
                  const tbankTransaction = await Transaction.create(
                    {
                      id: uuidv4(),
                      user_id: req.user.id,
                      debit_card_id: tbank.id,
                      type: 'expense',
                      amount: tbankAmount,
                      description: description || 'Расход с Тбанка',
                      category: category || 'Прочее',
                      date: date || new Date(),
                      status: 'completed',
                      created_at: new Date(),
                      updated_at: new Date(),
                    },
                    { transaction: t }
                  );
                  createdTransactions.push(tbankTransaction);
                }

                if (kubyshkaAmount > 0) {
                  kubyshkaBalance -= kubyshkaAmount;
                  await DebitCard.update(
                    { balance: kubyshkaBalance, updated_at: new Date() },
                    { where: { id: kubyshka.id }, transaction: t }
                  );
                  const kubyshkaTransaction = await Transaction.create(
                    {
                      id: uuidv4(),
                      user_id: req.user.id,
                      debit_card_id: kubyshka.id,
                      type: 'expense',
                      amount: kubyshkaAmount,
                      description: description || 'Расход с Кубышки',
                      category: category || 'Прочее',
                      date: date || new Date(),
                      status: 'completed',
                      created_at: new Date(),
                      updated_at: new Date(),
                    },
                    { transaction: t }
                  );
                  createdTransactions.push(kubyshkaTransaction);
                }
              } else if (fromCard.id === kubyshka.id) {
                if (kubyshkaBalance < totalAmount) {
                  logger.warn(`Недостаточно средств на Кубышке: ${kubyshkaBalance} < ${totalAmount}`);
                  throw new Error('Недостаточно средств на Кубышке');
                }
                kubyshkaBalance -= totalAmount;
                await DebitCard.update(
                  { balance: kubyshkaBalance, updated_at: new Date() },
                  { where: { id: kubyshka.id }, transaction: t }
                );
                const kubyshkaTransaction = await Transaction.create(
                  {
                    id: uuidv4(),
                    user_id: req.user.id,
                    debit_card_id: kubyshka.id,
                    type: 'expense',
                    amount: totalAmount,
                    description: description || 'Расход с Кубышки',
                    category: category || 'Прочее',
                    date: date || new Date(),
                    status: 'completed',
                    created_at: new Date(),
                    updated_at: new Date(),
                  },
                  { transaction: t }
                );
                createdTransactions.push(kubyshkaTransaction);
              } else {
                if (parseFloat(fromCard.balance) < totalAmount) {
                  logger.warn(`Недостаточно средств на дебетовой карте ${fromCard.name} (ID: ${fromCard.id}): ${fromCard.balance} < ${totalAmount}`);
                  throw new Error('Недостаточно средств на дебетовой карте');
                }
                await DebitCard.update(
                  { balance: Sequelize.literal(`balance - ${totalAmount}`), updated_at: new Date() },
                  { where: { id: fromCard.id }, transaction: t }
                );
                const expenseTransaction = await Transaction.create(
                  {
                    id: uuidv4(),
                    user_id: req.user.id,
                    debit_card_id: fromCard.id,
                    type: 'expense',
                    amount: totalAmount,
                    description: description || 'Расход',
                    category: category || 'Прочее',
                    date: date || new Date(),
                    status: 'completed',
                    created_at: new Date(),
                    updated_at: new Date(),
                  },
                  { transaction: t }
                );
                createdTransactions.push(expenseTransaction);
              }
            } else if (fromCard instanceof CreditCard) {
              const availableCredit = parseFloat(fromCard.credit_limit) - parseFloat(fromCard.debt);
              if (availableCredit < totalAmount) {
                logger.warn(`Недостаточно доступного кредитного лимита на кредитной карте ${fromCard.name} (ID: ${fromCard.id}): ${availableCredit} < ${totalAmount}`);
                throw new Error('Недостаточно доступного кредитного лимита');
              }
              await CreditCard.update(
                { debt: Sequelize.literal(`debt + ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
              const expenseTransaction = await Transaction.create(
                {
                  id: uuidv4(),
                  user_id: req.user.id,
                  credit_card_id: fromCard.id,
                  type: 'expense',
                  amount: totalAmount,
                  description: description || 'Расход',
                  category: category || 'Прочее',
                  date: date || new Date(),
                  status: 'completed',
                  created_at: new Date(),
                  updated_at: new Date(),
                },
                { transaction: t }
              );
              createdTransactions.push(expenseTransaction);
            }
          } else if (type === 'transfer') {
            const toCard = transfer_to_credit_card_id ? creditCards.find((cc) => cc.id === transfer_to_credit_card_id) : debitCards.find((dc) => dc.id === transfer_to_debit_card_id);
            if (!toCard || toCard.user_id !== req.user.id) throw new Error('Карта-получатель не найдена или не принадлежит пользователю');
            if (toCard.status !== 'active') throw new Error('Карта-получатель неактивна');
            if (fromCard.id === toCard.id) throw new Error('Нельзя переводить на тот же счет');

            if (fromCard instanceof DebitCard) {
              if (parseFloat(fromCard.balance) < totalAmount) throw new Error('Недостаточно средств на дебетовой карте');
              await DebitCard.update(
                { balance: Sequelize.literal(`balance - ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
            } else if (fromCard instanceof CreditCard) {
              const availableCredit = parseFloat(fromCard.credit_limit) - parseFloat(fromCard.debt);
              if (availableCredit < totalAmount) throw new Error('Недостаточно доступного кредитного лимита');
              await CreditCard.update(
                { debt: Sequelize.literal(`debt + ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
            }

            if (toCard instanceof DebitCard) {
              await DebitCard.update(
                { balance: Sequelize.literal(`balance + ${totalAmount}`), updated_at: new Date() },
                { where: { id: toCard.id }, transaction: t }
              );
            } else if (toCard instanceof CreditCard) {
              await CreditCard.update(
                { debt: Sequelize.literal(`debt - ${totalAmount}`), updated_at: new Date() },
                { where: { id: toCard.id }, transaction: t }
              );
            }

            const transferTransaction = await Transaction.create(
              {
                id: uuidv4(),
                user_id: req.user.id,
                debit_card_id: fromCard instanceof DebitCard ? fromCard.id : null,
                credit_card_id: fromCard instanceof CreditCard ? fromCard.id : null,
                type: 'transfer',
                amount: totalAmount,
                description: description || `Перевод на ${toCard.name}`,
                category: category || 'Перевод',
                date: date || new Date(),
                transfer_to_debit_card_id: toCard instanceof DebitCard ? toCard.id : null,
                transfer_to_credit_card_id: toCard instanceof CreditCard ? toCard.id : null,
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
              },
              { transaction: t }
            );
            createdTransactions.push(transferTransaction);
          } else {
            throw new Error('Неверный тип транзакции');
          }
        }
      } else { // Логика для всех ролей, кроме admin
        for (const tx of transactions) {
          const { credit_card_id, debit_card_id, type, amount, description, category, date, transfer_to_credit_card_id, transfer_to_debit_card_id } = tx;

          if (!type || !amount || parseFloat(amount) <= 0) {
            logger.warn(`Некорректные данные транзакции: ${JSON.stringify(tx)} для пользователя ${req.user.id}`);
            throw new Error('Некорректные данные транзакции: тип и положительная сумма обязательны');
          }

          const totalAmount = parseFloat(amount);
          let fromCard = credit_card_id ? creditCards.find((cc) => cc.id === credit_card_id) : debitCards.find((dc) => dc.id === debit_card_id);

          if (!fromCard || fromCard.user_id !== req.user.id) {
            logger.warn(`Карта-отправитель не найдена или не принадлежит пользователю: ID ${credit_card_id || debit_card_id}`);
            throw new Error('Карта-отправитель не найдена или не принадлежит пользователю');
          }
          if (fromCard.status !== 'active') throw new Error('Карта неактивна');

          if (type === 'income') {
            if (!(fromCard instanceof DebitCard)) {
              logger.warn(`Доход можно зачислять только на дебетовые карты для пользователя ${req.user.id}, выбрана карта ID ${credit_card_id || debit_card_id}`);
              throw new Error('Доход можно зачислять только на дебетовые карты');
            }
            await DebitCard.update(
              { balance: Sequelize.literal(`balance + ${totalAmount}`), updated_at: new Date() },
              { where: { id: fromCard.id }, transaction: t }
            );
            const incomeTransaction = await Transaction.create(
              {
                id: uuidv4(),
                user_id: req.user.id,
                debit_card_id: fromCard.id,
                type: 'income',
                amount: totalAmount,
                description: description || 'Доход',
                category: category || 'Прочее',
                date: date || new Date(),
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
              },
              { transaction: t }
            );
            createdTransactions.push(incomeTransaction);
          } else if (type === 'expense') {
            if (fromCard instanceof DebitCard) {
              if (parseFloat(fromCard.balance) < totalAmount) {
                logger.warn(`Недостаточно средств на дебетовой карте ${fromCard.name} (ID: ${fromCard.id}): ${fromCard.balance} < ${totalAmount}`);
                throw new Error('Недостаточно средств на дебетовой карте');
              }
              await DebitCard.update(
                { balance: Sequelize.literal(`balance - ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
            } else if (fromCard instanceof CreditCard) {
              const availableCredit = parseFloat(fromCard.credit_limit) - parseFloat(fromCard.debt);
              if (availableCredit < totalAmount) {
                logger.warn(`Недостаточно доступного кредитного лимита на кредитной карте ${fromCard.name} (ID: ${fromCard.id}): ${availableCredit} < ${totalAmount}`);
                throw new Error('Недостаточно доступного кредитного лимита');
              }
              await CreditCard.update(
                { debt: Sequelize.literal(`debt + ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
            }
            const expenseTransaction = await Transaction.create(
              {
                id: uuidv4(),
                user_id: req.user.id,
                debit_card_id: fromCard instanceof DebitCard ? fromCard.id : null,
                credit_card_id: fromCard instanceof CreditCard ? fromCard.id : null,
                type: 'expense',
                amount: totalAmount,
                description: description || 'Расход',
                category: category || 'Прочее',
                date: date || new Date(),
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
              },
              { transaction: t }
            );
            createdTransactions.push(expenseTransaction);
          } else if (type === 'transfer') {
            const toCard = transfer_to_credit_card_id ? creditCards.find((cc) => cc.id === transfer_to_credit_card_id) : debitCards.find((dc) => dc.id === transfer_to_debit_card_id);
            if (!toCard || toCard.user_id !== req.user.id) throw new Error('Карта-получатель не найдена или не принадлежит пользователю');
            if (toCard.status !== 'active') throw new Error('Карта-получатель неактивна');
            if (fromCard.id === toCard.id) throw new Error('Нельзя переводить на тот же счет');

            if (fromCard instanceof DebitCard) {
              if (parseFloat(fromCard.balance) < totalAmount) throw new Error('Недостаточно средств на дебетовой карте');
              await DebitCard.update(
                { balance: Sequelize.literal(`balance - ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
            } else if (fromCard instanceof CreditCard) {
              const availableCredit = parseFloat(fromCard.credit_limit) - parseFloat(fromCard.debt);
              if (availableCredit < totalAmount) throw new Error('Недостаточно доступного кредитного лимита');
              await CreditCard.update(
                { debt: Sequelize.literal(`debt + ${totalAmount}`), updated_at: new Date() },
                { where: { id: fromCard.id }, transaction: t }
              );
            }

            if (toCard instanceof DebitCard) {
              await DebitCard.update(
                { balance: Sequelize.literal(`balance + ${totalAmount}`), updated_at: new Date() },
                { where: { id: toCard.id }, transaction: t }
              );
            } else if (toCard instanceof CreditCard) {
              await CreditCard.update(
                { debt: Sequelize.literal(`debt - ${totalAmount}`), updated_at: new Date() },
                { where: { id: toCard.id }, transaction: t }
              );
            }

            const transferTransaction = await Transaction.create(
              {
                id: uuidv4(),
                user_id: req.user.id,
                debit_card_id: fromCard instanceof DebitCard ? fromCard.id : null,
                credit_card_id: fromCard instanceof CreditCard ? fromCard.id : null,
                type: 'transfer',
                amount: totalAmount,
                description: description || `Перевод на ${toCard.name}`,
                category: category || 'Перевод',
                date: date || new Date(),
                transfer_to_debit_card_id: toCard instanceof DebitCard ? toCard.id : null,
                transfer_to_credit_card_id: toCard instanceof CreditCard ? toCard.id : null,
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
              },
              { transaction: t }
            );
            createdTransactions.push(transferTransaction);
          } else {
            throw new Error('Неверный тип транзакции');
          }
        }
      }

      return { transactions: createdTransactions };
    });

    // Шаг 4: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('transactionUpdate', result.transactions);
        logger.debug(`Уведомление о создании транзакций отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 5: Логирование успешного создания
    logger.info(`Транзакции успешно созданы пользователем ${req.user.id}, кол-во транзакций: ${result.transactions.length}`);

    // Отправка ответа
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Ошибка при создании транзакций: ${error.message}, стек: ${error.stack}`);
    res.status(400).json({ error: error.message });
  }
};

// Контроллер для обновления транзакции
const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { description, category, date } = req.body;
  logger.debug(`Получен запрос на обновление транзакции: id=${id}, тело запроса=${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Transaction } = models;
    logger.debug('Модель Transaction успешно получена');

    // Шаг 2: Поиск транзакции
    logger.debug(`Поиск транзакции с id: ${id}`);
    const transaction = await Transaction.findByPk(id);
    if (!transaction || (transaction.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Транзакция не найдена или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Транзакция не найдена или доступ запрещён' });
    }
    logger.debug(`Транзакция найдена: id=${transaction.id}`);

    // Шаг 3: Обновление транзакции
    logger.debug('Обновление транзакции в базе данных');
    await transaction.update({
      description: description || transaction.description,
      category: category || transaction.category,
      date: date || transaction.date,
      updated_at: new Date(),
    });
    logger.debug(`Транзакция обновлена: id=${transaction.id}`);

    // Шаг 4: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('transactionUpdate', [transaction]);
        logger.debug(`Уведомление об обновлении транзакции отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 5: Логирование успешного обновления
    logger.info(`Транзакция обновлена пользователем ${req.user.id}: id=${transaction.id}`);

    // Отправка ответа
    res.json({ message: 'Транзакция обновлена', transaction });
  } catch (error) {
    logger.error(`Ошибка при обновлении транзакции: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении транзакции', details: error.message });
  }
};

// Контроллер для удаления транзакции
const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Удаление транзакции для пользователя: id=${req.user.id}, role=${req.user.role}, role_id=${req.user.role_id}`);

  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Transaction, CreditCard, DebitCard } = models;
    logger.debug('Модели Transaction, CreditCard, DebitCard успешно получены');

    // Шаг 2: Поиск транзакции
    logger.debug(`Поиск транзакции с id: ${id}`);
    const transaction = await Transaction.findByPk(id);
    if (!transaction || (transaction.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Транзакция не найдена или доступ запрещён для пользователя ${req.user.id}: ID ${id}`);
      return res.status(403).json({ error: 'Транзакция не найдена или доступ запрещён' });
    }
    logger.debug(`Транзакция найдена: id=${transaction.id}`);

    // Шаг 3: Удаление транзакции и пересчет балансов
    logger.debug('Удаление транзакции и пересчет балансов в базе данных');
    await Transaction.sequelize.transaction(async (t) => {
      await transaction.destroy({ transaction: t });

      const fromCardId = transaction.debit_card_id || transaction.credit_card_id;
      const toCardId = transaction.transfer_to_debit_card_id || transaction.transfer_to_credit_card_id;

      const recalculateDebitCardBalance = async (cardId) => {
        const card = await DebitCard.findByPk(cardId, { transaction: t });
        if (!card) {
          logger.warn(`Дебетовая карта ID ${cardId} не найдена`);
          return;
        }

        const transactionCount = await Transaction.count({
          where: {
            [Op.or]: [
              { debit_card_id: cardId },
              { transfer_to_debit_card_id: cardId },
            ],
            status: 'completed',
          },
          transaction: t,
        });

        if (transactionCount === 0) {
          const newBalance = (req.user.role === 'admin' && card.name === 'Кубышка') ? 50000 : 0;
          await DebitCard.update(
            { balance: newBalance, updated_at: new Date() },
            { where: { id: cardId }, transaction: t }
          );
          logger.debug(`Транзакций для дебетовой карты ${card.name} (ID ${cardId}) нет, баланс установлен: ${newBalance}`);
        } else {
          const incomes = (await Transaction.sum('amount', {
            where: { debit_card_id: cardId, type: 'income', status: 'completed' },
            transaction: t,
          })) || 0;
          const expenses = (await Transaction.sum('amount', {
            where: { debit_card_id: cardId, type: 'expense', status: 'completed' },
            transaction: t,
          })) || 0;
          const transfersOut = (await Transaction.sum('amount', {
            where: { debit_card_id: cardId, type: 'transfer', status: 'completed' },
            transaction: t,
          })) || 0;
          const transfersIn = (await Transaction.sum('amount', {
            where: { transfer_to_debit_card_id: cardId, type: 'transfer', status: 'completed' },
            transaction: t,
          })) || 0;

          const newBalance = incomes + transfersIn - expenses - transfersOut;
          await DebitCard.update(
            { balance: newBalance, updated_at: new Date() },
            { where: { id: cardId }, transaction: t }
          );
          logger.debug(`Баланс дебетовой карты ${card.name} (ID ${cardId}) пересчитан: ${newBalance}`);
        }
      };

      const recalculateCreditCardDebt = async (cardId) => {
        const card = await CreditCard.findByPk(cardId, { transaction: t });
        if (!card) {
          logger.warn(`Кредитная карта ID ${cardId} не найдена`);
          return;
        }

        const transactionCount = await Transaction.count({
          where: {
            [Op.or]: [
              { credit_card_id: cardId },
              { transfer_to_credit_card_id: cardId },
            ],
            status: 'completed',
          },
          transaction: t,
        });

        if (transactionCount === 0) {
          await CreditCard.update(
            { debt: 0, updated_at: new Date() },
            { where: { id: cardId }, transaction: t }
          );
          logger.debug(`Транзакций для кредитной карты ${card.name} (ID ${cardId}) нет, долг обнулен: 0`);
        } else {
          const expenses = (await Transaction.sum('amount', {
            where: { credit_card_id: cardId, type: 'expense', status: 'completed' },
            transaction: t,
          })) || 0;
          const transfersOut = (await Transaction.sum('amount', {
            where: { credit_card_id: cardId, type: 'transfer', status: 'completed' },
            transaction: t,
          })) || 0;
          const transfersIn = (await Transaction.sum('amount', {
            where: { transfer_to_credit_card_id: cardId, type: 'transfer', status: 'completed' },
            transaction: t,
          })) || 0;

          const newDebt = expenses + transfersOut - transfersIn;
          await CreditCard.update(
            { debt: newDebt, updated_at: new Date() },
            { where: { id: cardId }, transaction: t }
          );
          logger.debug(`Долг кредитной карты ${card.name} (ID ${cardId}) пересчитан: ${newDebt}`);
        }
      };

      if (transaction.debit_card_id) await recalculateDebitCardBalance(transaction.debit_card_id);
      if (transaction.transfer_to_debit_card_id) await recalculateDebitCardBalance(transaction.transfer_to_debit_card_id);
      if (transaction.credit_card_id) await recalculateCreditCardDebt(transaction.credit_card_id);
      if (transaction.transfer_to_credit_card_id) await recalculateCreditCardDebt(transaction.transfer_to_credit_card_id);
    });
    logger.debug(`Транзакция удалена и балансы пересчитаны: id=${id}`);

    // Шаг 4: Уведомление через WebSocket
    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('transactionDeleted', { id });
        logger.debug(`Уведомление об удалении транзакции отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    // Шаг 5: Логирование успешного удаления
    logger.info(`Транзакция удалена пользователем ${req.user.id}: ID ${id}`);

    // Отправка ответа
    res.json({ message: 'Транзакция удалена', id });
  } catch (error) {
    logger.error(`Ошибка при удалении транзакции: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении транзакции', details: error.message });
  }
};

logger.debug('Контроллер transaction.js успешно инициализирован');
module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction };