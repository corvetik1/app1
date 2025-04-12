import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'app/store';
import { TendersState } from './tendersSlice';

const selectTendersState = (state: RootState): TendersState => state.tenders;

export const selectAllTenders = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.tenders.allIds.map((id) => tendersState.tenders.byId[id])
);

export const selectFilteredAndSortedTenders = createSelector(
  [selectAllTenders, selectTendersState],
  (tenders, tendersState) => {
    let filtered = tenders;

    // Фильтрация по этапам
    if (tendersState.selectedStages.length > 0) {
      filtered = filtered.filter((tender) => tendersState.selectedStages.includes(tender.stage || ''));
    }

    // Фильтрация по цвету
    if (tendersState.colorFilter) {
      filtered = filtered.filter((tender) => tender.color_label === tendersState.colorFilter);
    }

    // Сортировка
    if (tendersState.sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const key = tendersState.sortConfig.key as string;
        const aValue = a[key] || '';
        const bValue = b[key] || '';
        if (aValue < bValue) return tendersState.sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return tendersState.sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }
);

export const selectVisibleColumns = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.visibleColumns
);

export const selectSelectedRows = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.selectedRows
);

export const selectSortConfig = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.sortConfig
);

export const selectSelectedStages = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.selectedStages
);

export const selectHeaderNote = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.headerNote
);

export const selectBudget = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.tenderBudgets
);

export const selectLoading = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.loading
);

export const selectErrors = createSelector(
  [selectTendersState],
  (tendersState) => tendersState.errors
);