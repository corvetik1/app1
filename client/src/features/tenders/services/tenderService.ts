// src/features/tenders/services/tenderService.ts
import api from 'api';

/**
 * Сервис для работы с тендерами через API.
 */
export const tenderService = {
  /**
   * Получение списка всех тендеров.
   */
  fetchTenders: async () => {
    const response = await api.get('/tenders');
    return response.data;
  },

  /**
   * Добавление нового тендера.
   * @param {any} tenderData - Данные нового тендера.
   */
  addTender: async (tenderData: any) => {
    const response = await api.post('/tenders', tenderData);
    return response.data;
  },

  /**
   * Обновление существующего тендера.
   * @param {number} id - ID тендера.
   * @param {any} tenderData - Обновленные данные тендера.
   */
  updateTender: async (id: number, tenderData: any) => {
    const response = await api.put(`/tenders/${id}`, tenderData);
    return response.data;
  },

  /**
   * Удаление тендера.
   * @param {number} id - ID тендера.
   */
  deleteTender: async (id: number) => {
    await api.delete(`/tenders/${id}`);
    return id;
  },
};