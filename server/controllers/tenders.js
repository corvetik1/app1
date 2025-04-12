// C:\rezerv\app\server\controllers\tenders.js
const logger = require('../utils/logger');
const { getModels } = require('../config/sequelize');
const { socketMap } = require('../sockets');

logger.debug('Инициализация контроллера tenders.js');

const formatTender = (tender) => {
  try {
    const formatNumber = (value) => {
      if (!value && value !== 0) return '';
      const num = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
      return isNaN(num) ? value : num.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    };
    return {
      ...tender.toJSON(),
      nmck: formatNumber(tender.nmck),
      quantity: formatNumber(tender.quantity),
      unit_price: formatNumber(tender.unit_price),
      logistics: formatNumber(tender.logistics),
      supplier_price: formatNumber(tender.supplier_price),
      total_amount: formatNumber(tender.total_amount),
      winner_price: formatNumber(tender.winner_price),
      contract_security: formatNumber(tender.contract_security),
      platform_fee: formatNumber(tender.platform_fee),
      margin_percent: tender.margin_percent ? formatNumber(tender.margin_percent) : tender.margin_percent,
    };
  } catch (error) {
    logger.error(`Ошибка форматирования тендера ID ${tender.id}: ${error.message}, стек: ${error.stack}`);
    return { ...tender.toJSON(), error: 'Ошибка форматирования' };
  }
};

const getTenders = async (req, res) => {
  logger.debug(`Получен запрос на получение списка тендеров для пользователя: ${req.user?.id || 'неизвестен'}`);
  
  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Tender } = models;
    logger.debug('Модель Tender успешно получена');

    logger.debug('Формирование условий запроса для списка тендеров');
    const whereClause = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    logger.debug('Запрос списка тендеров из базы данных');
    const tenders = await Tender.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });
    const formattedTenders = tenders.map(formatTender);
    logger.debug(`Получено ${tenders.length} тендеров`);

    logger.info(`Список тендеров отправлен пользователю ${req.user.id}: ${tenders.length} тендеров`);
    res.json(formattedTenders);
  } catch (error) {
    logger.error(`Ошибка при получении списка тендеров: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении тендеров', details: error.message });
  }
};

const getTenderById = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на получение тендера по ID: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Tender } = models;
    logger.debug('Модель Tender успешно получена');

    logger.debug(`Поиск тендера с id: ${id}`);
    const tender = await Tender.findByPk(id);
    if (!tender) {
      logger.warn(`Тендер с ID ${id} не найден для пользователя ${req.user.id}`);
      return res.status(404).json({ error: 'Тендер не найден' });
    }

    logger.debug('Проверка прав доступа к тендеру');
    if (req.user.role !== 'admin' && tender.user_id !== req.user.id) {
      logger.warn(`Доступ к тендеру ID ${id} запрещён для пользователя ${req.user.id}`);
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    logger.debug(`Доступ к тендеру подтверждён: id=${tender.id}`);

    logger.debug('Форматирование данных тендера');
    const formattedTender = formatTender(tender);

    logger.info(`Тендер ID ${tender.id} отправлен пользователю ${req.user.id}`);
    res.json(formattedTender);
  } catch (error) {
    logger.error(`Ошибка при получении тендера по ID ${id}: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при получении тендера', details: error.message });
  }
};

const createTender = async (req, res) => {
  const tenderData = req.body;
  logger.debug(`Получен запрос на создание тендера: тело запроса=${JSON.stringify(tenderData)}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Tender } = models;
    logger.debug('Модель Tender успешно получена');

    logger.debug('Создание нового тендера в базе данных');
    const tender = await Tender.create({
      ...tenderData,
      user_id: req.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const formattedTender = formatTender(tender);
    logger.debug(`Тендер создан: id=${tender.id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('tenderCreated', formattedTender);
        logger.debug(`Уведомление о создании тендера отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Тендер создан пользователем ${req.user.id}: id=${tender.id}`);
    res.status(201).json(formattedTender);
  } catch (error) {
    logger.error(`Ошибка при создании тендера: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при создании тендера', details: error.message });
  }
};

const updateTender = async (req, res) => {
  const { id } = req.params;
  const tenderData = req.body;
  logger.debug(`Получен запрос на обновление тендера: id=${id}, тело запроса=${JSON.stringify(tenderData)}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Tender } = models;
    logger.debug('Модель Tender успешно получена');

    logger.debug(`Поиск тендера с id: ${id}`);
    const tender = await Tender.findByPk(id);
    if (!tender || (tender.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Тендер не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Тендер не найден или доступ запрещён' });
    }
    logger.debug(`Тендер найден: id=${tender.id}`);

    logger.debug('Обновление тендера в базе данных');
    await tender.update({
      ...tenderData,
      updated_at: new Date(),
    });
    const formattedTender = formatTender(tender);
    logger.debug(`Тендер обновлен: id=${tender.id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('tenderUpdated', formattedTender);
        logger.debug(`Уведомление об обновлении тендера отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Тендер обновлен пользователем ${req.user.id}: id=${tender.id}`);
    res.json({ message: 'Тендер обновлен', tender: formattedTender });
  } catch (error) {
    logger.error(`Ошибка при обновлении тендера: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при обновлении тендера', details: error.message });
  }
};

const deleteTender = async (req, res) => {
  const { id } = req.params;
  logger.debug(`Получен запрос на удаление тендера: id=${id}, пользователь: ${req.user?.id || 'неизвестен'}`);

  try {
    logger.debug('Получение моделей из sequelize');
    const models = await getModels();
    const { Tender } = models;
    logger.debug('Модель Tender успешно получена');

    logger.debug(`Поиск тендера с id: ${id}`);
    const tender = await Tender.findByPk(id);
    if (!tender || (tender.user_id !== req.user.id && req.user.role !== 'admin')) {
      logger.warn(`Тендер не найден или доступ запрещён: id=${id}, пользователь: ${req.user.id}`);
      return res.status(403).json({ error: 'Тендер не найден или доступ запрещён' });
    }
    logger.debug(`Тендер найден: id=${tender.id}`);

    logger.debug('Удаление тендера из базы данных');
    await tender.destroy();
    logger.debug(`Тендер удален: id=${id}`);

    logger.debug('Отправка уведомления через WebSocket');
    if (req.io) {
      const socketId = socketMap.get(req.user.id);
      if (socketId) {
        req.io.to(socketId).emit('tenderDeleted', { id });
        logger.debug(`Уведомление об удалении тендера отправлено для socketId: ${socketId}`);
      }
    } else {
      logger.warn('req.io не определён, уведомление WebSocket не отправлено');
    }

    logger.info(`Тендер удален пользователем ${req.user.id}: id=${id}`);
    res.json({ message: 'Тендер удален' });
  } catch (error) {
    logger.error(`Ошибка при удалении тендера: ${error.message}, стек: ${error.stack}`);
    res.status(500).json({ error: 'Ошибка сервера при удалении тендера', details: error.message });
  }
};

logger.debug('Контроллер tenders.js успешно инициализирован');
module.exports = { getTenders, getTenderById, createTender, updateTender, deleteTender };