// src/api/index.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../app/store'; // Импорт Redux store для получения токена
import logger from '../utils/logger'; // Импорт logger для логирования ошибок

/**
 * Конфигурация API-клиента с базовым URL и заголовками.
 */
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // Базовый URL бэкенда (замените на ваш)
  timeout: 10000, // Таймаут запроса в миллисекундах
  headers: {
    'Content-Type': 'application/json', // Установка типа контента по умолчанию
  },
});

/**
 * Интерцептор запросов для добавления токена авторизации.
 * Добавляет заголовок Authorization, если токен доступен в Redux store.
 */
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const state = store.getState();
    const token = state.auth.token; // Предполагается, что токен хранится в auth slice
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('Ошибка в интерцепторе запроса:', error);
    return Promise.reject(error);
  }
);

/**
 * Интерцептор ответов для обработки ошибок.
 * Логирует ошибки и возвращает их для дальнейшей обработки.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'Неизвестная ошибка';
    logger.error('Ошибка API:', {
      status: error.response?.status,
      message: errorMessage,
      url: error.config?.url,
    });
    return Promise.reject({ ...error, error: errorMessage });
  }
);

// Экспорт API-клиента по умолчанию
export default api;