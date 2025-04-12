// C:\rezerv\app\server\sockets\index.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize'); // Для проверки пользователя в базе
const { Op } = require('sequelize');

// Хранилища для отслеживания онлайн-пользователей и их сокетов
const onlineUsers = new Set(); // Онлайн-пользователи
const socketMap = new Map(); // Соответствие userId -> socketId

/**
 * Инициализация WebSocket-сервера с улучшенной конфигурацией
 * @param {http.Server} server - HTTP-сервер для подключения Socket.IO
 * @returns {Server} Экземпляр Socket.IO
 */
const initWebSocket = (server) => {
  // Конфигурация Socket.IO с настройками из .env
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Настраиваемый CORS
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT, 10) || 60000, // Таймаут отключения
    pingInterval: parseInt(process.env.WS_PING_INTERVAL, 10) || 25000, // Интервал проверки
    transports: process.env.WS_TRANSPORTS ? process.env.WS_TRANSPORTS.split(',') : ['websocket'], // Транспорт из .env
    maxHttpBufferSize: 1e6, // Ограничение размера буфера (1MB)
    perMessageDeflate: { // Сжатие сообщений
      threshold: 1024, // Сжимать сообщения больше 1KB
    },
  });

  // Middleware для аутентификации через JWT и проверки пользователя в базе
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      logger.warn(`WebSocket: Токен не предоставлен для socketId=${socket.id}`);
      return next(new Error('Токен не предоставлен'));
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const models = await getModels();
      const { User } = models;
      
      // Проверка существования пользователя в базе
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        logger.warn(`WebSocket: Пользователь не найден или неактивен для userId=${decoded.id}, socketId=${socket.id}`);
        return next(new Error('Недействительный пользователь'));
      }

      socket.user = { id: decoded.id, role: decoded.role }; // Добавляем данные в сокет
      logger.debug(`WebSocket: Токен проверен для userId=${decoded.id}, role=${decoded.role}, socketId=${socket.id}`);
      next();
    } catch (err) {
      logger.warn(`WebSocket: Ошибка проверки токена для socketId=${socket.id}: ${err.message}`);
      return next(new Error('Недействительный токен'));
    }
  });

  // Обработка подключения клиента
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;
    logger.info(`WebSocket: Клиент подключён, userId=${userId}, role=${role}, socketId=${socket.id}`);

    // Добавление пользователя в список онлайн
    onlineUsers.add(userId);
    socketMap.set(userId, socket.id);
    io.emit('user_status_update', { userId, status: 'online', role });
    logger.debug(`WebSocket: Событие user_status_update отправлено: userId=${userId}, status=online`);

    // Событие: пользователь подтверждает онлайн-статус
    socket.on('user_online', (data) => {
      if (!data || !data.userId) {
        logger.warn(`WebSocket: Получен user_online без userId от socketId=${socket.id}`);
        socket.emit('error', { message: 'userId обязателен' });
        return;
      }

      if (data.userId !== userId) {
        logger.warn(`WebSocket: Несоответствие userId=${data.userId} в user_online для аутентифицированного userId=${userId}, socketId=${socket.id}`);
        socket.emit('error', { message: 'Несанкционированный userId' });
        return;
      }

      logger.info(`WebSocket: Пользователь онлайн, userId=${data.userId}, socketId=${socket.id}`);
      onlineUsers.add(data.userId);
      socketMap.set(data.userId, socket.id);
      io.emit('user_status_update', { userId: data.userId, status: 'online', role });
    });

    // Событие: пользователь подтверждает оффлайн-статус
    socket.on('user_offline', (data) => {
      if (!data || !data.userId) {
        logger.warn(`WebSocket: Получен user_offline без userId от socketId=${socket.id}`);
        socket.emit('error', { message: 'userId обязателен' });
        return;
      }

      if (data.userId !== userId) {
        logger.warn(`WebSocket: Несоответствие userId=${data.userId} в user_offline для аутентифицированного userId=${userId}, socketId=${socket.id}`);
        socket.emit('error', { message: 'Несанкционированный userId' });
        return;
      }

      logger.info(`WebSocket: Пользователь оффлайн, userId=${data.userId}, socketId=${socket.id}`);
      onlineUsers.delete(data.userId);
      socketMap.delete(data.userId);
      io.emit('user_status_update', { userId: data.userId, status: 'offline', role });
    });

    // Событие: принудительное отключение
    socket.on('forceDisconnect', (data) => {
      logger.info(`WebSocket: Принудительное отключение для userId=${userId}, socketId=${socket.id}, причина: ${data?.reason || 'не указана'}`);
      socket.disconnect(true);
    });

    // Событие: кастомное сообщение (пример расширения)
    socket.on('message', (data) => {
      logger.debug(`WebSocket: Получено сообщение от userId=${userId}, socketId=${socket.id}: ${JSON.stringify(data)}`);
      socket.emit('messageResponse', { received: data, timestamp: new Date() });
    });

    // Обработка отключения клиента
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket: Клиент отключён, userId=${userId}, socketId=${socket.id}, причина: ${reason}`);
      onlineUsers.delete(userId);
      socketMap.delete(userId);
      io.emit('user_status_update', { userId, status: 'offline', role });
    });

    // Обработка ошибок сокета
    socket.on('error', (error) => {
      logger.error(`WebSocket: Ошибка сокета для userId=${userId}, socketId=${socket.id}: ${error.message}`);
    });
  });

  // Логирование состояния сервера
  logger.info(`WebSocket-сервер инициализирован с pingTimeout=${io.engine.pingTimeout}, pingInterval=${io.engine.pingInterval}`);
  return io;
};

/**
 * Завершение всех WebSocket-соединений
 * Очищает списки onlineUsers и socketMap
 */
const disconnectSocket = () => {
  onlineUsers.clear();
  socketMap.clear();
  logger.info('Все WebSocket-соединения очищены');
};

/**
 * Получение списка онлайн-пользователей
 * @returns {Array} Массив ID онлайн-пользователей
 */
const getOnlineUsers = () => Array.from(onlineUsers);

/**
 * Проверка статуса пользователя
 * @param {number} userId - ID пользователя
 * @returns {boolean} Онлайн или нет
 */
const isUserOnline = (userId) => onlineUsers.has(userId);

/**
 * Получение socketId по userId
 * @param {number} userId - ID пользователя
 * @returns {string|null} Socket ID или null
 */
const getSocketId = (userId) => socketMap.get(userId);

module.exports = { 
  initWebSocket, 
  disconnectSocket, // Добавлена функция для завершения соединений
  onlineUsers, 
  socketMap, 
  getOnlineUsers, 
  isUserOnline, 
  getSocketId 
};