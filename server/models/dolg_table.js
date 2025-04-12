// C:\rezerv\app\server\models\dolg_table.js
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  logger.debug('Инициализация модели DolgTable начата', {
    timestamp: new Date().toISOString(),
  });

  const DolgTable = sequelize.define('DolgTable', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор долга',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Название долга обязательно' },
        len: { args: [1, 100], msg: 'Название должно быть от 1 до 100 символов' },
      },
      comment: 'Название долга (например, "Кредит на машину")',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Сумма долга должна быть числом с двумя знаками после запятой' },
        min: { args: 0, msg: 'Сумма долга не может быть отрицательной' },
        notNull: { msg: 'Сумма долга обязательна' },
      },
      comment: 'Сумма текущего платежа по долгу (в рублях)',
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: { msg: 'Дата платежа должна быть валидной' },
        notNull: { msg: 'Дата платежа обязательна' },
      },
      comment: 'Дата, к которой долг должен быть погашен',
    },
    total_debt: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: { msg: 'Общая сумма долга должна быть числом с двумя знаками после запятой' },
        min: { args: 0, msg: 'Общая сумма долга не может быть отрицательной' },
      },
      comment: 'Общая сумма долга (включая проценты, если применимо)',
    },
    is_paid: {
      type: DataTypes.BOOLEAN, // Исправлено на BOOLEAN
      allowNull: false,
      defaultValue: false,
      comment: 'Статус оплаты: false - не оплачен, true - оплачен',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: 'user_id должен быть целым числом' },
        notNull: { msg: 'user_id обязателен' },
      },
      comment: 'ID пользователя, которому принадлежит долг',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания записи о долге',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления записи о долге',
    },
  }, {
    tableName: 'dolg_table',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeCreate: (dolg) => {
        if (dolg.amount > dolg.total_debt) {
          logger.warn(`Текущий платёж (${dolg.amount}) превышает общую сумму долга (${dolg.total_debt}) для ${dolg.name}`);
          throw new Error('Текущий платёж не может превышать общую сумму долга');
        }
        logger.debug(`Создание долга: ${dolg.name}, user_id: ${dolg.user_id}`);
      },
      beforeUpdate: (dolg) => {
        if (dolg.amount > dolg.total_debt) {
          logger.warn(`Текущий платёж (${dolg.amount}) превышает общую сумму долга (${dolg.total_debt}) для ${dolg.name} при обновлении`);
          throw new Error('Текущий платёж не может превышать общую сумму долга');
        }
        logger.debug(`Обновление долга: ${dolg.name}, user_id: ${dolg.user_id}`);
      },
      afterCreate: (dolg) => {
        logger.info(`Создан долг: ${dolg.name} (ID: ${dolg.id}) для пользователя ${dolg.user_id}, сумма: ${dolg.amount}, общий долг: ${dolg.total_debt}`);
        dolg.message = `Долг "${dolg.name}" добавлен`;
      },
      afterUpdate: (dolg) => {
        logger.info(`Обновлён долг: ${dolg.name} (ID: ${dolg.id}) для пользователя ${dolg.user_id}, сумма: ${dolg.amount}, общий долг: ${dolg.total_debt}`);
        dolg.message = `Долг "${dolg.name}" обновлён`;
      },
      afterDestroy: (dolg) => {
        logger.info(`Удалён долг: ${dolg.name} (ID: ${dolg.id}) для пользователя ${dolg.user_id}`);
        dolg.message = `Долг "${dolg.name}" удалён`;
      },
    },
    indexes: [
      { fields: ['is_paid'] },
      { fields: ['due_date'] },
      { fields: ['user_id'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица долгов пользователей',
  });

  DolgTable.associate = (models) => {
    DolgTable.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, которому принадлежит долг',
    });
    logger.debug('Ассоциация DolgTable с User установлена');
  };

  DolgTable.prototype.isOverdue = function () {
    const overdue = !this.is_paid && new Date() > new Date(this.due_date);
    logger.debug(`Проверка просрочки для долга ID ${this.id}: ${overdue ? 'просрочен' : 'не просрочен'}`);
    return overdue;
  };

  DolgTable.prototype.getSummary = function () {
    const summary = {
      id: this.id,
      name: this.name,
      amount: parseFloat(this.amount),
      total_debt: parseFloat(this.total_debt),
      due_date: this.due_date,
      is_paid: this.is_paid,
      is_overdue: this.isOverdue(),
      notification: this.message ? { message: this.message, severity: 'info' } : undefined,
    };
    logger.debug(`Сформирован краткий отчёт для долга ID ${this.id}: ${JSON.stringify(summary)}`);
    return summary;
  };

  DolgTable.getOverdueDebts = async function () {
    try {
      logger.debug('Получение всех просроченных долгов');
      const debts = await this.findAll({
        where: {
          is_paid: false,
          due_date: { [sequelize.Op.lt]: new Date() },
        },
        order: [['due_date', 'ASC']],
      });
      logger.info(`Найдено просроченных долгов: ${debts.length}`);
      return debts.length > 0
        ? { debts, message: `Найдено ${debts.length} просроченных долгов` }
        : { debts, message: 'Просроченные долги отсутствуют' };
    } catch (error) {
      logger.error(`Ошибка получения просроченных долгов: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения просроченных долгов: ${error.message}`);
    }
  };

  DolgTable.findByUserId = async function (userId) {
    try {
      logger.debug(`Поиск долгов для пользователя user_id: ${userId}`);
      const debts = await this.findAll({
        where: { user_id: userId },
        order: [['due_date', 'ASC']],
      });
      logger.info(`Найдено долгов для пользователя ${userId}: ${debts.length}`);
      return debts.length > 0
        ? { debts, message: `Найдено ${debts.length} долгов для пользователя ${userId}` }
        : { debts, message: `Долги для пользователя ${userId} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка поиска долгов пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска долгов пользователя ${userId}: ${error.message}`);
    }
  };

  DolgTable.prototype.getFormattedAmount = function () {
    const formatted = `${parseFloat(this.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUB`;
    logger.debug(`Форматирование суммы для долга ID ${this.id}: ${formatted}`);
    return formatted;
  };

  DolgTable.getTotalDebtByUser = async function (userId) {
    try {
      logger.debug(`Подсчёт общей суммы долгов для пользователя user_id: ${userId}`);
      const result = await this.sum('total_debt', {
        where: { user_id: userId, is_paid: false },
      });
      const total = result ? parseFloat(result.toFixed(2)) : 0;
      logger.info(`Общая сумма долгов для пользователя ${userId}: ${total} RUB`);
      return {
        total,
        message: total > 0
          ? `Общая сумма долгов для пользователя ${userId}: ${total} RUB`
          : `У пользователя ${userId} нет непогашенных долгов`,
      };
    } catch (error) {
      logger.error(`Ошибка подсчёта общей суммы долгов пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка подсчёта общей суммы долгов пользователя ${userId}: ${error.message}`);
    }
  };

  logger.debug('Модель DolgTable успешно инициализирована', {
    timestamp: new Date().toISOString(),
  });

  return DolgTable;
};