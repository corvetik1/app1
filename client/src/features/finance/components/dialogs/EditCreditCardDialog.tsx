// src/features/finance/components/dialogs/EditCreditCardDialog.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from 'app/store';
import logger from 'utils/logger';
import { setSnackbar } from 'auth/authSlice';
import { StyledDialog } from '../FinanceStyles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parse, format } from 'date-fns';

interface EditCreditCardDialogProps {
  open: boolean;
  onClose: () => void;
  editedCreditCard: { id: number; name: string; credit_limit: number; debt: number; grace_period: string; min_payment: number; payment_due_date: string; user_id: number } | null;
  setEditedCreditCard: (card: { id: number; name: string; credit_limit: number; debt: number; grace_period: string; min_payment: number; payment_due_date: string; user_id: number } | null) => void;
  handleSaveCreditCard: () => void;
}

const EditCreditCardDialog: React.FC<EditCreditCardDialogProps> = ({
  open,
  onClose,
  editedCreditCard,
  setEditedCreditCard,
  handleSaveCreditCard,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [gracePeriodOpen, setGracePeriodOpen] = useState(false);
  const [paymentDueDateOpen, setPaymentDueDateOpen] = useState(false);

  // Валидация полей
  const validateField = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'name':
        return value.trim() ? '' : 'Название карты обязательно';
      case 'credit_limit':
        return value >= 0 ? '' : 'Кредитный лимит не может быть отрицательным';
      case 'debt':
        return value >= 0 ? '' : 'Долг не может быть отрицательным';
      case 'min_payment':
        return value >= 0 ? '' : 'Минимальный платеж не может быть отрицательным';
      case 'payment_due_date':
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value ? '' : 'Формат даты: дд.мм.гггг';
      case 'grace_period':
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value ? '' : 'Формат даты: дд.мм.гггг';
      default:
        return '';
    }
  }, []);

  // Обработчик изменения полей с валидацией (для текстовых полей)
  const handleChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let value: string | number = e.target.value;

      // Для числовых полей (credit_limit, debt, min_payment) разрешаем только числа
      if (field === 'credit_limit' || field === 'debt' || field === 'min_payment') {
        // Удаляем всё, кроме цифр и точки
        value = e.target.value.replace(/[^0-9.]/g, '');
        // Преобразуем в число
        value = value ? parseFloat(value) : 0;
      }

      setEditedCreditCard({ ...editedCreditCard!, [field]: value });
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
      logger.debug('EditCreditCardDialog: Изменено поле кредитной карты', { field, value });
    },
    [editedCreditCard, setEditedCreditCard, validateField]
  );

  // Обработчик изменения даты (для DatePicker)
  const handleDateChange = (field: string) => (date: Date | null) => {
    let value = '';
    if (date) {
      value = format(date, 'dd.MM.yyyy'); // Форматируем дату в DD.MM.YYYY
    }
    setEditedCreditCard({ ...editedCreditCard!, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('EditCreditCardDialog: Изменено поле даты', { field, value });
  };

  // Обработчик изменения даты вручную (для ввода текста)
  const handleDateInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditedCreditCard({ ...editedCreditCard!, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('EditCreditCardDialog: Изменено поле даты вручную', { field, value });
  };

  // Обработчик сохранения с валидацией
  const handleSaveWithLogging = useCallback(() => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields: string[] = ['name', 'credit_limit', 'debt', 'min_payment'];
    requiredFields.forEach((field) => {
      const error = validateField(field, editedCreditCard![field as keyof typeof editedCreditCard]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      dispatch(setSnackbar({ message: 'Пожалуйста, исправьте ошибки в форме', severity: 'error' }));
      logger.warn('EditCreditCardDialog: Валидация не пройдена', { errors: newErrors });
      return;
    }

    logger.info('EditCreditCardDialog: Сохранение изменений кредитной карты', editedCreditCard);
    handleSaveCreditCard();
  }, [dispatch, editedCreditCard, handleSaveCreditCard, validateField]);

  // Если editedCreditCard равен null, не рендерим диалог
  if (!open || !editedCreditCard) {
    logger.warn('EditCreditCardDialog: editedCreditCard is null or dialog is not open, диалог не будет отображён');
    return null;
  }

  // Парсим даты для DatePicker
  const parseDate = (dateStr: string): Date | null => {
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
          <h3>Редактировать кредитную карту</h3>
          <div className="form-field">
            <label htmlFor="name">Название карты</label>
            <input
              id="name"
              type="text"
              placeholder="Название карты"
              value={editedCreditCard.name || 'Карта 1'}
              onChange={handleChange('name')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="credit_limit">Лимит</label>
            <input
              id="credit_limit"
              type="text"
              placeholder="Лимит"
              value={editedCreditCard.credit_limit || 50000}
              onChange={handleChange('credit_limit')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="debt">Долг</label>
            <input
              id="debt"
              type="text"
              placeholder="Долг"
              value={editedCreditCard.debt || 5000}
              onChange={handleChange('debt')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="grace_period">Льготный период</label>
            <DatePicker
              value={parseDate(editedCreditCard.grace_period || '10.05.2025')}
              onChange={handleDateChange('grace_period')}
              format="dd.MM.yyyy"
              open={gracePeriodOpen}
              onOpen={() => setGracePeriodOpen(true)}
              onClose={() => setGracePeriodOpen(false)}
              slots={{
                textField: ({ inputRef }) => (
                  <input
                    id="grace_period"
                    type="text"
                    placeholder="Льготный период (DD.MM.YYYY)"
                    value={editedCreditCard.grace_period || '10.05.2025'}
                    onChange={handleDateInputChange('grace_period')}
                    onClick={() => setGracePeriodOpen(true)}
                    ref={inputRef}
                    className="date-input"
                  />
                ),
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="min_payment">Минимальный платеж</label>
            <input
              id="min_payment"
              type="text"
              placeholder="Минимальный платеж"
              value={editedCreditCard.min_payment || 1000}
              onChange={handleChange('min_payment')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="payment_due_date">Внести до</label>
            <DatePicker
              value={parseDate(editedCreditCard.payment_due_date || '10.04.2025')}
              onChange={handleDateChange('payment_due_date')}
              format="dd.MM.yyyy"
              open={paymentDueDateOpen}
              onOpen={() => setPaymentDueDateOpen(true)}
              onClose={() => setPaymentDueDateOpen(false)}
              slots={{
                textField: ({ inputRef }) => (
                  <input
                    id="payment_due_date"
                    type="text"
                    placeholder="Внести до (DD.MM.YYYY)"
                    value={editedCreditCard.payment_due_date || '10.04.2025'}
                    onChange={handleDateInputChange('payment_due_date')}
                    onClick={() => setPaymentDueDateOpen(true)}
                    ref={inputRef}
                    className="date-input"
                  />
                ),
              }}
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

export default EditCreditCardDialog;