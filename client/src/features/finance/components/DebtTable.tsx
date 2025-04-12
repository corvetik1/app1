// src/features/finance/components/DebtTable.tsx
import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  TableBody,
  Checkbox,
  Paper,
} from '@mui/material';
import { formatCurrency } from '../../../utils/formatUtils';
import { FINANCE_DEBT_TYPES, FinanceDebtType } from '../../../utils/constants';
import {
  DebtTableContainer,
  DebtTableStyled,
  DebtTableHead,
  DebtTableRow,
  DebtTableCell,
} from './FinanceStyles';
import { RootState, AppDispatch } from '../../../app/store';
import { togglePaidDebt } from '../financeActions';
import logger from '../../../utils/logger';
import { setSnackbar } from '../../../auth/authSlice';

// Интерфейсы
interface DebtItem {
  id: number;
  type: FinanceDebtType;
  debtName: string;
  amountToPay: number;
  deadline?: string;
  totalAmount: number;
  isPaid?: boolean;
}

interface UnifiedDebtItem extends DebtItem {
  debtKey: string;
  isPaid: boolean;
}

interface DebtTableProps {
  items?: DebtItem[];
  totalAmountToPay?: number;
  totalDebtAmount?: number;
}

/**
 * Компонент таблицы долгов.
 * Отображает список долгов с возможностью отмечать их как оплаченные и подсчитывает итоговые суммы.
 */
const DebtTable: React.FC<DebtTableProps> = ({
  items = [],
  totalAmountToPay = 0,
  totalDebtAmount = 0,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const paidDebts = useSelector((state: RootState) => state.finance.paidDebts);

  // Унифицируем элементы с учётом статуса оплаты
  const unifiedItems = useMemo<UnifiedDebtItem[]>(() => {
    const result = items.map((item) => ({
      ...item,
      debtKey: `${item.type}-${item.id}`,
      isPaid: paidDebts[`${item.type}-${item.id}`] || false,
    }));
    logger.debug('DebtTable: Unified items', result);
    return result;
  }, [items, paidDebts]);

  // Обработчик переключения статуса оплаты
  const handleTogglePaid = useCallback(async (debtKey: string) => {
    logger.debug(`DebtTable: Отправка togglePaidDebt для ключа: ${debtKey}`);
    try {
      await dispatch(togglePaidDebt({ debtKey, paidDebts, filteredDebts: items.filter(i => i.type === 'debt'), filteredAccounts: items.filter(i => i.type === 'credit_card'), filteredLoans: items.filter(i => i.type === 'loan') })).unwrap();
      dispatch(setSnackbar({ message: 'Статус оплаты успешно обновлён', severity: 'success' }));
    } catch (err) {
      logger.error('DebtTable: Ошибка при переключении статуса оплаты', err);
      dispatch(setSnackbar({ message: 'Ошибка при обновлении статуса оплаты', severity: 'error' }));
    }
  }, [dispatch, paidDebts, items]);

  // Логирование при обновлении таблицы
  useEffect(() => {
    logger.debug('DebtTable: Обновление таблицы долгов', { itemsCount: unifiedItems.length });
  }, [unifiedItems]);

  return (
    <DebtTableContainer component={Paper}>
      <DebtTableStyled size="small">
        <DebtTableHead>
          <DebtTableRow>
            <DebtTableCell>Название</DebtTableCell>
            <DebtTableCell sx={{ textAlign: 'right' }}>К оплате</DebtTableCell>
            <DebtTableCell sx={{ textAlign: 'right' }}>Срок</DebtTableCell>
            <DebtTableCell sx={{ textAlign: 'right' }}>Общая сумма</DebtTableCell>
            <DebtTableCell sx={{ textAlign: 'center' }}>Оплачено</DebtTableCell>
          </DebtTableRow>
        </DebtTableHead>
        <TableBody>
          {unifiedItems.length === 0 ? (
            <DebtTableRow>
              <DebtTableCell colSpan={5} align="center">
                Нет данных для отображения
              </DebtTableCell>
            </DebtTableRow>
          ) : (
            unifiedItems.map((item) => (
              <DebtTableRow key={item.debtKey}>
                <DebtTableCell component="th" scope="row">
                  {item.debtName || 'Без названия'}
                </DebtTableCell>
                <DebtTableCell sx={{ textAlign: 'right' }}>{formatCurrency(item.amountToPay)}</DebtTableCell>
                <DebtTableCell sx={{ textAlign: 'right' }}>{item.deadline || '—'}</DebtTableCell>
                <DebtTableCell sx={{ textAlign: 'right' }}>{formatCurrency(item.totalAmount)}</DebtTableCell>
                <DebtTableCell sx={{ textAlign: 'center' }}>
                  <Checkbox
                    checked={item.isPaid}
                    onChange={() => handleTogglePaid(item.debtKey)}
                    color="primary"
                    disabled={item.amountToPay <= 0}
                  />
                </DebtTableCell>
              </DebtTableRow>
            ))
          )}
          <DebtTableRow sx={{ '& > .MuiTableCell-root': { fontWeight: 'bold', color: '#1976d2' } }}>
            <DebtTableCell>Итого:</DebtTableCell>
            <DebtTableCell sx={{ textAlign: 'right' }}>{formatCurrency(totalAmountToPay)}</DebtTableCell>
            <DebtTableCell />
            <DebtTableCell sx={{ textAlign: 'right' }}>{formatCurrency(totalDebtAmount)}</DebtTableCell>
            <DebtTableCell />
          </DebtTableRow>
        </TableBody>
      </DebtTableStyled>
    </DebtTableContainer>
  );
};

export default DebtTable;