// src/features/tenders/components/TenderRow.tsx
import React, { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  TableRow,
  TableCell,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Box,
  IconButton,
  TextField,
  Popover,
} from '@mui/material';
import { ColorLens } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../app/store';
import { tenderService } from '../services/tenderService';
import logger from '../../../utils/logger';
import { setSnackbar } from '../../../auth/authSlice';
import { Tender } from '../tendersSlice';
import { ColumnConfig } from '../../../config/visibleColumnsConfig';

interface TenderRowProps {
  tender: Tender;
  selectedRows: string[];
  handleRowSelect: (id: string) => void;
  handleCellChange: (id: string, field: string, value: any) => void;
  visibleColumns: ColumnConfig[];
  errors: { [key: string]: string };
  handleColorLabelSelect: (id: string, color: string | null) => void;
  index: number;
  debounceDelay?: number;
}

const TenderRow: React.FC<TenderRowProps> = memo(
  ({
    tender,
    selectedRows,
    handleRowSelect,
    handleCellChange,
    visibleColumns,
    errors,
    handleColorLabelSelect,
    index,
    debounceDelay = 500,
  }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [localValues, setLocalValues] = useState<Tender>(tender);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      setLocalValues(tender);
    }, [tender]);

    const handleChangeWithSave = useCallback(
      (field: string, value: any, type: 'text' | 'date' | 'price' = 'text') => {
        let processedValue = value;
        if (type === 'price') {
          processedValue = cleanNumberValue(value);
        } else if (type === 'date' && value instanceof Date && !isNaN(value.getTime())) {
          processedValue = formatDate(value);
        } else if (value === null && type === 'date') {
          processedValue = null;
        }

        setLocalValues((prev) => ({ ...prev, [field]: value }));

        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(async () => {
          try {
            await tenderService.updateTender(tender.id.toString(), { [field]: processedValue });
            logger.info('handleChangeWithSave: Тендер успешно обновлен');
            dispatch(setSnackbar({ message: `Поле "${field}" сохранено`, severity: 'success' }));
          } catch (error: any) {
            logger.error('handleChangeWithSave: Ошибка при обновлении тендера', { id: tender.id, field, value: processedValue, error });
            dispatch(setSnackbar({ message: `Ошибка сохранения поля "${field}": ${error.message}`, severity: 'error' }));
            setLocalValues((prev) => ({ ...prev, [field]: tender[field] }));
          }
        }, debounceDelay);
      },
      [dispatch, tender.id, tender, debounceDelay]
    );

    const handleColorLabelClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    }, []);

    const handleColorLabelClose = useCallback(() => {
      setAnchorEl(null);
    }, []);

    const renderCells = useMemo(() => {
      return visibleColumns.map((column) => {
        const field = column.id;
        const value = localValues[field] ?? '';
        const error = errors[`${tender.id}_${field}`];
        const helperText = error;

        if (!column.visible || field === 'id') return null;

        if (field === 'stage') {
          return (
            <TableCell key={field} align="center">
              <FormControl fullWidth size="small">
                <Select
                  value={value || 'Не участвую'}
                  onChange={(e) => handleChangeWithSave('stage', e.target.value)}
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="Не участвую">Не участвую</MenuItem>
                  <MenuItem value="Проиграл ТА">Проиграл ТА</MenuItem>
                  <MenuItem value="Проиграл ИП">Проиграл ИП</MenuItem>
                  <MenuItem value="Просчет ИП">Просчет ИП</MenuItem>
                  <MenuItem value="Победил ИП">Победил ИП</MenuItem>
                  <MenuItem value="Подписание контракта">Подписание контракта</MenuItem>
                  <MenuItem value="Исполнение">Исполнение</MenuItem>
                  <MenuItem value="Ожидание оплаты">Ожидание оплаты</MenuItem>
                  <MenuItem value="Исполнено">Исполнено</MenuItem>
                </Select>
              </FormControl>
            </TableCell>
          );
        }

        if (field === 'law') {
          return (
            <TableCell key={field} align="center">
              <FormControl fullWidth size="small">
                <Select
                  value={value || '44-ФЗ'}
                  onChange={(e) => handleChangeWithSave('law', e.target.value)}
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="44-ФЗ">44-ФЗ</MenuItem>
                  <MenuItem value="223-ФЗ">223-ФЗ</MenuItem>
                  <MenuItem value="ЗМО">ЗМО</MenuItem>
                </Select>
              </FormControl>
            </TableCell>
          );
        }

        if (field === 'note') {
          return (
            <TableCell key={field} align="center">
              <TextField
                value={value}
                onChange={(e) => handleChangeWithSave('note', e.target.value)}
                size="small"
                error={!!error}
                helperText={helperText}
                sx={{ minWidth: '300px', maxWidth: '300px' }}
                inputProps={{ autoComplete: 'off' }}
              />
            </TableCell>
          );
        }

        if (field === 'platform_name') {
          const isUrl = /^(https?:\/\/[^\s]+)/.test(value);
          return (
            <TableCell key={field} align="center" sx={{ maxWidth: '200px' }}>
              {isUrl ? (
                <Box>
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    {value}
                  </a>
                </Box>
              ) : (
                <TextField
                  value={value}
                  onChange={(e) => handleChangeWithSave('platform_name', e.target.value)}
                  size="small"
                  error={!!error}
                  helperText={helperText}
                  sx={{ minWidth: '200px' }}
                  inputProps={{ autoComplete: 'off' }}
                />
              )}
            </TableCell>
          );
        }

        if (field === 'end_date') {
          return (
            <TableCell key={field} align="center">
              <DatePicker
                value={parseDate(value)}
                onChange={(newDate) => handleChangeWithSave('end_date', newDate, 'date')}
                slotProps={{
                  textField: {
                    size: 'small',
                    error: !!error,
                    helperText: helperText,
                    sx: { minWidth: '150px' },
                  },
                }}
                format="dd.MM.yyyy"
              />
            </TableCell>
          );
        }

        if (['nmck', 'winner_price', 'total_amount', 'platform_fee', 'contract_security'].includes(field)) {
          return (
            <TableCell key={field} align="center">
              <TextField
                value={formatNumberWithSpaces(value)}
                onChange={(e) => handleChangeWithSave(field, e.target.value, 'price')}
                size="small"
                error={!!error}
                helperText={helperText}
                sx={{ '& .MuiInputBase-input': { textAlign: 'right' }, minWidth: '150px' }}
                inputProps={{ autoComplete: 'off' }}
              />
            </TableCell>
          );
        }

        return (
          <TableCell key={field} align="center">
            <TextField
              value={value}
              onChange={(e) => handleChangeWithSave(field, e.target.value)}
              size="small"
              error={!!error}
              helperText={helperText}
              sx={{ minWidth: '150px' }}
              inputProps={{ autoComplete: 'off' }}
            />
          </TableCell>
        );
      });
    }, [visibleColumns, localValues, errors, tender.id, handleChangeWithSave]);

    return (
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <TableRow key={tender.id}>
          <TableCell sx={{ minWidth: '50px' }}>
            <Checkbox checked={selectedRows.includes(tender.id.toString())} onChange={() => handleRowSelect(tender.id.toString())} />
          </TableCell>
          <TableCell align="center">{index + 1}</TableCell>
          <TableCell sx={{ minWidth: '50px', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
            <IconButton onClick={handleColorLabelClick}>
              <ColorLens style={{ color: localValues.color_label || '#bdbdbd' }} />
            </IconButton>
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={handleColorLabelClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'].map((color) => (
                  <IconButton
                    key={color}
                    onClick={() => {
                      handleColorLabelSelect(tender.id.toString(), color);
                      handleChangeWithSave('color_label', color);
                      handleColorLabelClose();
                    }}
                    sx={{ backgroundColor: color, width: 24, height: 24 }}
                  />
                ))}
                <IconButton
                  onClick={() => {
                    handleColorLabelSelect(tender.id.toString(), null);
                    handleChangeWithSave('color_label', null);
                    handleColorLabelClose();
                  }}
                  sx={{ border: '1px dashed #ccc', width: 24, height: 24 }}
                  size="small"
                >
                  -
                </IconButton>
              </Box>
            </Popover>
          </TableCell>
          {renderCells}
        </TableRow>
      </LocalizationProvider>
    );
  }
);

const formatNumberWithSpaces = (value?: string | number): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return isNaN(num) ? '-' : num.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
};

const cleanNumberValue = (value?: string | number): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
  const number = parseFloat(cleaned);
  return isNaN(number) ? null : number.toString();
};

const parseDate = (dateStr?: string | Date): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (date?: Date | null): string | null => {
  if (!date || isNaN(date.getTime())) return null;
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().split('T')[0];
};

export default TenderRow;