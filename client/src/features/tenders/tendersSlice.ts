// src/features/tenders/tendersSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import logger from '../../utils/logger';
import { initialVisibleColumns } from '../../config/visibleColumnsConfig';
import {
  fetchTenders,
  addTender,
  updateTender,
  deleteTender,
  fetchTenderBudget,
  fetchHeaderNote,
  updateHeaderNote,
} from './tenderActions';

// Интерфейс тендера с уточнёнными необязательными полями
export interface Tender {
  id: number;
  stage?: string;
  subject?: string;
  purchase_number?: string;
  end_date?: string;
  note?: string;
  platform_name?: string;
  start_price?: string;
  winner_price?: string;
  winner_name?: string;
  risk_card?: string;
  contract_security?: string;
  platform_fee?: string;
  color_label?: string;
  user_id?: number;
  total_amount?: string; // Добавлено для совместимости с TendersPage
  [key: string]: any; // Оставлено для гибкости
}

// Интерфейс конфигурации колонок
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

// Интерфейс бюджета
export interface Budget {
  available: string;
  reserved: number;
  spent: number;
}

// Интерфейс состояния тендеров
export interface TendersState {
  tenders: {
    byId: { [key: number]: Tender };
    allIds: number[];
  };
  selectedRows: number[];
  errors: { [key: string]: string | null };
  filters: { [key: string]: any };
  sortConfig: { key: string | null; direction: 'asc' | 'desc' };
  colorFilter: string;
  visibleColumns: ColumnConfig[];
  headerNote: string;
  tenderBudgets: { [key: number]: Budget };
  loading: boolean;
  lastUpdated: string | null;
  selectedStages: string[]; // Добавлено для фильтрации по этапам
}

// Начальное состояние среза тендеров
const initialState: TendersState = {
  tenders: {
    byId: {},
    allIds: [],
  },
  selectedRows: [],
  errors: {},
  filters: {},
  sortConfig: { key: null, direction: 'asc' },
  colorFilter: '',
  visibleColumns: initialVisibleColumns,
  headerNote: '',
  tenderBudgets: {},
  loading: false,
  lastUpdated: null,
  selectedStages: [],
};

// Создание среза для управления тендерами
const tendersSlice = createSlice({
  name: 'tenders',
  initialState,
  reducers: {
    // Установка выбранных строк в таблице
    setSelectedRows(state, action: PayloadAction<number[]>) {
      state.selectedRows = action.payload;
    },
    // Установка конфигурации сортировки таблицы
    setSortConfig(state, action: PayloadAction<{ key: string | null; direction: 'asc' | 'desc' }>) {
      state.sortConfig = action.payload;
    },
    // Установка фильтра по цвету метки
    setColorFilter(state, action: PayloadAction<string>) {
      state.colorFilter = action.payload;
    },
    // Установка видимости колонок в таблице
    setVisibleColumns(state, action: PayloadAction<ColumnConfig[]>) {
      state.visibleColumns = action.payload;
    },
    // Установка заметки в шапке страницы
    setHeaderNote(state, action: PayloadAction<string>) {
      state.headerNote = action.payload;
    },
    // Установка бюджета для конкретного тендера
    setTenderBudget(state, action: PayloadAction<{ tenderId: number; budget: Budget }>) {
      const { tenderId, budget } = action.payload;
      state.tenderBudgets[tenderId] = budget;
    },
    // Добавление тендера в реальном времени (через WebSocket)
    addTenderRealtime(state, action: PayloadAction<Tender>) {
      const tender = action.payload;
      state.tenders.byId[tender.id] = tender;
      if (!state.tenders.allIds.includes(tender.id)) {
        state.tenders.allIds.push(tender.id);
      }
      logger.debug('Тендер добавлен/обновлен через WebSocket', { tenderId: tender.id });
    },
    // Обновление тендера в реальном времени (через WebSocket)
    updateTenderRealtime(state, action: PayloadAction<Tender>) {
      const tender = action.payload;
      state.tenders.byId[tender.id] = tender;
      logger.debug('Тендер обновлен через WebSocket', { tenderId: tender.id });
    },
    // Удаление тендера в реальном времени (через WebSocket)
    deleteTenderRealtime(state, action: PayloadAction<number>) {
      const tenderId = action.payload;
      delete state.tenders.byId[tenderId];
      state.tenders.allIds = state.tenders.allIds.filter((id) => id !== tenderId);
      state.selectedRows = state.selectedRows.filter((id) => id !== tenderId);
      delete state.tenderBudgets[tenderId];
      logger.debug('Тендер удален через WebSocket', { tenderId });
    },
    // Очистка ошибок по ключу или полностью
    clearTenderError(state, action: PayloadAction<string | undefined>) {
      const errorKey = action.payload;
      if (errorKey) {
        state.errors[errorKey] = null;
      } else {
        state.errors = {};
      }
    },
    // Сброс состояния тендеров до начального
    resetTenders() {
      return initialState;
    },
    // Установка выбранных этапов для фильтрации (для TendersPage)
    setSelectedStages(state, action: PayloadAction<string[]>) {
      state.selectedStages = action.payload;
    },
    // Установка состояния загрузки (добавлено для tenderActions.ts)
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    // Установка ошибки по ключу (добавлено для tenderActions.ts)
    setError(state, action: PayloadAction<{ key: string; message: string }>) {
      const { key, message } = action.payload;
      state.errors[key] = message;
    },
  },
  extraReducers: (builder) => {
    builder
      // Обработка загрузки тендеров
      .addCase(fetchTenders.pending, (state) => {
        state.loading = true;
        state.errors.fetch = null;
        logger.debug('Загрузка тендеров...');
      })
      .addCase(fetchTenders.fulfilled, (state, action: PayloadAction<Tender[]>) => {
        const tendersData = action.payload;
        state.tenders.byId = tendersData.reduce((acc: { [key: number]: Tender }, tender) => {
          acc[tender.id] = tender;
          return acc;
        }, {});
        state.tenders.allIds = tendersData.map((tender) => tender.id);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        logger.info('Тендеры успешно загружены', { count: tendersData.length });
      })
      .addCase(fetchTenders.rejected, (state, action) => {
        state.loading = false;
        state.errors.fetch = action.payload || 'Неизвестная ошибка загрузки тендеров';
        logger.error('Ошибка загрузки тендеров', { error: action.payload });
      })
      // Обработка добавления тендера
      .addCase(addTender.pending, (state) => {
        state.loading = true;
        state.errors.add = null;
        logger.debug('Добавление тендера...');
      })
      .addCase(addTender.fulfilled, (state, action: PayloadAction<Tender>) => {
        const newTender = action.payload;
        state.tenders.byId[newTender.id] = newTender;
        if (!state.tenders.allIds.includes(newTender.id)) {
          state.tenders.allIds.push(newTender.id);
        }
        state.loading = false;
        logger.info('Тендер успешно добавлен', { id: newTender.id });
      })
      .addCase(addTender.rejected, (state, action) => {
        state.loading = false;
        state.errors.add = action.payload || 'Неизвестная ошибка добавления тендера';
        logger.error('Ошибка добавления тендера', { error: action.payload });
      })
      // Обработка обновления тендера
      .addCase(updateTender.pending, (state) => {
        state.loading = true;
        state.errors.update = null;
        logger.debug('Обновление тендера...');
      })
      .addCase(updateTender.fulfilled, (state, action: PayloadAction<Tender>) => {
        const updatedTender = action.payload;
        state.tenders.byId[updatedTender.id] = updatedTender;
        state.loading = false;
        logger.info('Тендер успешно обновлен', { id: updatedTender.id });
      })
      .addCase(updateTender.rejected, (state, action) => {
        state.loading = false;
        state.errors.update = action.payload || 'Неизвестная ошибка обновления тендера';
        logger.error('Ошибка обновления тендера', { error: action.payload });
      })
      // Обработка удаления тендера
      .addCase(deleteTender.pending, (state) => {
        state.loading = true;
        state.errors.delete = null;
        logger.debug('Удаление тендера...');
      })
      .addCase(deleteTender.fulfilled, (state, action: PayloadAction<number>) => {
        const tenderId = action.payload;
        delete state.tenders.byId[tenderId];
        state.tenders.allIds = state.tenders.allIds.filter((id) => id !== tenderId);
        state.selectedRows = state.selectedRows.filter((id) => id !== tenderId);
        delete state.tenderBudgets[tenderId];
        state.loading = false;
        logger.info('Тендер успешно удален', { id: tenderId });
      })
      .addCase(deleteTender.rejected, (state, action) => {
        state.loading = false;
        state.errors.delete = action.payload || 'Неизвестная ошибка удаления тендера';
        logger.error('Ошибка удаления тендера', { error: action.payload });
      })
      // Обработка загрузки бюджета тендера
      .addCase(fetchTenderBudget.pending, (state) => {
        state.loading = true;
        logger.debug('Загрузка бюджета...');
      })
      .addCase(fetchTenderBudget.fulfilled, (state, action: PayloadAction<{ tenderId: number; budget: Budget }>) => {
        const { tenderId, budget } = action.payload;
        state.tenderBudgets[tenderId] = budget;
        state.loading = false;
        logger.info('Бюджет загружен', { tenderId });
      })
      .addCase(fetchTenderBudget.rejected, (state, action) => {
        state.loading = false;
        logger.error('Ошибка загрузки бюджета', { error: action.payload });
      })
      // Обработка загрузки заметки в шапке
      .addCase(fetchHeaderNote.pending, (state) => {
        state.loading = true;
        state.errors.headerNote = null;
        logger.debug('Загрузка заметки...');
      })
      .addCase(fetchHeaderNote.fulfilled, (state, action: PayloadAction<string>) => {
        state.headerNote = action.payload;
        state.loading = false;
        logger.info('Заметка загружена');
      })
      .addCase(fetchHeaderNote.rejected, (state, action) => {
        state.loading = false;
        state.errors.headerNote = action.payload || 'Неизвестная ошибка загрузки заметки';
        logger.error('Ошибка загрузки заметки', { error: action.payload });
      })
      // Обработка обновления заметки в шапке
      .addCase(updateHeaderNote.pending, (state) => {
        state.loading = true;
        state.errors.headerNoteUpdate = null;
        logger.debug('Обновление заметки...');
      })
      .addCase(updateHeaderNote.fulfilled, (state, action: PayloadAction<string>) => {
        state.headerNote = action.payload;
        state.loading = false;
        logger.info('Заметка обновлена');
      })
      .addCase(updateHeaderNote.rejected, (state, action) => {
        state.loading = false;
        state.errors.headerNoteUpdate = action.payload || 'Неизвестная ошибка обновления заметки';
        logger.error('Ошибка обновления заметки', { error: action.payload });
      });
  },
});

// Экспорт синхронных действий
export const {
  setSelectedRows,
  setSortConfig,
  setColorFilter,
  setVisibleColumns,
  setHeaderNote,
  setTenderBudget,
  addTenderRealtime,
  updateTenderRealtime,
  deleteTenderRealtime,
  clearTenderError,
  resetTenders,
  setSelectedStages,
  setLoading, // Добавлено для tenderActions.ts
  setError,   // Добавлено для tenderActions.ts
} = tendersSlice.actions;

// Экспорт асинхронных действий из tenderActions.ts
export {
  fetchTenders,
  addTender,
  updateTender,
  deleteTender,
  fetchTenderBudget,
  fetchHeaderNote,
  updateHeaderNote,
};

// Экспорт редьюсера по умолчанию
export default tendersSlice.reducer;

// Экспорт интерфейса состояния для использования в других частях приложения
export { TendersState };