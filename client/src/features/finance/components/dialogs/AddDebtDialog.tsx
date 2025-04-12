// src/features/finance/components/dialogs/AddDebtDialog.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../../app/store';
import { createDebt } from '../../financeActions';
import logger from '../../../../utils/logger';
import { setSnackbar } from '../../../../auth/authSlice';
import { Debt } from '../../financeSlice';
import { StyledDialog } from '../FinanceStyles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parse, format } from 'date-fns';

/**
 * Интерфейс пропсов компонента AddDebtDialog.
 * @property {boolean} open - Флаг открытия диалога.
 * @property {() => void} onClose - Функция закрытия диалога.
 */
interface AddDebtDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Компонент диалогового окна для добавления нового долга.
 * Позволяет ввести данные долга с валидацией и сохранить их через Redux action.
 */
const AddDebtDialog: React.FC<AddDebtDialogProps> = ({ open, onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const { userId } = useSelector((state: RootState) => state.auth);

  const [newDebt, setNewDebt] = useState<Partial<Debt>>({
    name: '',
    amount: 0,
    due_date: '',
    total_debt: 0,
    description: '',
    user_id: userId || 0,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [dueDateOpen, setDueDateOpen] = useState(false);

  // Валидация полей
  const validateField = (field: keyof typeof newDebt, value: any): string => {
    switch (field) {
      case 'name':
        return value.trim() ? '' : 'Название долга обязательно';
      case 'amount':
        return value > 0 ? '' : 'Сумма к оплате должна быть больше 0';
      case 'total_debt':
        return value >= 0 ? '' : 'Общая сумма долга не может быть отрицательной';
      case 'due_date':
        return /^\d{2}\.\d{2}\.\d{4}$/.test(value) || !value
          ? ''
          : 'Формат даты: дд.мм.гггг';
      default:
        return '';
    }
  };

  // Обработчик изменения полей с валидацией
  const handleChange = (field: keyof typeof newDebt) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value: string | number = e.target.value;

    if (field === 'amount' || field === 'total_debt') {
      value = e.target.value.replace(/[^0-9.]/g, '');
      value = value ? parseFloat(value) : 0;
    }

    setNewDebt({ ...newDebt, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddDebtDialog: Изменено поле долга', { field, value });
  };

  // Обработчик изменения даты (для DatePicker)
  const handleDateChange = (field: keyof typeof newDebt) => (date: Date | null) => {
    let value = '';
    if (date) {
      value = format(date, 'dd.MM.yyyy');
    }
    setNewDebt({ ...newDebt, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddDebtDialog: Изменено поле даты', { field, value });
  };

  // Обработчик изменения даты вручную
  const handleDateInputChange = (field: keyof typeof newDebt) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setNewDebt({ ...newDebt, [field]: value });
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('AddDebtDialog: Изменено поле даты вручную', { field, value });
  };

  // Обработчик сохранения долга с валидацией
  const handleSaveDebt = async () => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields: (keyof typeof newDebt)[] = ['name', 'amount', 'total_debt'];

    requiredFields.forEach((field) => {
      const error = validateField(field, newDebt[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      dispatch(
        setSnackbar({ message: 'Пожалуйста, исправьте ошибки в форме', severity: 'error' })
      );
      logger.warn('AddDebtDialog: Валидация не пройдена', { errors: newErrors });
      return;
    }

    try {
      await dispatch(createDebt(newDebt as Debt)).unwrap();
      setNewDebt({
        name: '',
        amount: 0,
        due_date: '',
        total_debt: 0,
        description: '',
        user_id: userId || 0,
      });
      dispatch(
        setSnackbar({ message: 'Долг успешно добавлен', severity: 'success' })
      );
      logger.info('AddDebtDialog: Долг добавлен', newDebt);
      onClose();
    } catch (error) {
      logger.error('Ошибка при добавлении долга', error);
      dispatch(
        setSnackbar({ message: 'Ошибка при добавлении долга', severity: 'error' })
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
      <StyledDialog open={open} onClose={onClose}>
        <div className="dialog">
          <div className="decor-line" />
          <h3>Добавить долг</h3>
          <div className="form-field">
            <label htmlFor="name">Название долга</label>
            <input
              id="name"
              type="text"
              placeholder="Название долга"
              value={newDebt.name || ''}
              onChange={handleChange('name')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="amount">Сумма к оплате</label>
            <input
              id="amount"
              type="text"
              placeholder="Сумма к оплате"
              value={newDebt.amount || 0}
              onChange={handleChange('amount')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="due_date">Срок оплаты</label>
            <DatePicker
              value={parseDate(newDebt.due_date || '')}
              onChange={handleDateChange('due_date')}
              format="dd.MM.yyyy"
              open={dueDateOpen}
              onOpen={() => setDueDateOpen(true)}
              onClose={() => setDueDateOpen(false)}
              slots={{
                textField: ({ inputRef }) => (
                  <input
                    id="due_date"
                    type="text"
                    placeholder="Срок оплаты (DD.MM.YYYY)"
                    value={newDebt.due_date || ''}
                    onChange={handleDateInputChange('due_date')}
                    onClick={() => setDueDateOpen(true)}
                    ref={inputRef}
                    className="date-input"
                  />
                ),
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="total_debt">Общая сумма долга</label>
            <input
              id="total_debt"
              type="text"
              placeholder="Общая сумма долга"
              value={newDebt.total_debt || 0}
              onChange={handleChange('total_debt')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="description">Примечание</label>
            <input
              id="description"
              type="text"
              placeholder="Примечание"
              value={newDebt.description || ''}
              onChange={handleChange('description')}
            />
          </div>
          <div className="buttons">
            <button className="cancel-btn" onClick={onClose}>
              Отмена
            </button>
            <button className="save-btn" onClick={handleSaveDebt}>
              Сохранить
            </button>
          </div>
        </div>
      </StyledDialog>
    </LocalizationProvider>
  );
};

export default AddDebtDialog;