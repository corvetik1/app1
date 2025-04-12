// src/features/tenders/services/tenderService.ts
import api from '../api'; // Импорт axios-инстанса из src/api/index.ts
import logger from '../utils/logger'; // Импорт логгера для отладки и ошибок

/**
 * Интерфейс тендера для типизации данных.
 */
interface Tender {
  id: number;
  purchase_number: string;
  subject: string;
  stage: string;
  platform_name: string;
  end_date: string;
  start_price: number;
  winner_price?: number;
  winner_name?: string;
  note?: string;
  note_input?: string;
  contract_security?: number;
  platform_fee?: number;
  total_amount?: number;
  risk_card?: string;
  law_type?: string;
  user_id?: number;
}

/**
 * Интерфейс ответа API с пагинацией.
 */
interface TenderResponse {
  tenders: Tender[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Сервис для работы с тендерами через API.
 */
const tenderService = {
  /**
   * Получение списка тендеров с пагинацией и фильтрацией.
   * @param {number} page - Номер страницы.
   * @param {number} pageSize - Размер страницы.
   * @param {Record<string, any>} [filters] - Фильтры для запроса (например, { stage: 'Исполнение' }).
   * @returns {Promise<TenderResponse>} Объект с тендерами и мета-данными.
   * @throws {Error} Если запрос завершился неудачно.
   */
  getTenders: async (page: number, pageSize: number, filters: Record<string, any> = {}): Promise<TenderResponse> => {
    const startTime = Date.now();
    try {
      logger.debug('tenderService.getTenders: Запрос списка тендеров', { page, pageSize, filters });
      const response = await api.get<TenderResponse>('/tenders', {
        params: {
          page,
          pageSize,
          ...filters,
        },
      });
      logger.info('tenderService.getTenders: Тендеры успешно загружены', {
        count: response.data.tenders.length,
        total: response.data.total,
        duration: `${Date.now() - startTime}ms`,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при загрузке тендеров';
      logger.error('tenderService.getTenders: Ошибка загрузки тендеров', {
        error: errorMessage,
        filters,
        duration: `${Date.now() - startTime}ms`,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Получение тендера по ID.
   * @param {number} id - ID тендера.
   * @returns {Promise<Tender>} Объект тендера.
   * @throws {Error} Если тендер не найден или запрос завершился неудачно.
   */
  getTenderById: async (id: number): Promise<Tender> => {
    const startTime = Date.now();
    try {
      logger.debug('tenderService.getTenderById: Запрос тендера по ID', { id });
      const response = await api.get<Tender>(`/tenders/${id}`);
      logger.info('tenderService.getTenderById: Тендер успешно загружен', {
        id,
        duration: `${Date.now() - startTime}ms`,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при загрузке тендера';
      logger.error('tenderService.getTenderById: Ошибка загрузки тендера', {
        id,
        error: errorMessage,
        duration: `${Date.now() - startTime}ms`,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Создание нового тендера.
   * @param {Omit<Tender, 'id'>} tenderData - Данные нового тендера (без ID).
   * @returns {Promise<Tender>} Созданный тендер с ID.
   * @throws {Error} Если создание завершилось неудачно.
   */
  createTender: async (tenderData: Omit<Tender, 'id'>): Promise<Tender> => {
    const startTime = Date.now();
    try {
      logger.debug('tenderService.createTender: Создание тендера', { tenderData });
      const response = await api.post<Tender>('/tenders', tenderData);
      logger.info('tenderService.createTender: Тендер успешно создан', {
        id: response.data.id,
        duration: `${Date.now() - startTime}ms`,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при создании тендера';
      logger.error('tenderService.createTender: Ошибка создания тендера', {
        tenderData,
        error: errorMessage,
        duration: `${Date.now() - startTime}ms`,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Обновление существующего тендера.
   * @param {number} id - ID тендера.
   * @param {Partial<Tender>} tenderData - Обновлённые данные тендера.
   * @returns {Promise<Tender>} Обновлённый тендер.
   * @throws {Error} Если обновление завершилось неудачно.
   */
  updateTender: async (id: number, tenderData: Partial<Tender>): Promise<Tender> => {
    const startTime = Date.now();
    try {
      logger.debug('tenderService.updateTender: Обновление тендера', { id, tenderData });
      const response = await api.put<Tender>(`/tenders/${id}`, tenderData);
      logger.info('tenderService.updateTender: Тендер успешно обновлён', {
        id,
        duration: `${Date.now() - startTime}ms`,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при обновлении тендера';
      logger.error('tenderService.updateTender: Ошибка обновления тендера', {
        id,
        tenderData,
        error: errorMessage,
        duration: `${Date.now() - startTime}ms`,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Удаление тендера.
   * @param {number} id - ID тендера.
   * @returns {Promise<void>} Ничего не возвращает при успехе.
   * @throws {Error} Если удаление завершилось неудачно.
   */
  deleteTender: async (id: number): Promise<void> => {
    const startTime = Date.now();
    try {
      logger.debug('tenderService.deleteTender: Удаление тендера', { id });
      await api.delete(`/tenders/${id}`);
      logger.info('tenderService.deleteTender: Тендер успешно удалён', {
        id,
        duration: `${Date.now() - startTime}ms`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при удалении тендера';
      logger.error('tenderService.deleteTender: Ошибка удаления тендера', {
        id,
        error: errorMessage,
        duration: `${Date.now() - startTime}ms`,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Получение статистики по тендерам (например, по статусам).
   * @returns {Promise<Record<string, number>>} Объект со статистикой.
   * @throws {Error} Если запрос завершился неудачно.
   */
  getTenderStats: async (): Promise<Record<string, number>> => {
    const startTime = Date.now();
    try {
      logger.debug('tenderService.getTenderStats: Запрос статистики тендеров');
      const response = await api.get<Record<string, number>>('/tenders/stats');
      logger.info('tenderService.getTenderStats: Статистика успешно загружена', {
        duration: `${Date.now() - startTime}ms`,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при загрузке статистики';
      logger.error('tenderService.getTenderStats: Ошибка загрузки статистики', {
        error: errorMessage,
        duration: `${Date.now() - startTime}ms`,
      });
      throw new Error(errorMessage);
    }
  },
};

export default tenderService;