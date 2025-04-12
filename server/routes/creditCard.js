const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, creditCardController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  creditCardController = require('../controllers/creditcard');
  logger.debug('Middleware authenticate и контроллер creditcard успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера creditcard: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard } = creditCardController;

// Логирование начала загрузки маршрутов кредитных карт
logger.debug('Инициализация маршрутов кредитных карт в creditcard.js');

// Маршрут для получения списка кредитных карт (GET /api/credit_cards)
router.get('/', authenticateToken, requirePermission('finance', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список кредитных карт: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getCreditCards(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /credit_cards: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания новой кредитной карты (POST /api/credit_cards)
router.post('/', authenticateToken, requirePermission('finance', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание кредитной карты: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createCreditCard(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /credit_cards: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления кредитной карты (PUT /api/credit_cards/:id)
router.put('/:id', authenticateToken, requirePermission('finance', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление кредитной карты: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateCreditCard(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /credit_cards/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления кредитной карты (DELETE /api/credit_cards/:id)
router.delete('/:id', authenticateToken, requirePermission('finance', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление кредитной карты: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteCreditCard(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /credit_cards/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты кредитных карт успешно настроены в creditcard.js');

module.exports = router;