// src/features/finance/components/dialogs/EditAccountDialog.tsx
import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from 'app/store';
import logger from 'utils/logger';
import { setSnackbar } from 'auth/authSlice';
import { StyledDialog } from '../FinanceStyles';

interface Account {
  id: number;
  name: string;
  balance: number;
}

interface EditAccountDialogProps {
  open: boolean;
  onClose: () => void;
  editedAccount: Account | null;
  setEditedAccount: (account: Account | null) => void;
  handleSaveEditedAccount: () => void;
}

const EditAccountDialog: React.FC<EditAccountDialogProps> = ({
  open,
  onClose,
  editedAccount,
  setEditedAccount,
  handleSaveEditedAccount,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Валидация полей
  const validateField = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'name':
        return value.trim() ? '' : 'Название счёта обязательно';
      default:
        return '';
    }
  }, []);

  // Обработчик изменения полей с валидацией
  const handleChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEditedAccount({ ...editedAccount!, [field]: value });
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
      logger.debug('EditAccountDialog: Изменено поле счёта', { field, value });
    },
    [editedAccount, setEditedAccount, validateField]
  );

  // Обработчик сохранения с валидацией
  const handleSaveWithLogging = useCallback(() => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields: string[] = ['name'];
    requiredFields.forEach((field) => {
      const error = validateField(field, editedAccount![field as keyof typeof editedAccount]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      dispatch(setSnackbar({ message: 'Пожалуйста, исправьте ошибки в форме', severity: 'error' }));
      logger.warn('EditAccountDialog: Валидация не пройдена', { errors: newErrors });
      return;
    }

    logger.info('EditAccountDialog: Сохранение изменений счёта', editedAccount);
    handleSaveEditedAccount();
  }, [dispatch, editedAccount, handleSaveEditedAccount, validateField]);

  // Если editedAccount равен null, не рендерим диалог
  if (!open || !editedAccount) {
    logger.warn('EditAccountDialog: editedAccount is null or dialog is not open, диалог не будет отображён');
    return null;
  }

  return (
    <StyledDialog open={open} onClose={onClose}>
      <div className="dialog">
        <div className="decor-line" />
        <h3>Редактировать счёт</h3>
        <div className="form-field">
          <label htmlFor="name">Название счёта</label>
          <input
            id="name"
            type="text"
            placeholder="Название счёта"
            value={editedAccount.name || ''}
            onChange={handleChange('name')}
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
  );
};

export default EditAccountDialog;