const logger = require('../utils/logger'); // Импорт логгера для диагностики
const { getModels } = require('../config/sequelize'); // Импорт функции получения моделей

logger.debug('Инициализация контроллера analytics.js');

// Контроллер для получения аналитики транзакций
const getTransactionsAnalytics = async (req, res) => {
  logger.debug(`Получен запрос на аналитику транзакций для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    // Шаг 1: Получение моделей
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Transaction, CreditCard, DebitCard, sequelize } = models;
    logger.debug('Модели Transaction, CreditCard, DebitCard и sequelize успешно получены');

    // Шаг 2: Формирование условий запроса
    logger.debug('Формирование условий запроса для аналитики');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    const analytics = {};

    // Шаг 3: Подсчет общего количества транзакций
    logger.debug('Подсчет общего количества транзакций');
    analytics.totalTransactions = await Transaction.count({ where: whereClause });
    logger.debug(`Общее количество транзакций: ${analytics.totalTransactions}`);

    // Шаг 4: Подсчет транзакций по типам
    logger.debug('Подсчет транзакций по типам');
    analytics.transactionsByType = await Transaction.findAll({
      where: whereClause,
      attributes: ['type', [sequelize.fn('COUNT', sequelize.col('type')), 'count']],
      group: ['type'],
    });
    logger.debug(`Транзакции по типам подсчитаны: ${analytics.transactionsByType.length} типов`);

    // Шаг 5: Подсчет общего дохода
    logger.debug('Подсчет общего дохода');
    analytics.totalIncome = (await Transaction.sum('amount', { where: { ...whereClause, type: 'income' } })) || 0;
    logger.debug(`Общий доход: ${analytics.totalIncome}`);

    // Шаг 6: Подсчет общего расхода
    logger.debug('Подсчет общего расхода');
    analytics.totalExpense = (await Transaction.sum('amount', { where: { ...whereClause, type: 'expense' } })) || 0;
    logger.debug(`Общий расход: ${analytics.totalExpense}`);

    // Шаг 7: Подсчет транзакций по категориям
    logger.debug('Подсчет транзакций по категориям');
    analytics.transactionsByCategory = await Transaction.findAll({
      where: whereClause,
      attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
      group: ['category'],
    });
    logger.debug(`Транзакции по категориям подсчитаны: ${analytics.transactionsByCategory.length} категорий`);

    // Шаг 8: Подсчет транзакций по месяцам
    logger.debug('Подсчет транзакций по месяцам');
    analytics.transactionsByMonth = await Transaction.findAll({
      where: whereClause,
      attributes: [[sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'month'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m')],
    });
    logger.debug(`Транзакции по месяцам подсчитаны: ${analytics.transactionsByMonth.length} месяцев`);

    // Шаг 9: Подсчет среднего значения транзакций
    logger.debug('Подсчет среднего значения транзакций');
    analytics.averageTransactionAmount = (await Transaction.avg('amount', { where: whereClause })) || 0;
    logger.debug(`Среднее значение транзакций: ${analytics.averageTransactionAmount}`);

    // Шаг 10: Получение топ-5 транзакций
    logger.debug('Получение топ-5 транзакций');
    analytics.topTransactions = await Transaction.findAll({
      where: whereClause,
      order: [['amount', 'DESC']],
      limit: 5,
      include: [
        { model: CreditCard, as: 'CreditCard', attributes: ['name'] },
        { model: DebitCard, as: 'DebitCard', attributes: ['name'] },
      ],
    });
    logger.debug(`Топ-5 транзакций получено: ${analytics.topTransactions.length} записей`);

    // Шаг 11: Логирование успешного завершения
    logger.info(`Аналитика транзакций сформирована для пользователя: ${req.user.id}`);

    // Отправка ответа
    res.json(analytics);
  } catch (error) {
    logger.error(`Ошибка при получении аналитики транзакций: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении аналитики транзакций', details: error.message });
  }
};

logger.debug('Контроллер analytics.js успешно инициализирован');
module.exports = { getTransactionsAnalytics };