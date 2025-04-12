// C:\rezerv\app\server\config\sequelize.js
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    logger.info(`Директория для логов создана: ${logDir}`);
  } catch (error) {
    logger.error(`Не удалось создать директорию для логов ${logDir}`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
} else {
  logger.info(`Директория для логов уже существует: ${logDir}`);
}

const requiredEnvVars = process.env.NODE_ENV === 'test' ? [] : ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Не указаны обязательные переменные окружения`, {
    missing: missingEnvVars.join(', '),
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
}

const sequelize = new Sequelize({
  dialect: process.env.NODE_ENV === 'test' ? 'sqlite' : 'mysql',
  storage: process.env.NODE_ENV === 'test' ? ':memory:' : undefined,
  host: process.env.NODE_ENV !== 'test' ? process.env.DB_HOST : undefined,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dialectOptions: process.env.NODE_ENV !== 'test' ? {
    charset: 'utf8mb4',
    connectTimeout: 30000,
    decimalNumbers: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
  } : undefined,
  pool: process.env.NODE_ENV !== 'test' ? {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 60000,
    idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    evict: 60000,
    handleDisconnects: true,
  } : undefined,
  logging: process.env.DB_LOG_QUERIES === 'true' ? (msg) => logger.debug(msg) : false,
  retry: process.env.NODE_ENV !== 'test' ? {
    max: 5,
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /EPIPE/,
      /SequelizeConnectionError/,
      /SequelizeDatabaseError/,
    ],
    backoffBase: 1000,
    backoffExponent: 1.5,
  } : undefined,
  timezone: process.env.DB_TIMEZONE || '+00:00',
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    paranoid: false,
  },
});

let modelsPromise = null;

async function loadModels(sequelizeInstance) {
  const modelFiles = {
    User: '../models/user',
    Role: '../models/role',
    Permission: '../models/permission',
    Tender: '../models/tender',
    Report: '../models/report',
    Transaction: '../models/transaction',
    CreditCard: '../models/credit_card',
    DebitCard: '../models/debit_card',
    DolgTable: '../models/dolg_table',
    Loan: '../models/loan',
    HeaderNote: '../models/headerNote',
    VisibilitySetting: '../models/visibilitySetting',
    TenderBudget: '../models/tenderBudget',
    Document: '../models/document',
  };

  const models = {};

  for (const [modelName, modelPath] of Object.entries(modelFiles)) {
    logger.info(`Загрузка модели: ${modelName} из ${modelPath}`);
    try {
      const fullPath = path.resolve(__dirname, modelPath);
      if (!fs.existsSync(`${fullPath}.js`)) {
        logger.error(`Файл модели ${modelName} не найден`, { path: fullPath });
        throw new Error(`Модель ${modelName} не найдена`);
      }
      const modelModule = require(fullPath);
      models[modelName] = modelModule(sequelizeInstance);
      logger.debug(`Модель ${modelName} успешно загружена`);
    } catch (error) {
      logger.error(`Ошибка загрузки модели ${modelName}`, {
        message: error.message,
        stack: error.stack,
        path: modelPath,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  logger.info(`Загруженные модели: ${Object.keys(models).join(', ')}`);

  for (const modelName of Object.keys(models)) {
    if (models[modelName].associate) {
      logger.info(`Регистрация ассоциаций для модели: ${modelName}`);
      try {
        models[modelName].associate(models);
        logger.debug(`Ассоциации для ${modelName} успешно зарегистрированы`);
      } catch (error) {
        logger.error(`Ошибка регистрации ассоциаций для модели ${modelName}`, {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    }
  }

  return models;
}

async function checkMySQLVersion() {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Тестовая среда SQLite, проверка версии MySQL пропущена');
    return true;
  }

  try {
    const [results] = await sequelize.query('SHOW VARIABLES LIKE "version";');
    const version = results.find((row) => row.Variable_name === 'version')?.Value || '0.0.0';
    const isMariaDB = version.includes('MariaDB');
    const majorMinor = version.split('.').slice(0, 2).join('.');
    if (parseFloat(majorMinor) < 5.7) {
      logger.error(`MySQL версия ${version} не поддерживает тип JSON`, {
        required: '5.7 или выше',
        timestamp: new Date().toISOString(),
      });
      throw new Error('Версия MySQL ниже 5.7, тип JSON не поддерживается');
    }
    logger.info(`${isMariaDB ? 'MariaDB' : 'MySQL'} версия ${version} поддерживает тип JSON`);
    return true;
  } catch (error) {
    logger.error(`Ошибка проверки версии MySQL`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database,
      host: sequelize.config.host,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function checkTableExistence(tableName) {
  try {
    const [results] = await sequelize.query(`SHOW TABLES LIKE '${tableName}'`, { retry: { max: 3 } });
    const exists = results.length > 0;
    logger.info(`Таблица ${tableName} ${exists ? 'существует' : 'не существует'}`);
    return exists;
  } catch (error) {
    logger.error(`Ошибка проверки существования таблицы ${tableName}`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database || 'sqlite',
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

async function cleanExtraIndexes(tableName, expectedIndexes) {
  try {
    if (!(await checkTableExistence(tableName))) {
      logger.warn(`Таблица ${tableName} не существует, пропускаем проверку индексов`);
      return;
    }

    const [indexes] = await sequelize.query(`SHOW INDEXES FROM ${tableName}`);
    const currentIndexes = indexes.map(index => index.Key_name);

    const [tableInfo] = await sequelize.query(`SHOW CREATE TABLE ${tableName}`);
    const createTableStatement = tableInfo[0]['Create Table'];
    const foreignKeyIndexes = new Set();
    const fkRegex = /CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\)/g;
    let match;
    while ((match = fkRegex.exec(createTableStatement)) !== null) {
      const field = match[2];
      const indexName = indexes.find(index => index.Column_name === field && index.Key_name !== 'PRIMARY')?.Key_name;
      if (indexName) foreignKeyIndexes.add(indexName);
    }

    const expectedIndexNames = expectedIndexes.map(index => index.name || `${index.unique ? 'unique' : tableName}_${index.fields.join('_')}`).concat(['PRIMARY']);
    const extraIndexes = currentIndexes.filter(index => !expectedIndexNames.includes(index) && !foreignKeyIndexes.has(index));

    for (const index of extraIndexes) {
      if (index !== 'PRIMARY') {
        try {
          await sequelize.query(`DROP INDEX ${index} ON ${tableName}`);
          logger.info(`Удалён лишний индекс ${index} из таблицы ${tableName}`);
        } catch (dropError) {
          logger.warn(`Не удалось удалить индекс ${index} из таблицы ${tableName}`, {
            message: dropError.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    logger.info(`Таблица ${tableName}: найдено ${indexes.length} индексов, лишних удалено: ${extraIndexes.length}`);
  } catch (error) {
    logger.error(`Ошибка проверки/очистки индексов для ${tableName}`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database || 'sqlite',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function checkIndexes(tableName) {
  try {
    if (!(await checkTableExistence(tableName))) {
      logger.warn(`Таблица ${tableName} не существует`);
      return null;
    }

    const [indexes] = await sequelize.query(`SHOW INDEXES FROM ${tableName}`);
    logger.info(`Индексы таблицы ${tableName}: ${indexes.length} найдено`);
    return indexes;
  } catch (error) {
    logger.error(`Ошибка проверки индексов таблицы ${tableName}`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database || 'sqlite',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function runMigrations() {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Тестовая среда SQLite, миграции пропущены');
    return;
  }

  try {
    const umzug = new Umzug({
      migrations: { glob: path.join(__dirname, '../migrations/*.js') },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: {
        info: (msg) => logger.info(`Umzug: ${msg}`),
        warn: (msg) => logger.warn(`Umzug: ${msg}`),
        error: (msg) => logger.error(`Umzug: ${msg}`),
      },
    });
    await umzug.up();
    logger.info('Миграции успешно выполнены');
  } catch (error) {
    logger.error(`Ошибка выполнения миграций`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function initializeDatabase(options = {}) {
  try {
    logger.info('Инициализация базы данных начата');
    await sequelize.authenticate();
    logger.info('Подключение к базе данных успешно установлено', {
      database: sequelize.config.database || 'sqlite',
      host: sequelize.config.host || 'memory',
    });

    if (process.env.NODE_ENV !== 'test') {
      await checkMySQLVersion();
      await runMigrations();
    } else {
      await sequelize.sync({ force: true });
      logger.info('Таблицы созданы в тестовой SQLite базе');
    }

    const models = await getModels();

    logger.info('Проверка существования таблиц перед завершением инициализации');
    const tableChecks = await Promise.all(
      Object.keys(models).map(modelName => checkTableExistence(models[modelName].tableName))
    );
    if (tableChecks.some(check => !check)) {
      logger.warn('Некоторые таблицы отсутствуют после инициализации');
    }

    logger.info('Инициализация базы данных завершена');
    return true;
  } catch (error) {
    logger.error(`Ошибка инициализации базы данных`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database || 'sqlite',
      host: sequelize.config.host || 'memory',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function getModels() {
  if (!modelsPromise) {
    logger.info('Инициализация кэширования моделей');
    modelsPromise = loadModels(sequelize);
  }
  try {
    const models = await modelsPromise;
    logger.info('Модели успешно извлечены из кэша', {
      modelCount: Object.keys(models).length,
    });
    return models;
  } catch (error) {
    logger.error(`Ошибка получения кэшированных моделей`, {
      message: error.message,
      stack: error.stack,
      database: sequelize.config.database || 'sqlite',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

process.on('uncaughtException', (error) => {
  logger.error(`Необработанное исключение`, {
    message: error.message,
    stack: error.stack,
    database: sequelize.config.database || 'sqlite',
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Необработанное отклонение промиса`, {
    reason: reason.message || reason,
    stack: reason.stack || 'нет стека',
    promise: JSON.stringify(promise),
    database: sequelize.config.database || 'sqlite',
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

module.exports = {
  sequelize,
  initializeDatabase,
  getModels,
  syncDatabase: async (options) => {
    logger.warn('syncDatabase устарела, используйте initializeDatabase для миграций');
    await sequelize.sync(options);
  },
  testConnection: async () => {
    try {
      await sequelize.authenticate();
      logger.info('Подключение к базе данных успешно проверено');
      return true;
    } catch (error) {
      logger.error(`Ошибка проверки подключения`, {
        message: error.message,
        stack: error.stack,
        database: sequelize.config.database || 'sqlite',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  },
  getDatabaseStatus: async () => {
    try {
      const models = await getModels();
      const isSQLite = process.env.NODE_ENV === 'test';
      const versionQuery = isSQLite ? 'SELECT sqlite_version() AS version' : 'SHOW VARIABLES LIKE "version";';
      const [versionResults] = await sequelize.query(versionQuery);
      const version = isSQLite ? versionResults[0].version : versionResults.find(row => row.Variable_name === 'version')?.Value || 'Неизвестно';
      return {
        connected: true,
        database: sequelize.config.database || 'sqlite',
        host: sequelize.config.host || 'memory',
        version,
        pool: isSQLite ? { active: 0, idle: 0, waiting: 0 } : {
          active: sequelize.connectionManager.pool._active.size,
          idle: sequelize.connectionManager.pool._idle.size,
          waiting: sequelize.connectionManager.pool._waiting.size,
        },
        modelsLoaded: Object.keys(models),
        userCount: await models.User.count(),
      };
    } catch (error) {
      logger.error(`Ошибка получения статуса базы данных`, {
        message: error.message,
        stack: error.stack,
        database: sequelize.config.database || 'sqlite',
        timestamp: new Date().toISOString(),
      });
      return { connected: false, error: error.message };
    }
  },
  checkIndexes,
  cleanExtraIndexes,
  runMigrations,
};