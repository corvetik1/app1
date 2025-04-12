const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const VisibilitySetting = sequelize.define('VisibilitySetting', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор настройки видимости',
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
      comment: 'ID пользователя, которому принадлежит настройка',
    },
    stage: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Стадия не может быть пустой' },
        isIn: {
          args: [[
            'В работе ИП', 'В работе ТА', 'Исполнение ТА', 'Исполнено ИП', 'Исполнено ТА',
            'Нулевые закупки', 'Ожидание оплаты ИП', 'Ожидание оплаты ТА', 'Отправил ТА',
            'Подал ИП', 'Подписание контракта', 'Проиграл ИП', 'Проиграл ТА', 'Просчет ЗМО',
            'Просчет ИП', 'Участвую ИП', 'Участвую ТА', 'Выиграл ИП', 'Выиграл ТА',
            'Не участвую', 'Участвую', 'В работе', 'Выиграл', 'Проиграл'
          ]],
          msg: 'Стадия должна быть одной из допустимых значений',
        },
      },
      comment: 'Стадия тендера, к которой применяется настройка',
    },
    visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      validate: {
        isBoolean: { msg: 'visible должен быть булевым значением (true/false)' },
      },
      comment: 'Флаг видимости стадии (true - видно, false - скрыто)',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
        is: { args: /^[a-zA-Zа-яА-Я0-9\s.,!?()-]*$/, msg: 'Описание содержит недопустимые символы' },
      },
      comment: 'Описание настройки видимости (опционально)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания настройки видимости',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления настройки видимости',
    },
  }, {
    tableName: 'visibility_settings',
    timestamps: true, // Включено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      afterCreate: (setting) => {
        logger.info(`Создана настройка видимости для пользователя ${setting.user_id}, стадия: ${setting.stage}, видимость: ${setting.visible}`);
        // Добавляем поле message для уведомления на фронтенде
        setting.message = `Настройка видимости "${setting.stage}" создана`;
      },
      afterUpdate: (setting) => {
        logger.debug(`Обновлена настройка видимости для пользователя ${setting.user_id}, стадия: ${setting.stage}, видимость: ${setting.visible}`);
        // Добавляем поле message для уведомления на фронтенде
        setting.message = `Видимость стадии "${setting.stage}" обновлена на ${setting.visible ? 'видимо' : 'скрыто'}`;
      },
    },
    indexes: [
      { unique: true, fields: ['user_id', 'stage'], name: 'user_stage_unique' },
      { fields: ['visible'], name: 'visibility_settings_visible' },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица настроек видимости стадий тендеров для каждого пользователя',
  });

  VisibilitySetting.associate = (models) => {
    VisibilitySetting.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Связь с пользователем, которому принадлежит настройка',
    });
  };

  VisibilitySetting.prototype.getVisibilityStatus = function () {
    const status = this.visible ? 'Видимо' : 'Скрыто';
    logger.debug(`Получен статус видимости для настройки id=${this.id}: ${status}`);
    return status;
  };

  VisibilitySetting.prototype.isRecent = function () {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const isRecent = new Date(this.updated_at) >= oneMonthAgo;
    logger.debug(`Проверка актуальности настройки id=${this.id}: ${isRecent ? 'актуальна' : 'устарела'}`);
    return isRecent;
  };

  VisibilitySetting.findByStageAndUser = async function (stage, userId) {
    try {
      logger.debug(`Поиск настройки по стадии ${stage} и user_id ${userId}`);
      const setting = await this.findOne({ where: { stage, user_id: userId } });
      if (setting) {
        logger.debug(`Найдена настройка: id=${setting.id}, visible=${setting.visible}`);
      } else {
        logger.debug(`Настройка для стадии ${stage} и user_id ${userId} не найдена`);
      }
      return setting;
    } catch (error) {
      logger.error(`Ошибка поиска настройки по стадии ${stage} и user_id ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска настройки по стадии ${stage} и user_id ${userId}: ${error.message}`);
    }
  };

  VisibilitySetting.getVisibleStages = async function (userId) {
    try {
      logger.debug(`Получение видимых стадий для user_id ${userId}`);
      const stages = await this.findAll({
        where: { visible: true, user_id: userId },
        attributes: ['stage'],
      });
      const visibleStages = stages.map((setting) => setting.stage);
      logger.debug(`Найдено видимых стадий для user_id ${userId}: ${visibleStages.length}`);
      return visibleStages;
    } catch (error) {
      logger.error(`Ошибка получения видимых стадий для user_id ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения видимых стадий для user_id ${userId}: ${error.message}`);
    }
  };

  VisibilitySetting.getHiddenStages = async function (userId) {
    try {
      logger.debug(`Получение скрытых стадий для user_id ${userId}`);
      const stages = await this.findAll({
        where: { visible: false, user_id: userId },
        attributes: ['stage'],
      });
      const hiddenStages = stages.map((setting) => setting.stage);
      logger.debug(`Найдено скрытых стадий для user_id ${userId}: ${hiddenStages.length}`);
      return hiddenStages;
    } catch (error) {
      logger.error(`Ошибка получения скрытых стадий для user_id ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения скрытых стадий для user_id ${userId}: ${error.message}`);
    }
  };

  VisibilitySetting.updateVisibility = async function (stage, userId, visible) {
    try {
      logger.debug(`Обновление видимости стадии ${stage} для user_id ${userId} на ${visible}`);
      const [updated] = await this.update(
        { visible },
        { where: { stage, user_id: userId } }
      );
      if (updated > 0) {
        logger.debug(`Видимость стадии ${stage} для user_id ${userId} обновлена`);
        // Возвращаем объект с сообщением для фронтенда
        return { success: true, message: `Видимость стадии "${stage}" обновлена на ${visible ? 'видимо' : 'скрыто'}` };
      } else {
        logger.debug(`Настройка для стадии ${stage} и user_id ${userId} не найдена для обновления`);
        throw new Error(`Настройка для стадии ${stage} не найдена`);
      }
    } catch (error) {
      logger.error(`Ошибка обновления видимости стадии ${stage} для user_id ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка обновления видимости стадии ${stage}: ${error.message}`);
    }
  };

  VisibilitySetting.toggleVisibility = async function (stage, userId) {
    try {
      logger.debug(`Переключение видимости стадии ${stage} для user_id ${userId}`);
      const setting = await this.findOne({ where: { stage, user_id: userId } });
      if (!setting) {
        logger.warn(`Настройка для стадии ${stage} и user_id ${userId} не найдена`);
        throw new Error(`Настройка для стадии ${stage} и user_id ${userId} не найдена`);
      }
      const newVisible = !setting.visible;
      await setting.update({ visible: newVisible });
      logger.debug(`Видимость стадии ${stage} для user_id ${userId} изменена на ${newVisible}`);
      // Возвращаем новое состояние с сообщением
      return { visible: newVisible, message: `Видимость стадии "${stage}" изменена на ${newVisible ? 'видимо' : 'скрыто'}` };
    } catch (error) {
      logger.error(`Ошибка переключения видимости стадии ${stage} для user_id ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка переключения видимости стадии ${stage}: ${error.message}`);
    }
  };

  VisibilitySetting.addStageForUser = async function (userId, stage, visible = false, description = null) {
    try {
      logger.debug(`Добавление стадии ${stage} для user_id ${userId}, visible=${visible}`);
      const [setting, created] = await this.upsert({
        user_id: userId,
        stage,
        visible,
        description,
      }, {
        where: { user_id: userId, stage }
      });
      if (created) {
        logger.info(`Создана новая настройка для user_id ${userId}, стадия: ${stage}, visible: ${visible}`);
        setting.message = `Настройка видимости "${stage}" создана`;
      } else {
        logger.debug(`Настройка для user_id ${userId}, стадия: ${stage} уже существует и обновлена`);
        setting.message = `Настройка видимости "${stage}" обновлена`;
      }
      return { setting, created, message: setting.message };
    } catch (error) {
      logger.error(`Ошибка добавления стадии ${stage} для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка добавления стадии ${stage}: ${error.message}`);
    }
  };

  VisibilitySetting.removeStageForUser = async function (userId, stage) {
    try {
      logger.debug(`Удаление стадии ${stage} для user_id ${userId}`);
      const deleted = await this.destroy({
        where: { user_id: userId, stage }
      });
      if (deleted > 0) {
        logger.info(`Удалена настройка для user_id ${userId}, стадия: ${stage}`);
        return { success: true, message: `Настройка видимости "${stage}" удалена` };
      } else {
        logger.debug(`Настройка для user_id ${userId}, стадия: ${stage} не найдена для удаления`);
        throw new Error(`Настройка для стадии ${stage} не найдена`);
      }
    } catch (error) {
      logger.error(`Ошибка удаления стадии ${stage} для пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка удаления стадии ${stage}: ${error.message}`);
    }
  };

  logger.debug('Модель VisibilitySetting инициализирована');
  return VisibilitySetting;
};