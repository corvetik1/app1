// src/features/finance/components/TransactionForm.tsx
import React, { useEffect } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fade,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { StyledButton } from './FinanceStyles';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../app/store';
import logger from '../../../utils/logger';
import { setSnackbar } from '../../../auth/authSlice';
import { FINANCE_TRANSACTION_TYPES, FINANCE_INCOME_CATEGORIES, FINANCE_EXPENSE_CATEGORIES } from '../../../utils/constants';

interface TransactionFormProps {
  accounts: { id: number; name: string }[];
  newTransaction: NewTransaction;
  setNewTransaction: (data: NewTransaction) => void;
  handleAddTransaction: () => void;
  disabled: boolean;
  role: string;
}

interface NewTransaction {
  accountId: string;
  transferToAccountId: number | null;
  type: 'income' | 'expense' | 'transfer_in';
  amount: string;
  description: string;
  category: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  accounts,
  newTransaction,
  setNewTransaction,
  handleAddTransaction,
  disabled,
  role,
}) => {
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    logger.debug('TransactionForm обновлён', { type: newTransaction.type, accountId: newTransaction.accountId });
  }, [newTransaction.type, newTransaction.accountId]);

  const handleChange =
    (field: keyof NewTransaction) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number>) => {
      const value =
        field === 'accountId' || field === 'transferToAccountId'
          ? (e.target.value as string | number)
          : (e.target.value as string);

      if (field === 'amount' && value && parseFloat(value as string) <= 0) {
        dispatch(setSnackbar({ message: 'Сумма должна быть больше 0', severity: 'error' }));
      }

      if (field === 'type') {
        // Сбрасываем transferToAccountId и category при смене типа операции
        setNewTransaction({ 
          ...newTransaction, 
          [field]: value as 'income' | 'expense' | 'transfer_in', 
          transferToAccountId: null, 
          category: '',
          description: '' 
        });
      } else {
        setNewTransaction({ ...newTransaction, [field]: value });
      }
    };

  const handleSubmit = () => {
    const { accountId, type, amount, transferToAccountId } = newTransaction;

    if (!accountId) {
      dispatch(setSnackbar({ message: 'Выберите счёт отправителя', severity: 'error' }));
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      dispatch(setSnackbar({ message: 'Введите корректную сумму', severity: 'error' }));
      return;
    }
    if (type === 'transfer_in' && !transferToAccountId) {
      dispatch(setSnackbar({ message: 'Выберите счёт получателя для перевода', severity: 'error' }));
      return;
    }

    handleAddTransaction();
  };

  return (
    <Fade in={true} timeout={500}>
      <div>
        <Grid container sx={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', display: 'grid' }}>
          <Grid item>
            <FormControl fullWidth>
              <InputLabel>Счет (отправитель)</InputLabel>
              <Select
                value={newTransaction.accountId}
                onChange={handleChange('accountId')}
                disabled={disabled || (role === 'admin' && newTransaction.type === 'income')}
              >
                <MenuItem value="">Счет (отправитель)</MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <FormControl fullWidth>
              <InputLabel>Тип операции</InputLabel>
              <Select
                value={newTransaction.type}
                onChange={handleChange('type')}
                disabled={disabled}
              >
                <MenuItem value="">Тип операции</MenuItem>
                {FINANCE_TRANSACTION_TYPES.filter(type => type.value !== 'all').map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <TextField
              placeholder="Сумма"
              type="number"
              fullWidth
              value={newTransaction.amount}
              onChange={handleChange('amount')}
              disabled={disabled}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              error={!newTransaction.amount || parseFloat(newTransaction.amount) <= 0}
            />
          </Grid>
          <Grid item>
            <FormControl fullWidth>
              <InputLabel>{newTransaction.type === 'transfer_in' ? 'Счет (получатель)' : 'Категория'}</InputLabel>
              {newTransaction.type === 'transfer_in' ? (
                <Select
                  value={newTransaction.transferToAccountId || ''}
                  onChange={handleChange('transferToAccountId')}
                  disabled={disabled}
                  error={!newTransaction.transferToAccountId && newTransaction.type === 'transfer_in'}
                >
                  <MenuItem value="">Счет (получатель)</MenuItem>
                  {accounts
                    .filter((acc) => acc.id.toString() !== newTransaction.accountId)
                    .map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                </Select>
              ) : (
                <Select
                  value={newTransaction.category}
                  onChange={handleChange('category')}
                  disabled={disabled}
                >
                  <MenuItem value="">Без категории</MenuItem>
                  {(newTransaction.type === 'income' ? FINANCE_INCOME_CATEGORIES : FINANCE_EXPENSE_CATEGORIES).map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          </Grid>
          <Grid item>
            <TextField
              placeholder="Примечание"
              fullWidth
              value={newTransaction.description}
              onChange={handleChange('description')}
              disabled={disabled}
            />
          </Grid>
        </Grid>
        <StyledButton onClick={handleSubmit} disabled={disabled} sx={{ mt: '15px' }}>
          Добавить
        </StyledButton>
      </div>
    </Fade>
  );
};

export default TransactionForm;