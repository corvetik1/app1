// C:\rezerv\app\server\models\document.js
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор документа',
    },
    tender_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'tender_id должен быть целым числом' },
      },
      comment: 'ID тендера, к которому привязан документ (может быть null)',
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Имя файла обязательно' },
        len: { args: [1, 255], msg: 'Имя файла должно быть от 1 до 255 символов' },
      },
      comment: 'Имя файла документа',
    },
    file_path: {
      type: DataTypes.STRING(512),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Путь к файлу обязателен' },
        len: { args: [1, 512], msg: 'Путь к файлу должен быть от 1 до 512 символов' },
      },
      comment: 'Путь к файлу на сервере или в хранилище',
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'Размер файла должен быть целым числом' },
        min: { args: 0, msg: 'Размер файла не может быть отрицательным' },
      },
      comment: 'Размер файла в байтах',
    },
    file_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: { args: [0, 50], msg: 'Тип файла не должен превышать 50 символов' },
      },
      comment: 'MIME-тип файла (например, "application/pdf")',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания документа',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления документа',
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'uploaded_by должен быть целым числом' },
      },
      comment: 'ID пользователя, загрузившего документ (может быть null)',
    },
  }, {
    tableName: 'documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeCreate: async (document) => {
        if (document.tender_id) {
          const tender = await sequelize.models.Tender.findByPk(document.tender_id);
          if (!tender) {
            logger.warn(`Тендер с ID ${document.tender_id} не найден для документа ${document.file_name}`);
            throw new Error('Указанный тендер не существует');
          }
        }
      },
      afterCreate: (document) => {
        logger.info(`Создан документ: ${document.file_name} (ID: ${document.id}) для тендера ${document.tender_id || 'без тендера'}`);
        document.message = `Документ "${document.file_name}" загружен`;
      },
      afterUpdate: (document) => {
        logger.info(`Обновлён документ: ${document.file_name} (ID: ${document.id})`);
        document.message = `Документ "${document.file_name}" обновлён`;
      },
      afterDestroy: (document) => {
        logger.info(`Удалён документ: ${document.file_name} (ID: ${document.id})`);
        document.message = `Документ "${document.file_name}" удалён`;
      },
    },
    indexes: [
      { fields: ['tender_id'] },
      { fields: ['file_name'] },
      { fields: ['created_at'] },
      { fields: ['uploaded_by'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица документов, связанных с тендерами',
  });

  Document.associate = (models) => {
    Document.belongsTo(models.Tender, {
      foreignKey: 'tender_id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      as: 'Tender',
      comment: 'Связь с тендером, к которому относится документ',
    });
    Document.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      as: 'Uploader',
      comment: 'Связь с пользователем, загрузившим документ',
    });
  };

  Document.prototype.getFullPath = function () {
    return `${this.file_path}/${this.file_name}`;
  };

  Document.prototype.isLinkedToTender = function () {
    return this.tender_id !== null;
  };

  Document.getDocumentsByTender = async function (tenderId) {
    try {
      const documents = await this.findAll({
        where: { tender_id: tenderId },
        order: [['created_at', 'ASC']],
      });
      if (documents.length === 0) {
        return { documents, message: `Документы для тендера ${tenderId} не найдены` };
      }
      return { documents };
    } catch (error) {
      logger.error(`Ошибка получения документов для тендера ${tenderId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения документов для тендера ${tenderId}: ${error.message}`);
    }
  };

  Document.findByUploader = async function (userId) {
    try {
      const documents = await this.findAll({
        where: { uploaded_by: userId },
        order: [['created_at', 'DESC']],
      });
      if (documents.length === 0) {
        return { documents, message: `Документы, загруженные пользователем ${userId}, не найдены` };
      }
      return { documents };
    } catch (error) {
      logger.error(`Ошибка получения документов, загруженных пользователем ${userId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения документов, загруженных пользователем ${userId}: ${error.message}`);
    }
  };

  Document.prototype.getFormattedSize = function () {
    if (!this.file_size) return 'Неизвестно';
    const sizeInKB = this.file_size / 1024;
    if (sizeInKB < 1024) return `${sizeInKB.toFixed(2)} KB`;
    const sizeInMB = sizeInKB / 1024;
    return `${sizeInMB.toFixed(2)} MB`;
  };

  Document.getTotalSizeByTender = async function (tenderId) {
    try {
      const result = await this.sum('file_size', {
        where: { tender_id: tenderId },
      });
      const totalSize = result ? result : 0;
      return {
        totalSize,
        message: totalSize === 0 ? `Размер документов для тендера ${tenderId} равен 0` : `Общий размер документов для тендера ${tenderId}: ${totalSize} байт`,
      };
    } catch (error) {
      logger.error(`Ошибка подсчёта общего размера документов для тендера ${tenderId}: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка подсчёта общего размера документов для тендера ${tenderId}: ${error.message}`);
    }
  };

  return Document;
};