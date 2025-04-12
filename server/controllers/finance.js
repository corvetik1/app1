const logger = require('../utils/logger'); // Импорт логгера для диагностики
const { getModels } = require('../config/sequelize'); // Импорт функции получения моделей

logger.debug('Инициализация контроллера finance.js');

// Контроллер для получения общего финансового обзора
const getFinancialOverview = async (req, res) => {
  logger.debug(`Получен запрос на получение финансового обзора для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { DebitCard, CreditCard, DolgTable, Loan, Transaction, TenderBudget } = models;
    logger.debug('Модели финансовых сущностей успешно получены');

    // Шаг 2: Формирование условий запроса
    logger.debug('Формирование условий запроса для финансового обзора');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    // Шаг 3: Получение данных по дебетовым картам
    logger.debug('Запрос данных по дебетовым картам');
    const debitCards = await DebitCard.findAll({ where: whereClause });
    const totalDebitBalance = debitCards.reduce((sum, card) => sum + parseFloat(card.balance), 0);
    logger.debug(`Общий баланс дебетовых карт: ${totalDebitBalance}`);

    // Шаг 4: Получение данных по кредитным картам
    logger.debug('Запрос данных по кредитным картам');
    const creditCards = await CreditCard.findAll({ where: whereClause });
    const totalCreditDebt = creditCards.reduce((sum, card) => sum + parseFloat(card.debt), 0);
    const totalCreditLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.credit_limit), 0);
    logger.debug(`Общий долг по кредитным картам: ${totalCreditDebt}, общий лимит: ${totalCreditLimit}`);

    // Шаг 5: Получение данных по долгам
    logger.debug('Запрос данных по долгам');
    const dolgTables = await DolgTable.findAll({ where: whereClause });
    const totalDebt = dolgTables.reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
    logger.debug(`Общий долг: ${totalDebt}`);

    // Шаг 6: Получение данных по займам
    logger.debug('Запрос данных по займам');
    const loans = await Loan.findAll({ where: whereClause });
    const totalLoanAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
    logger.debug(`Общая сумма займов: ${totalLoanAmount}`);

    // Шаг 7: Получение данных по транзакциям
    logger.debug('Запрос данных по транзакциям');
    const totalIncome = (await Transaction.sum('amount', { where: { ...whereClause, type: 'income' } })) || 0;
    const totalExpense = (await Transaction.sum('amount', { where: { ...whereClause, type: 'expense' } })) || 0;
    logger.debug(`Общий доход: ${totalIncome}, общий расход: ${totalExpense}`);

    // Шаг 8: Получение данных по бюджету тендеров
    logger.debug('Запрос данных по бюджету тендеров');
    const tenderBudget = await TenderBudget.findOne({ where: whereClause });
    const tenderBudgetAmount = tenderBudget ? parseFloat(tenderBudget.amount) : 0;
    logger.debug(`Бюджет тендеров: ${tenderBudgetAmount}`);

    // Шаг 9: Формирование финансового обзора
    logger.debug('Формирование итогового финансового обзора');
    const overview = {
      debitCards: {
        count: debitCards.length,
        totalBalance: totalDebitBalance,
      },
      creditCards: {
        count: creditCards.length,
        totalDebt: totalCreditDebt,
        totalLimit: totalCreditLimit,
        availableCredit: totalCreditLimit - totalCreditDebt,
      },
      debts: {
        count: dolgTables.length,
        totalAmount: totalDebt,
      },
      loans: {
        count: loans.length,
        totalAmount: totalLoanAmount,
      },
      transactions: {
        totalIncome,
        totalExpense,
        netCashFlow: totalIncome - totalExpense,
      },
      tenderBudget: {
        amount: tenderBudgetAmount,
      },
    };

    // Шаг 10: Логирование успешного получения
    logger.info(`Финансовый обзор сформирован для пользователя: ${req.user.id}`);

    // Отправка ответа
    res.json(overview);
  } catch (error) {
    logger.error(`Ошибка при получении финансового обзора: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении финансового обзора', details: error.message });
  }
};

logger.debug('Контроллер finance.js успешно инициализирован');
module.exports = { getFinancialOverview };