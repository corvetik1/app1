// src/features/finance/components/dialogs/ReportDialog.tsx
import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Box,
  Fade,
} from '@mui/material';
import { styled } from '@mui/system';
import { formatNumber } from '../../../../utils/formatUtils';
import logger from '../../../../utils/logger';
import { setSnackbar } from '../../../../auth/authSlice';
import { Transaction } from '../../financeSlice';
import { AppDispatch, RootState } from '../../../../app/store';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

interface ReportData {
  category: string;
  total: number;
  count: number;
  transactions: string[];
}

const StyledDialog = styled(Dialog)(() => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    backgroundColor: '#fff',
    width: '80%',
    maxWidth: '900px',
  },
}));

const StyledButton = styled(Button)(() => ({
  borderRadius: '8px',
  padding: '8px 16px',
  background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
  color: '#fff',
  '&:hover': {
    background: 'linear-gradient(45deg, #1565c0, #2196f3)',
    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
  },
  transition: 'all 0.3s ease',
}));

const MonthButton = styled(Button)<{ selected: boolean }>(({ selected }) => ({
  borderRadius: '8px',
  padding: '4px 12px',
  fontSize: '0.9rem',
  backgroundColor: selected ? '#1976d2' : 'transparent',
  color: selected ? '#fff' : '#1976d2',
  '&:hover': {
    backgroundColor: selected ? '#1565c0' : '#e3f2fd',
  },
  transition: 'all 0.3s ease',
}));

const ReportDialog: React.FC<ReportDialogProps> = ({ open, onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const { transactions } = useSelector((state: RootState) => state.finance);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const reportData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const allTransactions = Object.values(transactions.byId).map((t) => ({
      ...t,
      month: new Date(t.date).getMonth() + 1,
      year: new Date(t.date).getFullYear(),
    }));

    if (!allTransactions.length) {
      dispatch(setSnackbar({ message: 'Нет транзакций для отображения отчёта', severity: 'warning' }));
      return { incomeData: [], expenseData: [], totalIncome: 0, totalExpense: 0 };
    }

    const filtered = allTransactions.filter((t) => t.year === currentYear && (!selectedMonth || t.month === selectedMonth));
    const incomeCategories = Array.from(new Set(filtered.filter((t) => t.type === 'income' || t.transfer_to_debit_card_id || t.transfer_to_credit_card_id).map((t) => t.category || 'Без категории')));
    const expenseCategories = Array.from(new Set(filtered.filter((t) => t.type === 'expense' || t.debit_card_id || t.credit_card_id).map((t) => t.category || 'Без категории')));

    const incomeData: ReportData[] = incomeCategories.map((category) => {
      const txs = filtered.filter((t) => (t.type === 'income' || t.transfer_to_debit_card_id || t.transfer_to_credit_card_id) && (t.category || 'Без категории') === category);
      return { category, total: txs.reduce((acc, t) => acc + (t.amount || 0), 0), count: txs.length, transactions: txs.map((t) => t.description) };
    });

    const expenseData: ReportData[] = expenseCategories.map((category) => {
      const txs = filtered.filter((t) => (t.type === 'expense' || t.debit_card_id || t.credit_card_id) && (t.category || 'Без категории') === category);
      return { category, total: txs.reduce((acc, t) => acc + (t.amount || 0), 0), count: txs.length, transactions: txs.map((t) => t.description) };
    });

    const totalIncome = incomeData.reduce((acc, item) => acc + item.total, 0);
    const totalExpense = expenseData.reduce((acc, item) => acc + item.total, 0);

    return { incomeData, expenseData, totalIncome, totalExpense };
  }, [transactions, selectedMonth, dispatch]);

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex + 1);
    logger.debug('Выбран месяц для отчёта', months[monthIndex]);
  };

  return (
    <StyledDialog open={open} onClose={onClose} TransitionComponent={Fade} transitionDuration={300}>
      <DialogTitle sx={{ fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
        Отчет по доходам и расходам
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {months.map((month, index) => (
                <MonthButton
                  key={index}
                  variant="outlined"
                  selected={selectedMonth === index + 1}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month}
                </MonthButton>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
              <Box sx={{ flex: 1, minWidth: '300px' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50', mb: 2 }}>
                  Доходы
                </Typography>
                <TableContainer component={Paper} sx={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                        <TableCell>Категория</TableCell>
                        <TableCell align="right">Сумма (руб.)</TableCell>
                        <TableCell align="right">Кол-во</TableCell>
                        <TableCell align="right">Примечание</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.incomeData.map((row) => (
                        <TableRow key={row.category} sx={{ '&:hover': { backgroundColor: '#f1f8e9' } }}>
                          <TableCell>{row.category}</TableCell>
                          <TableCell align="right">{formatNumber(row.total)}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">{row.transactions[0] || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.totalIncome > 0 && (
                        <TableRow sx={{ fontWeight: 600, backgroundColor: '#e8f5e9' }}>
                          <TableCell align="right" colSpan={2}>Итого:</TableCell>
                          <TableCell align="right">{formatNumber(reportData.totalIncome)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              <Box sx={{ flex: 1, minWidth: '300px' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#f44336', mb: 2 }}>
                  Расходы
                </Typography>
                <TableContainer component={Paper} sx={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#ffebee' }}>
                        <TableCell>Категория</TableCell>
                        <TableCell align="right">Сумма (руб.)</TableCell>
                        <TableCell align="right">Кол-во</TableCell>
                        <TableCell align="right">Примечание</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.expenseData.map((row) => (
                        <TableRow key={row.category} sx={{ '&:hover': { backgroundColor: '#ffcdd2' } }}>
                          <TableCell>{row.category}</TableCell>
                          <TableCell align="right">{formatNumber(row.total)}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">{row.transactions[0] || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.totalExpense > 0 && (
                        <TableRow sx={{ fontWeight: 600, backgroundColor: '#ffebee' }}>
                          <TableCell align="right" colSpan={2}>Итого:</TableCell>
                          <TableCell align="right">{formatNumber(reportData.totalExpense)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <StyledButton onClick={onClose}>
          Закрыть
        </StyledButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default ReportDialog;