// C:\rezerv\app\server\models\debit_card.js
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const DebitCard = sequelize.define('DebitCard', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор дебетовой карты',
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
      comment: 'ID пользователя, владельца дебетовой карты',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Название карты обязательно' },
        len: { args: [1, 100], msg: 'Название должно быть от 1 до 100 символов' },
      },
      comment: 'Название дебетовой карты (например, "Тбанк", "Кубышка")',
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Баланс должен быть числом с двумя знаками после запятой' },
        notNull: { msg: 'Баланс обязателен' },
      },
      comment: 'Текущий баланс дебетовой карты (корректируется до 0, если отрицательный)',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
      },
      comment: 'Описание дебетовой карты (опционально)',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: { args: [['active', 'frozen', 'closed']], msg: 'Статус должен быть active, frozen или closed' },
      },
      comment: 'Статус дебетовой карты: active, frozen или closed',
    },
    card_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      validate: {
        len: { args: [0, 50], msg: 'Номер карты не должен превышать 50 символов' },
        is: { args: /^[0-9]*$/, msg: 'Номер карты должен содержать только цифры' }, // Добавлена валидация
      },
      comment: 'Уникальный номер дебетовой карты (например, банковский номер)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания дебетовой карты',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления дебетовой карты',
    },
  }, {
    tableName: 'debit_card',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeCreate: (debitCard) => {
        if (parseFloat(debitCard.balance) < 0) {
          debitCard.balance = 0;
          logger.info(`Баланс скорректирован до 0 перед созданием карты ${debitCard.name} для пользователя ${debitCard.user_id}`);
          debitCard.message = 'Баланс новой дебетовой карты скорректирован до 0';
        }
        logger.debug(`Подготовка к созданию дебетовой карты: ${debitCard.name} для пользователя ${debitCard.user_id}`);
      },
      beforeUpdate: (debitCard) => {
        if (parseFloat(debitCard.balance) < 0) {
          debitCard.balance = 0;
          logger.info(`Баланс скорректирован до 0 перед обновлением карты ${debitCard.name} (ID: ${debitCard.id})`);
          debitCard.message = 'Баланс дебетовой карты скорректирован до 0';
        }
        logger.debug(`Подготовка к обновлению дебетовой карты: ${debitCard.name} (ID: ${debitCard.id})`);
      },
      afterCreate: (debitCard) => {
        logger.info(`Создана дебетовая карта: ${debitCard.name} (ID: ${debitCard.id}) для пользователя ${debitCard.user_id}, баланс: ${debitCard.balance}`);
        if (!debitCard.message) {
          debitCard.message = `Дебетовая карта "${debitCard.name}" создана`;
        }
      },
      afterUpdate: (debitCard) => {
        logger.info(`Обновлена дебетовая карта: ${debitCard.name} (ID: ${debitCard.id}), новый баланс: ${debitCard.balance}`);
        if (!debitCard.message) {
          debitCard.message = `Дебетовая карта "${debitCard.name}" обновлена`;
        }
      },
    },
    indexes: [
      { fields: ['user_id'] },
      { unique: true, fields: ['card_number'] },
      { fields: ['status'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица дебетовых карт пользователей',
  });

  DebitCard.associate = (models) => {
    DebitCard.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, владельцем дебетовой карты',
    });
    DebitCard.hasMany(models.Transaction, {
      foreignKey: 'debit_card_id',
      as: 'Transactions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Связь с транзакциями, где эта карта является источником',
    });
    DebitCard.hasMany(models.Transaction, {
      foreignKey: 'transfer_to_debit_card_id',
      as: 'TransferTransactions',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Связь с транзакциями, где эта карта является получателем перевода',
    });
  };

  DebitCard.prototype.getFormattedBalance = function () {
    try {
      const balance = parseFloat(this.balance);
      if (isNaN(balance)) {
        logger.warn(`Некорректный баланс для карты ${this.id}: ${this.balance}`);
        return '0.00';
      }
      return balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (error) {
      logger.error(`Ошибка форматирования баланса для карты ${this.id}: ${error.message}, стек: ${error.stack}`);
      return '0.00';
    }
  };

  DebitCard.getActiveCards = async function (userId) {
    try {
      const cards = await this.findAll({
        where: { user_id: userId, status: 'active' },
        order: [['name', 'ASC']],
      });
      logger.info(`Найдено активных дебетовых карт для пользователя ${userId}: ${cards.length}`);
      return cards;
    } catch (error) {
      logger.error(`Ошибка поиска активных дебетовых карт для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  DebitCard.prototype.getSummary = async function () {
    try {
      logger.debug(`Получение summary для дебетовой карты ID ${this.id}, user_id: ${this.user_id}`);
      const user = await this.getUser();
      const summary = {
        id: this.id,
        name: this.name,
        balance: parseFloat(this.balance),
        status: this.status,
        owner: user ? user.username : 'Неизвестный пользователь',
        formattedBalance: this.getFormattedBalance(),
        notification: this.message ? { message: this.message, severity: 'info' } : undefined,
      };
      logger.info(`Сформирован summary для дебетовой карты ${this.id}: ${JSON.stringify(summary, null, 2)}`);
      return summary;
    } catch (error) {
      logger.error(`Ошибка получения краткого профиля дебетовой карты ${this.id}: ${error.message}, стек: ${error.stack}`);
      return {
        id: this.id,
        name: this.name,
        balance: 0,
        status: this.status,
        owner: null,
        formattedBalance: '0.00',
        error: 'Ошибка получения данных',
      };
    }
  };

  DebitCard.findByUserId = async function (userId) {
    try {
      const cards = await this.findAll({
        where: { user_id: userId, status: 'active' },
        order: [['created_at', 'DESC']],
      });
      logger.info(`Найдено дебетовых карт для пользователя ${userId}: ${cards.length}`);
      return cards;
    } catch (error) {
      logger.error(`Ошибка поиска дебетовых карт для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  DebitCard.getTotalBalance = async function (userId) {
    try {
      const debitCards = await this.findAll({
        where: { user_id: userId, status: 'active' },
      });
      const total = debitCards.reduce((sum, debitCard) => {
        const balance = parseFloat(debitCard.balance);
        return sum + (isNaN(balance) ? 0 : balance);
      }, 0);
      logger.info(`Общий баланс по дебетовым картам пользователя ${userId}: ${total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`);
      return total;
    } catch (error) {
      logger.error(`Ошибка подсчёта общего баланса по дебетовым картам пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      return 0;
    }
  };

  DebitCard.prototype.isSystemCard = function () {
    const systemNames = ['Тбанк', 'Кубышка'];
    const isSystem = systemNames.includes(this.name);
    if (isSystem) {
      logger.debug(`Карта ${this.name} (ID: ${this.id}) определена как системная`);
    }
    return isSystem;
  };

  return DebitCard;
};