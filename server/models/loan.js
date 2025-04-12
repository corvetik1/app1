const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const Loan = sequelize.define('Loan', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор займа',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: 'user_id должен быть целым числом' },
        notNull: { msg: 'user_id обязателен' },
      },
      comment: 'ID пользователя, взявшего заём',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Название займа обязательно' },
        len: { args: [1, 100], msg: 'Название должно быть от 1 до 100 символов' },
      },
      comment: 'Название займа (например, "Ипотека")',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Сумма должна быть числом с двумя знаками после запятой' },
        min: { args: 0.01, msg: 'Сумма займа должна быть больше 0' },
        notNull: { msg: 'Сумма займа обязательна' },
      },
      comment: 'Сумма займа',
    },
    interest_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        isDecimal: { msg: 'Процентная ставка должна быть числом с двумя знаками после запятой' },
        min: { args: 0, msg: 'Процентная ставка не может быть отрицательной' },
        max: { args: 100, msg: 'Процентная ставка не может превышать 100%' },
      },
      comment: 'Годовая процентная ставка по займу (может быть NULL)',
    },
    term: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: 'Срок должен быть целым числом' },
        min: { args: 1, msg: 'Срок должен быть не менее 1 месяца' },
        notNull: { msg: 'Срок займа обязателен' },
      },
      comment: 'Срок займа в месяцах',
    },
    monthly_payment: {
      type: DataTypes.VIRTUAL,
      get() {
        const amount = parseFloat(this.getDataValue('amount'));
        const rate = parseFloat(this.getDataValue('interest_rate')) / 100 / 12; // Месячная ставка
        const term = parseInt(this.getDataValue('term'));
        if (amount && rate >= 0 && term) {
          const monthlyPayment = (amount * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
          const result = isNaN(monthlyPayment) ? 0 : parseFloat(monthlyPayment.toFixed(2));
          logger.debug(`Вычислен monthly_payment для займа ${this.id || 'нового'}: ${result}`);
          return result;
        }
        logger.debug(`monthly_payment для займа ${this.id || 'нового'} не вычислен: недостаточно данных`);
        return 0;
      },
    },
    payment_due_day: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'День платежа должен быть целым числом' },
        min: { args: 1, msg: 'День платежа должен быть от 1' },
        max: { args: 31, msg: 'День платежа не может превышать 31' },
      },
      comment: 'День месяца для ежемесячного платежа',
    },
    is_paid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isIn: { args: [[0, 1]], msg: 'is_paid должен быть 0 или 1' },
      },
      comment: 'Статус оплаты: 0 - не оплачен полностью, 1 - оплачен',
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: 'Дата возврата должна быть валидной' },
      },
      comment: 'Дата полного возврата займа',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
      },
      comment: 'Описание займа (опционально)',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: { args: [['active', 'closed']], msg: 'Статус должен быть active или closed' },
      },
      comment: 'Статус займа: active, closed',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания записи о займе',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления записи о займе',
    },
  }, {
    tableName: 'loans',
    timestamps: true, // Включено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeCreate: (loan) => {
        if (!loan.due_date && loan.term) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + loan.term);
          if (loan.payment_due_day) {
            dueDate.setDate(loan.payment_due_day);
          }
          loan.due_date = dueDate;
          logger.debug(`Автоматически установлена due_date для займа ${loan.name}: ${loan.due_date}`);
          // Добавляем поле message для уведомления на фронтенде
          loan.message = `Дата возврата для займа "${loan.name}" установлена автоматически: ${loan.due_date.toLocaleDateString()}`;
        }
      },
      afterCreate: (loan) => {
        logger.info(`Создан заём: ${loan.name} (ID: ${loan.id}) для пользователя ${loan.user_id}`);
        // Устанавливаем сообщение по умолчанию, если не было автоматической установки due_date
        if (!loan.message) {
          loan.message = `Займ "${loan.name}" добавлен`;
        }
      },
      afterUpdate: (loan) => {
        logger.info(`Обновлён заём: ${loan.name} (ID: ${loan.id})`);
        // Добавляем поле message для уведомления на фронтенде
        loan.message = `Займ "${loan.name}" обновлён`;
      },
      afterDestroy: (loan) => {
        // Добавляем хук для удаления с уведомлением
        logger.info(`Удалён заём: ${loan.name} (ID: ${loan.id}) для пользователя ${loan.user_id}`);
        loan.message = `Займ "${loan.name}" удалён`;
      },
    },
    indexes: [
      { fields: ['user_id'] },
      { fields: ['is_paid'] },
      { fields: ['due_date'] },
      { fields: ['status'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица займов пользователей с расчётом платежей',
  });

  Loan.associate = (models) => {
    Loan.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, взявшим заём',
    });
    Loan.hasMany(models.Transaction, {
      foreignKey: 'loan_id',
      as: 'Transactions',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Связь с транзакциями, связанными с этим займом (например, платежи по займу)',
    });
  };

  Loan.prototype.isOverdue = function () {
    try {
      if (!this.is_paid && this.due_date) {
        const isOverdue = new Date() > new Date(this.due_date);
        logger.debug(`Проверка просрочки для займа ${this.id}: ${isOverdue ? 'просрочен' : 'не просрочен'}`);
        return isOverdue;
      }
      return false;
    } catch (error) {
      logger.error(`Ошибка проверки просрочки займа ${this.id}: ${error.message}`);
      return false;
    }
  };

  Loan.prototype.getSummary = async function () {
    try {
      logger.info(`Получение summary для займа ID ${this.id}, user_id: ${this.user_id}`);
      const user = await this.getUser();
      const summary = {
        id: this.id,
        name: this.name,
        amount: parseFloat(this.amount),
        monthly_payment: this.monthly_payment,
        interest_rate: this.interest_rate ? parseFloat(this.interest_rate) : null,
        term: this.term,
        due_date: this.due_date,
        is_paid: this.is_paid,
        is_overdue: this.isOverdue(),
        status: this.status,
        description: this.description,
        owner: user ? user.username : 'Неизвестный пользователь',
        // Добавляем сообщение из хука, если оно есть
        notification: this.message ? { message: this.message, severity: 'info' } : undefined,
      };
      logger.info(`Сформирован summary для займа ${this.id}`);
      return summary;
    } catch (error) {
      logger.error(`Ошибка получения краткого описания займа ${this.id}: ${error.message}, стек: ${error.stack}`);
      return {
        id: this.id,
        name: this.name,
        amount: parseFloat(this.amount),
        monthly_payment: 0,
        interest_rate: null,
        term: this.term,
        due_date: this.due_date,
        is_paid: this.is_paid,
        is_overdue: false,
        status: this.status,
        description: this.description,
        owner: null,
        error: 'Ошибка получения данных',
      };
    }
  };

  Loan.getActiveLoansByUser = async function (userId) {
    try {
      const loans = await this.findAll({
        where: {
          user_id: userId,
          status: 'active',
          is_paid: 0,
          due_date: { [sequelize.Op.gte]: new Date() },
        },
        order: [['created_at', 'ASC']],
      });
      logger.info(`Найдено активных займов для пользователя ${userId}: ${loans.length}`);
      // Добавляем сообщение в результат
      return loans.length > 0
        ? { loans, message: `Найдено ${loans.length} активных займов для пользователя ${userId}` }
        : { loans, message: `Активные займы для пользователя ${userId} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка получения активных займов пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  Loan.getOverdueLoans = async function (userId = null) {
    try {
      const where = {
        is_paid: 0,
        status: 'active',
        due_date: { [sequelize.Op.lt]: new Date() },
      };
      if (userId !== null) {
        where.user_id = userId;
      }
      const loans = await this.findAll({
        where,
        order: [['due_date', 'ASC']],
      });
      logger.info(`Найдено просроченных займов${userId ? ` для пользователя ${userId}` : ''}: ${loans.length}`);
      // Добавляем сообщение в результат
      return loans.length > 0
        ? { loans, message: `Найдено ${loans.length} просроченных займов${userId ? ` для пользователя ${userId}` : ''}` }
        : { loans, message: `Просроченные займы${userId ? ` для пользователя ${userId}` : ''} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка получения просроченных займов: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  Loan.prototype.getFormattedAmount = function () {
    try {
      const amount = parseFloat(this.amount);
      if (isNaN(amount)) {
        logger.warn(`Некорректная сумма для займа ${this.id}: ${this.amount}`);
        return '0.00 RUB';
      }
      return `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUB`;
    } catch (error) {
      logger.error(`Ошибка форматирования суммы для займа ${this.id}: ${error.message}`);
      return '0.00 RUB';
    }
  };

  Loan.prototype.getTotalPayment = function () {
    try {
      const monthlyPayment = this.monthly_payment;
      const term = this.term;
      if (monthlyPayment && term) {
        const total = monthlyPayment * term;
        return parseFloat(total.toFixed(2));
      }
      logger.warn(`Невозможно рассчитать общую сумму для займа ${this.id}: отсутствует monthly_payment или term`);
      return 0;
    } catch (error) {
      logger.error(`Ошибка расчёта общей суммы выплат для займа ${this.id}: ${error.message}`);
      return 0;
    }
  };

  return Loan;
};