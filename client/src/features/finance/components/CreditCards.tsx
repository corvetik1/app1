// src/features/finance/components/CreditCards.tsx
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
import EditCreditCardDialog from './dialogs/EditCreditCardDialog';
import { AccountCard } from './FinanceStyles';
import { RootState, AppDispatch } from '../../../app/store';
import { deleteTransaction, saveCreditCard } from '../financeActions';
import logger from '../../../utils/logger';
import { setSnackbar } from '../../../auth/authSlice';
import { Account, Transaction } from '../financeSlice';
import { FINANCE_TRANSACTION_TYPES } from '../../../utils/constants';

const CreditCards: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { accounts, transactions } = useSelector((state: RootState) => state.finance);

  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<{ [key: number]: { [key: string]: boolean } }>({});
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editedCreditCard, setEditedCreditCard] = useState<Account | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [accountNames, setAccountNames] = useState<{ [key: number]: string }>(
    Object.values(accounts.byId).reduce((acc, account) => {
      acc[account.id] = account.name;
      return acc;
    }, {} as { [key: number]: string })
  );

  const accountsArray = useMemo(() => Object.values(accounts.byId).filter((account) => account.type === 'credit'), [accounts]);

  const transactionsByAccountId = useMemo(() => {
    const grouped: { [key: number]: Transaction[] } = {};
    Object.values(transactions.byId).forEach((tx) => {
      const accountId =
        tx.debit_card_id ||
        tx.credit_card_id ||
        tx.transfer_to_debit_card_id ||
        tx.transfer_to_credit_card_id;
      if (accountId) {
        if (!grouped[accountId]) grouped[accountId] = [];
        grouped[accountId].push(tx);
      }
    });
    return grouped;
  }, [transactions]);

  const handleExpandAccount = useCallback((accountId: number) => {
    setExpandedAccount((prev) => (prev === accountId ? null : accountId));
  }, []);

  const toggleMonthExpansion = useCallback((accountId: number, monthKey: string) => {
    setExpandedMonths((prev) => {
      const accountExpanded = prev[accountId] || {};
      return {
        ...prev,
        [accountId]: {
          ...accountExpanded,
          [monthKey]: !accountExpanded[monthKey],
        },
      };
    });
  }, []);

  const handleEditCardTitle = useCallback((accountId: number) => {
    setEditingAccountId(accountId);
  }, []);

  const handleSaveCardTitle = useCallback((accountId: number, newName: string) => {
    if (newName.trim()) {
      setAccountNames((prev) => ({
        ...prev,
        [accountId]: newName.trim(),
      }));
      setEditingAccountId(null);
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

  const handleOpenEditDialog = useCallback((account: Account) => {
    setEditedCreditCard(account);
    setEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditedCreditCard(null);
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
    try {
      logger.info('CreditCards: Сохранение кредитной карты', { accountId: editedCreditCard.id });
      await dispatch(saveCreditCard({ accountId: editedCreditCard.id!, creditCardData: editedCreditCard })).unwrap();
      setAccountNames((prev) => ({
        ...prev,
        [editedCreditCard.id]: editedCreditCard.name,
      }));
      setEditDialogOpen(false);
      setEditedCreditCard(null);
      dispatch(setSnackbar({ message: 'Кредитная карта успешно обновлена', severity: 'success' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logger.error('CreditCards: Ошибка сохранения кредитной карты', { error: errorMessage });
      dispatch(setSnackbar({ message: `Ошибка при сохранении кредитной карты: ${errorMessage}`, severity: 'error' }));
    }
  }, [dispatch, editedCreditCard]);

  const groupedTransactions = useMemo(() => {
    return accountsArray.map((account) => {
      const accountTxs = (transactionsByAccountId[account.id] || [])
        .filter((t) => filterType === 'all' || t.type === filterType);

      const byMonth = accountTxs.reduce(
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
        ...account,
        monthlyGroups: Object.values(byMonth).sort((a, b) =>
          b.transactions[0].date.localeCompare(a.transactions[0].date)
        ),
      };
    });
  }, [accountsArray, transactionsByAccountId, filterType]);

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
        {accountsArray.length === 0 ? (
          <Typography sx={{ p: 2, textAlign: 'center', color: '#757575' }}>
            Нет доступных кредитных карт
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 2 }} className="cards-container">
            {groupedTransactions.map((account) => (
              <AccountCard key={account.id} id={`card-${account.id}`} sx={{ background: 'linear-gradient(135deg, #ffffff, #f8bbd0)' }}>
                <Box className="decor-pattern" />
                <Box className="card-header">
                  {editingAccountId === account.id ? (
                    <TextField
                      className="edit-input"
                      value={accountNames[account.id]}
                      onChange={(e) =>
                        setAccountNames((prev) => ({
                          ...prev,
                          [account.id]: e.target.value,
                        }))
                      }
                      onBlur={() => handleSaveCardTitle(account.id, accountNames[account.id])}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveCardTitle(account.id, accountNames[account.id]);
                      }}
                      autoFocus
                      fullWidth
                    />
                  ) : (
                    <Typography
                      className="card-title"
                      onClick={() => handleEditCardTitle(account.id)}
                    >
                      {accountNames[account.id]}
                    </Typography>
                  )}
                  <Box className="card-actions">
                    <Typography
                      className="expand-btn"
                      onClick={() => handleExpandAccount(account.id)}
                      sx={{
                        transform: expandedAccount === account.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        cursor: 'pointer',
                      }}
                    >
                      ▼
                    </Typography>
                    <IconButton
                      onClick={() => handleOpenEditDialog(account)}
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
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/4caf50/wallet.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography
                      className="highlight balance"
                      sx={{ fontFamily: 'Montserrat', fontSize: '1.1rem', fontWeight: 600, color: '#4caf50' }}
                    >
                      Баланс: {account.balance.toLocaleString('ru-RU')} руб.
                    </Typography>
                  </Box>
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
                      Долг: {(account.debt || 0).toLocaleString('ru-RU')} руб.
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
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.9rem', color: '#424242' }}>
                      Лимит: {(account.limit || 0).toLocaleString('ru-RU')} руб.
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
                      Мин. платеж: {(account.min_payment || 0).toLocaleString('ru-RU')} руб.
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
                      Платеж: {account.payment_due_date || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: 'url(https://img.icons8.com/ios-filled/24/757575/time.png)',
                        backgroundSize: 'cover',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'Montserrat', fontSize: '0.9rem', color: '#757575', fontStyle: 'italic' }}>
                      Льготный: {account.grace_period || '-'}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  className="months"
                  sx={{ display: expandedAccount === account.id ? 'block' : 'none' }}
                >
                  {account.monthlyGroups.length > 0 ? (
                    account.monthlyGroups.map((monthGroup) => (
                      <Box key={monthGroup.monthName} className="month">
                        <Box
                          className="month-header"
                          onClick={() => toggleMonthExpansion(account.id, monthGroup.monthName)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <Typography className="month-title">
                            {monthGroup.monthName}
                          </Typography>
                          <Typography
                            sx={{
                              transform: expandedMonths[account.id]?.[monthGroup.monthName]
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
                            display: expandedMonths[account.id]?.[monthGroup.monthName]
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
        <EditCreditCardDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          editedCreditCard={editedCreditCard}
          setEditedCreditCard={setEditedCreditCard}
          handleSaveCreditCard={handleSaveCreditCard}
        />
      </Box>
    </Fade>
  );
};

export default CreditCards;