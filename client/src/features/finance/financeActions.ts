// src/features/finance/financeActions.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api'; // Импортируем api для единообразия
import logger from '../../utils/logger'; // Используем исправленный logger
import { setSnackbar } from '../../auth/authSlice'; // Для уведомлений
import { Account, Transaction, Debt, Loan } from './financeSlice'; // Импорт интерфейсов

/**
 * Загрузка всех счетов.
 * @returns {Promise<Account[]>} Массив счетов.
 * @throws {string} Сообщение об ошибке при неудачной загрузке.
 */
export const fetchAccounts = createAsyncThunk(
  'finance/fetchAccounts',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.getAccounts();
      logger.debug('fetchAccounts: Счета успешно загружены', { count: response.length });
      dispatch(setSnackbar({ message: 'Счета успешно загружены', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки счетов';
      logger.error('fetchAccounts: Ошибка загрузки счетов', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Создание нового счёта.
 * @param {Account} accountData - Данные нового счёта.
 * @returns {Promise<Account>} Объект созданного счёта.
 * @throws {string} Сообщение об ошибке при неудачном создании.
 */
export const createAccount = createAsyncThunk(
  'finance/createAccount',
  async (accountData: Account, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addAccount(accountData);
      logger.debug('createAccount: Счёт успешно создан', { accountId: response.id });
      dispatch(setSnackbar({ message: 'Счёт успешно создан', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания счёта';
      logger.error('createAccount: Ошибка создания счёта', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Обновление существующего счёта.
 * @param {Account} accountData - Обновлённые данные счёта (включая id и type).
 * @returns {Promise<Account>} Обновлённый объект счёта.
 * @throws {string} Сообщение об ошибке при неудачном обновлении.
 */
export const updateAccount = createAsyncThunk(
  'finance/updateAccount',
  async (accountData: Account, { dispatch, rejectWithValue }) => {
    try {
      if (!accountData.id) throw new Error('ID счёта обязателен для обновления');
      const response = await api.updateAccount(accountData.id, accountData);
      logger.debug('updateAccount: Счёт обновлён', { accountId: response.id });
      dispatch(setSnackbar({ message: 'Счёт обновлён', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления счёта';
      logger.error('updateAccount: Ошибка обновления счёта', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Удаление счёта.
 * @param {{ accountId: number; type: 'debit' | 'credit' }} params - ID счёта и его тип.
 * @returns {Promise<number>} ID удалённого счёта.
 * @throws {string} Сообщение об ошибке при неудачном удалении.
 */
export const deleteAccount = createAsyncThunk(
  'finance/deleteAccount',
  async ({ accountId, type }: { accountId: number; type: 'debit' | 'credit' }, { dispatch, rejectWithValue }) => {
    try {
      await api.deleteAccount(accountId, type);
      logger.debug('deleteAccount: Счёт удалён', { accountId, type });
      dispatch(setSnackbar({ message: 'Счёт удалён', severity: 'success' }));
      return accountId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления счёта';
      logger.error('deleteAccount: Ошибка удаления счёта', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Загрузка всех транзакций.
 * @returns {Promise<Transaction[]>} Массив транзакций.
 * @throws {string} Сообщение об ошибке при неудачной загрузке.
 */
export const fetchTransactions = createAsyncThunk(
  'finance/fetchTransactions',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.getTransactions();
      logger.debug('fetchTransactions: Транзакции загружены', { count: response.length });
      dispatch(setSnackbar({ message: 'Транзакции загружены', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки транзакций';
      logger.error('fetchTransactions: Ошибка загрузки транзакций', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Создание новой транзакции.
 * @param {Transaction} transactionData - Данные новой транзакции.
 * @returns {Promise<Transaction>} Объект созданной транзакции.
 * @throws {string} Сообщение об ошибке при неудачном создании.
 */
export const createTransaction = createAsyncThunk(
  'finance/createTransaction',
  async (transactionData: Transaction, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addTransaction(transactionData);
      logger.debug('createTransaction: Транзакция создана', { transactionId: response.id });
      dispatch(setSnackbar({ message: 'Транзакция создана', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания транзакции';
      logger.error('createTransaction: Ошибка создания транзакции', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Добавление новой транзакции (альтернатива для FinancePage).
 * @param {Transaction} transactionData - Данные новой транзакции.
 * @returns {Promise<Transaction>} Объект созданной транзакции.
 * @throws {string} Сообщение об ошибке при неудачном добавлении.
 */
export const addTransaction = createAsyncThunk(
  'finance/addTransaction',
  async (transactionData: Transaction, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addTransaction(transactionData);
      logger.debug('addTransaction: Транзакция добавлена', { transactionId: response.id });
      dispatch(setSnackbar({ message: 'Транзакция добавлена', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка добавления транзакции';
      logger.error('addTransaction: Ошибка добавления транзакции', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Обновление существующей транзакции.
 * @param {Transaction} transactionData - Обновлённые данные транзакции (включая id).
 * @returns {Promise<Transaction>} Обновлённый объект транзакции.
 * @throws {string} Сообщение об ошибке при неудачном обновлении.
 */
export const updateTransaction = createAsyncThunk(
  'finance/updateTransaction',
  async (transactionData: Transaction, { dispatch, rejectWithValue }) => {
    try {
      if (!transactionData.id) throw new Error('ID транзакции обязателен для обновления');
      const response = await api.updateTransaction(transactionData.id, transactionData);
      logger.debug('updateTransaction: Транзакция обновлена', { transactionId: response.id });
      dispatch(setSnackbar({ message: 'Транзакция обновлена', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления транзакции';
      logger.error('updateTransaction: Ошибка обновления транзакции', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Удаление транзакции.
 * @param {number} transactionId - ID транзакции.
 * @returns {Promise<number>} ID удалённой транзакции.
 * @throws {string} Сообщение об ошибке при неудачном удалении.
 */
export const deleteTransaction = createAsyncThunk(
  'finance/deleteTransaction',
  async (transactionId: number, { dispatch, rejectWithValue }) => {
    try {
      await api.deleteTransaction(transactionId);
      logger.debug('deleteTransaction: Транзакция удалена', { transactionId });
      dispatch(setSnackbar({ message: 'Транзакция удалена', severity: 'success' }));
      return transactionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления транзакции';
      logger.error('deleteTransaction: Ошибка удаления транзакции', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Загрузка всех долгов.
 * @returns {Promise<Debt[]>} Массив долгов.
 * @throws {string} Сообщение об ошибке при неудачной загрузке.
 */
export const fetchDebts = createAsyncThunk(
  'finance/fetchDebts',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.getDolgTable();
      logger.debug('fetchDebts: Долги загружены', { count: response.length });
      dispatch(setSnackbar({ message: 'Долги загружены', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки долгов';
      logger.error('fetchDebts: Ошибка загрузки долгов', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Создание нового долга.
 * @param {Debt} debtData - Данные нового долга.
 * @returns {Promise<Debt>} Объект созданного долга.
 * @throws {string} Сообщение об ошибке при неудачном создании.
 */
export const createDebt = createAsyncThunk(
  'finance/createDebt',
  async (debtData: Debt, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addDebt(debtData);
      logger.debug('createDebt: Долг создан', { debtId: response.id });
      dispatch(setSnackbar({ message: 'Долг создан', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания долга';
      logger.error('createDebt: Ошибка создания долга', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Обновление существующего долга.
 * @param {Debt} debtData - Обновлённые данные долга (включая id).
 * @returns {Promise<Debt>} Обновлённый объект долга.
 * @throws {string} Сообщение об ошибке при неудачном обновлении.
 */
export const updateDebt = createAsyncThunk(
  'finance/updateDebt',
  async (debtData: Debt, { dispatch, rejectWithValue }) => {
    try {
      if (!debtData.id) throw new Error('ID долга обязателен для обновления');
      const response = await api.updateDebt(debtData.id, debtData);
      logger.debug('updateDebt: Долг обновлён', { debtId: response.id });
      dispatch(setSnackbar({ message: 'Долг обновлён', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления долга';
      logger.error('updateDebt: Ошибка обновления долга', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Удаление долга.
 * @param {number} debtId - ID долга.
 * @returns {Promise<number>} ID удалённого долга.
 * @throws {string} Сообщение об ошибке при неудачном удалении.
 */
export const deleteDebt = createAsyncThunk(
  'finance/deleteDebt',
  async (debtId: number, { dispatch, rejectWithValue }) => {
    try {
      await api.deleteDebt(debtId);
      logger.debug('deleteDebt: Долг удалён', { debtId });
      dispatch(setSnackbar({ message: 'Долг удалён', severity: 'success' }));
      return debtId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления долга';
      logger.error('deleteDebt: Ошибка удаления долга', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Загрузка всех займов.
 * @returns {Promise<Loan[]>} Массив займов.
 * @throws {string} Сообщение об ошибке при неудачной загрузке.
 */
export const fetchLoans = createAsyncThunk(
  'finance/fetchLoans',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.getLoans();
      logger.debug('fetchLoans: Займы загружены', { count: response.length });
      dispatch(setSnackbar({ message: 'Займы загружены', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки займов';
      logger.error('fetchLoans: Ошибка загрузки займов', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Создание нового займа.
 * @param {Loan} loanData - Данные нового займа.
 * @returns {Promise<Loan>} Объект созданного займа.
 * @throws {string} Сообщение об ошибке при неудачном создании.
 */
export const createLoan = createAsyncThunk(
  'finance/createLoan',
  async (loanData: Loan, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addLoan(loanData);
      logger.debug('createLoan: Займ создан', { loanId: response.id });
      dispatch(setSnackbar({ message: 'Займ создан', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания займа';
      logger.error('createLoan: Ошибка создания займа', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Обновление существующего займа.
 * @param {Loan} loanData - Обновлённые данные займа (включая id).
 * @returns {Promise<Loan>} Обновлённый объект займа.
 * @throws {string} Сообщение об ошибке при неудачном обновлении.
 */
export const updateLoan = createAsyncThunk(
  'finance/updateLoan',
  async (loanData: Loan, { dispatch, rejectWithValue }) => {
    try {
      if (!loanData.id) throw new Error('ID займа обязателен для обновления');
      const response = await api.updateLoan(loanData.id, loanData);
      logger.debug('updateLoan: Займ обновлён', { loanId: response.id });
      dispatch(setSnackbar({ message: 'Займ обновлён', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления займа';
      logger.error('updateLoan: Ошибка обновления займа', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Удаление займа.
 * @param {number} loanId - ID займа.
 * @returns {Promise<number>} ID удалённого займа.
 * @throws {string} Сообщение об ошибке при неудачном удалении.
 */
export const deleteLoan = createAsyncThunk(
  'finance/deleteLoan',
  async (loanId: number, { dispatch, rejectWithValue }) => {
    try {
      await api.deleteLoan(loanId);
      logger.debug('deleteLoan: Займ удалён', { loanId });
      dispatch(setSnackbar({ message: 'Займ удалён', severity: 'success' }));
      return loanId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления займа';
      logger.error('deleteLoan: Ошибка удаления займа', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Загрузка начальных финансовых данных.
 * @param {{ userId: number }} params - ID пользователя.
 * @returns {Promise<{ accounts: Account[]; transactions: Transaction[]; debts: Debt[]; loans: Loan[]; paidDebts: { [key: string]: boolean } }>} Объект с массивами данных.
 * @throws {string} Сообщение об ошибке при неудачной загрузке.
 */
export const fetchInitialData = createAsyncThunk(
  'finance/fetchInitialData',
  async ({ userId }: { userId: number }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.getAllFinanceData(userId);
      logger.debug('fetchInitialData: Данные успешно загружены', {
        accounts: response.accounts.length,
        transactions: response.transactions.length,
        debts: response.debts.length,
        loans: response.loans.length,
      });
      dispatch(setSnackbar({ message: 'Финансовые данные загружены', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить данные';
      logger.error('fetchInitialData: Ошибка загрузки данных', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Добавление дебетовой карты.
 * @param {{ name: string; user_id: number }} cardData - Данные дебетовой карты.
 * @returns {Promise<Account>} Объект созданной дебетовой карты.
 * @throws {string} Сообщение об ошибке при неудачном добавлении.
 */
export const addDebitCard = createAsyncThunk(
  'finance/addDebitCard',
  async ({ name, user_id }: { name: string; user_id: number }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addDebitCard({ name, user_id });
      logger.debug('addDebitCard: Дебетовая карта добавлена', { accountId: response.id });
      dispatch(setSnackbar({ message: 'Дебетовая карта добавлена', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при добавлении дебетовой карты';
      logger.error('addDebitCard: Ошибка добавления дебетовой карты', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Добавление кредитной карты.
 * @param {Account} cardData - Данные кредитной карты.
 * @returns {Promise<Account>} Объект созданной кредитной карты.
 * @throws {string} Сообщение об ошибке при неудачном добавлении.
 */
export const addCreditCard = createAsyncThunk(
  'finance/addCreditCard',
  async (cardData: Account, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.addCreditCard({ ...cardData, type: 'credit' });
      logger.debug('addCreditCard: Кредитная карта добавлена', { accountId: response.id });
      dispatch(setSnackbar({ message: 'Кредитная карта добавлена', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при добавлении кредитной карты';
      logger.error('addCreditCard: Ошибка добавления кредитной карты', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Переключение статуса оплаты долга, кредитной карты или займа.
 * @param {{ debtKey: string; paidDebts: { [key: string]: boolean }; filteredDebts: Debt[]; filteredAccounts: Account[]; filteredLoans: Loan[] }} params - Параметры переключения.
 * @returns {Promise<{ type: string; id: number; data: Debt | Account | Loan; newPaidStatus: boolean }>} Объект с обновлёнными данными.
 * @throws {string} Сообщение об ошибке при неудачном переключении.
 */
export const togglePaidDebt = createAsyncThunk(
  'finance/togglePaidDebt',
  async (
    {
      debtKey,
      paidDebts,
      filteredDebts,
      filteredAccounts,
      filteredLoans,
    }: {
      debtKey: string;
      paidDebts: { [key: string]: boolean };
      filteredDebts: Debt[];
      filteredAccounts: Account[];
      filteredLoans: Loan[];
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const [type, idStr] = debtKey.split('-');
      const id = parseInt(idStr);
      if (isNaN(id)) throw new Error('Неверный формат debtKey');
      const newPaidStatus = !paidDebts[debtKey];
      let response;

      switch (type) {
        case 'debt': {
          const currentDebt = filteredDebts.find((d) => d.id === id);
          if (!currentDebt) throw new Error('Долг не найден');
          response = await api.toggleDebtPaid(id, newPaidStatus);
          break;
        }
        case 'credit_card': {
          const currentAccount = filteredAccounts.find((a) => a.id === id);
          if (!currentAccount) throw new Error('Кредитная карта не найдена');
          response = await api.toggleCreditCardPaid(id, newPaidStatus);
          break;
        }
        case 'loan': {
          const currentLoan = filteredLoans.find((l) => l.id === id);
          if (!currentLoan) throw new Error('Займ не найден');
          response = await api.toggleLoanPaid(id, newPaidStatus);
          break;
        }
        default:
          throw new Error('Неверный тип долга');
      }

      logger.debug('togglePaidDebt: Статус оплаты обновлён', { type, id, newPaidStatus });
      dispatch(setSnackbar({ message: 'Статус оплаты обновлён', severity: 'success' }));
      return { type, id, data: response, newPaidStatus };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении статуса оплаты';
      logger.error('togglePaidDebt: Ошибка переключения статуса оплаты', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue({ error: errorMessage, debtKey, paidDebts });
    }
  }
);

/**
 * Сохранение изменений кредитной карты.
 * @param {{ accountId: number; creditCardData: Account }} params - ID счёта и обновлённые данные.
 * @returns {Promise<Account>} Обновлённый объект кредитной карты.
 * @throws {string} Сообщение об ошибке при неудачном сохранении.
 */
export const saveCreditCard = createAsyncThunk(
  'finance/saveCreditCard',
  async (
    { accountId, creditCardData }: { accountId: number; creditCardData: Account },
    { dispatch, rejectWithValue }
  ) => {
    try {
      if (!accountId) throw new Error('ID счёта обязателен для обновления');
      const response = await api.updateCreditCard(accountId, creditCardData);
      logger.debug('saveCreditCard: Кредитная карта обновлена', { accountId: response.id });
      dispatch(setSnackbar({ message: 'Кредитная карта обновлена', severity: 'success' }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении кредитной карты';
      logger.error('saveCreditCard: Ошибка сохранения кредитной карты', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Сохранение изменений займа.
 * @param {{ loanId: number; loanData: Loan }} params - ID займа и обновлённые данные.
 * @returns {Promise<Loan>} Обновлённый объект займа с ID.
 * @throws {string} Сообщение об ошибке при неудачном сохранении.
 */
export const saveEditedLoan = createAsyncThunk(
  'finance/saveEditedLoan',
  async (
    { loanId, loanData }: { loanId: number; loanData: Loan },
    { dispatch, rejectWithValue }
  ) => {
    try {
      if (!loanId) throw new Error('ID займа обязателен для обновления');
      const response = await api.updateLoan(loanId, loanData);
      logger.debug('saveEditedLoan: Займ обновлён', { loanId: response.id });
      dispatch(setSnackbar({ message: 'Займ обновлён', severity: 'success' }));
      return { ...response, id: loanId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении займа';
      logger.error('saveEditedLoan: Ошибка сохранения займа', { error: errorMessage });
      dispatch(setSnackbar({ message: errorMessage, severity: 'error' }));
      return rejectWithValue(errorMessage);
    }
  }
);

// Экспорт всех действий через объект по умолчанию
export default {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  fetchTransactions,
  createTransaction,
  addTransaction, 
  updateTransaction,
  deleteTransaction,
  fetchDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  fetchLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  fetchInitialData,
  addDebitCard,
  addCreditCard,
  togglePaidDebt,
  saveCreditCard,
  saveEditedLoan,
};