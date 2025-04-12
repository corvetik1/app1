// src/utils/formatUtils.ts

/**
 * Опции для форматирования валюты.
 */
interface CurrencyFormatOptions {
    locale?: string; // Локаль для форматирования (по умолчанию 'ru-RU')
    currency?: string; // Код валюты (по умолчанию 'RUB')
    minimumFractionDigits?: number; // Минимальное количество знаков после запятой
    maximumFractionDigits?: number; // Максимальное количество знаков после запятой
  }
  
  /**
   * Опции для форматирования чисел.
   */
  interface NumberFormatOptions {
    locale?: string; // Локаль для форматирования (по умолчанию 'ru-RU')
    minimumFractionDigits?: number; // Минимальное количество знаков после запятой
    maximumFractionDigits?: number; // Максимальное количество знаков после запятой
  }
  
  /**
   * Опции для форматирования даты.
   */
  interface DateFormatOptions {
    locale?: string; // Локаль для форматирования (по умолчанию 'ru-RU')
    format?: 'short' | 'medium' | 'long' | 'full'; // Стиль форматирования
    customFormat?: string; // Пользовательский формат для date-fns
  }
  
  /**
   * Форматирует число в строку с учётом локали.
   * @param {number} value - Число для форматирования.
   * @param {NumberFormatOptions} [options] - Опции форматирования.
   * @returns {string} Отформатированное число.
   * @example
   * formatNumber(1234567.89) // "1 234 567,89"
   * formatNumber(1234, { maximumFractionDigits: 0 }) // "1 234"
   */
  export const formatNumber = (value: number, options: NumberFormatOptions = {}): string => {
    const {
      locale = 'ru-RU',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    } = options;
  
    if (isNaN(value)) {
      return 'Недействительное число';
    }
  
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  };
  
  /**
   * Форматирует число в строку с указанием валюты.
   * @param {number} value - Число для форматирования.
   * @param {CurrencyFormatOptions} [options] - Опции форматирования.
   * @returns {string} Отформатированная валюта.
   * @example
   * formatCurrency(1234567.89) // "1 234 567,89 ₽"
   * formatCurrency(1234.5, { currency: 'USD' }) // "1 234,50 $"
   */
  export const formatCurrency = (value: number, options: CurrencyFormatOptions = {}): string => {
    const {
      locale = 'ru-RU',
      currency = 'RUB',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    } = options;
  
    if (isNaN(value)) {
      return 'Недействительная сумма';
    }
  
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  };
  
  /**
   * Форматирует дату в строку с учётом локали.
   * @param {string | number | Date} date - Дата для форматирования (строка ISO, timestamp или объект Date).
   * @param {DateFormatOptions} [options] - Опции форматирования.
   * @returns {string} Отформатированная дата.
   * @example
   * formatDate('2025-04-09') // "9 апреля 2025 г."
   * formatDate(new Date(), { format: 'short' }) // "09.04.2025"
   * formatDate('2025-04-09', { customFormat: 'dd.MM.yyyy HH:mm' }) // "09.04.2025 00:00"
   */
  export const formatDate = (date: string | number | Date, options: DateFormatOptions = {}): string => {
    const {
      locale = 'ru-RU',
      format = 'long',
      customFormat,
    } = options;
  
    let dateObj: Date;
    if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
  
    if (isNaN(dateObj.getTime())) {
      return 'Недействительная дата';
    }
  
    if (customFormat) {
      const { format: dateFnsFormat } = require('date-fns'); // Динамический импорт для избежания SSR-ошибок
      const { ru } = require('date-fns/locale');
      return dateFnsFormat(dateObj, customFormat, { locale: ru });
    }
  
    const intlOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? '2-digit' : 'long',
      day: '2-digit',
    };
  
    if (format === 'medium' || format === 'long' || format === 'full') {
      intlOptions.month = 'long';
      if (format === 'full') {
        intlOptions.weekday = 'long';
      }
    }
  
    return new Intl.DateTimeFormat(locale, intlOptions).format(dateObj);
  };
  
  /**
   * Форматирует число в проценты с учётом локали.
   * @param {number} value - Число для форматирования (в диапазоне 0-1 или 0-100).
   * @param {NumberFormatOptions} [options] - Опции форматирования.
   * @param {boolean} [isPercentage=false] - Указывает, является ли значение уже процентом (0-100).
   * @returns {string} Отформатированный процент.
   * @example
   * formatPercentage(0.75) // "75,00%"
   * formatPercentage(75, { isPercentage: true }) // "75,00%"
   */
  export const formatPercentage = (value: number, options: NumberFormatOptions = {}, isPercentage: boolean = false): string => {
    const {
      locale = 'ru-RU',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    } = options;
  
    if (isNaN(value)) {
      return 'Недействительный процент';
    }
  
    const adjustedValue = isPercentage ? value : value * 100;
  
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(adjustedValue / 100);
  };
  
  /**
   * Утилита для проверки и преобразования значения в число.
   * @param {string | number} value - Значение для преобразования.
   * @param {number} [defaultValue=0] - Значение по умолчанию, если преобразование не удалось.
   * @returns {number} Преобразованное число.
   * @example
   * parseNumber('123.45') // 123.45
   * parseNumber('invalid') // 0
   */
  export const parseNumber = (value: string | number, defaultValue: number = 0): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? defaultValue : num;
  };
  
  // Экспорт утилит для использования в проекте
  export default {
    formatNumber,
    formatCurrency,
    formatDate,
    formatPercentage,
    parseNumber,
  };