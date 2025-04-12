const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

// Список всех доступных страниц в приложении
const pages = [
  'home', 'tenders', 'users', 'finance', 'analytics', 'accounting', 'taxes',
  'investments', 'notes', 'education', 'health', 'travel', 'recipes', 'savings', 'profile'
];

// Список стадий для ИП (Индивидуальный предприниматель)
const ipStages = [
  'В работе ИП', 'Исполнено ИП', 'Ожидание оплаты ИП', 'Подал ИП', 'Подписание контракта',
  'Проиграл ИП', 'Просчет ЗМО', 'Просчет ИП', 'Участвую ИП', 'Выиграл ИП'
];

// Список стадий для ТА (Тендерный агент)
const taStages = [
  'В работе ТА', 'Исполнение ТА', 'Исполнено ТА', 'Ожидание оплаты ТА', 'Отправил ТА',
  'Проиграл ТА', 'Участвую ТА', 'Выиграл ТА'
];

// Базовые разрешения для всех ролей — по умолчанию доступ запрещён
const basePermissions = {
  can_view: false,
  can_edit: false,
  can_delete: false,
  can_create: false,
  ip_stages: ipStages.reduce((acc, stage) => ({ ...acc, [stage]: false }), {}),
  ta_stages: taStages.reduce((acc, stage) => ({ ...acc, [stage]: false }), {}),
  zero_purchases: false,
};

// Разрешения для роли admin — полный доступ ко всем страницам и стадиям
const adminPermissions = pages.map(page => ({
  role_id: 1, // Фиксированный id для admin
  page,
  can_view: true,
  can_edit: true,
  can_delete: true,
  can_create: true,
  ip_stages: ipStages.reduce((acc, stage) => ({ ...acc, [stage]: true }), {}),
  ta_stages: taStages.reduce((acc, stage) => ({ ...acc, [stage]: true }), {}),
  zero_purchases: true,
}));

// Исключения для роли user — явно задаём разрешения для определённых страниц
const userPermissionsExceptions = {
  home: { can_view: true }, // Только просмотр главной страницы
  tenders: { can_view: true, can_edit: true, can_create: true }, // Полный доступ к тендерам, кроме удаления
  finance: { can_view: true, can_edit: true, can_create: true }, // Полный доступ к финансам, кроме удаления
  notes: { can_view: true, can_edit: true, can_delete: true, can_create: true }, // Полный доступ к заметкам
  profile: { can_view: true, can_edit: true }, // Доступ к профилю с редактированием
  users: { can_view: false }, // Явный запрет на управление пользователями
};

// Исключения для роли moderator — промежуточный уровень доступа
const moderatorPermissionsExceptions = {
  home: { can_view: true }, // Доступ к главной странице
  tenders: { can_view: true, can_edit: true, can_create: true, can_delete: true }, // Полный доступ к тендерам
  finance: { can_view: true, can_edit: true }, // Просмотр и редактирование финансов
  analytics: { can_view: true }, // Только просмотр аналитики
  accounting: { can_view: true }, // Только просмотр бухгалтерии
  notes: { can_view: true, can_edit: true, can_delete: true, can_create: true }, // Полный доступ к заметкам
  users: { can_view: true }, // Просмотр пользователей без редактирования
  profile: { can_view: true, can_edit: true }, // Доступ к профилю с редактированием
};

// Функция для генерации разрешений для роли с динамическим id
const generatePermissionsForRole = (roleId, exceptions) => {
  return pages.map(page => {
    const exception = exceptions[page] || {};
    return {
      role_id: roleId,
      page,
      can_view: exception.can_view ?? basePermissions.can_view,
      can_edit: exception.can_edit ?? basePermissions.can_edit,
      can_delete: exception.can_delete ?? basePermissions.can_delete,
      can_create: exception.can_create ?? basePermissions.can_create,
      ip_stages: basePermissions.ip_stages,
      ta_stages: basePermissions.ta_stages,
      zero_purchases: basePermissions.zero_purchases,
    };
  });
};

// Определение ролей с динамическими id (кроме admin)
const roles = [
  { name: 'user', exceptions: userPermissionsExceptions, id: 2 },
  { name: 'moderator', exceptions: moderatorPermissionsExceptions, id: 3 },
];

// Генерация разрешений для всех ролей, кроме admin
const otherRolesPermissions = roles.map(role => 
  generatePermissionsForRole(role.id, role.exceptions)
).flat();

module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Уникальный идентификатор разрешения',
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      comment: 'Ссылка на роль в таблице roles',
      validate: {
        notNull: { msg: 'Поле role_id обязательно' },
        isInt: { msg: 'role_id должен быть целым числом' },
      },
    },
    page: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Идентификатор страницы (например, "tenders", "users", "finance")',
      validate: {
        notNull: { msg: 'Поле page обязательно' },
        len: {
          args: [1, 50],
          msg: 'Длина page должна быть от 1 до 50 символов',
        },
        is: {
          args: /^[a-z_]+$/,
          msg: 'page должен содержать только строчные буквы и подчеркивания',
        },
      },
    },
    can_view: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Разрешение на просмотр страницы',
      validate: {
        isBoolean: { msg: 'can_view должен быть булевым значением' },
      },
    },
    can_edit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Разрешение на редактирование данных на странице',
      validate: {
        isBoolean: { msg: 'can_edit должен быть булевым значением' },
      },
    },
    can_delete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Разрешение на удаление данных на странице',
      validate: {
        isBoolean: { msg: 'can_delete должен быть булевым значением' },
      },
    },
    can_create: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Разрешение на создание данных на странице',
      validate: {
        isBoolean: { msg: 'can_create должен быть булевым значением' },
      },
    },
    ip_stages: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Настройки видимости этапов ИП',
      get() {
        const value = this.getDataValue('ip_stages');
        return value === null ? {} : value;
      },
      set(value) {
        this.setDataValue('ip_stages', value === undefined || value === null ? {} : value);
      },
    },
    ta_stages: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Настройки видимости этапов ТА',
      get() {
        const value = this.getDataValue('ta_stages');
        return value === null ? {} : value;
      },
      set(value) {
        this.setDataValue('ta_stages', value === undefined || value === null ? {} : value);
      },
    },
    zero_purchases: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Настройка видимости нулевых закупок',
      validate: {
        isBoolean: { msg: 'zero_purchases должен быть булевым значением' },
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true, // Изменено на allowNull: true, так как в таблице поле NULLable
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Дата создания записи',
      validate: {
        isDate: { msg: 'created_at должен быть корректной датой' },
      },
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true, // Изменено на allowNull: true, так как в таблице поле NULLable
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Дата последнего обновления записи',
      validate: {
        isDate: { msg: 'updated_at должен быть корректной датой' },
      },
    },
  }, {
    tableName: 'permissions',
    timestamps: true, // Включено для автоматического управления created_at/updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { unique: true, fields: ['role_id', 'page'], name: 'idx_role_page_unique' },
    ],
    hooks: {
      beforeUpdate: (permission) => {
        logger.debug('Permission beforeUpdate: Подготовка к обновлению записи:', permission.toJSON());
      },
      beforeCreate: (permission) => {
        logger.debug('Permission beforeCreate: Подготовка к созданию записи:', permission.toJSON());
      },
      afterUpdate: (permission) => {
        logger.info('Permission afterUpdate: Запись успешно обновлена:', permission.toJSON());
        // Добавляем поле message для уведомления на фронтенде
        permission.message = `Разрешение для страницы "${permission.page}" (роль ${permission.role_id}) обновлено`;
      },
      afterCreate: (permission) => {
        logger.info('Permission afterCreate: Запись успешно создана:', permission.toJSON());
        // Добавляем поле message для уведомления на фронтенде
        permission.message = `Разрешение для страницы "${permission.page}" (роль ${permission.role_id}) создано`;
      },
      afterDestroy: (permission) => {
        // Добавляем хук для удаления с уведомлением
        logger.info(`Удалено разрешение для страницы "${permission.page}" (ID: ${permission.id}, роль ${permission.role_id})`);
        permission.message = `Разрешение для страницы "${permission.page}" (роль ${permission.role_id}) удалено`;
      },
    },
  });

  Permission.associate = (models) => {
    Permission.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'Role',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    logger.debug('Permission.associate: Ассоциация с моделью Role установлена');
  };

  Permission.getAvailablePages = () => {
    const availablePages = [
      { id: 'home', name: 'Главная' },
      { id: 'tenders', name: 'Тендеры' },
      { id: 'finance', name: 'Финансы' },
      { id: 'analytics', name: 'Аналитика' },
      { id: 'accounting', name: 'Бухгалтерия' },
      { id: 'investments', name: 'Инвестиции' },
      { id: 'notes', name: 'Заметки' },
      { id: 'users', name: 'Управление пользователями' },
      { id: 'gallery', name: 'Галерея' },
      { id: 'profile', name: 'Профиль' },
      { id: 'taxes', name: 'Налоги' },
      { id: 'education', name: 'Образование' },
      { id: 'health', name: 'Здоровье' },
      { id: 'recipes', name: 'Рецепты' },
      { id: 'savings', name: 'Сбережения' },
    ];
    logger.debug('Permission.getAvailablePages: Возвращён список доступных страниц:', availablePages);
    return availablePages;
  };

  Permission.defaultPermissions = [
    ...adminPermissions,
    ...otherRolesPermissions
  ];

  Permission.getSimplePages = () => pages;

  Permission.ipStages = ipStages;
  Permission.taStages = taStages;

  Permission.getRoles = () => [
    { id: 1, name: 'admin', description: 'Полный доступ ко всем функциям' },
    ...roles.map(role => ({
      id: role.id,
      name: role.name,
      description: `Роль ${role.name} с ограниченным доступом`
    }))
  ];

  return Permission;
};