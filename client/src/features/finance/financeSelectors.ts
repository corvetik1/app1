// src/features/finance/financeSelectors.ts
import { createSelector } from 'reselect';
import { RootState } from '../../app/store';
import { Account, Transaction, Debt, Loan, FinanceState } from './financeSlice';

/**
 * Базовый селектор для получения состояния финансов.
 * @param state - Состояние Redux.
 * @returns Состояние финансов.
 */
const getFinanceState = (state: RootState): FinanceState => state.finance;

/**
 * Базовый селектор для получения состояния аутентификации.
 * @param state - Состояние Redux.
 * @returns Состояние аутентификации.
 */
const getAuthState = (state: RootState) => state.auth;

/**
 * Селектор для получения массива счетов.
 * @param state - Состояние Redux.
 * @returns Массив счетов.
 */
export const getAccountsArray = createSelector(
  [getFinanceState],
  (finance) => Object.values(finance.accounts.byId)
);

/**
 * Селектор для получения массива транзакций.
 * @param state - Состояние Redux.
 * @returns Массив транзакций.
 */
export const getTransactionsArray = createSelector(
  [getFinanceState],
  (finance) => Object.values(finance.transactions.byId)
);

/**
 * Селектор для получения массива долгов.
 * @param state - Состояние Redux.
 * @returns Массив долгов.
 */
export const getDebtsArray = createSelector(
  [getFinanceState],
  (finance) => Object.values(finance.debts.byId)
);

/**
 * Селектор для получения массива займов.
 * @param state - Состояние Redux.
 * @returns Массив займов.
 */
export const getLoansArray = createSelector(
  [getFinanceState],
  (finance) => Object.values(finance.loans.byId)
);

/**
 * Селектор для получения массива ключей оплаченных долгов.
 * @param state - Состояние Redux.
 * @returns Массив ключей оплаченных долгов.
 */
export const getPaidDebtsArray = createSelector(
  [getFinanceState],
  (finance) =>
    Object.entries(finance.paidDebts)
      .filter(([_, isPaid]) => isPaid)
      .map(([key]) => key)
);

/**
 * Селектор для получения счетов текущего пользователя.
 * @param state - Состояние Redux.
 * @returns Массив счетов текущего пользователя.
 */
export const getFilteredAccounts = createSelector(
  [getFinanceState, getAuthState],
  (finance, auth) =>
    auth.userId ? Object.values(finance.accounts.byId).filter((account) => account.user_id === auth.userId) : []
);

/**
 * Селектор для получения транзакций текущего пользователя.
 * @param state - Состояние Redux.
 * @returns Массив транзакций текущего пользователя.
 */
export const getFilteredTransactions = createSelector(
  [getFinanceState, getAuthState],
  (finance, auth) =>
    auth.userId ? Object.values(finance.transactions.byId).filter((t) => t.user_id === auth.userId) : []
);

/**
 * Селектор для получения долгов текущего пользователя.
 * @param state - Состояние Redux.
 * @returns Массив долгов текущего пользователя.
 */
export const getFilteredDebts = createSelector(
  [getFinanceState, getAuthState],
  (finance, auth) =>
    auth.userId ? Object.values(finance.debts.byId).filter((debt) => debt.user_id === auth.userId) : []
);

/**
 * Селектор для получения займов текущего пользователя.
 * @param state - Состояние Redux.
 * @returns Массив займов текущего пользователя.
 */
export const getFilteredLoans = createSelector(
  [getFinanceState, getAuthState],
  (finance, auth) =>
    auth.userId ? Object.values(finance.loans.byId).filter((loan) => loan.user_id === auth.userId) : []
);

/**
 * Селектор для получения унифицированного списка долгов текущего пользователя.
 * @param state - Состояние Redux.
 * @returns Массив унифицированных долгов (долги, кредитные карты, займы).
 */
export const getUnifiedDebts = createSelector(
  [getFilteredDebts, getFilteredAccounts, getFilteredLoans, getFinanceState],
  (debts, accounts, loans, finance) => {
    const unified: Array<{ id: number; name: string; amountToPay: number; totalAmount: number; dueDate?: string; type: string; isPaid: boolean }> = [];

    // Долги
    debts.forEach((debt) =>
      unified.push({
        id: debt.id,
        name: debt.name,
        amountToPay: debt.amount,
        totalAmount: debt.total_debt,
        dueDate: debt.due_date,
        type: 'debt',
        isPaid: finance.paidDebts[`debt-${debt.id}`] || false,
      })
    );

    // Кредитные карты
    accounts.filter((acc) => acc.type === 'credit').forEach((card) =>
      unified.push({
        id: card.id,
        name: card.name,
        amountToPay: card.min_payment || 0,
        totalAmount: card.debt || 0,
        dueDate: card.payment_due_date,
        type: 'credit_card',
        isPaid: finance.paidDebts[`credit_card-${card.id}`] || false,
      })
    );

    // Займы
    loans.forEach((loan) =>
      unified.push({
        id: loan.id,
        name: loan.name,
        amountToPay: loan.monthly_payment || 0,
        totalAmount: loan.amount || 0,
        dueDate: loan.payment_due_day,
        type: 'loan',
        isPaid: finance.paidDebts[`loan-${loan.id}`] || false,
      })
    );

    return unified;
  }
);

/**
 * Селектор для получения общей суммы транзакций по типу.
 * @param type - Тип транзакции ('income', 'expense', 'transfer_in', 'transfer_out').
 * @returns Сумма транзакций указанного типа.
 */
export const getTotalByTransactionType = createSelector(
  [getFilteredTransactions],
  (transactions) => (type: Transaction['type']) =>
    transactions
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
);