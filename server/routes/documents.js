const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Импорт логгера для диагностики

// Проверка импорта middleware и контроллера
let authenticateToken, requirePermission, documentController;
try {
  ({ authenticateToken, requirePermission } = require('../middleware/authenticate'));
  documentController = require('../controllers/document');
  logger.debug('Middleware authenticate и контроллер document успешно импортированы');
} catch (error) {
  logger.error(`Ошибка импорта middleware или контроллера document: ${error.message}, стек: ${error.stack}`);
  throw error; // Прерываем выполнение, если зависимости не найдены
}

const { uploadDocuments, deleteDocument } = documentController;

// Логирование начала загрузки маршрутов документов
logger.debug('Инициализация маршрутов документов в documents.js');

// Маршрут для загрузки документов (POST /api/upload)
router.post('/upload', authenticateToken, requirePermission('tenders', 'create'), (req, res, next) => {
  logger.debug(`Получен запрос на загрузку документов: ${req.method} ${req.originalUrl}, пользователь: ${req.user?.id || 'неизвестен'}`);
  uploadDocuments(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте POST /upload: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Маршрут для удаления документа (DELETE /api/documents/:id)
router.delete('/:id', authenticateToken, requirePermission('tenders', 'delete'), (req, res, next) => {
  logger.debug(`Получен запрос на удаление документа: ${req.method} ${req.originalUrl}, id: ${req.params.id}, пользователь: ${req.user?.id || 'неизвестен'}`);
  deleteDocument(req, res, next).catch((error) => {
    logger.error(`Ошибка в маршруте DELETE /documents/:id: ${error.message}, стек: ${error.stack}`);
    next(error); // Передача ошибки в глобальный обработчик
  });
});

// Логирование завершения настройки маршрутов
logger.debug('Маршруты документов успешно настроены в documents.js');

module.exports = router;