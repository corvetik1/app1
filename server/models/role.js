const { DataTypes } = require('sequelize');
const logger = require('../utils/logger'); // Добавляем импорт логгера для一致性

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Уникальный идентификатор роли',
    },
    name: {
      type: DataTypes.STRING(255),
      unique: {
        msg: 'Название роли уже занято',
      },
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Название роли не может быть пустым' },
        len: { args: [2, 50], msg: 'Название роли должно быть от 2 до 50 символов' },
        // Убрал isIn, чтобы позволить создавать пользовательские роли
      },
      comment: 'Название роли (например, admin, user, custom_role)',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'Описание не должно превышать 255 символов' },
      },
      comment: 'Описание роли',
    },
  }, {
    hooks: {
      afterCreate: (role) => {
        logger.info(`Создана роль: ${role.name} (ID: ${role.id})`); // Заменяем console.log на logger
        // Добавляем поле message для уведомления на фронтенде
        role.message = `Роль "${role.name}" создана`;
      },
      afterUpdate: (role) => {
        logger.info(`Обновлена роль: ${role.name} (ID: ${role.id})`); // Заменяем console.log на logger
        // Добавляем поле message для уведомления на фронтенде
        role.message = `Роль "${role.name}" обновлена`;
      },
      afterDestroy: (role) => {
        // Добавляем хук для удаления с уведомлением
        logger.info(`Удалена роль: ${role.name} (ID: ${role.id})`);
        role.message = `Роль "${role.name}" удалена`;
      },
    },
    timestamps: false, // Отключаем автоматические timestamps
    tableName: 'roles',
    underscored: true,
    indexes: [
      { unique: true, fields: ['name'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица ролей пользователей системы',
  });

  // Ассоциации
  Role.associate = (models) => {
    Role.hasMany(models.User, {
      foreignKey: 'role_id',
      as: 'Users',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Связь с пользователями, имеющими эту роль',
    });
    Role.hasMany(models.Permission, {
      foreignKey: 'role_id',
      as: 'Permissions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Связь с разрешениями для этой роли',
    });
  };

  // Метод для получения читаемого описания роли
  Role.prototype.getDescription = function () {
    return this.description || `Роль ${this.name} без описания`;
  };

  // Метод для проверки, является ли роль администраторской
  Role.prototype.isAdminRole = function () {
    return this.name === 'admin';
  };

  // Статический метод для поиска роли по имени
  Role.findByName = async function (name) {
    try {
      const role = await this.findOne({ where: { name } });
      logger.debug(`Поиск роли по имени "${name}": ${role ? `найдена (ID: ${role.id})` : 'не найдена'}`);
      return role;
    } catch (error) {
      logger.error(`Ошибка поиска роли по имени "${name}": ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка поиска роли по имени "${name}": ${error.message}`);
    }
  };

  // Статический метод для создания роли с валидацией
  Role.createRole = async function (roleData) {
    try {
      const role = await this.create(roleData);
      logger.debug(`Создана роль через createRole: ${role.name} (ID: ${role.id})`);
      // Добавляем сообщение в результат
      return { role, message: `Роль "${role.name}" успешно создана` };
    } catch (error) {
      logger.error(`Ошибка создания роли: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка создания роли: ${error.message}`);
    }
  };

  // Статический метод для получения всех ролей
  Role.getAllRoles = async function () {
    try {
      const roles = await this.findAll({
        order: [['name', 'ASC']],
        include: [{ model: sequelize.models.Permission, as: 'Permissions' }],
      });
      logger.debug(`Получено ролей: ${roles.length}`);
      // Добавляем сообщение в результат
      return roles.length > 0
        ? { roles, message: `Найдено ${roles.length} ролей` }
        : { roles, message: 'Роли отсутствуют' };
    } catch (error) {
      logger.error(`Ошибка получения всех ролей: ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения всех ролей: ${error.message}`);
    }
  };

  // Метод экземпляра для проверки актуальности роли (без updated_at заменён на заглушку)
  Role.prototype.isRecent = function () {
    // Поскольку updated_at удалён, метод теперь возвращает true как заглушка
    // Можно адаптировать под другие критерии, если нужно
    return true;
  };

  // Новый метод: Получение разрешений роли
  Role.prototype.getPermissions = async function () {
    try {
      const permissions = await this.getPermissions();
      logger.debug(`Получено разрешений для роли "${this.name}" (ID: ${this.id}): ${permissions.length}`);
      return permissions;
    } catch (error) {
      logger.error(`Ошибка получения разрешений для роли "${this.name}": ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка получения разрешений для роли "${this.name}": ${error.message}`);
    }
  };

  // Новый метод: Проверка разрешения для конкретной страницы
  Role.prototype.hasPermission = async function (page, action) {
    try {
      const permission = await sequelize.models.Permission.findOne({
        where: { role_id: this.id, page },
      });
      if (!permission) {
        logger.debug(`Разрешение для страницы "${page}" и действия "${action}" не найдено для роли "${this.name}" (ID: ${this.id})`);
        return false;
      }
      let hasPerm = false;
      switch (action) {
        case 'view': hasPerm = permission.can_view; break;
        case 'edit': hasPerm = permission.can_edit; break;
        case 'delete': hasPerm = permission.can_delete; break;
        case 'create': hasPerm = permission.can_create; break;
        default: hasPerm = false;
      }
      logger.debug(`Проверка разрешения "${action}" для страницы "${page}" роли "${this.name}" (ID: ${this.id}): ${hasPerm}`);
      return hasPerm;
    } catch (error) {
      logger.error(`Ошибка проверки разрешения "${action}" для страницы "${page}" роли "${this.name}": ${error.message}, стек: ${error.stack}`);
      throw new Error(`Ошибка проверки разрешения "${action}" для страницы "${page}": ${error.message}`);
    }
  };

  return Role;
};