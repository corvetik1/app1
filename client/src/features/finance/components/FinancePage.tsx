// src/features/finance/components/FinancePage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Fade,
  CircularProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import TransactionForm from './TransactionForm';
import AddDebtDialog from './dialogs/AddDebtDialog';
import AddLoanDialog from './dialogs/AddLoanDialog';
import EditLoanDialog from './dialogs/EditLoanDialog';
import AddCreditCardDialog from './dialogs/AddCreditCardDialog';
import EditCreditCardDialog from './dialogs/EditCreditCardDialog';
import ReportDialog from './dialogs/ReportDialog';
import HistoryDialog from './dialogs/HistoryDialog';
import AccountCards from './AccountCards';
import CreditCards from './CreditCards';
import Loans from './Loans';
import DebtTable from './DebtTable';
import {
  FinancePageWrapper,
  FinancePageContainer,
  SummaryContainer,
  SummaryItem,
  TopActions,
  TopActionButton,
  DecorLine,
  DecorDots,
  SectionTitle,
  AccountsSummary,
  AccountsSummaryItem,
  DebtTableContainer,
  TransactionFormContainer,
  StyledButton,
} from './FinanceStyles';
import { RootState, AppDispatch } from '../../../app/store';
import { fetchInitialData, addTransaction, saveCreditCard, saveEditedLoan } from '../financeActions';
import { setSnackbar } from '../../../auth/authSlice';
import { formatCurrency } from '../../../utils/formatUtils';
import logger from '../../../utils/logger';
import { Account, Transaction, Loan } from '../financeSlice';

interface NewTransaction {
  accountId: string;
  transferToAccountId: number | null;
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  description: string;
  category: string;
}

const FinancePage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { userId, token, role } = useSelector((state: RootState) => state.auth);
  const { accounts, debts, loans, loading, error } = useSelector((state: RootState) => state.finance);

  const [newTransaction, setNewTransaction] = useState<NewTransaction>({
    accountId: '',
    transferToAccountId: null,
    type: 'expense',
    amount: '',
    description: '',
    category: '',
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [addDebtDialogOpen, setAddDebtDialogOpen] = useState<boolean>(false);
  const [addLoanDialogOpen, setAddLoanDialogOpen] = useState<boolean>(false);
  const [editLoanDialogOpen, setEditLoanDialogOpen] = useState<boolean>(false);
  const [addCreditCardDialogOpen, setAddCreditCardDialogOpen] = useState<boolean>(false);
  const [editCreditCardDialogOpen, setEditCreditCardDialogOpen] = useState<boolean>(false);
  const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  const [editedLoan, setEditedLoan] = useState<Loan | null>(null);
  const [editedCreditCard, setEditedCreditCard] = useState<Account | null>(null);

  const accountsArray = useMemo(() => Object.values(accounts.byId), [accounts.byId]);
  const debtsArray = useMemo(() => Object.values(debts.byId), [debts.byId]);
  const loansArray = useMemo(() => Object.values(loans.byId), [loans.byId]);
  const debitAccounts = useMemo(() => accountsArray.filter(acc => acc.type === 'debit'), [accountsArray]);
  const creditAccounts = useMemo(() => accountsArray.filter(acc => acc.type === 'credit'), [accountsArray]);

  const unifiedDebts = useMemo(() => {
    const debtItems = debtsArray.map((debt) => ({
      id: debt.id,
      type: 'debt' as const,
      debtName: debt.name,
      amountToPay: debt.amount,
      deadline: debt.due_date,
      totalAmount: debt.total_debt,
    }));
    const creditItems = creditAccounts.map((acc) => ({
      id: acc.id,
      type: 'credit_card' as const,
      debtName: acc.name,
      amountToPay: acc.min_payment || 0,
      deadline: acc.payment_due_date,
      totalAmount: acc.debt || 0,
    }));
    const loanItems = loansArray.map((loan) => ({
      id: loan.id,
      type: 'loan' as const,
      debtName: loan.name,
      amountToPay: loan.monthly_payment || 0,
      deadline: loan.payment_due_day,
      totalAmount: loan.amount || 0,
    }));
    logger.debug('FinancePage: Унифицированный список долгов сформирован', { totalItems: debtItems.length + creditItems.length + loanItems.length });
    return [...debtItems, ...creditItems, ...loanItems];
  }, [debtsArray, creditAccounts, loansArray]);

  const totalBalance = useMemo(() => {
    const balance = accountsArray.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    logger.debug('FinancePage: Общий баланс подсчитан', { totalBalance: balance });
    return balance;
  }, [accountsArray]);

  useEffect(() => {
    if (token && userId) {
      logger.info('FinancePage: Загрузка начальных данных для финансов', { userId });
      dispatch(fetchInitialData({ userId }));
    } else {
      logger.warn('FinancePage: Отсутствует токен или userId для загрузки данных');
      dispatch(setSnackbar({ message: 'Требуется авторизация для загрузки данных', severity: 'warning' }));
    }
  }, [dispatch, token, userId]);

  useEffect(() => {
    if (error) {
      dispatch(setSnackbar({ message: error, severity: 'error' }));
    }
  }, [error, dispatch]);

  const handleAddTransaction = useCallback(async () => {
    const { accountId, transferToAccountId, type, amount, description, category } = newTransaction;

    if (!accountId) {
      dispatch(setSnackbar({ message: 'Выберите счёт отправителя', severity: 'error' }));
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      dispatch(setSnackbar({ message: 'Введите корректную сумму больше 0', severity: 'error' }));
      return;
    }
    if (type === 'transfer' && !transferToAccountId) {
      dispatch(setSnackbar({ message: 'Выберите счёт получателя для перевода', severity: 'error' }));
      return;
    }
    if (description.length > 255) {
      dispatch(setSnackbar({ message: 'Описание не может превышать 255 символов', severity: 'error' }));
      return;
    }

    setIsSyncing(true);
    try {
      const txData: Transaction = {
        debit_card_id: type === 'expense' ? parseInt(accountId) : null,
        credit_card_id: type === 'expense' && creditAccounts.some(acc => acc.id === parseInt(accountId)) ? parseInt(accountId) : null,
        transfer_to_debit_card_id: type === 'transfer' && debitAccounts.some(acc => acc.id === transferToAccountId) ? transferToAccountId : null,
        transfer_to_credit_card_id: type === 'transfer' && creditAccounts.some(acc => acc.id === transferToAccountId) ? transferToAccountId : null,
        type,
        amount: parsedAmount,
        description: description.trim(),
        category,
        date: new Date().toISOString(),
        user_id: userId!,
      };
      logger.info('FinancePage: Добавление транзакции', { txData });
      await dispatch(addTransaction(txData)).unwrap();
      setNewTransaction({ ...newTransaction, amount: '', description: '', category: '' });
      dispatch(setSnackbar({ message: 'Транзакция успешно добавлена', severity: 'success' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logger.error('FinancePage: Ошибка добавления транзакции', { error: errorMessage });
      dispatch(setSnackbar({ message: `Ошибка при добавлении транзакции: ${errorMessage}`, severity: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, newTransaction, userId, debitAccounts, creditAccounts]);

  const handleEditCreditCard = useCallback((account: Account) => {
    setEditedCreditCard(account);
    setEditCreditCardDialogOpen(true);
    logger.debug('FinancePage: Открытие диалога редактирования кредитной карты', { accountId: account.id });
  }, []);

  const handleSaveCreditCard = useCallback(async () => {
    if (!editedCreditCard) {
      dispatch(setSnackbar({ message: 'Нет данных кредитной карты для сохранения', severity: 'error' }));
      return;
    }
    if (!editedCreditCard.name || editedCreditCard.balance === undefined) {
      dispatch(setSnackbar({ message: 'Заполните все обязательные поля кредитной карты', severity: 'error' }));
      return;
    }
    setIsSyncing(true);
    try {
      logger.info('FinancePage: Сохранение кредитной карты', { accountId: editedCreditCard.id });
      await dispatch(saveCreditCard({ accountId: editedCreditCard.id!, creditCardData: editedCreditCard })).unwrap();
      setEditCreditCardDialogOpen(false);
      setEditedCreditCard(null);
      dispatch(setSnackbar({ message: 'Кредитная карта успешно обновлена', severity: 'success' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logger.error('FinancePage: Ошибка сохранения кредитной карты', { error: errorMessage });
      dispatch(setSnackbar({ message: `Ошибка при сохранении кредитной карты: ${errorMessage}`, severity: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, editedCreditCard]);

  const handleSaveEditedLoan = useCallback(async () => {
    if (!editedLoan) {
      dispatch(setSnackbar({ message: 'Нет данных займа для сохранения', severity: 'error' }));
      return;
    }
    if (!editedLoan.name || editedLoan.amount === undefined) {
      dispatch(setSnackbar({ message: 'Заполните все обязательные поля займа', severity: 'error' }));
      return;
    }
    setIsSyncing(true);
    try {
      logger.info('FinancePage: Сохранение изменений займа', { loanId: editedLoan.id });
      await dispatch(saveEditedLoan({ loanId: editedLoan.id!, loanData: editedLoan })).unwrap();
      setEditLoanDialogOpen(false);
      setEditedLoan(null);
      dispatch(setSnackbar({ message: 'Займ успешно обновлён', severity: 'success' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logger.error('FinancePage: Ошибка сохранения займа', { error: errorMessage });
      dispatch(setSnackbar({ message: `Ошибка при сохранении займа: ${errorMessage}`, severity: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, editedLoan]);

  const handleEditLoan = useCallback((loan: Loan) => {
    setEditedLoan(loan);
    setEditLoanDialogOpen(true);
    logger.debug('FinancePage: Открытие диалога редактирования займа', { loanId: loan.id });
  }, []);

  return (
    <FinancePageWrapper>
      <FinancePageContainer>
        <Fade in={true} timeout={500}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SummaryContainer>
                {[{ category: 'Питание', amount: 12500 }, { category: 'Прочее', amount: 8750 }].map((expense, index) => (
                  <SummaryItem key={index}>
                    <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: '#424242' }}>
                      {expense.category}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Poppins', fontSize: '1.1rem', fontWeight: 600, color: '#1976d2' }}>
                      {expense.amount.toLocaleString('ru-RU')} руб.
                    </Typography>
                  </SummaryItem>
                ))}
              </SummaryContainer>
              <TopActions>
                <TopActionButton onClick={() => setHistoryDialogOpen(true)}>
                  История
                </TopActionButton>
                <TopActionButton onClick={() => setReportDialogOpen(true)}>
                  Отчет
                </TopActionButton>
              </TopActions>
            </Box>

            <DecorLine />
            <DecorDots />

            <SectionTitle variant="h1">Учет финансов</SectionTitle>

            <DebtTableContainer>
              <AccountsSummary>
                {[
                  { type: 'debit', label: 'Дебетовые карты', amount: debitAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), icon: 'https://img.icons8.com/ios-filled/24/4caf50/wallet.png' },
                  { type: 'credit', label: 'Кредитные карты', amount: creditAccounts.reduce((sum, acc) => sum + (acc.debt || 0), 0), icon: 'https://img.icons8.com/ios-filled/24/f44336/credit-card.png' },
                  { type: 'loan', label: 'Кредиты', amount: loansArray.reduce((sum, loan) => sum + (loan.amount || 0), 0), icon: 'https://img.icons8.com/ios-filled/24/7e57c2/bank.png' },
                ].map((summary, index) => (
                  <AccountsSummaryItem key={index} className={summary.type}>
                    <Box
                      className="icon"
                      sx={{
                        width: '24px',
                        height: '24px',
                        mr: 1,
                        backgroundImage: `url(${summary.icon})`,
                        backgroundSize: 'cover',
                      }}
                    />
                    <Box className="text">
                      <Typography className="label" sx={{ fontFamily: 'Poppins', fontSize: '0.85rem', fontWeight: 500, color: '#424242' }}>
                        {summary.label}
                      </Typography>
                      <Typography className="amount" sx={{ fontFamily: 'Poppins', fontSize: '1.1rem', fontWeight: 600, color: '#1976d2' }}>
                        {summary.amount.toLocaleString('ru-RU')} руб.
                      </Typography>
                    </Box>
                  </AccountsSummaryItem>
                ))}
              </AccountsSummary>
              <SectionTitle variant="h2">Долги</SectionTitle>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DebtTable
                  items={unifiedDebts}
                  totalAmountToPay={unifiedDebts.reduce((sum, debt) => sum + debt.amountToPay, 0)}
                  totalDebtAmount={unifiedDebts.reduce((sum, debt) => sum + debt.totalAmount, 0)}
                />
              )}
            </DebtTableContainer>

            <TransactionFormContainer>
              <SectionTitle variant="h2">Добавить операцию</SectionTitle>
              <TransactionForm
                accounts={accountsArray}
                newTransaction={newTransaction}
                setNewTransaction={setNewTransaction}
                handleAddTransaction={handleAddTransaction}
                disabled={isSyncing}
                role={role || 'user'}
              />
            </TransactionFormContainer>

            <Box sx={{ display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap' }}>
              <StyledButton onClick={() => setAddCreditCardDialogOpen(true)}>
                Добавить кредитную карту
              </StyledButton>
              <StyledButton onClick={() => setAddLoanDialogOpen(true)}>
                Добавить кредит
              </StyledButton>
              <StyledButton onClick={() => setAddDebtDialogOpen(true)}>
                Добавить долг
              </StyledButton>
            </Box>

            <Box className="accounts">
              <Box id="debit-cards">
                <SectionTitle variant="h2">Дебетовые карты</SectionTitle>
                <AccountCards />
              </Box>

              <Box id="credit-cards">
                <SectionTitle variant="h2">Кредитные карты</SectionTitle>
                <CreditCards />
              </Box>

              <Box id="loans">
                <SectionTitle variant="h2">Кредиты</SectionTitle>
                <Loans />
              </Box>
            </Box>

            <Typography
              variant="h6"
              sx={{
                mt: 4,
                fontWeight: 600,
                color: '#1976d2',
              }}
            >
              Общий баланс: {formatCurrency(totalBalance)}
            </Typography>
          </Box>
        </Fade>

        <AddDebtDialog open={addDebtDialogOpen} onClose={() => setAddDebtDialogOpen(false)} />
        <AddLoanDialog open={addLoanDialogOpen} onClose={() => setAddLoanDialogOpen(false)} />
        <EditLoanDialog
          open={editLoanDialogOpen}
          onClose={() => setEditLoanDialogOpen(false)}
          editedLoan={editedLoan}
          setEditedLoan={setEditedLoan}
          handleSaveEditedLoan={handleSaveEditedLoan}
        />
        <AddCreditCardDialog open={addCreditCardDialogOpen} onClose={() => setAddCreditCardDialogOpen(false)} />
        <EditCreditCardDialog
          open={editCreditCardDialogOpen}
          onClose={() => setEditCreditCardDialogOpen(false)}
          editedCreditCard={editedCreditCard}
          setEditedCreditCard={setEditedCreditCard}
          handleSaveCreditCard={handleSaveCreditCard}
        />
        <ReportDialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} />
        <HistoryDialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} accounts={accountsArray} />
      </FinancePageContainer>
    </FinancePageWrapper>
  );
};

export default FinancePage;