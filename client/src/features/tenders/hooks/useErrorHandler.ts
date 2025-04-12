// src/features/tenders/hooks/useErrorHandler.ts
import { useState, useCallback } from 'react';
import logger from '../../../utils/logger';

/**
 * Пропсы для хука useErrorHandler.
 * @property {(message: string, severity: 'error' | 'warning' | 'info' | 'success') => void} [onNotify] - Функция для отправки уведомлений (опционально).
 */
interface UseErrorHandlerProps {
  onNotify?: (message: string, severity: 'error' | 'warning' | 'info' | 'success') => void;
}

/**
 * Хук для управления временными ошибками и уведомлениями.
 * Позволяет устанавливать временные ошибки и передавать уведомления через пропс onNotify.
 * @param {UseErrorHandlerProps} [props] - Пропсы хука, включая опциональный обработчик уведомлений.
 * @returns {{ error: string | null; setTemporaryError: (message: string, severity?: 'error' | 'warning' | 'info' | 'success') => void }}
 * Объект с текущей ошибкой и функцией для установки временной ошибки.
 */
export const useErrorHandler = ({ onNotify }: UseErrorHandlerProps = {}) => {
  const [error, setError] = useState<string | null>(null);

  /**
   * Устанавливает временную ошибку с уведомлением.
   * Ошибка автоматически сбрасывается через 5 секунд, а уведомление передаётся через onNotify, если оно предоставлено.
   * @param {string} message - Сообщение об ошибке.
   * @param {'error' | 'warning' | 'info' | 'success'} [severity='error'] - Уровень серьёзности уведомления (по умолчанию 'error').
   */
  const setTemporaryError = useCallback(
    (message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'error') => {
      setError(message);
      onNotify?.(message, severity); // Вызываем onNotify, если он передан
      setTimeout(() => setError(null), 5000);
      logger.error('Temporary error set:', { message });
    },
    [onNotify]
  );

  return { error, setTemporaryError };
};