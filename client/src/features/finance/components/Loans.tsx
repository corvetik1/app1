// src/features/finance/components/Loans.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Fade,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { formatNumber } from 'utils/formatUtils';
import { format, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import EditLoanDialog from './dialogs/EditLoanDialog';
import { AccountCard } from './FinanceStyles';
import { RootState, AppDispatch } from '../../../app/store';
import { deleteTransaction, saveEditedLoan } from '../financeActions';
import logger from '../../../utils/logger';
import { setSnackbar } from '../../../auth/authSlice';
import { Loan, Transaction } from '../financeSlice';
import { FINANCE_TRANSACTION_TYPES } from '../../../utils/constants';

const Loans: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { loans, transactions } = useSelector((state: RootState) => state.finance);

  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<{ [key: number]: { [key: string]: boolean } }>({});
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editedLoan, setEditedLoan] = useState<Loan | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [loanNames, setLoanNames] = useState<{ [key: number]: string }>(
    Object.values(loans.byId).reduce((acc, loan) => {
      acc[loan.id] = loan.name;
      return acc;
    }, {} as { [key: number]: string })
  );

  const loansArray = useMemo(() => Object.values(loans.byId), [loans]);

  const transactionsByLoanId = useMemo(() => {
    const grouped: { [key: number]: Transaction[] } = {};
    Object.values(transactions.byId).forEach((tx) => {
      const loanId = tx.loan_id;
      if (loanId) {
        if (!grouped[loanId]) grouped[loanId] = [];
        grouped[loanId].push(tx);
      }
    });
    return grouped;
  }, [transactions]);

  const handleExpandLoan = useCallback((loanId: number) => {
    setExpandedLoan((prev) => (prev === loanId ? null : loanId));
  }, []);

  const toggleMonthExpansion = useCallback((loanId: number, monthKey: string) => {
    setExpandedMonths((prev) => {
      const loanExpanded = prev[loanId] || {};
      return {
        ...prev,
        [loanId]: {
          ...loanExpanded,
          [monthKey]: !loanExpanded[monthKey],
        },
      };
    });
  }, []);

  const handleEditLoanTitle = useCallback((loanId: number) => {
    setEditingLoanId(loanId);
  }, []);

  const handleSaveLoanTitle = useCallback((loanId: number, newName: string) => {
    if (newName.trim()) {
      setLoanNames((prev) => ({
        ...prev,
        [loanId]: newName.trim(),
      }));
      setEditingLoanId(null);
    } else {
      dispatch(setSnackbar({ message: 'Название не может быть пустым!', severity: 'error' }));
    }
  }, [dispatch]);

  const handleDeleteTransaction = useCallback(async (transactionId: number) => {
    try {
      await dispatch(deleteTransaction(transactionId)).unwrap();
      dispatch(setSnackbar({ message: 'Транзакция успешно удалена', severity: 'success' }));
    } catch (err) {
      logger.error('Ошибка удаления транзакции', err);
      dispatch(setSnackbar({ message: 'Ошибка при удалении транзакции', severity: 'error' }));
    }
  }, [dispatch]);

  const handleOpenEditDialog = useCallback((loan: Loan) => {
    setEditedLoan(loan);
    setEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditedLoan(null);
  }, []);

  const handleSaveLoan = useCallback(async () => {
    if (!editedLoan) {
      dispatch(setSnackbar({ message: 'Нет данных займа для сохранения', severity: 'error' }));
      return;
    }
    if (!editedLoan.name || editedLoan.amount === undefined) {
      dispatch(setSnackbar({ message: 'Заполните все обязательные поля займа', severity: 'error' }));
      return;
    }
    try {
      logger.info('Loans: Сохранение изменений займа', { loanId: editedLoan.id });
      await dispatch(saveEditedLoan({ loanId: editedLoan.id!, loanData: editedLoan })).unwrap();
      setLoanNames((prev) => ({
        ...prev,
        [editedLoan.id]: editedLoan.name,
      }));
      setEditDialogOpen(false);
      setEditedLoan(null);
      dispatch(setSnackbar({ message: 'Займ успешно обновлён', severity: 'success' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logger.error('Loans: Ошибка сохранения займа', { error: errorMessage });
      dispatch(setSnackbar({ message: `Ошибка при сохранении займа: ${errorMessage}`, severity: 'error' }));
    }
  }, [dispatch, editedLoan]);

  const groupedTransactions = useMemo(() => {
    return loansArray.map((loan) => {
      const loanTxs = (transactionsByLoanId[loan.id] || [])
        .filter((t) => filterType === 'all' || t.type === filterType);

      const byMonth = loanTxs.reduce(
        (acc: { [key: string]: { monthName: string; transactions: Transaction[] } }, tx) => {
          const date = parse(tx.date, 'yyyy-MM-dd', new Date());
          const monthKey = format(date, 'yyyy-MM');
          const monthName = format(date, 'LLLL yyyy', { locale: ru });
          if (!acc[monthKey]) acc[monthKey] = { monthName, transactions: [] };
          acc[monthKey].transactions.push(tx);
          return acc;
        },
        {}
      );

      return {
        ...loan,
        monthlyGroups: Object.values(byMonth).sort((a, b) =>
          b.transactions[0].date.localeCompare(a.transactions[0].date)
        ),
      };
    });
  }, [loansArray, transactionsByLoanId, filterType]);

  return (
    <Fade in={true} timeout={500}>
      <Box className="account-cards">
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 150, flexGrow: 1 }} size="small">
            <InputLabel>Тип</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as string)}
              label="Тип"
            >
              {FINANCE_TRANSACTION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        {loansArray.length === 0 ? (
          <Typography sx={{ p: 2, textAlign: 'center', color: '#757575' }}>
            Нет доступных кредитов
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 2 }} className="cards-container">
            {groupedTransactions.map((loan) => (
              <AccountCard key={loan.id} id={`card-${loan.id}`} sx={{ background: 'linear-gradient(135deg, #ffffff, #c5cae9)' }}>
                <Box className="decor-pattern" />
                <Box className="card-header">
                  {editingLoanId === loan.id ? (
                    <TextField
                      className="edit-input"
                      value={loanNames[loan.id]}
                      onChange={(e) =>
                        setLoanNames((prev) => ({
                          ...prev,
                          [loan.id]: e.target.value,
                        }))
                      }
                      onBlur={() => handleSaveLoanTitle(loan.id, loanNames[loan.id])}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveLoanTitle(loan.id, loanNames[loan.id]);
                      }}
                      autoFocus
                      fullWidth
                    />
                  ) : (
                    <Typography
                      className="card-title"
                      onClick={() => handleEditLoanTitle(loan.id)}
                      sx={{ fontSize: '1.2rem', fontWeight: 600 }}
                    >
                      {loanNames[loan.id]}
                    </Typography>
                  )}
                  <Box className="card-actions">
                    <Typography
                      className="expand-btn"
                      onClick={() => handleExpandLoan(loan.id)}
                      sx={{
                        transform: expandedLoan === loan.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        cursor: 'pointer',
                        color: '#42a5f5',
                        fontSize: '1.2rem',
                      }}
                    >
                      ▼
                    </Typography>
                    <IconButton
                      onClick={() => handleOpenEditDialog(loan)}
                      sx={{ color: '#1976d2' }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box
                  className="card-info"
                  sx={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    gap: '20px',
                    fontSize: '1rem',
                    color: '#424242',
                    mb: 2,
                    overflowX: 'auto',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/f44336/credit-card.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography
                      className="highlight debt"
                      sx={{ fontFamily: 'Montserrat', fontSize: '1.1rem', fontWeight: 600, color: '#f44336' }}
                    >
                      Долг: {(loan.debt || 0).toLocaleString('ru-RU')} руб.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/1976d2/credit-limit.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.95rem', color: '#424242', fontWeight: 500 }}>
                      Сумма: {(loan.amount || 0).toLocaleString('ru-RU')} руб.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/1976d2/interest-rate.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.9rem', color: '#424242' }}>
                      Ставка: {loan.rate}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/1976d2/calendar.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.9rem', color: '#424242' }}>
                      Срок: {loan.term} мес.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/1976d2/minimum-payment.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.9rem', color: '#424242' }}>
                      Платеж: {(loan.monthly_payment || 0).toLocaleString('ru-RU')} руб.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/757575/calendar.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.9rem', color: '#757575', fontStyle: 'italic' }}>
                      След. платеж: {loan.payment_due_day || '-'}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  className="months"
                  sx={{ display: expandedLoan === loan.id ? 'block' : 'none' }}
                >
                  {loan.monthlyGroups && loan.monthlyGroups.length > 0 ? (
                    loan.monthlyGroups.map((monthGroup) => (
                      <Box key={monthGroup.monthName} className="month">
                        <Box
                          className="month-header"
                          onClick={() => toggleMonthExpansion(loan.id, monthGroup.monthName)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <Typography className="month-title">
                            {monthGroup.monthName}
                          </Typography>
                          <Typography
                            sx={{
                              transform: expandedMonths[loan.id]?.[monthGroup.monthName]
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 0.3s ease',
                            }}
                          >
                            ▼
                          </Typography>
                        </Box>
                        <Box
                          className="transactions"
                          sx={{
                            display: expandedMonths[loan.id]?.[monthGroup.monthName]
                              ? 'block'
                              : 'none',
                          }}
                        >
                          {monthGroup.transactions.map((tx) => (
                            <Box key={tx.id} className="transaction">
                              <Box className="transaction-info">
                                <Typography
                                  className={`transaction-amount ${
                                    tx.type === 'income' || tx.type === 'transfer_in' ? 'income' : 'expense'
                                  }`}
                                >
                                  {tx.type === 'income' || tx.type === 'transfer_in' ? '+' : '-'} {formatNumber(tx.amount)} руб.
                                </Typography>
                                <Typography className="transaction-desc">
                                  {tx.description || 'Нет описания'}
                                </Typography>
                                <Typography className="transaction-date">
                                  {tx.date}{tx.category ? ` (${tx.category})` : ''}
                                </Typography>
                              </Box>
                              <IconButton
                                onClick={() => handleDeleteTransaction(tx.id)}
                                sx={{ color: '#f44336' }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', color: '#757575' }}>
                      Нет транзакций
                    </Typography>
                  )}
                </Box>
              </AccountCard>
            ))}
          </Box>
        )}
        <EditLoanDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          editedLoan={editedLoan}
          setEditedLoan={setEditedLoan}
          handleSaveEditedLoan={handleSaveLoan}
        />
      </Box>
    </Fade>
  );
};

export default Loans;