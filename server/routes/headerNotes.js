const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, headerNotesController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  headerNotesController = require('../controllers/headernotes');
  logger.debug('Middleware authenticate и контроллер headernotes успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера headernotes: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { getHeaderNotes, createHeaderNote, updateHeaderNote, deleteHeaderNote } = headerNotesController;

// Логирование начала загрузки маршрутов заметок в заголовке
logger.debug('Инициализация маршрутов заметок в заголовке в headernotes.js');

// Маршрут для получения списка заметок (GET /api/header_notes)
router.get('/', authenticateToken, requirePermission('notes', 'view'), (req, res, next) => {
  logger.debug(`Получен запрос на список заметок в заголовке: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  getHeaderNotes(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте GET /header_notes: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для создания новой заметки (POST /api/header_notes)
router.post('/', authenticateToken, requirePermission('notes', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на создание заметки в заголовке: ${req.method} ${req.originalUrl}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  createHeaderNote(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /header_notes: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для обновления заметки (PUT /api/header_notes/:id)
router.put('/:id', authenticateToken, requirePermission('notes', 'edit'), (req, res, next) => {
  logger.debug(`Получен запрос на обновление заметки в заголовке: ${req.method} ${req.originalUrl}, id: ${req.params.id}, тело запроса: ${JSON.stringify(req.body)}, пользователь: ${req.user?.id || 'неизвестен'}`);
  updateHeaderNote(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте PUT /header_notes/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления заметки (DELETE /api/header_notes/:id)
router.delete('/:id', authenticateToken, requirePermission('notes', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление заметки в заголовке: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteHeaderNote(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /header_notes/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты заметок в заголовке успешно настроены в headernotes.js');

module.exports = router;