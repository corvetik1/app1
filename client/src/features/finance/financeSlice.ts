// src/features/finance/financeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import logger from '../../utils/logger';
import {
  fetchInitialData,
  addTransaction,
  deleteTransaction,
  addDebitCard,
  togglePaidDebt,
  saveCreditCard,
  saveEditedLoan,
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  fetchTransactions,
  createTransaction,
  updateTransaction,
  fetchDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  fetchLoans,
  createLoan,
  updateLoan,
  deleteLoan,
} from './financeActions';

/**
 * Интерфейс счёта.
 */
export interface Account {
  id: number;
  name: string;
  type: 'debit' | 'credit';
  balance: number;
  user_id: number;
  credit_limit?: number;
  debt?: number;
  grace_period?: string;
  min_payment?: number;
  payment_due_date?: string;
  is_paid?: number;
  transactions?: Transaction[];
}

/**
 * Интерфейс транзакции.
 */
export interface Transaction {
  id: number;
  debit_card_id?: number;
  credit_card_id?: number;
  transfer_to_debit_card_id?: number;
  transfer_to_credit_card_id?: number;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: number;
  description?: string;
  category?: string;
  date: string;
  user_id: number;
}

/**
 * Интерфейс долга.
 */
export interface Debt {
  id: number;
  name: string;
  amount: number;
  due_date?: string;
  total_debt: number;
  description?: string;
  user_id: number;
  is_paid?: number;
}

/**
 * Интерфейс займа.
 */
export interface Loan {
  id: number;
  name: string;
  amount: number;
  interest_rate: number;
  term: number;
  end_date?: string;
  monthly_payment?: number;
  payment_due_day?: string;
  user_id: number;
  is_paid?: number;
}

/**
 * Интерфейс состояния финансов.
 */
interface FinanceState {
  accounts: {
    byId: { [key: number]: Account };
    allIds: number[];
  };
  transactions: {
    byId: { [key: number]: Transaction };
    allIds: number[];
  };
  debts: {
    byId: { [key: number]: Debt };
    allIds: number[];
  };
  loans: {
    byId: { [key: number]: Loan };
    allIds: number[];
  };
  paidDebts: { [key: string]: boolean };
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  lastUpdated: string | null;
}

/**
 * Начальное состояние для финансовой части с нормализованной структурой.
 */
const initialState: FinanceState = {
  accounts: { byId: {}, allIds: [] },
  transactions: { byId: {}, allIds: [] },
  debts: { byId: {}, allIds: [] },
  loans: { byId: {}, allIds: [] },
  paidDebts: {},
  loading: false,
  error: null,
  successMessage: null,
  lastUpdated: null,
};

/**
 * Slice для управления состоянием финансов.
 * Обрабатывает счета, транзакции, долги и займы с нормализованной структурой.
 */
const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    /**
     * Установка счетов в состояние.
     * @param state - Текущее состояние.
     * @param action - Массив счетов для установки.
     */
    setAccounts: (state, action: PayloadAction<Account[]>) => {
      logger.debug('setAccounts: Установка счетов', action.payload);
      state.accounts = action.payload.reduce(
        (acc, account) => {
          acc.byId[account.id] = account;
          if (!acc.allIds.includes(account.id)) acc.allIds.push(account.id);
          return acc;
        },
        { byId: {}, allIds: [] } as FinanceState['accounts']
      );
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
      state.error = null;
      state.successMessage = 'Счета установлены';
    },

    /**
     * Добавление нового счёта.
     * @param state - Текущее состояние.
     * @param action - Новый счёт для добавления.
     */
    addAccount: (state, action: PayloadAction<Account>) => {
      const account = action.payload;
      if (state.accounts.byId[account.id]) {
        logger.warn('addAccount: Счёт с таким ID уже существует', { id: account.id });
        state.error = `Счёт с ID ${account.id} уже существует`;
        return;
      }
      logger.debug('addAccount: Добавление счёта', action.payload);
      state.accounts.byId[account.id] = account;
      if (!state.accounts.allIds.includes(account.id)) {
        state.accounts.allIds.push(account.id);
      }
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Счёт добавлен';
    },

    /**
     * Обновление существующего счёта.
     * @param state - Текущее состояние.
     * @param action - Обновлённые данные счёта.
     */
    updateAccount: (state, action: PayloadAction<Account>) => {
      const { id } = action.payload;
      if (!state.accounts.byId[id]) {
        logger.warn('updateAccount: Счёт с ID не найден', { id });
        state.error = `Счёт с ID ${id} не найден`;
        return;
      }
      logger.debug('updateAccount: Обновление счёта', action.payload);
      state.accounts.byId[id] = { ...state.accounts.byId[id], ...action.payload };
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Счёт обновлён';
    },

    /**
     * Удаление счёта и связанных транзакций.
     * @param state - Текущее состояние.
     * @param action - ID счёта для удаления.
     */
    deleteAccount: (state, action: PayloadAction<number>) => {
      const accountId = action.payload;
      if (!state.accounts.byId[accountId]) {
        logger.warn('deleteAccount: Счёт с ID не найден', { id: accountId });
        state.error = `Счёт с ID ${accountId} не найден`;
        return;
      }
      logger.debug('deleteAccount: Удаление счёта', { accountId });
      delete state.accounts.byId[accountId];
      state.accounts.allIds = state.accounts.allIds.filter((id) => id !== accountId);
      Object.keys(state.transactions.byId).forEach((txId) => {
        const tx = state.transactions.byId[parseInt(txId)];
        if (tx.debit_card_id === accountId || tx.credit_card_id === accountId) {
          logger.debug('deleteAccount: Удаление связанной транзакции', { txId });
          delete state.transactions.byId[parseInt(txId)];
          state.transactions.allIds = state.transactions.allIds.filter((id) => id !== parseInt(txId));
        }
      });
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Счёт удалён';
    },

    /**
     * Установка транзакций в состояние.
     * @param state - Текущее состояние.
     * @param action - Массив транзакций для установки.
     */
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      logger.debug('setTransactions: Установка транзакций', action.payload);
      state.transactions = action.payload.reduce(
        (acc, tx) => {
          acc.byId[tx.id] = tx;
          if (!acc.allIds.includes(tx.id)) acc.allIds.push(tx.id);
          return acc;
        },
        { byId: {}, allIds: [] } as FinanceState['transactions']
      );
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
      state.error = null;
      state.successMessage = 'Транзакции установлены';
    },

    /**
     * Добавление новой транзакции.
     * @param state - Текущее состояние.
     * @param action - Новая транзакция для добавления.
     */
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      const tx = action.payload;
      if (state.transactions.byId[tx.id]) {
        logger.warn('addTransaction: Транзакция с таким ID уже существует', { id: tx.id });
        state.error = `Транзакция с ID ${tx.id} уже существует`;
        return;
      }
      logger.debug('addTransaction: Добавление транзакции', action.payload);
      state.transactions.byId[tx.id] = tx;
      if (!state.transactions.allIds.includes(tx.id)) {
        state.transactions.allIds.push(tx.id);
      }
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Транзакция добавлена';
    },

    /**
     * Обновление существующей транзакции.
     * @param state - Текущее состояние.
     * @param action - Обновлённые данные транзакции.
     */
    updateTransaction: (state, action: PayloadAction<Transaction>) => {
      const { id } = action.payload;
      if (!state.transactions.byId[id]) {
        logger.warn('updateTransaction: Транзакция с ID не найдена', { id });
        state.error = `Транзакция с ID ${id} не найдена`;
        return;
      }
      logger.debug('updateTransaction: Обновление транзакции', action.payload);
      state.transactions.byId[id] = { ...state.transactions.byId[id], ...action.payload };
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Транзакция обновлена';
    },

    /**
     * Удаление транзакции.
     * @param state - Текущее состояние.
     * @param action - ID транзакции для удаления.
     */
    deleteTransaction: (state, action: PayloadAction<number>) => {
      const txId = action.payload;
      if (!state.transactions.byId[txId]) {
        logger.warn('deleteTransaction: Транзакция с ID не найдена', { id: txId });
        state.error = `Транзакция с ID ${txId} не найдена`;
        return;
      }
      logger.debug('deleteTransaction: Удаление транзакции', { txId });
      delete state.transactions.byId[txId];
      state.transactions.allIds = state.transactions.allIds.filter((id) => id !== txId);
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Транзакция удалена';
    },

    /**
     * Установка долгов в состояние.
     * @param state - Текущее состояние.
     * @param action - Массив долгов для установки.
     */
    setDebts: (state, action: PayloadAction<Debt[]>) => {
      logger.debug('setDebts: Установка долгов', action.payload);
      state.debts = action.payload.reduce(
        (acc, debt) => {
          acc.byId[debt.id] = debt;
          if (!acc.allIds.includes(debt.id)) acc.allIds.push(debt.id);
          return acc;
        },
        { byId: {}, allIds: [] } as FinanceState['debts']
      );
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
      state.error = null;
      state.successMessage = 'Долги установлены';
    },

    /**
     * Добавление нового долга.
     * @param state - Текущее состояние.
     * @param action - Новый долг для добавления.
     */
    addDebt: (state, action: PayloadAction<Debt>) => {
      const debt = action.payload;
      if (state.debts.byId[debt.id]) {
        logger.warn('addDebt: Долг с таким ID уже существует', { id: debt.id });
        state.error = `Долг с ID ${debt.id} уже существует`;
        return;
      }
      logger.debug('addDebt: Добавление долга', action.payload);
      state.debts.byId[debt.id] = debt;
      if (!state.debts.allIds.includes(debt.id)) {
        state.debts.allIds.push(debt.id);
      }
      state.paidDebts[`debt-${debt.id}`] = debt.is_paid === 1;
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Долг добавлен';
    },

    /**
     * Обновление существующего долга.
     * @param state - Текущее состояние.
     * @param action - Обновлённые данные долга.
     */
    updateDebt: (state, action: PayloadAction<Debt>) => {
      const { id } = action.payload;
      if (!state.debts.byId[id]) {
        logger.warn('updateDebt: Долг с ID не найден', { id });
        state.error = `Долг с ID ${id} не найден`;
        return;
      }
      logger.debug('updateDebt: Обновление долга', action.payload);
      state.debts.byId[id] = { ...state.debts.byId[id], ...action.payload };
      state.paidDebts[`debt-${id}`] = action.payload.is_paid === 1;
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Долг обновлён';
    },

    /**
     * Удаление долга.
     * @param state - Текущее состояние.
     * @param action - ID долга для удаления.
     */
    deleteDebt: (state, action: PayloadAction<number>) => {
      const debtId = action.payload;
      if (!state.debts.byId[debtId]) {
        logger.warn('deleteDebt: Долг с ID не найден', { id: debtId });
        state.error = `Долг с ID ${debtId} не найден`;
        return;
      }
      logger.debug('deleteDebt: Удаление долга', { debtId });
      delete state.debts.byId[debtId];
      state.debts.allIds = state.debts.allIds.filter((id) => id !== debtId);
      delete state.paidDebts[`debt-${debtId}`];
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Долг удалён';
    },

    /**
     * Установка займов в состояние.
     * @param state - Текущее состояние.
     * @param action - Массив займов для установки.
     */
    setLoans: (state, action: PayloadAction<Loan[]>) => {
      logger.debug('setLoans: Установка займов', action.payload);
      state.loans = action.payload.reduce(
        (acc, loan) => {
          acc.byId[loan.id] = loan;
          if (!acc.allIds.includes(loan.id)) acc.allIds.push(loan.id);
          return acc;
        },
        { byId: {}, allIds: [] } as FinanceState['loans']
      );
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
      state.error = null;
      state.successMessage = 'Займы установлены';
    },

    /**
     * Добавление нового займа.
     * @param state - Текущее состояние.
     * @param action - Новый займ для добавления.
     */
    addLoan: (state, action: PayloadAction<Loan>) => {
      const loan = action.payload;
      if (state.loans.byId[loan.id]) {
        logger.warn('addLoan: Займ с таким ID уже существует', { id: loan.id });
        state.error = `Займ с ID ${loan.id} уже существует`;
        return;
      }
      logger.debug('addLoan: Добавление займа', action.payload);
      state.loans.byId[loan.id] = loan;
      if (!state.loans.allIds.includes(loan.id)) {
        state.loans.allIds.push(loan.id);
      }
      state.paidDebts[`loan-${loan.id}`] = loan.is_paid === 1;
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Займ добавлен';
    },

    /**
     * Обновление существующего займа.
     * @param state - Текущее состояние.
     * @param action - Обновлённые данные займа.
     */
    updateLoan: (state, action: PayloadAction<Loan>) => {
      const { id } = action.payload;
      if (!state.loans.byId[id]) {
        logger.warn('updateLoan: Займ с ID не найден', { id });
        state.error = `Займ с ID ${id} не найден`;
        return;
      }
      logger.debug('updateLoan: Обновление займа', action.payload);
      state.loans.byId[id] = { ...state.loans.byId[id], ...action.payload };
      state.paidDebts[`loan-${id}`] = action.payload.is_paid === 1;
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Займ обновлён';
    },

    /**
     * Удаление займа.
     * @param state - Текущее состояние.
     * @param action - ID займа для удаления.
     */
    deleteLoan: (state, action: PayloadAction<number>) => {
      const loanId = action.payload;
      if (!state.loans.byId[loanId]) {
        logger.warn('deleteLoan: Займ с ID не найден', { id: loanId });
        state.error = `Займ с ID ${loanId} не найден`;
        return;
      }
      logger.debug('deleteLoan: Удаление займа', { loanId });
      delete state.loans.byId[loanId];
      state.loans.allIds = state.loans.allIds.filter((id) => id !== loanId);
      delete state.paidDebts[`loan-${loanId}`];
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Займ удалён';
    },

    /**
     * Установка статусов оплаченных долгов.
     * @param state - Текущее состояние.
     * @param action - Объект статусов оплаченных долгов.
     */
    setPaidDebts: (state, action: PayloadAction<{ [key: string]: boolean }>) => {
      logger.debug('setPaidDebts: Установка статусов оплаченных долгов', action.payload);
      state.paidDebts = action.payload || {};
      state.lastUpdated = new Date().toISOString();
      state.successMessage = 'Статусы оплаченных долгов установлены';
    },

    /**
     * Сброс состояния финансов до начального.
     * @param state - Текущее состояние.
     */
    resetFinance: (state) => {
      logger.debug('resetFinance: Сброс состояния финансов');
      return initialState;
    },

    /**
     * Установка состояния загрузки.
     * @param state - Текущее состояние.
     * @param action - Флаг загрузки.
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      logger.debug('setLoading: Установка состояния загрузки', action.payload);
      state.loading = action.payload;
    },

    /**
     * Установка ошибки.
     * @param state - Текущее состояние.
     * @param action - Текст ошибки.
     */
    setError: (state, action: PayloadAction<string | null>) => {
      logger.debug('setError: Установка ошибки', action.payload);
      state.error = action.payload;
      state.loading = false;
    },

    /**
     * Очистка ошибки.
     * @param state - Текущее состояние.
     */
    clearError: (state) => {
      logger.debug('clearError: Очистка ошибки');
      state.error = null;
    },

    /**
     * Очистка сообщения об успехе.
     * @param state - Текущее состояние.
     */
    clearSuccessMessage: (state) => {
      logger.debug('clearSuccessMessage: Очистка сообщения об успехе');
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAccounts
      .addCase(fetchAccounts.pending, (state) => {
        logger.debug('fetchAccounts.pending: Начало загрузки счетов');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        logger.debug('fetchAccounts.fulfilled: Счета успешно загружены', action.payload);
        state.accounts = action.payload.reduce(
          (acc, account) => {
            acc.byId[account.id] = account;
            if (!acc.allIds.includes(account.id)) acc.allIds.push(account.id);
            return acc;
          },
          { byId: {}, allIds: [] } as FinanceState['accounts']
        );
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Счета успешно загружены';
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        logger.error('fetchAccounts.rejected: Ошибка загрузки счетов', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка загрузки счетов';
        state.successMessage = null;
      })

      // createAccount
      .addCase(createAccount.pending, (state) => {
        logger.debug('createAccount.pending: Начало создания счёта');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        logger.debug('createAccount.fulfilled: Счёт успешно создан', action.payload);
        const account = action.payload;
        state.accounts.byId[account.id] = account;
        if (!state.accounts.allIds.includes(account.id)) {
          state.accounts.allIds.push(account.id);
        }
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Счёт успешно создан';
      })
      .addCase(createAccount.rejected, (state, action) => {
        logger.error('createAccount.rejected: Ошибка создания счёта', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка создания счёта';
        state.successMessage = null;
      })

      // updateAccount
      .addCase(updateAccount.pending, (state) => {
        logger.debug('updateAccount.pending: Начало обновления счёта');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        logger.debug('updateAccount.fulfilled: Счёт обновлён', action.payload);
        const account = action.payload;
        state.accounts.byId[account.id] = account;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Счёт обновлён';
      })
      .addCase(updateAccount.rejected, (state, action) => {
        logger.error('updateAccount.rejected: Ошибка обновления счёта', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка обновления счёта';
        state.successMessage = null;
      })

      // deleteAccount
      .addCase(deleteAccount.pending, (state) => {
        logger.debug('deleteAccount.pending: Начало удаления счёта');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        logger.debug('deleteAccount.fulfilled: Счёт удалён', action.payload);
        const accountId = action.payload;
        delete state.accounts.byId[accountId];
        state.accounts.allIds = state.accounts.allIds.filter((id) => id !== accountId);
        Object.keys(state.transactions.byId).forEach((txId) => {
          const tx = state.transactions.byId[parseInt(txId)];
          if (tx.debit_card_id === accountId || tx.credit_card_id === accountId) {
            delete state.transactions.byId[parseInt(txId)];
            state.transactions.allIds = state.transactions.allIds.filter((id) => id !== parseInt(txId));
          }
        });
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Счёт удалён';
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        logger.error('deleteAccount.rejected: Ошибка удаления счёта', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка удаления счёта';
        state.successMessage = null;
      })

      // fetchTransactions
      .addCase(fetchTransactions.pending, (state) => {
        logger.debug('fetchTransactions.pending: Начало загрузки транзакций');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        logger.debug('fetchTransactions.fulfilled: Транзакции загружены', action.payload);
        state.transactions = action.payload.reduce(
          (acc, tx) => {
            acc.byId[tx.id] = tx;
            if (!acc.allIds.includes(tx.id)) acc.allIds.push(tx.id);
            return acc;
          },
          { byId: {}, allIds: [] } as FinanceState['transactions']
        );
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Транзакции загружены';
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        logger.error('fetchTransactions.rejected: Ошибка загрузки транзакций', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка загрузки транзакций';
        state.successMessage = null;
      })

      // createTransaction
      .addCase(createTransaction.pending, (state) => {
        logger.debug('createTransaction.pending: Начало создания транзакции');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        logger.debug('createTransaction.fulfilled: Транзакция создана', action.payload);
        const tx = action.payload;
        state.transactions.byId[tx.id] = tx;
        if (!state.transactions.allIds.includes(tx.id)) {
          state.transactions.allIds.push(tx.id);
        }
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Транзакция создана';
      })
      .addCase(createTransaction.rejected, (state, action) => {
        logger.error('createTransaction.rejected: Ошибка создания транзакции', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка создания транзакции';
        state.successMessage = null;
      })

      // updateTransaction
      .addCase(updateTransaction.pending, (state) => {
        logger.debug('updateTransaction.pending: Начало обновления транзакции');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        logger.debug('updateTransaction.fulfilled: Транзакция обновлена', action.payload);
        const tx = action.payload;
        state.transactions.byId[tx.id] = tx;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Транзакция обновлена';
      })
      .addCase(updateTransaction.rejected, (state, action) => {
        logger.error('updateTransaction.rejected: Ошибка обновления транзакции', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка обновления транзакции';
        state.successMessage = null;
      })

      // deleteTransaction
      .addCase(deleteTransaction.pending, (state) => {
        logger.debug('deleteTransaction.pending: Начало удаления транзакции');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        logger.debug('deleteTransaction.fulfilled: Транзакция удалена', action.payload);
        const { id } = action.payload;
        delete state.transactions.byId[id];
        state.transactions.allIds = state.transactions.allIds.filter((txId) => txId !== id);
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Транзакция удалена';
      })
      .addCase(deleteTransaction.rejected, (state, action) => {
        logger.error('deleteTransaction.rejected: Ошибка удаления транзакции', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка удаления транзакции';
        state.successMessage = null;
      })

      // fetchDebts
      .addCase(fetchDebts.pending, (state) => {
        logger.debug('fetchDebts.pending: Начало загрузки долгов');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchDebts.fulfilled, (state, action) => {
        logger.debug('fetchDebts.fulfilled: Долги загружены', action.payload);
        state.debts = action.payload.reduce(
          (acc, debt) => {
            acc.byId[debt.id] = debt;
            if (!acc.allIds.includes(debt.id)) acc.allIds.push(debt.id);
            return acc;
          },
          { byId: {}, allIds: [] } as FinanceState['debts']
        );
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Долги загружены';
      })
      .addCase(fetchDebts.rejected, (state, action) => {
        logger.error('fetchDebts.rejected: Ошибка загрузки долгов', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка загрузки долгов';
        state.successMessage = null;
      })

      // createDebt
      .addCase(createDebt.pending, (state) => {
        logger.debug('createDebt.pending: Начало создания долга');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createDebt.fulfilled, (state, action) => {
        logger.debug('createDebt.fulfilled: Долг создан', action.payload);
        const debt = action.payload;
        state.debts.byId[debt.id] = debt;
        if (!state.debts.allIds.includes(debt.id)) {
          state.debts.allIds.push(debt.id);
        }
        state.paidDebts[`debt-${debt.id}`] = debt.is_paid === 1;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Долг создан';
      })
      .addCase(createDebt.rejected, (state, action) => {
        logger.error('createDebt.rejected: Ошибка создания долга', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка создания долга';
        state.successMessage = null;
      })

      // updateDebt
      .addCase(updateDebt.pending, (state) => {
        logger.debug('updateDebt.pending: Начало обновления долга');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateDebt.fulfilled, (state, action) => {
        logger.debug('updateDebt.fulfilled: Долг обновлён', action.payload);
        const debt = action.payload;
        state.debts.byId[debt.id] = debt;
        state.paidDebts[`debt-${debt.id}`] = debt.is_paid === 1;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Долг обновлён';
      })
      .addCase(updateDebt.rejected, (state, action) => {
        logger.error('updateDebt.rejected: Ошибка обновления долга', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка обновления долга';
        state.successMessage = null;
      })

      // deleteDebt
      .addCase(deleteDebt.pending, (state) => {
        logger.debug('deleteDebt.pending: Начало удаления долга');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteDebt.fulfilled, (state, action) => {
        logger.debug('deleteDebt.fulfilled: Долг удалён', action.payload);
        const debtId = action.payload;
        delete state.debts.byId[debtId];
        state.debts.allIds = state.debts.allIds.filter((id) => id !== debtId);
        delete state.paidDebts[`debt-${debtId}`];
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Долг удалён';
      })
      .addCase(deleteDebt.rejected, (state, action) => {
        logger.error('deleteDebt.rejected: Ошибка удаления долга', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка удаления долга';
        state.successMessage = null;
      })

      // fetchLoans
      .addCase(fetchLoans.pending, (state) => {
        logger.debug('fetchLoans.pending: Начало загрузки займов');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        logger.debug('fetchLoans.fulfilled: Займы загружены', action.payload);
        state.loans = action.payload.reduce(
          (acc, loan) => {
            acc.byId[loan.id] = loan;
            if (!acc.allIds.includes(loan.id)) acc.allIds.push(loan.id);
            return acc;
          },
          { byId: {}, allIds: [] } as FinanceState['loans']
        );
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Займы загружены';
      })
      .addCase(fetchLoans.rejected, (state, action) => {
        logger.error('fetchLoans.rejected: Ошибка загрузки займов', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка загрузки займов';
        state.successMessage = null;
      })

      // createLoan
      .addCase(createLoan.pending, (state) => {
        logger.debug('createLoan.pending: Начало создания займа');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createLoan.fulfilled, (state, action) => {
        logger.debug('createLoan.fulfilled: Займ создан', action.payload);
        const loan = action.payload;
        state.loans.byId[loan.id] = loan;
        if (!state.loans.allIds.includes(loan.id)) {
          state.loans.allIds.push(loan.id);
        }
        state.paidDebts[`loan-${loan.id}`] = loan.is_paid === 1;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Займ создан';
      })
      .addCase(createLoan.rejected, (state, action) => {
        logger.error('createLoan.rejected: Ошибка создания займа', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка создания займа';
        state.successMessage = null;
      })

      // updateLoan
      .addCase(updateLoan.pending, (state) => {
        logger.debug('updateLoan.pending: Начало обновления займа');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateLoan.fulfilled, (state, action) => {
        logger.debug('updateLoan.fulfilled: Займ обновлён', action.payload);
        const loan = action.payload;
        state.loans.byId[loan.id] = loan;
        state.paidDebts[`loan-${loan.id}`] = loan.is_paid === 1;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Займ обновлён';
      })
      .addCase(updateLoan.rejected, (state, action) => {
        logger.error('updateLoan.rejected: Ошибка обновления займа', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка обновления займа';
        state.successMessage = null;
      })

      // deleteLoan
      .addCase(deleteLoan.pending, (state) => {
        logger.debug('deleteLoan.pending: Начало удаления займа');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteLoan.fulfilled, (state, action) => {
        logger.debug('deleteLoan.fulfilled: Займ удалён', action.payload);
        const loanId = action.payload;
        delete state.loans.byId[loanId];
        state.loans.allIds = state.loans.allIds.filter((id) => id !== loanId);
        delete state.paidDebts[`loan-${loanId}`];
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Займ удалён';
      })
      .addCase(deleteLoan.rejected, (state, action) => {
        logger.error('deleteLoan.rejected: Ошибка удаления займа', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка удаления займа';
        state.successMessage = null;
      })

      // fetchInitialData
      .addCase(fetchInitialData.pending, (state) => {
        logger.debug('fetchInitialData.pending: Начало загрузки данных');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchInitialData.fulfilled, (state, action) => {
        logger.debug('fetchInitialData.fulfilled: Данные успешно загружены', action.payload);
        const { accounts, transactions, debts, loans, paidDebts } = action.payload;
        state.accounts = {
          byId: accounts.reduce((acc: { [key: number]: Account }, item) => {
            acc[item.id] = item;
            return acc;
          }, {}),
          allIds: accounts.map((item: Account) => item.id),
        };
        state.transactions = {
          byId: transactions.reduce((acc: { [key: number]: Transaction }, item) => {
            acc[item.id] = item;
            return acc;
          }, {}),
          allIds: transactions.map((item: Transaction) => item.id),
        };
        state.debts = {
          byId: debts.reduce((acc: { [key: number]: Debt }, item) => {
            acc[item.id] = item;
            return acc;
          }, {}),
          allIds: debts.map((item: Debt) => item.id),
        };
        state.loans = {
          byId: loans.reduce((acc: { [key: number]: Loan }, item) => {
            acc[item.id] = item;
            return acc;
          }, {}),
          allIds: loans.map((item: Loan) => item.id),
        };
        state.paidDebts = paidDebts || {};
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Данные успешно загружены';
      })
      .addCase(fetchInitialData.rejected, (state, action) => {
        logger.error('fetchInitialData.rejected: Ошибка загрузки данных', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Не удалось загрузить данные';
        state.successMessage = null;
      })

      // addTransaction
      .addCase(addTransaction.pending, (state) => {
        logger.debug('addTransaction.pending: Начало добавления транзакции');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        logger.debug('addTransaction.fulfilled: Транзакция успешно добавлена', action.payload);
        const { data } = action.payload;
        const newTransactions = Array.isArray(data) ? data : [data];
        newTransactions.forEach((tx: Transaction) => {
          state.transactions.byId[tx.id] = tx;
          if (!state.transactions.allIds.includes(tx.id)) {
            state.transactions.allIds.push(tx.id);
          }
        });
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Транзакция успешно добавлена';
      })
      .addCase(addTransaction.rejected, (state, action) => {
        logger.error('addTransaction.rejected: Ошибка добавления транзакции', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка добавления транзакции';
        state.successMessage = null;
      })

      // addDebitCard
      .addCase(addDebitCard.pending, (state) => {
        logger.debug('addDebitCard.pending: Начало добавления дебетовой карты');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(addDebitCard.fulfilled, (state, action) => {
        logger.debug('addDebitCard.fulfilled: Дебетовая карта добавлена', action.payload);
        const { data } = action.payload;
        state.accounts.byId[data.id] = data;
        if (!state.accounts.allIds.includes(data.id)) {
          state.accounts.allIds.push(data.id);
        }
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Дебетовая карта добавлена';
      })
      .addCase(addDebitCard.rejected, (state, action) => {
        logger.error('addDebitCard.rejected: Ошибка добавления дебетовой карты', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка добавления дебетовой карты';
        state.successMessage = null;
      })

      // togglePaidDebt
      .addCase(togglePaidDebt.pending, (state) => {
        logger.debug('togglePaidDebt.pending: Начало переключения статуса оплаты');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(togglePaidDebt.fulfilled, (state, action) => {
        logger.debug('togglePaidDebt.fulfilled: Статус оплаты обновлён', action.payload);
        const { type, id, data, newPaidStatus } = action.payload;
        if (type === 'debt') {
          state.debts.byId[id] = data;
        } else if (type === 'credit_card') {
          state.accounts.byId[id] = data;
        } else if (type === 'loan') {
          state.loans.byId[id] = data;
        }
        state.paidDebts[`${type}-${id}`] = newPaidStatus;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Статус оплаты обновлён';
      })
      .addCase(togglePaidDebt.rejected, (state, action) => {
        logger.error('togglePaidDebt.rejected: Ошибка переключения статуса оплаты', action.payload);
        const { debtKey, paidDebts } = action.payload;
        state.paidDebts = paidDebts;
        state.loading = false;
        state.error = action.payload.error || 'Ошибка переключения статуса оплаты';
        state.successMessage = null;
      })

      // saveCreditCard
      .addCase(saveCreditCard.pending, (state) => {
        logger.debug('saveCreditCard.pending: Начало сохранения кредитной карты');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(saveCreditCard.fulfilled, (state, action) => {
        logger.debug('saveCreditCard.fulfilled: Кредитная карта обновлена', action.payload);
        const { id, ...account } = action.payload;
        state.accounts.byId[id] = { ...state.accounts.byId[id], ...account };
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Кредитная карта обновлена';
      })
      .addCase(saveCreditCard.rejected, (state, action) => {
        logger.error('saveCreditCard.rejected: Ошибка сохранения кредитной карты', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка сохранения кредитной карты';
        state.successMessage = null;
      })

      // saveEditedLoan
      .addCase(saveEditedLoan.pending, (state) => {
        logger.debug('saveEditedLoan.pending: Начало сохранения займа');
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(saveEditedLoan.fulfilled, (state, action) => {
        logger.debug('saveEditedLoan.fulfilled: Займ обновлён', action.payload);
        const { id, ...loan } = action.payload;
        state.loans.byId[id] = { ...state.loans.byId[id], ...loan };
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
        state.successMessage = 'Займ обновлён';
      })
      .addCase(saveEditedLoan.rejected, (state, action) => {
        logger.error('saveEditedLoan.rejected: Ошибка сохранения займа', action.payload);
        state.loading = false;
        state.error = action.payload as string || 'Ошибка сохранения займа';
        state.successMessage = null;
      });
  },
});

// Экспорт действий из slice
export const financeActions = financeSlice.actions;

// Экспорт редьюсера
export default financeSlice.reducer;

/**
 * Селекторы для получения массивов из нормализованных данных.
 */
export const getAccountsArray = (state: RootState): Account[] => Object.values(state.finance.accounts.byId);
export const getTransactionsArray = (state: RootState): Transaction[] => Object.values(state.finance.transactions.byId);
export const getDebtsArray = (state: RootState): Debt[] => Object.values(state.finance.debts.byId);
export const getLoansArray = (state: RootState): Loan[] => Object.values(state.finance.loans.byId);
export const getPaidDebtsArray = (state: RootState): string[] =>
  Object.entries(state.finance.paidDebts)
    .filter(([_, isPaid]) => isPaid)
    .map(([key]) => key);

/**
 * Селекторы для фильтрации данных.
 */
export const getFilteredAccounts = (state: RootState): Account[] => Object.values(state.finance.accounts.byId);
export const getFilteredTransactions = (state: RootState): Transaction[] => Object.values(state.finance.transactions.byId);
export const getFilteredDebts = (state: RootState): Debt[] => Object.values(state.finance.debts.byId);
export const getFilteredLoans = (state: RootState): Loan[] => Object.values(state.finance.loans.byId);

/**
 * Селектор для получения унифицированного списка долгов.
 * @param state - Состояние Redux.
 * @returns Массив унифицированных долгов.
 */
export const getUnifiedDebts = (state: RootState): Array<{ id: number; name: string; amountToPay: number; totalAmount: number; dueDate?: string; type: string }> => {
  const debts = getDebtsArray(state).map((debt) => ({
    id: debt.id,
    name: debt.name,
    amountToPay: debt.amount,
    totalAmount: debt.total_debt,
    dueDate: debt.due_date,
    type: 'debt',
  }));
  const creditCards = getAccountsArray(state)
    .filter((acc) => acc.type === 'credit')
    .map((acc) => ({
      id: acc.id,
      name: acc.name,
      amountToPay: acc.min_payment || 0,
      totalAmount: acc.debt || 0,
      dueDate: acc.payment_due_date,
      type: 'credit_card',
    }));
  const loans = getLoansArray(state).map((loan) => ({
    id: loan.id,
    name: loan.name,
    amountToPay: loan.monthly_payment || 0,
    totalAmount: loan.amount || 0,
    dueDate: loan.payment_due_day,
    type: 'loan',
  }));
  return [...debts, ...creditCards, ...loans];
};