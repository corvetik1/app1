// src/features/finance/components/dialogs/AddLoanDialog.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../../app/store';
import { createLoan } from '../../financeActions';
import logger from '../../../../utils/logger';
import { setSnackbar } from '../../../../auth/authSlice';
import { Loan } from '../../financeSlice';
import { StyledDialog } from '../FinanceStyles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parse, format } from 'date-fns';
import { styled } from '@mui/system';

interface AddLoanDialogProps {
  open: boolean;
  onClose: () => void;
}

// Локально переопределяем StyledDialog без скролла
const NoScrollStyledDialog = styled(StyledDialog)({
  '& .MuiDialog-paper': {
    maxHeight: '100vh', // Ограничиваем высоту до размера экрана
    overflowY: 'hidden', // Отключаем вертикальную прокрутку
  },
  '& .dialog': {
    overflowY: 'hidden', // Отключаем прокрутку внутри формы
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%', // Форма занимает всю доступную высоту
  },
  '& .form-field': {
    marginBottom: '15px', // Уменьшаем отступы между полями для компактности
  },
  '& .buttons': {
    marginTop: '10px', // Уменьшаем верхний отступ кнопок
  },
});

/**
 * Компонент диалогового окна для добавления нового кредита.
 * Позволяет ввести данные кредита с валидацией и сохранить их через Redux action.
 */
const AddLoanDialog: React.FC<AddLoanDialogProps> = ({ open, onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const { userId } = useSelector((state: RootState) => state.auth);

  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    name: '',
    amount: 0,
    interest_rate: 0,
    term: 0,
    end_date: '',
    monthly_payment: 0,
    payment_due_day: '',
    user_id: userId || 0,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Валидация полей
  const validateField = (field: keyof Partial<Loan>, value: any): string => {
    switch (field) {
      case 'name':
        return value.trim() ? '' : 'Название кредита обязательно';
      case 'amount':
        return value > 0 ? '' : 'Сумма кредита должна быть больше 0';
      case 'interest_rate':
        return value >= 0 ? '' : 'Процентная ставка не может быть отрицательной';
      case 'term':
        return value > 0 ? '' : 'Срок должен быть больше 0';
      case 'monthly_payment':
        return value >= 0 ? '' : 'Платеж в месяц не может быть отрицательным';
      case 'payment_due_day':
        return !value || (parseInt(value) >= 1 && parseInt(value) <= 31)
          ? ''
          : 'День должен быть от 1 до 31';
      case 'end_date':
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value
          ? ''
          : 'Формат даты: дд.мм.гггг';
      default:
        return '';
    }
  };

  // Обработчик изменения полей с валидацией
  const handleChange = (field: keyof Partial<Loan>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value: string | number = e.target.value;

    if (
      field === 'amount' ||
      field === 'interest_rate' ||
      field === 'term' ||
      field === 'monthly_payment'
    ) {
      value = e.target.value.replace(/[^0-9.]/g, '');
      value = value ? parseFloat(value) : 0;
    }

    setNewLoan({ ...newLoan, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddLoanDialog: Изменено поле кредита', { field, value });
  };

  // Обработчик изменения даты (для DatePicker)
  const handleDateChange = (field: keyof Partial<Loan>) => (date: Date | null) => {
    let value = '';
    if (date) {
      value = format(date, 'dd.MM.yyyy');
    }
    setNewLoan({ ...newLoan, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddLoanDialog: Изменено поле даты', { field, value });
  };

  // Обработчик изменения даты вручную
  const handleDateInputChange = (field: keyof Partial<Loan>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setNewLoan({ ...newLoan, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddLoanDialog: Изменено поле даты вручную', { field, value });
  };

  // Обработчик сохранения кредита с валидацией
  const handleSaveLoan = async () => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields: (keyof Partial<Loan>)[] = [
      'name',
      'amount',
      'interest_rate',
      'term',
      'monthly_payment',
    ];

    requiredFields.forEach((field) => {
      const error = validateField(field, newLoan[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      dispatch(
        setSnackbar({ message: 'Пожалуйста, исправьте ошибки в форме', severity: 'error' })
      );
      logger.warn('AddLoanDialog: Валидация не пройдена', { errors: newErrors });
      return;
    }

    try {
      const loanData: Loan = {
        ...newLoan,
        user_id: userId || 0,
        end_date: newLoan.end_date || '',
        payment_due_day: newLoan.payment_due_day || '',
      } as Loan;
      await dispatch(createLoan(loanData)).unwrap();
      setNewLoan({
        name: '',
        amount: 0,
        interest_rate: 0,
        term: 0,
        end_date: '',
        monthly_payment: 0,
        payment_due_day: '',
        user_id: userId || 0,
      });
      dispatch(
        setSnackbar({ message: 'Кредит успешно добавлен', severity: 'success' })
      );
      logger.info('AddLoanDialog: Кредит добавлен', loanData);
      onClose();
    } catch (error) {
      logger.error('Ошибка при добавлении кредита', error);
      dispatch(
        setSnackbar({ message: 'Ошибка при добавлении кредита', severity: 'error' })
      );
    }
  };

  // Парсим дату для DatePicker
  const parseDate = (dateStr: string): Date | null => {
    try {
      return parse(dateStr, 'dd.MM.yyyy', new Date());
    } catch (error) {
      return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <NoScrollStyledDialog open={open} onClose={onClose}>
        <div className="dialog">
          <div className="decor-line" />
          <h3>Добавить кредит</h3>
          <div className="form-field">
            <label htmlFor="name">Название кредита</label>
            <input
              id="name"
              type="text"
              placeholder="Название кредита"
              value={newLoan.name || ''}
              onChange={handleChange('name')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="amount">Сумма кредита</label>
            <input
              id="amount"
              type="text"
              placeholder="Сумма кредита"
              value={newLoan.amount || 0}
              onChange={handleChange('amount')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="interest_rate">Процентная ставка</label>
            <input
              id="interest_rate"
              type="text"
              placeholder="Процентная ставка"
              value={newLoan.interest_rate || 0}
              onChange={handleChange('interest_rate')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="term">Срок (в месяцах)</label>
            <input
              id="term"
              type="text"
              placeholder="Срок (в месяцах)"
              value={newLoan.term || 0}
              onChange={handleChange('term')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="end_date">Дата окончания</label>
            <DatePicker
              value={parseDate(newLoan.end_date || '')}
              onChange={handleDateChange('end_date')}
              format="dd.MM.yyyy"
              open={endDateOpen}
              onOpen={() => setEndDateOpen(true)}
              onClose={() => setEndDateOpen(false)}
              slots={{
                textField: ({ inputRef }) => (
                  <input
                    id="end_date"
                    type="text"
                    placeholder="Дата окончания (DD.MM.YYYY)"
                    value={newLoan.end_date || ''}
                    onChange={handleDateInputChange('end_date')}
                    onClick={() => setEndDateOpen(true)}
                    ref={inputRef}
                    className="date-input"
                  />
                ),
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="monthly_payment">Платеж в месяц</label>
            <input
              id="monthly_payment"
              type="text"
              placeholder="Платеж в месяц"
              value={newLoan.monthly_payment || 0}
              onChange={handleChange('monthly_payment')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="payment_due_day">Оплатить до (день месяца)</label>
            <input
              id="payment_due_day"
              type="text"
              placeholder="Оплатить до (день месяца)"
              value={newLoan.payment_due_day || ''}
              onChange={handleChange('payment_due_day')}
            />
          </div>
          <div className="buttons">
            <button className="cancel-btn" onClick={onClose}>
              Отмена
            </button>
            <button className="save-btn" onClick={handleSaveLoan}>
              Сохранить
            </button>
          </div>
        </div>
      </NoScrollStyledDialog>
    </LocalizationProvider>
  );
};

export default AddLoanDialog;