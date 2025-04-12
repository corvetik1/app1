// C:\rezerv\app\server\utils\logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Определение директории для логов
const logDir = path.join(__dirname, '../logs');

// Создание директории, если она не существует
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Формат логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Временная метка в формате ISO
  winston.format.printf(({ timestamp, level, message }) => 
    `${timestamp} [${level.toUpperCase()}]: ${message}` // Формат: "дата [УРОВЕНЬ]: сообщение"
  )
);

// Создание логгера
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Уровень логирования из .env или 'info' по умолчанию
  format: logFormat,
  transports: [
    // Вывод в консоль с цветами
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Цветной вывод в консоли
        winston.format.simple() // Простой формат для консоли
      ),
    }),
    // Все логи в logs/server.log
    new winston.transports.File({
      filename: path.join(logDir, 'server.log'), // Исправлен путь для консистентности с logDir
      maxsize: 5242880, // 5MB - максимальный размер файла
      maxFiles: 5, // Максимум 5 файлов ротации
      tailable: true, // Поддержка ротации с перезаписью
    }),
    // Только ошибки в logs/error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error', // Только ошибки
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exceptionHandlers: [
    // Необработанные исключения в logs/exceptions.log
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
});

// Адаптация для продакшена
if (process.env.NODE_ENV === 'production') {
  logger.level = 'info'; // Устанавливаем уровень 'info' в продакшене
}

module.exports = logger;