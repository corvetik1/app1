const logger = require('../utils/logger');

const setSyncingHeader = (req, res, next) => {
  // Устанавливаем начальное значение заголовка X-Syncing как 'false'
  res.setHeader('X-Syncing', 'false');

  // Сохраняем оригинальную функцию res.json
  const originalJson = res.json;

  // Переопределяем res.json для установки X-Syncing в 'true' перед отправкой ответа
  res.json = function (data) {
    res.setHeader('X-Syncing', 'true');
    logger.debug(`Установлен заголовок X-Syncing: true для запроса ${req.method} ${req.url}`);
    return originalJson.call(this, data);
  };

  next(); // Переходим к следующему middleware или обработчику маршрута
};

module.exports = setSyncingHeader;