const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requireAdmin, visibilitySettingsController;
try {
  ({ authenticateToken, requireAdmin } = require('../middleware/authenticate'));
  visibilitySettingsController = require('../controllers/visibilitySettings');
  logger.debug('Middleware authenticate и контроллер visibilitySettings успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера visibilitySettings: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getVisibilitySettings, createVisibilitySetting, updateVisibilitySetting, deleteVisibilitySetting } = visibilitySettingsController;

// Логирование начала загрузки маршрутов настроек видимости
logger.debug('Инициализация маршрутов настроек видимости в visibilitySettings.js');

// Маршрут для получения списка настроек видимости (GET /api/visibility-settings)
router.get('/', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на список настроек видимости: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getVisibilitySettings(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /visibility-settings: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания новой настройки видимости (POST /api/visibility-settings)
router.post('/', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на создание настройки видимости: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createVisibilitySetting(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /visibility-settings: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления настройки видимости (PUT /api/visibility-settings/:id)
router.put('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на обновление настройки видимости: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateVisibilitySetting(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /visibility-settings/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления настройки видимости (DELETE /api/visibility-settings/:id)
router.delete('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  logger.debug(`Получен запрос на удаление настройки видимости: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteVisibilitySetting(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /visibility-settings/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты настроек видимости успешно настроены в visibilitySettings.js');

module.exports = router;