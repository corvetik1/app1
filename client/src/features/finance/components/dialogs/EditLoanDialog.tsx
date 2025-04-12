// src/features/finance/components/dialogs/EditLoanDialog.tsx
import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from 'app/store';
import logger from 'utils/logger';
import { setSnackbar } from 'auth/authSlice';
import { StyledDialog } from '../FinanceStyles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parse, format } from 'date-fns';

interface Loan {
  id: number;
  name: string;
  amount?: number;
  monthly_payment?: number;
  payment_due_day?: string;
  rate?: number;
  term?: number;
  debt?: number;
}

interface EditLoanDialogProps {
  open: boolean;
  onClose: () => void;
  editedLoan: Loan | null;
  setEditedLoan: (loan: Loan | null) => void;
  handleSaveEditedLoan: () => void;
}

const EditLoanDialog: React.FC<EditLoanDialogProps> = ({
  open,
  onClose,
  editedLoan,
  setEditedLoan,
  handleSaveEditedLoan,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Валидация полей
  const validateField = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'name':
        return value.trim() ? '' : 'Название кредита обязательно';
      case 'amount':
        return value >= 0 ? '' : 'Сумма кредита не может быть отрицательной';
      case 'monthly_payment':
        return value >= 0 ? '' : 'Ежемесячный платеж не может быть отрицательным';
      case 'payment_due_day':
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value ? '' : 'Формат даты: дд.мм.гггг';
      case 'rate':
        return value >= 0 ? '' : 'Процентная ставка не может быть отрицательной';
      case 'term':
        return value >= 0 ? '' : 'Срок не может быть отрицательным';
      case 'debt':
        return value >= 0 ? '' : 'Долг не может быть отрицательным';
      default:
        return '';
    }
  }, []);

  // Обработчик изменения полей с валидацией (для текстовых полей)
  const handleChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let value: string | number = e.target.value;

      // Для числовых полей (amount, monthly_payment, rate, term, debt) разрешаем только числа
      if (field === 'amount' || field === 'monthly_payment' || field === 'rate' || field === 'term' || field === 'debt') {
        // Удаляем всё, кроме цифр и точки
        value = e.target.value.replace(/[^0-9.]/g, '');
        // Преобразуем в число
        value = value ? parseFloat(value) : 0;
      }

      setEditedLoan({ ...editedLoan!, [field]: value });
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
      logger.debug('EditLoanDialog: Изменено поле кредита', { field, value });
    },
    [editedLoan, setEditedLoan, validateField]
  );

  // Обработчик изменения даты (для DatePicker)
  const handleDateChange = (field: string) => (date: Date | null) => {
    let value = '';
    if (date) {
      value = format(date, 'dd.MM.yyyy'); // Форматируем дату в DD.MM.YYYY
    }
    setEditedLoan({ ...editedLoan!, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('EditLoanDialog: Изменено поле даты', { field, value });
  };

  // Обработчик изменения даты вручную (для ввода текста)
  const handleDateInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditedLoan({ ...editedLoan!, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('EditLoanDialog: Изменено поле даты вручную', { field, value });
  };

  // Обработчик сохранения с валидацией
  const handleSaveWithLogging = useCallback(() => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields: string[] = ['name', 'amount', 'monthly_payment', 'rate', 'term', 'debt'];
    requiredFields.forEach((field) => {
      const error = validateField(field, editedLoan![field as keyof typeof editedLoan]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      dispatch(setSnackbar({ message: 'Пожалуйста, исправьте ошибки в форме', severity: 'error' }));
      logger.warn('EditLoanDialog: Валидация не пройдена', { errors: newErrors });
      return;
    }

    logger.info('EditLoanDialog: Сохранение изменений кредита', editedLoan);
    handleSaveEditedLoan();
  }, [dispatch, editedLoan, handleSaveEditedLoan, validateField]);

  // Если editedLoan равен null, не рендерим диалог
  if (!open || !editedLoan) {
    logger.warn('EditLoanDialog: editedLoan is null or dialog is not open, диалог не будет отображён');
    return null;
  }

  // Парсим даты для DatePicker
  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      return parse(dateStr, 'dd.MM.yyyy', new Date());
    } catch (error) {
      return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <StyledDialog open={open} onClose={onClose}>
        <div className="dialog">
          <div className="decor-line" />
          <h3>Редактировать кредит</h3>
          <div className="form-field">
            <label htmlFor="name">Название кредита</label>
            <input
              id="name"
              type="text"
              placeholder="Название кредита"
              value={editedLoan.name || ''}
              onChange={handleChange('name')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="amount">Сумма кредита</label>
            <input
              id="amount"
              type="text"
              placeholder="Сумма кредита"
              value={editedLoan.amount !== undefined ? editedLoan.amount : 0}
              onChange={handleChange('amount')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="monthly_payment">Ежемесячный платеж</label>
            <input
              id="monthly_payment"
              type="text"
              placeholder="Ежемесячный платеж"
              value={editedLoan.monthly_payment !== undefined ? editedLoan.monthly_payment : 0}
              onChange={handleChange('monthly_payment')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="payment_due_day">Следующий платеж</label>
            <DatePicker
              value={parseDate(editedLoan.payment_due_day || '')}
              onChange={handleDateChange('payment_due_day')}
              format="dd.MM.yyyy"
              open={endDateOpen}
              onOpen={() => setEndDateOpen(true)}
              onClose={() => setEndDateOpen(false)}
              slots={{
                textField: ({ inputRef }) => (
                  <input
                    id="payment_due_day"
                    type="text"
                    placeholder="Следующий платеж (DD.MM.YYYY)"
                    value={editedLoan.payment_due_day || ''}
                    onChange={handleDateInputChange('payment_due_day')}
                    onClick={() => setEndDateOpen(true)}
                    ref={inputRef}
                    className="date-input"
                  />
                ),
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="rate">Процентная ставка</label>
            <input
              id="rate"
              type="text"
              placeholder="Процентная ставка"
              value={editedLoan.rate !== undefined ? editedLoan.rate : 0}
              onChange={handleChange('rate')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="term">Срок (месяцы)</label>
            <input
              id="term"
              type="text"
              placeholder="Срок (месяцы)"
              value={editedLoan.term !== undefined ? editedLoan.term : 0}
              onChange={handleChange('term')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="debt">Долг</label>
            <input
              id="debt"
              type="text"
              placeholder="Долг"
              value={editedLoan.debt !== undefined ? editedLoan.debt : 0}
              onChange={handleChange('debt')}
            />
          </div>
          <div className="buttons">
            <button className="cancel-btn" onClick={onClose}>
              Отмена
            </button>
            <button className="save-btn" onClick={handleSaveWithLogging}>
              Сохранить
            </button>
          </div>
        </div>
      </StyledDialog>
    </LocalizationProvider>
  );
};

export default EditLoanDialog;