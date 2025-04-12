// C:\rezerv\app\server\utils\formatNumber.js
const logger = require('../utils/logger'); // Исправлен путь

const formatNumber = (value, options = { maximumFractionDigits: 2 }) => {
  try {
    if (!value && value !== 0) {
      logger.debug(`formatNumber: пустое значение, возвращаем пустую строку`);
      return '';
    }

    const cleanedValue = String(value).replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleanedValue);

    if (isNaN(num)) {
      logger.warn(`formatNumber: не удалось преобразовать '${value}' в число, возвращаем исходное значение`);
      return value;
    }

    const formatted = num.toLocaleString('ru-RU', options);
    logger.debug(`formatNumber: успешно отформатировано ${value} в ${formatted}`);
    return formatted;
  } catch (error) {
    logger.error(`Ошибка в formatNumber для значения '${value}': ${error.message}, стек: ${error.stack}`);
    return value;
  }
};

module.exports = formatNumber;