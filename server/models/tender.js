const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  logger.debug('Инициализация модели Tender');

  const Tender = sequelize.define('Tender', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор тендера',
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
      comment: 'Идентификатор пользователя, связанного с тендером',
    },
    stage: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Подал ИП',
      validate: {
        isIn: { 
          args: [[
            'В работе ИП', 'В работе ТА', 'Исполнение ТА', 'Исполнено ИП', 'Исполнено ТА',
            'Нулевые закупки', 'Ожидание оплаты ИП', 'Ожидание оплаты ТА', 'Отправил ТА',
            'Подал ИП', 'Подписание контракта', 'Проиграл ИП', 'Проиграл ТА', 'Просчет ЗМО',
            'Просчет ИП', 'Участвую ИП', 'Участвую ТА', 'Выиграл ИП', 'Выиграл ТА'
          ]], 
          msg: 'Недопустимое значение стадии тендера' 
        },
      },
      comment: 'Стадия участия в тендере',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: { args: [['active', 'completed', 'canceled']], msg: 'Недопустимое значение статуса тендера' },
      },
      comment: 'Статус тендера',
    },
    subject: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      validate: {
        len: { args: [0, 10000], msg: 'Предмет тендера не должен превышать 10000 символов' },
      },
      comment: 'Предмет тендера',
    },
    purchase_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: {
        name: 'tenders_purchase_number_unique',
        msg: 'Номер закупки уже существует',
      },
      validate: {
        len: { args: [0, 100], msg: 'Номер закупки не должен превышать 100 символов' },
      },
      comment: 'Номер закупки, уникальный в системе',
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: 'Дата окончания должна быть валидной' },
      },
      comment: 'Дата окончания тендера',
    },
    note: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      validate: {
        len: { args: [0, 10000], msg: 'Заметки не должны превышать 10000 символов' },
      },
      comment: 'Заметки по тендеру',
    },
    note_input: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Краткая заметка не должна превышать 255 символов' },
      },
      comment: 'Краткая заметка ввода',
    },
    platform_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Название платформы не должно превышать 255 символов' },
      },
      comment: 'Название платформы',
    },
    platforms: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Список платформ не должен превышать 255 символов' },
      },
      comment: 'Список платформ',
    },
    law: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '44-ФЗ',
      validate: {
        isIn: { args: [['44-ФЗ', '223-ФЗ']], msg: 'Закон должен быть либо "44-ФЗ", либо "223-ФЗ"' },
      },
      comment: 'Закон, регулирующий тендер',
    },
    nmck: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'НМЦК не может быть отрицательной' },
      },
      comment: 'Начальная максимальная цена контракта',
    },
    delivery_period: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'Срок поставки должен быть целым числом' },
        min: { args: 0, msg: 'Срок поставки не может быть отрицательным' },
      },
      comment: 'Срок поставки в днях',
    },
    customer_region: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: { args: [0, 100], msg: 'Регион заказчика не должен превышать 100 символов' },
      },
      comment: 'Регион заказчика',
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Имя заказчика не должно превышать 255 символов' },
      },
      comment: 'Имя заказчика',
    },
    supplier_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Имя поставщика не должно превышать 255 символов' },
      },
      comment: 'Имя поставщика',
    },
    quantity: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: { args: 0, msg: 'Количество не может быть отрицательным' },
      },
      comment: 'Количество',
    },
    unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'Цена за единицу не может быть отрицательной' },
      },
      comment: 'Цена за единицу',
    },
    logistics: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'Стоимость логистики не может быть отрицательной' },
      },
      comment: 'Стоимость логистики',
    },
    supplier_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'Цена поставщика не может быть отрицательной' },
      },
      comment: 'Цена поставщика',
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'Общая сумма не может быть отрицательной' },
      },
      comment: 'Общая сумма',
    },
    color_label: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#FFFFFF',
      validate: {
        is: { args: /^#[0-9A-F]{6}$/i, msg: 'Цветовая метка должна быть в формате HEX (#RRGGBB)' },
      },
      comment: 'Цветовая метка в формате HEX',
    },
    winner_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'Цена победителя не может быть отрицательной' },
      },
      comment: 'Цена победителя',
    },
    margin_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: { args: 0, msg: 'Процент маржи не может быть отрицательным' },
        max: { args: 100, msg: 'Процент маржи не может превышать 100%' },
      },
      comment: 'Процент маржи',
    },
    winner_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Имя победителя не должно превышать 255 символов' },
      },
      comment: 'Имя победителя',
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: { msg: 'Порядок сортировки должен быть целым числом' },
        min: { args: 0, msg: 'Порядок сортировки не может быть отрицательным' },
      },
      comment: 'Порядок сортировки',
    },
    risk_card: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: `Конкурс или запрос предложений
Проверка 275 ГОЗ (военная приемка+ и казначейство)
Тендер включает оказание услуг/монтаж
ФЗ 44 или 223?
Можно ли поставлять аналоги? (Для 223)
Нац режим
Место поставки (Дальняя доставка?)
Количество мест поставки
Условия поставки
Срок поставки
Разгрузка
Срок приемки товара
Срок оплаты
Срок действия договора
Длинные гарантийные обязательства
Проверка штрафов в 223 ФЗ`,
      comment: 'Карточка рисков тендера',
    },
    contract_security: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: { args: 0, msg: 'Обеспечение контракта не может быть отрицательным' },
      },
      comment: 'Обеспечение контракта',
    },
    platform_fee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: { args: 0, msg: 'Комиссия платформы не может быть отрицательной' },
      },
      comment: 'Комиссия платформы',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания тендера',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления тендера',
    },
  }, {
    tableName: 'tenders',
    timestamps: true, // Включено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeCreate: (tender) => {
        logger.debug(`Создание тендера: purchase_number ${tender.purchase_number || 'не указан'}, пользователь ${tender.user_id}`);
      },
      beforeUpdate: (tender) => {
        logger.debug(`Обновление тендера ID ${tender.id}: purchase_number ${tender.purchase_number || 'не указан'}`);
      },
      afterCreate: (tender) => {
        logger.info(`Создан тендер: ${tender.purchase_number || tender.id} (ID: ${tender.id}) для пользователя ${tender.user_id}`);
        // Добавляем поле message для уведомления на фронтенде
        tender.message = `Тендер "${tender.purchase_number || tender.id}" создан`;
      },
      afterUpdate: (tender) => {
        logger.info(`Обновлён тендер: ${tender.purchase_number || tender.id} (ID: ${tender.id}) для пользователя ${tender.user_id}`);
        // Добавляем поле message для уведомления на фронтенде
        tender.message = `Тендер "${tender.purchase_number || tender.id}" обновлён`;
      },
      afterDestroy: (tender) => {
        // Добавляем хук для удаления с уведомлением
        logger.info(`Удалён тендер: ${tender.purchase_number || tender.id} (ID: ${tender.id}) для пользователя ${tender.user_id}`);
        tender.message = `Тендер "${tender.purchase_number || tender.id}" удалён`;
      },
    },
    indexes: [
      { fields: ['user_id'], name: 'tenders_user_id' },
      { unique: true, fields: ['purchase_number'], name: 'tenders_purchase_number_unique' },
      { fields: ['stage'], name: 'tenders_stage' },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица тендеров системы',
  });

  Tender.associate = (models) => {
    logger.debug('Регистрация ассоциаций для Tender');
    Tender.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, связанным с тендером',
    });
    Tender.hasMany(models.Report, {
      foreignKey: 'tender_id',
      as: 'Reports',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Связь с отчётами по тендеру',
    });
    Tender.hasMany(models.Document, {
      foreignKey: 'tender_id',
      as: 'Documents',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Связь с документами тендера',
    });
  };

  Tender.prototype.isCompleted = function () {
    const isCompleted = this.status === 'completed';
    logger.debug(`Проверка завершения тендера ID ${this.id}: ${isCompleted ? 'завершён' : 'не завершён'}`);
    return isCompleted;
  };

  Tender.prototype.isOverdue = function () {
    const isOverdue = this.end_date && new Date(this.end_date) < new Date() && this.status === 'active';
    logger.debug(`Проверка просрочки тендера ID ${this.id}: ${isOverdue ? 'просрочен' : 'не просрочен'}`);
    return isOverdue;
  };

  Tender.prototype.getSummary = function () {
    try {
      const summary = {
        id: this.id,
        purchase_number: this.purchase_number,
        subject: this.subject ? this.subject.substring(0, 50) + (this.subject.length > 50 ? '...' : '') : null,
        stage: this.stage,
        status: this.status,
        end_date: this.end_date,
        nmck: parseFloat(this.nmck) || null,
        winner_price: parseFloat(this.winner_price) || null,
        margin_percent: parseFloat(this.margin_percent) || null,
        user_id: this.user_id,
        // Добавляем сообщение из хука, если оно есть
        notification: this.message ? { message: this.message, severity: 'info' } : undefined,
      };
      logger.debug(`Сформировано краткое описание тендера ID ${this.id}`);
      return summary;
    } catch (error) {
      logger.error(`Ошибка формирования краткого описания тендера ID ${this.id}: ${error.message}`);
      return { id: this.id, error: 'Ошибка формирования описания' };
    }
  };

  Tender.prototype.getFormattedTotalAmount = function () {
    try {
      const totalAmount = parseFloat(this.total_amount);
      if (isNaN(totalAmount)) {
        logger.warn(`Некорректная общая сумма для тендера ID ${this.id}: ${this.total_amount}`);
        return 'Не указано';
      }
      return `${totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
    } catch (error) {
      logger.error(`Ошибка форматирования общей суммы тендера ID ${this.id}: ${error.message}`);
      return 'Не указано';
    }
  };

  Tender.prototype.calculateMarginPercent = function () {
    try {
      const nmck = parseFloat(this.getDataValue('nmck'));
      const winnerPrice = parseFloat(this.getDataValue('winner_price'));
      if (nmck && winnerPrice && nmck > 0) {
        const margin = ((nmck - winnerPrice) / nmck * 100).toFixed(2);
        logger.debug(`Рассчитан процент маржи для тендера ID ${this.id}: ${margin}%`);
        return parseFloat(margin);
      }
      logger.debug(`Невозможно рассчитать маржу для тендера ID ${this.id}: nmck=${nmck}, winner_price=${winnerPrice}`);
      return null;
    } catch (error) {
      logger.error(`Ошибка расчёта маржи для тендера ID ${this.id}: ${error.message}`);
      return null;
    }
  };

  Tender.findActiveByUser = async function (userId) {
    try {
      const tenders = await this.findAll({
        where: { user_id: userId, status: 'active' },
        order: [['end_date', 'ASC']],
      });
      logger.info(`Найдено активных тендеров для пользователя ${userId}: ${tenders.length}`);
      // Добавляем сообщение в результат
      return tenders.length > 0
        ? { tenders, message: `Найдено ${tenders.length} активных тендеров для пользователя ${userId}` }
        : { tenders, message: `Активные тендеры для пользователя ${userId} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка поиска активных тендеров пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска активных тендеров пользователя ${userId}: ${error.message}`);
    }
  };

  Tender.getTotalAmountByStatus = async function (status) {
    try {
      const result = await this.sum('total_amount', {
        where: { status },
      });
      const total = result ? parseFloat(result.toFixed(2)) : 0;
      logger.info(`Общая сумма тендеров со статусом ${status}: ${total} ₽`);
      // Добавляем сообщение в результат
      return {
        total,
        message: total > 0
          ? `Общая сумма тендеров со статусом "${status}": ${total} ₽`
          : `Тендеры со статусом "${status}" отсутствуют или их сумма равна 0`,
      };
    } catch (error) {
      logger.error(`Ошибка подсчёта общей суммы для статуса ${status}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка подсчёта общей суммы для статуса ${status}: ${error.message}`);
    }
  };

  Tender.getOverdueTenders = async function (userId = null) {
    try {
      const where = {
        status: 'active',
        end_date: { [sequelize.Op.lt]: new Date() },
      };
      if (userId !== null) {
        where.user_id = userId;
      }
      const tenders = await this.findAll({
        where,
        order: [['end_date', 'ASC']],
      });
      logger.info(`Найдено просроченных тендеров${userId ? ` для пользователя ${userId}` : ''}: ${tenders.length}`);
      // Добавляем сообщение в результат
      return tenders.length > 0
        ? { tenders, message: `Найдено ${tenders.length} просроченных тендеров${userId ? ` для пользователя ${userId}` : ''}` }
        : { tenders, message: `Просроченные тендеры${userId ? ` для пользователя ${userId}` : ''} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка поиска просроченных тендеров: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска просроченных тендеров: ${error.message}`);
    }
  };

  Tender.prototype.getNetProfit = function () {
    try {
      const winnerPrice = parseFloat(this.winner_price) || 0;
      const logistics = parseFloat(this.logistics) || 0;
      const supplierPrice = parseFloat(this.supplier_price) || 0;
      const platformFee = parseFloat(this.platform_fee) || 0;
      const contractSecurity = parseFloat(this.contract_security) || 0;
      const netProfit = winnerPrice - (supplierPrice + logistics + platformFee + contractSecurity);
      logger.debug(`Рассчитана чистая прибыль для тендера ID ${this.id}: ${netProfit} ₽`);
      return parseFloat(netProfit.toFixed(2)) || 0;
    } catch (error) {
      logger.error(`Ошибка расчёта чистой прибыли для тендера ID ${this.id}: ${error.message}`);
      return 0;
    }
  };

  Tender.findByStage = async function (stage, userId = null) {
    try {
      const where = { stage };
      if (userId !== null) {
        where.user_id = userId;
      }
      const tenders = await this.findAll({
        where,
        order: [['order', 'ASC']],
      });
      logger.info(`Найдено тендеров со стадией ${stage}${userId ? ` для пользователя ${userId}` : ''}: ${tenders.length}`);
      // Добавляем сообщение в результат
      return tenders.length > 0
        ? { tenders, message: `Найдено ${tenders.length} тендеров со стадией "${stage}"${userId ? ` для пользователя ${userId}` : ''}` }
        : { tenders, message: `Тендеры со стадией "${stage}"${userId ? ` для пользователя ${userId}` : ''} отсутствуют` };
    } catch (error) {
      logger.error(`Ошибка поиска тендеров по стадии ${stage}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска тендеров по стадии ${stage}: ${error.message}`);
    }
  };

  logger.debug('Модель Tender успешно инициализирована');
  return Tender;
};