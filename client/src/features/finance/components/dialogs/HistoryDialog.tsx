// src/features/finance/components/dialogs/HistoryDialog.tsx
import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  TextField,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { StyledDialog } from '../FinanceStyles';
import { RootState, AppDispatch } from '../../../../app/store';
import { setSnackbar } from '../../../snackbar/snackbarSlice';
import { Transaction, Account } from '../../financeSlice';
import { FINANCE_CATEGORIES } from '../../../../utils/constants';
import { format } from 'date-fns';

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

const HistoryDialog: React.FC<HistoryDialogProps> = ({ open, onClose, accounts }) => {
  const dispatch: AppDispatch = useDispatch();
  const { transactions } = useSelector((state: RootState) => state.finance);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isCardOpen, setIsCardOpen] = useState<{ [key: string]: boolean }>({});

  const availableCategories = useMemo(() => {
    const categories = new Set<string>(['', ...FINANCE_CATEGORIES]);
    Object.values(transactions.byId).forEach((tx) => {
      if (tx.category) categories.add(tx.category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = Object.values(transactions.byId);

    if (filterAccountId) {
      filtered = filtered.filter((tx) =>
        [tx.debit_card_id, tx.credit_card_id, tx.transfer_to_debit_card_id, tx.transfer_to_credit_card_id].includes(parseInt(filterAccountId))
      );
    }

    if (filterCategory) {
      filtered = filtered.filter((tx) => (tx.category || 'Без категории') === filterCategory);
    }

    if (selectedDate) {
      filtered = filtered.filter((tx) => format(new Date(tx.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
    }

    return filtered;
  }, [transactions, filterAccountId, filterCategory, selectedDate]);

  const groupedByCategory = useMemo(() => {
    const grouped: { [key: string]: { total: number; transactions: Transaction[] } } = {};
    filteredTransactions.forEach((tx) => {
      const category = tx.category || 'Без категории';
      if (!grouped[category]) {
        grouped[category] = { total: 0, transactions: [] };
      }
      grouped[category].total += tx.amount || 0;
      grouped[category].transactions.push(tx);
    });
    return Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTransactions]);

  const toggleCard = (category: string) => {
    setIsCardOpen((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <StyledDialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          История операций
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box className="filters">
            <select
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
            >
              <option value="">Счет</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id.toString()}>
                  {account.name} ({account.type === 'credit' ? 'Кредитная' : 'Дебетовая'})
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Категория</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category || 'Без категории'}
                </option>
              ))}
            </select>
            <DatePicker
              label="Выберите дату"
              value={selectedDate}
              onChange={setSelectedDate}
              format="dd.MM.yyyy"
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined',
                },
              }}
            />
          </Box>
          <div className="dialog-content">
            {filteredTransactions.length === 0 ? (
              <p>Нет транзакций для отображения</p>
            ) : (
              groupedByCategory.map(([category, { total, transactions }]) => (
                <div key={category} className="card">
                  <div className="card-header" onClick={() => toggleCard(category)}>
                    <h4>{category} ({formatNumber(total)} руб.)</h4>
                    <span style={{ transform: isCardOpen[category] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </div>
                  <div style={{ display: isCardOpen[category] ? 'block' : 'none' }}>
                    {transactions.map((tx) => (
                      <div key={tx.id} className="transaction">
                        <p>
                          {tx.type === 'income' || tx.type === 'transfer_in' ? '+' : '-'} {formatNumber(tx.amount)} руб. - {tx.description || 'Нет описания'}
                        </p>
                        <small>
                          {tx.date}{tx.category ? ` (${tx.category})` : ''}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} className="close-btn">
            Закрыть
          </Button>
        </DialogActions>
      </StyledDialog>
    </LocalizationProvider>
  );
};

export default HistoryDialog;