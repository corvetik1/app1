// src/features/finance/components/AccountCards.tsx
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatNumber } from 'utils/formatUtils';
import { format, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AccountCard } from './FinanceStyles';
import { RootState, AppDispatch } from '../../../app/store';
import { deleteTransaction } from '../financeActions';
import logger from '../../../utils/logger';
import { setSnackbar } from '../../../auth/authSlice';
import { Transaction } from '../financeSlice';
import { FINANCE_TRANSACTION_TYPES } from '../../../utils/constants';

interface Account {
  id: number;
  name: string;
  type: 'debit' | 'credit';
  balance: number;
  user_id: number;
}

interface Transaction {
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

const AccountCards: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { accounts, transactions } = useSelector((state: RootState) => state.finance);

  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<{ [key: string]: boolean }>({});
  const [filterType, setFilterType] = useState<string>('all');

  const accountsArray = useMemo(() => Object.values(accounts.byId).filter((account) => account.type !== 'credit'), [accounts]);

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
    const uniqueKey = `${accountId}_${monthKey}`;
    setExpandedMonths((prev) => ({ ...prev, [uniqueKey]: !prev[uniqueKey] }));
  }, []);

  const handleDeleteTransaction = useCallback(async (transactionId: number) => {
    try {
      await dispatch(deleteTransaction(transactionId)).unwrap();
      dispatch(setSnackbar({ message: 'Транзакция успешно удалена', severity: 'success' }));
    } catch (err) {
      logger.error('Ошибка удаления транзакции', err);
      dispatch(setSnackbar({ message: 'Ошибка при удалении транзакции', severity: 'error' }));
    }
  }, [dispatch]);

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
            Нет доступных счетов
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 2 }} className="cards-container">
            {groupedTransactions.map((account) => (
              <AccountCard key={account.id} id={`card-${account.id}`}>
                <Box className="decor-pattern" />
                <Box className="card-header">
                  <Typography className="card-title">{account.name}</Typography>
                  <Box className="card-actions">
                    <Typography
                      className="expand-btn"
                      onClick={() => handleExpandAccount(account.id)}
                    >
                      ▼
                    </Typography>
                  </Box>
                </Box>
                <Typography className="card-balance">
                  Баланс: {formatNumber(account.balance || 0)} руб.
                </Typography>
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
                        >
                          <Typography className="month-title">
                            {monthGroup.monthName}
                          </Typography>
                          <Typography
                            sx={{
                              transform: expandedMonths[`${account.id}_${monthGroup.monthName}`]
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
                            display: expandedMonths[`${account.id}_${monthGroup.monthName}`]
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
                                className="delete-btn"
                                onClick={() => handleDeleteTransaction(tx.id)}
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
      </Box>
    </Fade>
  );
};

export default AccountCards;