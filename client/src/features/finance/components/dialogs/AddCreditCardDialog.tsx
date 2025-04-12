// src/features/finance/components/dialogs/AddCreditCardDialog.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../../app/store';
import { addCreditCard } from '../../financeActions';
import logger from '../../../../utils/logger';
import { setSnackbar, SetSnackbarPayload } from '../../../../auth/authSlice';
import { Account } from '../../financeSlice';
import { StyledDialog } from '../FinanceStyles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parse, format } from 'date-fns';

/**
 * Интерфейс пропсов компонента AddCreditCardDialog.
 */
interface AddCreditCardDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Расширенный интерфейс Account для кредитной карты.
 */
interface CreditCard extends Account {
  name: string;
  credit_limit: number;
  debt: number;
  grace_period?: string;
  min_payment: number;
  payment_due_date?: string;
  user_id: string;
  type: 'credit';
}

/**
 * Компонент диалогового окна для добавления новой кредитной карты.
 * Позволяет ввести данные карты с валидацией и сохранить их через Redux action.
 */
const AddCreditCardDialog: React.FC<AddCreditCardDialogProps> = ({ open, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { userId } = useSelector((state: RootState) => state.auth);

  const [newCard, setNewCard] = useState<Partial<CreditCard>>({
    name: '',
    credit_limit: 0,
    debt: 0,
    grace_period: '',
    min_payment: 0,
    payment_due_date: '',
    user_id: userId || '',
    type: 'credit',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreditCard, string>>>({});
  const [gracePeriodOpen, setGracePeriodOpen] = useState(false);
  const [paymentDueDateOpen, setPaymentDueDateOpen] = useState(false);

  // Валидация полей
  const validateField = (field: keyof CreditCard, value: any): string => {
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
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value
          ? ''
          : 'Формат даты: дд.мм.гггг';
      case 'grace_period':
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value
          ? ''
          : 'Формат даты: дд.мм.гггг';
      case 'user_id':
        return value ? '' : 'ID пользователя обязателен';
      default:
        return '';
    }
  };

  // Обработчик изменения полей с валидацией
  const handleChange = (field: keyof CreditCard) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value: string | number = e.target.value;

    if (field === 'credit_limit' || field === 'debt' || field === 'min_payment') {
      value = e.target.value.replace(/[^0-9.]/g, '');
      value = value ? parseFloat(value) : 0;
    }

    setNewCard({ ...newCard, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddCreditCardDialog: Изменено поле кредитной карты', { field, value });
  };

  // Обработчик изменения даты (для DatePicker)
  const handleDateChange = (field: keyof CreditCard) => (date: Date | null) => {
    let value = '';
    if (date) {
      value = format(date, 'dd.MM.yyyy');
    }
    setNewCard({ ...newCard, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddCreditCardDialog: Изменено поле даты', { field, value });
  };

  // Обработчик изменения даты вручную
  const handleDateInputChange = (field: keyof CreditCard) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setNewCard({ ...newCard, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddCreditCardDialog: Изменено поле даты вручную', { field, value });
  };

  // Обработчик сохранения карты с валидацией
  const handleSaveCard = async () => {
    const newErrors: Partial<Record<keyof CreditCard, string>> = {};
    const requiredFields: (keyof CreditCard)[] = [
      'name',
      'credit_limit',
      'debt',
      'min_payment',
    ];
    requiredFields.forEach((field) => {
      const error = validateField(field, newCard[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      dispatch(
        setSnackbar({
          message: 'Пожалуйста, исправьте ошибки в форме',
          severity: 'error',
        })
      );
      logger.warn('AddCreditCardDialog: Валидация не пройдена', { errors: newErrors });
      return;
    }

    if (!userId) {
      dispatch(
        setSnackbar({
          message: 'Пользователь не авторизован',
          severity: 'error',
        })
      );
      return;
    }

    try {
      const cardData: CreditCard = {
        ...newCard,
        id: 0,
        name: newCard.name || '',
        credit_limit: newCard.credit_limit || 0,
        debt: newCard.debt || 0,
        min_payment: newCard.min_payment || 0,
        user_id: userId,
        type: 'credit',
      } as CreditCard;
      await dispatch(addCreditCard(cardData)).unwrap();
      setNewCard({
        name: '',
        credit_limit: 0,
        debt: 0,
        grace_period: '',
        min_payment: 0,
        payment_due_date: '',
        user_id: userId,
        type: 'credit',
      });
      dispatch(
        setSnackbar({
          message: 'Кредитная карта успешно добавлена',
          severity: 'success',
        })
      );
      logger.info('AddCreditCardDialog: Кредитная карта добавлена', cardData);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error('Ошибка при добавлении кредитной карты', errorMessage);
      dispatch(
        setSnackbar({
          message: 'Ошибка при добавлении кредитной карты',
          severity: 'error',
        })
      );
    }
  };

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
          <h3>Добавить кредитную карту</h3>
          <div className="form-field">
            <label htmlFor="name">Название карты</label>
            <input
              id="name"
              type="text"
              placeholder="Название карты"
              value={newCard.name || ''}
              onChange={handleChange('name')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="credit_limit">Лимит</label>
            <input
              id="credit_limit"
              type="text"
              placeholder="Лимит"
              value={newCard.credit_limit || 0}
              onChange={handleChange('credit_limit')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="debt">Долг</label>
            <input
              id="debt"
              type="text"
              placeholder="Долг"
              value={newCard.debt || 0}
              onChange={handleChange('debt')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="grace_period">Льготный период</label>
            <DatePicker
              value={parseDate(newCard.grace_period || '')}
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
                    value={newCard.grace_period || ''}
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
              value={newCard.min_payment || 0}
              onChange={handleChange('min_payment')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="payment_due_date">Внести до</label>
            <DatePicker
              value={parseDate(newCard.payment_due_date || '')}
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
                    value={newCard.payment_due_date || ''}
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
            <button className="save-btn" onClick={handleSaveCard}>
              Сохранить
            </button>
          </div>
        </div>
      </StyledDialog>
    </LocalizationProvider>
  );
};

export default AddCreditCardDialog;