const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const defaultUsers = [
  {
    username: 'admin',
    password: '123456',
    telegram: '@admin',
    role_id: 1,
    is_active: true,
    admin_id: null,
  },
];

const createDefaultUsers = async (User) => {
  const users = [];
  for (const userData of defaultUsers) {
    const password_hash = await bcrypt.hash(userData.password, 10);
    const [user, created] = await User.findOrCreate({
      where: { username: userData.username },
      defaults: {
        username: userData.username,
        password_hash,
        telegram: userData.telegram,
        role_id: userData.role_id,
        is_active: userData.is_active,
        admin_id: userData.admin_id,
      },
    });
    users.push({ user, created });
  }
  return users;
};

const getAllUsers = async (User) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'telegram', 'role_id', 'is_active', 'created_at', 'updated_at', 'admin_id'],
    });
    return users;
  } catch (error) {
    throw new Error(`Ошибка при получении списка пользователей: ${error.message}`);
  }
};

const addUser = async (User, userData) => {
  try {
    const { username, password, telegram, role_id, is_active = true, admin_id } = userData;
    if (!username || !password) {
      throw new Error('Логин и пароль обязательны');
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [user, created] = await User.findOrCreate({
      where: { username },
      defaults: {
        username,
        password_hash,
        telegram,
        role_id: role_id || 2,
        is_active,
        admin_id,
      },
    });
    if (!created) {
      throw new Error(`Пользователь ${username} уже существует`);
    }
    return user;
  } catch (error) {
    throw new Error(`Ошибка при добавлении пользователя: ${error.message}`);
  }
};

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор пользователя',
    },
    username: {
      type: DataTypes.STRING(100), // Увеличено до 100 для соответствия MySQL
      allowNull: false,
      unique: { msg: 'Имя пользователя уже занято' },
      validate: {
        len: { args: [3, 100], msg: 'Имя пользователя должно быть от 3 до 100 символов' },
        is: { args: /^[a-zA-Z0-9_-]+$/, msg: 'Имя пользователя может содержать только буквы, цифры, подчеркивания и дефисы' },
      },
      comment: 'Логин пользователя, уникальный в системе',
    },
    password_hash: {
      type: DataTypes.STRING(60),
      allowNull: false,
      comment: 'Хешированный пароль пользователя (bcrypt)',
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      references: { model: 'roles', key: 'id' },
      comment: 'Идентификатор роли пользователя (1 - admin, 2 - user)',
    },
    telegram: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: { msg: 'Аккаунт Telegram уже используется' },
      validate: {
        len: { args: [3, 255], msg: 'Telegram должен быть от 3 до 255 символов' },
        is: { args: /^@[\w]+$/, msg: 'Telegram должен начинаться с @ и содержать только буквы, цифры и подчеркивания' },
      },
      comment: 'Аккаунт Telegram пользователя, уникальный в системе',
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Дата и время последнего входа пользователя',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Статус активности пользователя (true - активен, false - заблокирован)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания записи о пользователе',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления записи о пользователе',
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID администратора, вошедшего в профиль пользователя (если применимо)',
    },
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (!user.password_hash.startsWith('$2b$')) {
          if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(user.password_hash)) {
            throw new Error('Пароль должен содержать минимум 8 символов, включая буквы и цифры');
          }
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash') && !user.password_hash.startsWith('$2b$')) {
          if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(user.password_hash)) {
            throw new Error('Пароль должен содержать минимум 8 символов, включая буквы и цифры');
          }
          user.password_hash = await bcrypt.hash(user.password_hash, 10);
        }
      },
      afterCreate: (user) => {
        console.log(`Создан пользователь: ${user.username} (ID: ${user.id})`);
      },
      afterUpdate: (user) => {
        console.log(`Обновлён пользователь: ${user.username} (ID: ${user.id})`);
      },
    },
    timestamps: true, // Включено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'users',
    underscored: true,
    indexes: [
      { unique: true, fields: ['username'] },
      { unique: true, fields: ['telegram'] },
      { fields: ['role_id'] },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Таблица пользователей системы с их учетными данными и статусами',
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, { 
      foreignKey: 'role_id', 
      as: 'Role', 
      onDelete: 'RESTRICT', 
      onUpdate: 'CASCADE' 
    });
    User.hasMany(models.Transaction, { 
      foreignKey: 'user_id', 
      as: 'Transactions', 
      onDelete: 'CASCADE', 
      onUpdate: 'CASCADE' 
    });
    User.hasMany(models.DebitCard, { 
      foreignKey: 'user_id', 
      as: 'DebitCards', 
      onDelete: 'CASCADE', 
      onUpdate: 'CASCADE' 
    });
    User.hasMany(models.CreditCard, { 
      foreignKey: 'user_id', 
      as: 'CreditCards', 
      onDelete: 'CASCADE', 
      onUpdate: 'CASCADE' 
    });
    User.hasMany(models.DolgTable, { 
      foreignKey: 'user_id', 
      as: 'DolgTables', 
      onDelete: 'CASCADE', 
      onUpdate: 'CASCADE' 
    });
    User.hasMany(models.Loan, { 
      foreignKey: 'user_id', 
      as: 'Loans', 
      onDelete: 'CASCADE', 
      onUpdate: 'CASCADE' 
    });
  };

  User.prototype.verifyPassword = async function (password) {
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      throw new Error(`Ошибка проверки пароля: ${error.message}`);
    }
  };

  User.prototype.getProfile = async function () {
    try {
      const role = await this.getRole();
      return {
        id: this.id,
        username: this.username,
        telegram: this.telegram,
        role: role ? role.name : null,
        last_login: this.last_login,
        is_active: this.is_active,
        created_at: this.created_at,
        updated_at: this.updated_at,
        admin_id: this.admin_id,
      };
    } catch (error) {
      throw new Error(`Ошибка получения профиля пользователя: ${error.message}`);
    }
  };

  User.prototype.isAdmin = async function () {
    try {
      const role = await this.getRole();
      return role && role.name === 'admin';
    } catch (error) {
      throw new Error(`Ошибка проверки роли администратора: ${error.message}`);
    }
  };

  User.prototype.updateLastLogin = async function () {
    try {
      await this.update({ last_login: new Date() });
    } catch (error) {
      throw new Error(`Ошибка обновления времени последнего входа: ${error.message}`);
    }
  };

  User.findByUsername = async function (username) {
    try {
      return await this.findOne({ where: { username } });
    } catch (error) {
      throw new Error(`Ошибка поиска пользователя по имени "${username}": ${error.message}`);
    }
  };

  User.createUser = async function (userData) {
    try {
      return await this.create(userData);
    } catch (error) {
      throw new Error(`Ошибка создания пользователя: ${error.message}`);
    }
  };

  User.getActiveUsers = async function () {
    try {
      return await this.findAll({ where: { is_active: true }, order: [['username', 'ASC']] });
    } catch (error) {
      throw new Error(`Ошибка получения активных пользователей: ${error.message}`);
    }
  };

  // Экспорт дополнительных функций
  User.createDefaultUsers = createDefaultUsers;
  User.getAllUsers = getAllUsers;
  User.addUser = addUser;
  User.defaultUsers = defaultUsers;

  return User;
};