// C:\rezerv\app\server\controllers\documents.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера documents.js');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.debug(`Директория uploads создана: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    logger.debug(`Загрузка файла: ${file.originalname} как ${uniqueName}`);
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      logger.warn(`Недопустимый тип файла: ${file.mimetype} для пользователя ${req.user?.id}`);
      return cb(new Error('Недопустимый тип файла. Разрешены: JPEG, PNG, PDF'));
    }
    cb(null, true);
  },
}).array('files');

const uploadDocuments = async (req, res) => {
  logger.debug(`Получен запрос на загрузку документов для пользователя: ${req.user?.id || 'неизвестен'}`);

  upload(req, res, async (err) => {
    if (err) {
      logger.error(`Ошибка при загрузке файлов: ${err.message}, стек: ${err.stack}`);
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      logger.warn(`Файлы не загружены пользователем ${req.user?.id}`);
      return res.status(400).json({ error: 'Файлы не загружены' });
    }

    const { tender_id } = req.body;
    if (!tender_id) {
      logger.warn(`tender_id обязателен для пользователя ${req.user?.id}`);
      return res.status(400).json({ error: 'tender_id обязателен' });
    }

    try {
      logger.debug('Получение моделей из sequelize');
      const models = await getModels();
      const { Tender, Document } = models;
      logger.debug('Модели Tender и Document успешно получены');

      logger.debug(`Поиск тендера с id: ${tender_id}`);
      const tender = await Tender.findByPk(tender_id);
      if (!tender || (tender.user_id !== req.user.id && req.user.role !== 'admin')) {
        logger.warn(`Тендер не найден или доступ запрещён: id=${tender_id}, пользователь: ${req.user.id}`);
        return res.status(403).json({ error: 'Тендер не найден или доступ запрещён' });
      }
      logger.debug(`Тендер найден: id=${tender.id}`);

      logger.debug('Создание записей о загруженных документах');
      const documents = req.files.map((file) => ({
        tender_id,
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      const createdDocs = await Document.bulkCreate(documents);
      logger.debug(`Создано ${createdDocs.length} записей о документах`);

      logger.debug('Отправка уведомления через WebSocket');
      if (req.io) {
        const socketId = socketMap.get(req.user.id);
        if (socketId) {
          req.io.to(socketId).emit('documentsUploaded', createdDocs);
          logger.debug(`Уведомление о загрузке документов отправлено для socketId: ${socketId}`);
        }
      } else {
        logger.warn('req.io не определён, уведомление WebSocket не отправлено');
      }

      logger.info(`Документы загружены пользователем ${req.user.id}: ${createdDocs.length} файлов для тендера id=${tender_id}`);
      res.json({ message: 'Файлы успешно загружены', documents: createdDocs });
    } catch (error) {
      logger.error(`Ошибка при сохранении документов: ${error.message}, стек: ${error.stack}`);
      res.status(500).json({ error: 'Ошибка сервера при загрузке файлов', details: error.message });
    }
  });
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление документа: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Document, Tender } = models;
    logger.debug('Модели Document и Tender успешно получены');

    logger.debug(`Поиск документа с id: ${id}`);
    const document = await Document.findByPk(id, {
      include: [{ model: Tender, as: 'Tender' }],
    });
    if (!document || (document.Tender.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Документ не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Документ не найден или доступ запрещён' });
    }
    logger.debug(`Документ найден: id=${document.id}, filename=${document.filename}`);

    logger.debug('Удаление файла с диска');
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(document.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`Файл удалён с диска: ${filePath}`);
    } else {
      logger.warn(`Файл не найден на диске: ${filePath}`);
    }

    logger.debug('Удаление документа из базы данных');
    await document.destroy();
    logger.debug(`Документ удалён из базы: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('documentDeleted', { id });
        logger.debug(`Уведомление об удалении документа отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Документ удалён пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Документ удалён' });
  } catch (error) {
    logger.error(`Ошибка при удалении документа: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении документа', details: error.message });
  }
};

logger.debug('Контроллер documents.js успешно инициализирован');
module.exports = { uploadDocuments, deleteDocument };