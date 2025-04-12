const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  logger.debug('Инициализация модели TenderBudget начата', {
    timestamp: new Date().toISOString(),
  });

  const TenderBudget = sequelize.define('TenderBudget', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор записи бюджета тендеров',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // Добавлено для соответствия таблице
      references: {
        model: 'users',
        key: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      validate: {
        isInt: { msg: 'user_id должен быть целым числом' },
        notNull: { msg: 'user_id обязателен' },
      },
      comment: 'ID пользователя, которому принадлежит бюджет тендеров',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: { msg: 'Сумма бюджета должна быть числом с двумя знаками после запятой' },
        min: { args: 0, msg: 'Сумма бюджета не может быть отрицательной' },
        notNull: { msg: 'Сумма бюджета обязательна' },
      },
      comment: 'Сумма бюджета тендеров (в рублях)',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
        is: { args: /^[a-zA-Zа-яА-Я0-9\s.,!?()'"]*$/, msg: 'Описание содержит недопустимые символы' },
      },
      comment: 'Описание бюджета (до 255 символов)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания записи о бюджете',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления записи о бюджете',
    },
  }, {
    tableName: 'tender_budget',
    timestamps: true, // Включено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeValidate: (tenderBudget) => {
        logger.debug(`Валидация бюджета тендеров для пользователя ${tenderBudget.user_id}: ID ${tenderBudget.id || 'новый'}`, {
          amount: tenderBudget.amount,
        });
      },
      afterCreate: (tenderBudget) => {
        logger.info(`Создана запись бюджета тендеров для пользователя ${tenderBudget.user_id}: ID ${tenderBudget.id}, сумма: ${tenderBudget.amount} ₽`);
      },
      afterUpdate: (tenderBudget) => {
        logger.info(`Бюджет обновлён для пользователя ${tenderBudget.user_id}: ID ${tenderBudget.id}, новая сумма: ${tenderBudget.amount} ₽`);
      },
    },
    indexes: [
      { fields: ['user_id'], name: 'tender_budget_user_id' }, // Указан явный индекс с именем из таблицы
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица бюджета тендеров пользователей',
  });

  TenderBudget.associate = (models) => {
    logger.debug('Регистрация ассоциаций для TenderBudget');
    TenderBudget.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, которому принадлежит бюджет',
    });
  };

  TenderBudget.prototype.getFormattedAmount = function () {
    try {
      const amount = parseFloat(this.amount);
      if (isNaN(amount)) {
        logger.warn(`Некорректная сумма бюджета для ID ${this.id}: ${this.amount}`);
        return '0.00 ₽';
      }
      const formatted = `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
      logger.debug(`Форматирование суммы бюджета для ID ${this.id}: ${formatted}`);
      return formatted;
    } catch (error) {
      logger.error(`Ошибка форматирования суммы бюджета для ID ${this.id}: ${error.message}, стек: ${error.stack}`);
      return '0.00 ₽';
    }
  };

  TenderBudget.getLatest = async function (userId) {
    try {
      logger.debug(`Получение последней записи бюджета для пользователя ${userId || 'всех'}`);
      const budget = await TenderBudget.findOne({
        where: userId ? { user_id: userId } : {},
        order: [['id', 'DESC']],
      });
      if (budget) {
        logger.info(`Получена последняя запись бюджета для пользователя ${userId || 'всех'}: ID ${budget.id}, сумма: ${budget.amount} ₽`);
      } else {
        logger.warn(`Последняя запись бюджета не найдена для пользователя ${userId || 'всех'}`);
      }
      return budget;
    } catch (error) {
      logger.error(`Ошибка получения последней записи бюджета для пользователя ${userId || 'всех'}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  TenderBudget.getTotalAmount = async function (userId) {
    try {
      logger.debug(`Подсчёт общей суммы бюджета для пользователя ${userId || 'всех'}`);
      const result = await TenderBudget.sum('amount', {
        where: userId ? { user_id: userId } : {},
      });
      const total = result ? parseFloat(result.toFixed(2)) : 0;
      logger.info(`Общая сумма бюджета для пользователя ${userId || 'всех'}: ${total} ₽`);
      return total;
    } catch (error) {
      logger.error(`Ошибка подсчёта общей суммы бюджета для пользователя ${userId || 'всех'}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  TenderBudget.findAllBudgets = async function (userId) {
    try {
      logger.debug(`Поиск всех записей бюджета для пользователя ${userId || 'всех'}`);
      const budgets = await TenderBudget.findAll({
        where: userId ? { user_id: userId } : {},
        order: [['id', 'DESC']],
      });
      logger.info(`Найдено записей бюджета для пользователя ${userId || 'всех'}: ${budgets.length}`);
      return budgets;
    } catch (error) {
      logger.error(`Ошибка получения всех записей бюджета для пользователя ${userId || 'всех'}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  TenderBudget.prototype.isRecent = function () {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const isRecent = new Date(this.updated_at) >= oneMonthAgo;
    logger.debug(`Проверка актуальности бюджета ID ${this.id}: ${isRecent ? 'актуален' : 'устарел'}`);
    return isRecent;
  };

  logger.debug('Модель TenderBudget успешно инициализирована', {
    timestamp: new Date().toISOString(),
  });

  return TenderBudget;
};