const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Уникальный идентификатор транзакции (UUID)',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: 'user_id должен быть целым числом' },
        notNull: { msg: 'user_id обязателен' },
      },
      comment: 'ID пользователя, создавшего транзакцию',
    },
    credit_card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'credit_card_id должен быть целым числом' },
      },
      comment: 'ID кредитной карты, с которой выполняется транзакция (если применимо)',
    },
    debit_card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'debit_card_id должен быть целым числом' },
      },
      comment: 'ID дебетовой карты, с которой выполняется транзакция (если применимо)',
    },
    dolg_table_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'dolg_table_id должен быть целым числом' },
      },
      comment: 'ID долга из таблицы dolg_table, с которым связана транзакция (если применимо)',
    },
    loan_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'loan_id должен быть целым числом' },
      },
      comment: 'ID займа, с которым связана транзакция (если применимо)',
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: { args: [['income', 'expense', 'transfer']], msg: 'Тип транзакции должен быть income, expense или transfer' },
        notEmpty: { msg: 'Тип транзакции обязателен' },
      },
      comment: 'Тип транзакции: income (доход), expense (расход) или transfer (перевод)',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Сумма должна быть числом с двумя знаками после запятой' },
        min: { args: 0.01, msg: 'Сумма должна быть больше 0' },
        notNull: { msg: 'Сумма обязательна' },
      },
      comment: 'Сумма транзакции с точностью до 2 знаков (в валюте)',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
      },
      comment: 'Описание транзакции (опционально, до 255 символов)',
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: { args: [0, 50], msg: 'Категория не должна превышать 50 символов' },
      },
      comment: 'Категория транзакции (опционально, до 50 символов)',
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'Дата должна быть валидной' },
        notNull: { msg: 'Дата обязательна' },
      },
      comment: 'Дата проведения транзакции',
    },
    transfer_to_credit_card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      field: 'transfer_to_credit_card_id',
      validate: {
        isInt: { msg: 'transfer_to_credit_card_id должен быть целым числом' },
      },
      comment: 'ID кредитной карты-получателя для транзакций типа transfer (если применимо)',
    },
    transfer_to_debit_card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      field: 'transfer_to_debit_card_id',
      validate: {
        isInt: { msg: 'transfer_to_debit_card_id должен быть целым числом' },
      },
      comment: 'ID дебетовой карты-получателя для транзакций типа transfer (если применимо)',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'completed',
      validate: {
        isIn: { args: [['pending', 'completed', 'failed']], msg: 'Статус должен быть pending, completed или failed' },
        notNull: { msg: 'Статус обязателен' },
      },
      comment: 'Статус транзакции: pending (в ожидании), completed (выполнена), failed (ошибка)',
    },
    reference_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        len: { args: [0, 100], msg: 'reference_id не должен превышать 100 символов' },
      },
      comment: 'Внешний идентификатор транзакции (например, от платёжной системы), уникален',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания записи о транзакции',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления записи о транзакции',
    },
  }, {
    tableName: 'transactions',
    timestamps: true, // Оставлено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeValidate: (transaction, options) => {
        logger.info(`BeforeValidate: Проверка данных транзакции: ${JSON.stringify(transaction.dataValues)}`);
        if (!transaction.date) {
          transaction.date = new Date();
          logger.info(`Дата не указана, установлена текущая: ${transaction.date}`);
          // Добавляем поле message для уведомления на фронтенде
          transaction.message = `Дата транзакции установлена автоматически: ${transaction.date.toLocaleString()}`;
        }
        if (!transaction.credit_card_id && !transaction.debit_card_id && !transaction.dolg_table_id && !transaction.loan_id) {
          logger.error('Не указан ни один из идентификаторов: credit_card_id, debit_card_id, dolg_table_id или loan_id');
          throw new Error('Необходимо указать хотя бы один из: credit_card_id, debit_card_id, dolg_table_id или loan_id');
        }
        if (transaction.type === 'transfer' && !transaction.transfer_to_credit_card_id && !transaction.transfer_to_debit_card_id) {
          logger.error('Для transfer обязателен transfer_to_credit_card_id или transfer_to_debit_card_id');
          throw new Error('Для транзакции типа "transfer" обязателен transfer_to_credit_card_id или transfer_to_debit_card_id');
        }
        if (transaction.type !== 'transfer' && (transaction.transfer_to_credit_card_id || transaction.transfer_to_debit_card_id)) {
          logger.error('transfer_to_credit_card_id и transfer_to_debit_card_id должны быть null для типов, отличных от "transfer"');
          throw new Error('transfer_to_credit_card_id и transfer_to_debit_card_id должны быть null для типов, отличных от "transfer"');
        }
      },
      afterCreate: (transaction) => {
        logger.info(`AfterCreate: Транзакция создана: ID ${transaction.id}, тип: ${transaction.type}, сумма: ${transaction.amount}, debit_card_id: ${transaction.debit_card_id}, credit_card_id: ${transaction.credit_card_id}`);
        // Устанавливаем сообщение по умолчанию, если не было автоматической установки даты
        if (!transaction.message) {
          transaction.message = `Транзакция "${transaction.type}" на сумму ${transaction.amount} ₽ создана`;
        }
      },
      afterUpdate: (transaction) => {
        logger.info(`AfterUpdate: Транзакция обновлена: ID ${transaction.id}, статус: ${transaction.status}`);
        // Добавляем поле message для уведомления на фронтенде
        transaction.message = `Транзакция "${transaction.type}" (ID: ${transaction.id}) обновлена, статус: ${transaction.status}`;
      },
      afterDestroy: (transaction) => {
        // Добавляем хук для удаления с уведомлением
        logger.info(`AfterDestroy: Транзакция удалена: ID ${transaction.id}, тип: ${transaction.type}, сумма: ${transaction.amount}`);
        transaction.message = `Транзакция "${transaction.type}" (ID: ${transaction.id}) на сумму ${transaction.amount} ₽ удалена`;
      },
    },
    indexes: [
      { fields: ['user_id'] },
      { fields: ['credit_card_id'] },
      { fields: ['debit_card_id'] },
      { fields: ['dolg_table_id'] },
      { fields: ['loan_id'] },
      { fields: ['date'] },
      { unique: true, fields: ['reference_id'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица транзакций с финансовыми операциями пользователей',
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, создавшим транзакцию',
    });
    Transaction.belongsTo(models.CreditCard, {
      foreignKey: 'credit_card_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'CreditCard',
      comment: 'Связь с исходной кредитной картой',
    });
    Transaction.belongsTo(models.DebitCard, {
      foreignKey: 'debit_card_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'DebitCard',
      comment: 'Связь с исходной дебетовой картой',
    });
    Transaction.belongsTo(models.DolgTable, {
      foreignKey: 'dolg_table_id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      as: 'Dolg',
      comment: 'Связь с долгом из таблицы dolg_table, если транзакция связана с долгом',
    });
    Transaction.belongsTo(models.Loan, {
      foreignKey: 'loan_id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      as: 'Loan',
      comment: 'Связь с займом, если транзакция связана с займом',
    });
    Transaction.belongsTo(models.CreditCard, {
      foreignKey: 'transfer_to_credit_card_id',
      targetKey: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      as: 'TransferToCreditCard',
      comment: 'Связь с кредитной картой-получателем для переводов',
    });
    Transaction.belongsTo(models.DebitCard, {
      foreignKey: 'transfer_to_debit_card_id',
      targetKey: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      as: 'TransferToDebitCard',
      comment: 'Связь с дебетовой картой-получателем для переводов',
    });
  };

  Transaction.prototype.getBalanceImpact = function () {
    if (this.type === 'income') return parseFloat(this.amount);
    if (this.type === 'expense') return -parseFloat(this.amount);
    return 0;
  };

  Transaction.prototype.getFormattedAmount = function () {
    const amount = parseFloat(this.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${this.type === 'expense' ? '-' : ''}${amount} ₽`;
  };

  Transaction.getByStatus = async function (status, userId) {
    try {
      const transactions = await this.findAll({
        where: { status, user_id: userId },
        order: [['date', 'DESC']],
      });
      logger.debug(`Найдено транзакций со статусом "${status}" для пользователя ${userId}: ${transactions.length}`);
      // Добавляем сообщение в результат
      return transactions.length > 0
        ? { transactions, message: `Найдено ${transactions.length} транзакций со статусом "${status}" для пользователя ${userId}` }
        : { transactions, message: `Транзакции со статусом "${status}" для пользователя ${userId} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка получения транзакций со статусом ${status} для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  Transaction.getTotalByType = async function (type, userId) {
    try {
      const result = await this.sum('amount', {
        where: { type, user_id: userId, status: 'completed' },
      });
      const total = result ? parseFloat(result.toFixed(2)) : 0;
      logger.debug(`Подсчитана сумма для типа "${type}" пользователя ${userId}: ${total} ₽`);
      // Добавляем сообщение в результат
      return {
        total,
        message: total > 0
          ? `Общая сумма транзакций типа "${type}" для пользователя ${userId}: ${total} ₽`
          : `Транзакции типа "${type}" для пользователя ${userId} отсутствуют или их сумма равна 0`,
      };
    } catch (error) {
      logger.error(`Ошибка подсчёта суммы для типа ${type} пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  Transaction.getByDateRange = async function (userId, startDate, endDate) {
    try {
      const transactions = await this.findAll({
        where: {
          user_id: userId,
          date: {
            [sequelize.Op.between]: [startDate, endDate],
          },
        },
        order: [['date', 'ASC']],
      });
      logger.debug(`Найдено транзакций за период ${startDate} - ${endDate} для пользователя ${userId}: ${transactions.length}`);
      // Добавляем сообщение в результат
      return transactions.length > 0
        ? { transactions, message: `Найдено ${transactions.length} транзакций за период ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` }
        : { transactions, message: `Транзакции за период ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка получения транзакций за период ${startDate} - ${endDate} для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  Transaction.prototype.isRecent = function () {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(this.date) >= oneMonthAgo;
  };

  Transaction.getNetBalance = async function (userId, creditCardId = null, debitCardId = null, dolgTableId = null, loanId = null) {
    try {
      const where = { user_id: userId, status: 'completed' };
      if (creditCardId !== null) where.credit_card_id = creditCardId;
      if (debitCardId !== null) where.debit_card_id = debitCardId;
      if (dolgTableId !== null) where.dolg_table_id = dolgTableId;
      if (loanId !== null) where.loan_id = loanId;
      const incomes = (await this.sum('amount', { where: { ...where, type: 'income' } })) || 0;
      const expenses = (await this.sum('amount', { where: { ...where, type: 'expense' } })) || 0;
      const netBalance = parseFloat((incomes - expenses).toFixed(2));
      logger.debug(`Подсчитан чистый баланс для пользователя ${userId}: ${netBalance} ₽`);
      // Добавляем сообщение в результат
      return {
        netBalance,
        message: `Чистый баланс для пользователя ${userId}: ${netBalance} ₽ (доходы: ${incomes}, расходы: ${expenses})`,
      };
    } catch (error) {
      logger.error(`Ошибка подсчёта чистого баланса для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  return Transaction;
};