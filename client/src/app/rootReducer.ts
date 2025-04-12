// src/app/rootReducer.ts
import { combineReducers, Reducer, AnyAction } from '@reduxjs/toolkit';
import authReducer from '../auth/authSlice';
import tendersReducer from '../features/tenders/tendersSlice';
import financeReducer from '../features/finance/financeSlice';
import homeReducer from '../features/home/homeSlice';
import accountingReducer from '../features/accounting/accountingSlice';
import notesReducer from '../features/notes/notesSlice';
import galleryReducer from '../features/gallery/gallerySlice';
import investmentsReducer from '../features/investments/investmentsSlice';
import analyticsReducer from '../features/analytics/analyticsSlice';
import usersReducer from '../features/users/usersSlice';
import  logger  from '../utils/logger';

/**
 * Интерфейс корневого состояния приложения.
 */
export interface RootState {
  auth: ReturnType<typeof authReducer>;
  tenders: ReturnType<typeof tendersReducer>;
  finance: ReturnType<typeof financeReducer>;
  home: ReturnType<typeof homeReducer>;
  accounting: ReturnType<typeof accountingReducer>;
  notes: ReturnType<typeof notesReducer>;
  gallery: ReturnType<typeof galleryReducer>;
  investments: ReturnType<typeof investmentsReducer>;
  analytics: ReturnType<typeof analyticsReducer>;
  users: ReturnType<typeof usersReducer>;
}

/**
 * Объект редьюсеров для всех модулей приложения.
 */
const appReducer = combineReducers({
  auth: authReducer,
  tenders: tendersReducer,
  finance: financeReducer,
  home: homeReducer,
  accounting: accountingReducer,
  notes: notesReducer,
  gallery: galleryReducer,
  investments: investmentsReducer,
  analytics: analyticsReducer,
  users: usersReducer,
});

/**
 * Корневой редьюсер с обработкой сброса состояния при выходе.
 * @param {RootState | undefined} state - Текущее состояние приложения.
 * @param {AnyAction} action - Действие Redux.
 * @returns {RootState} Новое состояние приложения.
 */
const rootReducer: Reducer<RootState, AnyAction> = (state: RootState | undefined, action: AnyAction) => {
  if (action.type === 'auth/logout') {
    logger.info('rootReducer: Сброс состояния при выходе из системы');
    // Сброс состояния всех редьюсеров, кроме auth, чтобы сохранить настройки темы
    const resetState = {
      ...state,
      tenders: tendersReducer(undefined, { type: '@@INIT' }),
      finance: financeReducer(undefined, { type: '@@INIT' }),
      home: homeReducer(undefined, { type: '@@INIT' }),
      accounting: accountingReducer(undefined, { type: '@@INIT' }),
      notes: notesReducer(undefined, { type: '@@INIT' }),
      gallery: galleryReducer(undefined, { type: '@@INIT' }),
      investments: investmentsReducer(undefined, { type: '@@INIT' }),
      analytics: analyticsReducer(undefined, { type: '@@INIT' }),
      users: usersReducer(undefined, { type: '@@INIT' }),
    };
    return appReducer(resetState, action);
  }

  return appReducer(state, action);
};

/**
 * Инициализация корневого редьюсера с логированием.
 */
logger.debug('rootReducer: Инициализация корневого редьюсера', {
  reducers: Object.keys(appReducer).join(', '),
});

export default rootReducer;