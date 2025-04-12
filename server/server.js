// C:\rezerv\app\server\server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { initWebSocket, disconnectSocket } = require('./sockets');
const { sequelize, initializeDatabase, getModels, getDatabaseStatus } = require('./config/sequelize'); // Добавлен импорт sequelize
const logger = require('./utils/logger');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket'],
});

const PORT = process.env.PORT || 5000;
const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  logger.error('SECRET_KEY не задан в .env, сервер не может запуститься');
  process.exit(1);
}

logger.debug('Запуск сервера начат', {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  pid: process.pid,
  memoryUsage: process.memoryUsage(),
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Слишком много запросов с вашего IP, попробуйте позже' },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.static(path.join(__dirname, 'uploads'))); // Добавлено для отдачи файлов

app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const startTime = Date.now();
  logger.info(`Запрос: ${req.method} ${req.originalUrl} от IP: ${clientIp}`, {
    userAgent: req.headers['user-agent'] || 'не указан',
    userId: req.user?.id || 'не авторизован',
    timestamp: new Date().toISOString(),
  });
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.debug(`Ответ: ${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'не авторизован',
    });
  });
  next();
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

global.isSyncing = false; // Оставлено, но может быть удалено, если не используется

async function startServer() {
  try {
    await initializeDatabase();
    logger.info('База данных инициализирована', {
      timestamp: new Date().toISOString(),
      pid: process.pid,
    });

    initWebSocket(server);
    logger.debug('WebSocket инициализирован', { timestamp: new Date().toISOString() });

    try {
      app.use('/api', require('./routes')(io));
      logger.debug('Маршруты подключены через /api', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn('Ошибка подключения маршрутов', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    app.get('/api/health', async (req, res) => {
      try {
        const dbStatus = await getDatabaseStatus();
        const health = {
          status: 'healthy',
          server: {
            uptime: process.uptime(),
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            pid: process.pid,
            environment: process.env.NODE_ENV || 'development',
          },
          database: {
            connected: dbStatus.connected,
            name: dbStatus.database,
            host: dbStatus.host,
            version: dbStatus.version,
            pool: dbStatus.pool,
            modelCount: dbStatus.modelsLoaded.length,
            userCount: dbStatus.userCount,
          },
          websocket: {
            connectedClients: io.engine.clientsCount,
          },
          timestamp: new Date().toISOString(),
        };

        logger.info('Проверка состояния сервера выполнена', {
          status: health.status,
          uptime: health.server.uptime,
          dbConnected: health.database.connected,
          wsClients: health.websocket.connectedClients,
        });

        res.status(200).json(health);
      } catch (error) {
        logger.error('Ошибка проверки состояния сервера', {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        res.status(500).json({
          status: 'unhealthy',
          error: 'Ошибка проверки состояния',
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    app.use(errorHandler);

    server.listen(PORT, () => {
      logger.info(`Сервер запущен на порту ${PORT}`, {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
      });
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    logger.error('Ошибка при запуске сервера', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    console.error(`Ошибка: ${error.message}`);
    process.exit(1);
  }
}

const gracefulShutdown = async (signal) => {
  logger.info(`Получен сигнал ${signal}, начало завершения работы сервера`, {
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });

  try {
    io.close(() => {
      logger.info('WebSocket-сервер закрыт');
    });
    disconnectSocket();
    logger.info('WebSocket-соединения очищены');

    await new Promise((resolve) => {
      server.close(() => {
        logger.info('HTTP-сервер закрыт');
        resolve();
      });
    });

    await sequelize.close(); // Используется импортированный sequelize
    logger.info('Соединение с базой данных закрыто');

    logger.info('Сервер успешно остановлен', { timestamp: new Date().toISOString() });
    process.exit(0);
  } catch (error) {
    logger.error('Ошибка при завершении работы сервера', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memoryUsage: process.memoryUsage(),
  });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Необработанный отказ промиса', {
    reason: reason.message || reason,
    stack: reason.stack || 'нет стека',
    promise: JSON.stringify(promise),
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
  gracefulShutdown('unhandledRejection');
});

startServer();