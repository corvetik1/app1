// C:\rezerv\app\server\models\headerNote.js
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  logger.debug('Инициализация модели HeaderNote');

  const HeaderNote = sequelize.define('HeaderNote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      comment: 'Уникальный идентификатор заметки',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: 'user_id должен быть целым числом' },
      },
      comment: 'ID пользователя, создавшего заметку',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: { args: [0, 10000], msg: 'Содержимое не должно превышать 10000 символов' },
      },
      comment: 'Содержимое заметки',
    },
    created_at: { // Добавлено
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания заметки',
    },
    updated_at: { // Добавлено
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления заметки',
    },
  }, {
    tableName: 'header_note',
    timestamps: true, // Включено
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица персональных заметок пользователей',
  });

  HeaderNote.associate = (models) => {
    logger.debug('Регистрация ассоциаций для HeaderNote');
    HeaderNote.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      as: 'User',
      comment: 'Связь с пользователем, которому принадлежит заметка',
    });
  };

  HeaderNote.addHook('afterCreate', (headerNote) => {
    logger.info(`Создана заметка заголовка ID ${headerNote.id} для пользователя ${headerNote.user_id}`);
  });

  HeaderNote.addHook('afterUpdate', (headerNote) => {
    logger.info(`Обновлена заметка заголовка ID ${headerNote.id} для пользователя ${headerNote.user_id}`);
  });

  HeaderNote.addHook('afterDestroy', (headerNote) => {
    logger.info(`Удалена заметка заголовка ID ${headerNote.id} для пользователя ${headerNote.user_id}`);
  });

  HeaderNote.prototype.getSummary = async function () {
    try {
      const user = await this.getUser();
      const summary = {
        id: this.id,
        user_id: this.user_id,
        owner: user ? user.username : 'Неизвестный пользователь',
        content: this.content ? this.content.substring(0, 50) + (this.content.length > 50 ? '...' : '') : null,
      };
      logger.debug(`Сформировано краткое описание заметки ID ${this.id}`);
      return summary;
    } catch (error) {
      logger.error(`Ошибка получения краткого описания заметки ID ${this.id}: ${error.message}, стек: ${error.stack}`);
      throw error;
    }
  };

  HeaderNote.findByUserId = async function (userId) {
    try {
      const note = await this.findOne({ where: { user_id: userId } });
      if (note) {
        logger.debug(`Найдена заметка для пользователя ${userId}: ID ${note.id}`);
      } else {
        logger.debug(`Заметка для пользователя ${userId} не найдена`);
      }
      return note;
    } catch (error) {
      logger.error(`Ошибка получения заметки пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения заметки пользователя ${userId}: ${error.message}`);
    }
  };

  HeaderNote.searchByContent = async function (query, userId = null) {
    try {
      const where = { content: { [sequelize.Op.like]: `%${query}%` } };
      if (userId !== null) {
        where.user_id = userId;
      }
      const notes = await this.findAll({ where });
      logger.info(`Найдено заметок по запросу "${query}"${userId ? ` для пользователя ${userId}` : ''}: ${notes.length}`);
      return notes;
    } catch (error) {
      logger.error(`Ошибка поиска заметок по содержимому "${query}": ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска заметок по содержимому "${query}": ${error.message}`);
    }
  };

  HeaderNote.getAllByUserId = async function (userId) {
    try {
      const notes = await this.findAll({
        where: { user_id: userId },
        order: [['id', 'DESC']],
      });
      logger.info(`Найдено заметок для пользователя ${userId}: ${notes.length}`);
      return notes;
    } catch (error) {
      logger.error(`Ошибка получения всех заметок пользователя ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения всех заметок пользователя ${userId}: ${error.message}`);
    }
  };

  logger.debug('Модель HeaderNote успешно инициализирована');
  return HeaderNote;
};