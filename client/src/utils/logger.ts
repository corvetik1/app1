// src/utils/logger.ts

/**
 * Уровни логирования.
 */
export enum LogLevel {
  INFO = 'info',
  DEBUG = 'debug',
  WARN = 'warn',
  ERROR = 'error',
  OFF = 'off',
}

/**
 * Интерфейс логгера с методами для разных уровней логирования.
 */
interface Logger {
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Интерфейс для форматированного сообщения лога.
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

/**
 * Проверка, включён ли указанный уровень логирования.
 * @param {LogLevel} level - Уровень логирования для проверки.
 * @returns {boolean} Включён ли уровень.
 */
const isLevelEnabled = (level: LogLevel): boolean => {
  // Безопасный доступ к переменным окружения через window или значение по умолчанию
  const configuredLevel = (typeof process !== 'undefined' && process.env?.REACT_APP_LOG_LEVEL) || LogLevel.INFO;
  const levelsOrder = [LogLevel.OFF, LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
  const configuredIndex = levelsOrder.indexOf(configuredLevel.toLowerCase() as LogLevel);
  const levelIndex = levelsOrder.indexOf(level);
  return levelIndex <= configuredIndex && configuredIndex !== 0;
};

/**
 * Форматирование сообщения лога с временной меткой и контекстом.
 * @param {LogLevel} level - Уровень логирования.
 * @param {string} message - Основное сообщение.
 * @param {any[]} [context] - Дополнительный контекст (объекты, массивы и т.д.).
 * @returns {LogEntry} Форматированный объект лога.
 */
const formatLogEntry = (level: LogLevel, message: string, context: any[] = []): LogEntry => {
  const timestamp = new Date().toISOString();
  const formattedContext = context.length > 0 ? context : undefined;
  return { timestamp, level, message, context: formattedContext };
};

/**
 * Экземпляр логгера для вывода сообщений в консоль.
 * Поддерживает уровни логирования: info, debug, warn, error.
 */
const logger: Logger = {
  info: (message: string, ...context: any[]) => {
    if (isLevelEnabled(LogLevel.INFO)) {
      const entry = formatLogEntry(LogLevel.INFO, message, context);
      console.log(`[${entry.timestamp}] [INFO] ${entry.message}`, ...(entry.context || []));
    }
  },

  debug: (message: string, ...context: any[]) => {
    if (isLevelEnabled(LogLevel.DEBUG)) {
      const entry = formatLogEntry(LogLevel.DEBUG, message, context);
      console.debug(`[${entry.timestamp}] [DEBUG] ${entry.message}`, ...(entry.context || []));
    }
  },

  warn: (message: string, ...context: any[]) => {
    if (isLevelEnabled(LogLevel.WARN)) {
      const entry = formatLogEntry(LogLevel.WARN, message, context);
      console.warn(`[${entry.timestamp}] [WARN] ${entry.message}`, ...(entry.context || []));
    }
  },

  error: (message: string, ...context: any[]) => {
    if (isLevelEnabled(LogLevel.ERROR)) {
      const entry = formatLogEntry(LogLevel.ERROR, message, context);
      console.error(`[${entry.timestamp}] [ERROR] ${entry.message}`, ...(entry.context || []));
    }
  },
};

/**
 * Инициализация логгера с выводом начального сообщения.
 */
const initializeLogger = () => {
  const configuredLevel = (typeof process !== 'undefined' && process.env?.REACT_APP_LOG_LEVEL) || LogLevel.INFO;
  logger.info('Logger инициализирован', { logLevel: configuredLevel, environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown' });
};

initializeLogger();

export default logger;