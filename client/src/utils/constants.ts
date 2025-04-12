// src/utils/constants.ts

/**
 * Интерфейс опции цвета для меток тендеров.
 * @property {string} value - Значение цвета в формате HEX или пустая строка для сброса.
 * @property {string} label - Название цвета для отображения в UI.
 */
export interface ColorOption {
  value: string;
  label: string;
}

/**
 * Интерфейс для описания видимости колонок в таблице тендеров.
 * @property {string} id - Уникальный идентификатор колонки.
 * @property {string} label - Название колонки для отображения в UI.
 * @property {boolean} visible - Флаг видимости колонки.
 */
export interface ColumnVisibility {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * Интерфейс опции типа транзакции для финансов.
 * @property {string} value - Значение типа транзакции.
 * @property {string} label - Название типа для отображения в UI.
 */
export interface TransactionTypeOption {
  value: string;
  label: string;
}

/**
 * Массив доступных цветов для меток тендеров.
 * Используется в компонентах, таких как TenderTable, для выбора цвета метки.
 */
export const COLORS: ColorOption[] = [
  { value: '#FF0000', label: 'Красный' },
  { value: '#00FF00', label: 'Зелёный' },
  { value: '#0000FF', label: 'Синий' },
  { value: '#FFFF00', label: 'Жёлтый' },
  { value: '#FF00FF', label: 'Фиолетовый' },
  { value: '#00FFFF', label: 'Голубой' },
  { value: '#FFFFFF', label: 'Белый' },
  { value: '#000000', label: 'Чёрный' },
  { value: '', label: 'Без цвета' }, // Опция для сброса цвета
] as const;

/**
 * Объект цветов для стилизации с поддержкой тёмной темы.
 * Используется в компонентах для динамического изменения цветов.
 */
export const THEME_COLORS = {
  BLUE_700: '#1976d2',
  BLUE_900: '#1565c0',
  ORANGE_300: '#ffb300',
  ORANGE_500: '#ff9800',
  GREEN_300: '#81c784',
  GREEN_500: '#4caf50',
  RED_300: '#ef5350',
  RED_500: '#f44336',
} as const;

/**
 * Максимальное количество строк для импорта из Excel.
 * Используется в TendersPage для ограничения размера загружаемых данных.
 */
export const MAX_IMPORT_ROWS = 1000;

/**
 * Этапы тендеров, используемые для фильтрации и расчёта бюджета.
 * Используется в TendersPage, TenderTable и других компонентах.
 */
export const TENDER_STAGES = {
  executionStages: ['Победил ИП', 'Подписание контракта', 'Исполнение', 'Ожидание оплаты', 'Исполнено'] as const,
  reservedStage: 'Подал ИП' as const,
  allStages: [
    'Не участвую',
    'Проиграл ТА',
    'Проиграл ИП',
    'Просчет ИП',
    'Победил ИП',
    'Подписание контракта',
    'Исполнение',
    'Ожидание оплаты',
    'Исполнено',
    'Подал ИП',
    'Подал ТА',
  ] as const,
};

/**
 * Список законов, применимых к тендерам.
 * Используется для выбора типа закона в форме редактирования тендера.
 */
export const TENDER_LAWS = [
  '44-ФЗ', // Федеральный закон о контрактной системе
  '223-ФЗ', // Федеральный закон о закупках отдельными видами юридических лиц
  '615-ПП', // Постановление Правительства РФ
  'Коммерческая закупка', // Для закупок, не регулируемых законами
] as const;

/**
 * Начальные значения видимости колонок для таблицы тендеров.
 * Используется в TenderTable и tendersSlice для инициализации состояния.
 */
export const INITIAL_VISIBLE_COLUMNS: ColumnVisibility[] = [
  { id: 'stage', label: 'Этап', visible: true },
  { id: 'subject', label: 'Предмет закупки', visible: true },
  { id: 'purchase_number', label: 'Номер закупки', visible: true },
  { id: 'platform_name', label: 'Название площадки', visible: true },
  { id: 'end_date', label: 'Дата окончания', visible: true },
  { id: 'start_price', label: 'НМЦК', visible: true },
  { id: 'note_input', label: 'Заголовок примечания', visible: true },
  { id: 'note', label: 'Примечание', visible: false }, // Скрыто по умолчанию в таблице
  { id: 'winner_price', label: 'Цена победителя', visible: true },
  { id: 'winner_name', label: 'Победитель', visible: true },
  { id: 'risk_card', label: 'Карта рисков', visible: false },
  { id: 'contract_security', label: 'Обеспечение контракта', visible: false },
  { id: 'platform_fee', label: 'Комиссия площадки', visible: false },
  { id: 'total_amount', label: 'Общая сумма', visible: true },
] as const;

/**
 * Типы транзакций для модуля финансов.
 * Используется в TransactionForm, FinancePage и других компонентах.
 */
export const FINANCE_TRANSACTION_TYPES: TransactionTypeOption[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'income', label: 'Доход' },
  { value: 'expense', label: 'Расход' },
  { value: 'transfer_in', label: 'Перевод' },
] as const;

/**
 * Категории доходов для транзакций.
 * Используется в TransactionForm для выбора категории дохода.
 */
export const FINANCE_INCOME_CATEGORIES = [
  'Алименты',
  'ИП',
  'Зарплата',
  'Кэшбек',
  'Прочие доходы',
] as const;

/**
 * Категории расходов для транзакций.
 * Используется в TransactionForm для выбора категории расхода.
 */
export const FINANCE_EXPENSE_CATEGORIES = [
  'Питание',
  'Прочее',
  'Аренда',
  'Автокредит',
  'Проценты по кредиту',
  'Погашение кредита',
  'Погашение кредита Мама',
  'Балет',
  'Актерское',
] as const;

/**
 * Общий список категорий для финансовых транзакций.
 * Используется в HistoryDialog, ReportDialog для фильтрации и отображения.
 */
export const FINANCE_CATEGORIES = [
  ...FINANCE_INCOME_CATEGORIES,
  ...FINANCE_EXPENSE_CATEGORIES,
] as const;

/**
 * Типы долгов для модуля финансов.
 * Используется в DebtTable для отображения унифицированного списка.
 */
export const FINANCE_DEBT_TYPES: TransactionTypeOption[] = [
  { value: 'debt', label: 'Долг' },
  { value: 'credit_card', label: 'Кредитная карта' },
  { value: 'loan', label: 'Кредит' },
] as const;

/**
 * Максимальная длина описания транзакции.
 * Используется в TransactionForm для валидации.
 */
export const MAX_TRANSACTION_DESCRIPTION_LENGTH = 255;

/**
 * Максимальная сумма транзакции (в рублях).
 * Используется в TransactionForm для валидации.
 */
export const MAX_TRANSACTION_AMOUNT = 1_000_000_000; // 1 миллиард рублей

/**
 * Минимальная сумма транзакции (в рублях).
 * Используется в TransactionForm для валидации.
 */
export const MIN_TRANSACTION_AMOUNT = 0.01; // 1 копейка

// Экспорт по умолчанию для совместимости с модулями
export default {
  COLORS,
  THEME_COLORS,
  MAX_IMPORT_ROWS,
  TENDER_STAGES,
  TENDER_LAWS,
  INITIAL_VISIBLE_COLUMNS,
  FINANCE_TRANSACTION_TYPES,
  FINANCE_INCOME_CATEGORIES,
  FINANCE_EXPENSE_CATEGORIES,
  FINANCE_CATEGORIES,
  FINANCE_DEBT_TYPES,
  MAX_TRANSACTION_DESCRIPTION_LENGTH,
  MAX_TRANSACTION_AMOUNT,
  MIN_TRANSACTION_AMOUNT,
};