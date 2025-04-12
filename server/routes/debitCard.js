const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, debitCardController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  debitCardController = require('../controllers/debitcard');
  logger.debug('Middleware authenticate и контроллер debitcard успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера debitcard: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getDebitCards, createDebitCard, deleteDebitCard } = debitCardController;

// Логирование начала загрузки маршрутов дебетовых карт
logger.debug('Инициализация маршрутов дебетовых карт в debitcard.js');

// Маршрут для получения списка дебетовых карт (GET /api/debit_cards)
router.get('/', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список дебетовых карт: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getDebitCards(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /debit_cards: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания новой дебетовой карты (POST /api/debit_cards)
router.post('/', authenticateToken, requirePermission('finance', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание дебетовой карты: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createDebitCard(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /debit_cards: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления дебетовой карты (DELETE /api/debit_cards/:id)
router.delete('/:id', authenticateToken, requirePermission('finance', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление дебетовой карты: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteDebitCard(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /debit_cards/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты дебетовых карт успешно настроены в debitcard.js');

module.exports = router;