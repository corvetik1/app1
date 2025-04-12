// C:\rezerv\app\server\models\credit_card.js
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const CreditCard = sequelize.define('CreditCard', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор кредитной карты',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      validate: {
        isInt: { msg: 'user_id должен быть целым числом' },
        notNull: { msg: 'user_id обязателен' },
      },
      comment: 'ID пользователя, владельца кредитной карты',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Название кредитной карты обязательно' },
        len: { args: [1, 100], msg: 'Название должно быть от 1 до 100 символов' },
      },
      comment: 'Название кредитной карты',
    },
    credit_limit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isNumeric: { msg: 'Кредитный лимит должен быть числом' },
        min: { args: 0, msg: 'Кредитный лимит не может быть отрицательным' },
        notNull: { msg: 'Кредитный лимит обязателен' },
      },
      comment: 'Кредитный лимит карты',
    },
    debt: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false,
      validate: {
        isNumeric: { msg: 'Долг должен быть числом' },
        min: { args: 0, msg: 'Долг не может быть отрицательным' },
      },
      comment: 'Текущая задолженность по кредитной карте',
    },
    grace_period: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'Льготный период должен быть целым числом' },
        min: { args: 0, msg: 'Льготный период не может быть отрицательным' },
      },
      comment: 'Льготный период в днях',
    },
    min_payment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        isDecimal: { msg: 'Минимальный платёж должен быть числом с двумя знаками после запятой' },
        min: { args: 0, msg: 'Минимальный платёж не может быть отрицательным' },
      },
      comment: 'Минимальный обязательный платёж',
    },
    payment_due_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: 'Дата платежа должна быть валидной' },
      },
      comment: 'Дата следующего обязательного платежа',
    },
    monthly_payment: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: true,
      validate: {
        isDecimal: { msg: 'Ежемесячный платёж должен быть числом с двумя знаками после запятой' },
        min: { args: 0, msg: 'Ежемесячный платёж не может быть отрицательным' },
      },
      comment: 'Ежемесячный платёж',
    },
    is_paid: {
      type: DataTypes.BOOLEAN, // Исправлено на BOOLEAN
      defaultValue: false,
      allowNull: false,
      comment: 'Статус оплаты: false - не оплачен, true - оплачен',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
      },
      comment: 'Описание кредитной карты (опционально)',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: { args: [['active', 'frozen', 'closed']], msg: 'Статус должен быть active, frozen или closed' },
      },
      comment: 'Статус кредитной карты: active, frozen или closed',
    },
    account_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      validate: {
        len: { args: [0, 50], msg: 'Номер карты не должен превышать 50 символов' },
        is: { args: /^[0-9]*$/, msg: 'Номер карты должен содержать только цифры' }, // Добавлена валидация
      },
      comment: 'Уникальный номер кредитной карты',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания кредитной карты',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления кредитной карты',
    },
  }, {
    tableName: 'credit_card',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeCreate: (creditCard) => {
        if (creditCard.debt > creditCard.credit_limit) {
          logger.warn(`Долг (${creditCard.debt}) превышает лимит (${creditCard.credit_limit}) для карты ${creditCard.name} (ID: ${creditCard.id || 'новая'})`);
          throw new Error('Долг не может превышать лимит для кредитной карты');
        }
      },
      beforeUpdate: (creditCard) => {
        if (creditCard.debt > creditCard.credit_limit) {
          logger.warn(`Долг (${creditCard.debt}) превышает лимит (${creditCard.credit_limit}) для карты ${creditCard.name} (ID: ${creditCard.id})`);
          throw new Error('Долг не может превышать лимит для кредитной карты');
        }
      },
      beforeValidate: (creditCard) => {
        if (!creditCard.payment_due_date && creditCard.monthly_payment > 0) {
          creditCard.payment_due_date = new Date(new Date().setDate(new Date().getDate() + 30));
          logger.info(`Установлена дата платежа по умолчанию для карты ${creditCard.name} (ID: ${creditCard.id || 'новая'}): ${creditCard.payment_due_date}`);
        }
      },
      afterCreate: (creditCard) => {
        logger.info(`Создана кредитная карта: ${creditCard.name} (ID: ${creditCard.id}) для пользователя ${creditCard.user_id}`);
      },
      afterUpdate: (creditCard) => {
        logger.info(`Обновлена кредитная карта: ${creditCard.name} (ID: ${creditCard.id})`);
      },
    },
    indexes: [
      { fields: ['user_id'] },
      { unique: true, fields: ['account_number'] },
      { fields: ['status'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица кредитных карт пользователей с финансовыми параметрами',
  });

  CreditCard.associate = (models) => {
    CreditCard.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, владельцем карты',
    });
    CreditCard.hasMany(models.Transaction, {
      foreignKey: 'credit_card_id',
      as: 'Transactions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Связь с транзакциями, где эта карта является источником',
    });
    CreditCard.hasMany(models.Transaction, {
      foreignKey: 'transfer_to_credit_card_id',
      as: 'TransferTransactions',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Связь с транзакциями, где эта карта является получателем перевода',
    });
  };

  CreditCard.prototype.getAvailableCredit = function () {
    try {
      const available = parseFloat(this.credit_limit) - parseFloat(this.debt);
      return isNaN(available) ? 0 : available;
    } catch (error) {
      logger.error(`Ошибка расчёта доступного лимита для карты ${this.id}: ${error.message}`);
      return 0;
    }
  };

  CreditCard.getActiveCards = async function (userId) {
    try {
      const cards = await this.findAll({
        where: { user_id: userId, status: 'active' },
        order: [['name', 'ASC']],
      });
      logger.info(`Найдено активных кредитных карт для пользователя ${userId}: ${cards.length}`);
      return cards;
    } catch (error) {
      logger.error(`Ошибка поиска активных кредитных карт для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  CreditCard.prototype.isPaymentOverdue = function () {
    try {
      if (this.payment_due_date && !this.is_paid) {
        const isOverdue = new Date() > new Date(this.payment_due_date);
        logger.debug(`Проверка просрочки для карты ${this.id}: ${isOverdue ? 'просрочена' : 'не просрочена'}`);
        return isOverdue;
      }
      return false;
    } catch (error) {
      logger.error(`Ошибка проверки просрочки платежа для карты ${this.id}: ${error.message}`);
      return false;
    }
  };

  CreditCard.prototype.getSummary = async function () {
    try {
      logger.info(`Получение summary для карты ID ${this.id}, user_id: ${this.user_id}`);
      const user = await this.getUser();
      const summary = {
        id: this.id,
        name: this.name,
        credit_limit: parseFloat(this.credit_limit),
        debt: parseFloat(this.debt),
        available_credit: this.getAvailableCredit(),
        status: this.status,
        owner: user ? user.username : 'Неизвестный пользователь',
        payment_due_date: this.payment_due_date,
        is_payment_overdue: this.isPaymentOverdue(),
      };
      logger.info(`Сформирован summary для карты ${this.id}`);
      return summary;
    } catch (error) {
      logger.error(`Ошибка получения краткого профиля карты ${this.id}: ${error.message}, стек: ${error.stack}`);
      return {
        id: this.id,
        name: this.name,
        credit_limit: parseFloat(this.credit_limit),
        debt: parseFloat(this.debt),
        available_credit: 0,
        status: this.status,
        owner: null,
        payment_due_date: this.payment_due_date,
        is_payment_overdue: false,
        error: 'Ошибка получения данных',
      };
    }
  };

  CreditCard.findByUserId = async function (userId) {
    try {
      const cards = await this.findAll({
        where: { user_id: userId, status: 'active' },
        order: [['created_at', 'DESC']],
      });
      logger.info(`Найдено кредитных карт для пользователя ${userId}: ${cards.length}`);
      return cards;
    } catch (error) {
      logger.error(`Ошибка поиска кредитных карт для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  CreditCard.prototype.getFormattedCreditLimit = function () {
    try {
      const limit = parseFloat(this.credit_limit);
      if (isNaN(limit)) {
        logger.warn(`Некорректный лимит для карты ${this.id}: ${this.credit_limit}`);
        return '0.00';
      }
      return limit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (error) {
      logger.error(`Ошибка форматирования лимита для карты ${this.id}: ${error.message}`);
      return '0.00';
    }
  };

  CreditCard.getTotalDebt = async function (userId) {
    try {
      const cards = await this.findAll({
        where: { user_id: userId, status: 'active' },
      });
      const total = cards.reduce((sum, card) => sum + parseFloat(card.debt), 0);
      logger.info(`Общий долг по кредитным картам для пользователя ${userId}: ${total}`);
      return total;
    } catch (error) {
      logger.error(`Ошибка подсчёта общего долга для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      return 0;
    }
  };

  return CreditCard;
};