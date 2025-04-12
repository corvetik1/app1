// src/features/tenders/components/ColumnSettingsModal.tsx
import React, { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Divider,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { setVisibleColumns } from '../tendersSlice';
import { RootState, AppDispatch } from '../../../app/store';
import logger from '../../../utils/logger'; // Исправлен импорт на default

/**
 * Интерфейс конфигурации колонки таблицы тендеров.
 */
interface Column {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * Пропсы для компонента ColumnSettingsModal.
 * @property {boolean} open - Флаг открытия модального окна.
 * @property {() => void} onClose - Функция для закрытия модального окна.
 */
interface ColumnSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Компонент модального окна для настройки видимости колонок таблицы тендеров.
 * Позволяет пользователю включать/выключать отображение колонок.
 */
const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({ open, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const visibleColumns: Column[] = useSelector((state: RootState) => state.tenders.visibleColumns);
  const isLoading = useSelector((state: RootState) => state.tenders.loading);

  /**
   * Обработчик переключения видимости колонки.
   * @param {string} columnId - Идентификатор колонки для переключения.
   */
  const handleToggleColumn = useCallback(
    async (columnId: string) => {
      if (!visibleColumns) return;

      const updatedColumns = visibleColumns.map((column) =>
        column.id === columnId ? { ...column, visible: !column.visible } : column
      );

      dispatch(setVisibleColumns(updatedColumns));
      logger.info('Изменена видимость колонки (локально)');
    },
    [dispatch, visibleColumns]
  );

  // Состояние загрузки или отсутствие колонок
  if (!visibleColumns || visibleColumns.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>Настройка колонок</DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={onClose} variant="contained">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ borderBottom: '1px solid #eee', fontSize: '1.1rem', fontWeight: 600 }}>
        Настройка видимости колонок
      </DialogTitle>
      <DialogContent sx={{ padding: '0' }}>
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <List dense sx={{ padding: 0 }}>
            {visibleColumns.map((column, index) => (
              <React.Fragment key={column.id}>
                <ListItem
                  component="button"
                  onClick={() => handleToggleColumn(column.id)}
                  disabled={isLoading}
                  sx={{
                    padding: '10px 24px',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                  }}
                >
                  <Checkbox
                    checked={column.visible}
                    onChange={() => handleToggleColumn(column.id)}
                    color="primary"
                    edge="start"
                    sx={{ padding: '0 16px 0 0' }}
                    disabled={isLoading}
                  />
                  <ListItemText
                    primary={column.label}
                    sx={{
                      fontSize: '0.95rem',
                      fontWeight: column.visible ? 500 : 400,
                      color: column.visible ? 'text.primary' : 'text.secondary',
                    }}
                  />
                </ListItem>
                {index < visibleColumns.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
        <Button onClick={onClose} variant="contained" disabled={isLoading}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnSettingsModal;