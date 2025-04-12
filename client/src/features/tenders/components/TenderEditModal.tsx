// src/features/tenders/components/TenderEditModal.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Tabs,
  Tab,
  Autocomplete,
  IconButton,
  useTheme,
} from '@mui/material';
import { ColorLens } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { styled } from '@mui/system';
import { RootState, AppDispatch } from 'app/store';
import { updateTender } from '../tenderActions';
import logger from 'utils/logger';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw, convertFromRaw, ContentState } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { COLORS, TENDER_STAGES, TENDER_LAWS } from 'utils/constants';
import { Popover } from '@mui/material';

/**
 * Интерфейс тендера для редактирования.
 */
interface Tender {
  id: string;
  stage?: string;
  subject?: string;
  purchase_number?: string;
  end_date?: string;
  note?: string;
  note_input?: string;
  platform_name?: string;
  start_price?: string;
  winner_price?: string;
  winner_name?: string;
  risk_card?: string;
  contract_security?: string;
  platform_fee?: string;
  total_amount?: string;
  color_label?: string | null;
  law?: string;
  [key: string]: any;
}

/**
 * Пропсы для компонента TenderEditModal.
 * @property {boolean} open - Флаг открытия модального окна.
 * @property {() => void} onClose - Функция закрытия модального окна.
 * @property {Tender} tenderData - Данные тендера для редактирования.
 */
interface TenderEditModalProps {
  open: boolean;
  onClose: () => void;
  tenderData: Tender;
}

/**
 * Стилизованный диалог с поддержкой тёмной темы.
 */
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    backgroundColor: theme.palette.mode === 'dark' ? '#2e2e2e' : '#fff',
    padding: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
      width: '100%',
    },
  },
}));

const TenderEditModal: React.FC<TenderEditModalProps> = ({ open, onClose, tenderData }) => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const visibleColumns = useSelector((state: RootState) => state.tenders.visibleColumns);

  const [formData, setFormData] = useState<Tender>(tenderData || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [tabValue, setTabValue] = useState(0);
  const [anchorElColor, setAnchorElColor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (tenderData) {
      setFormData(tenderData);
      setChangedFields(new Set());
      setErrors({});
    }
  }, [tenderData]);

  const validateField = useCallback((field: string, value: string | null): string => {
    switch (field) {
      case 'subject':
        return value?.trim() ? '' : 'Предмет закупки обязателен';
      case 'stage':
        return value ? '' : 'Этап обязателен';
      case 'end_date':
        return value ? '' : 'Дата окончания обязательна';
      case 'start_price':
      case 'winner_price':
      case 'total_amount':
      case 'contract_security':
      case 'platform_fee':
        return /^\d+(\.\d{1,2})?$/.test(value || '') || !value ? '' : 'Введите корректную сумму';
      default:
        return '';
    }
  }, []);

  const handleFieldChange = useCallback((field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setChangedFields((prev) => new Set(prev).add(field));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    logger.debug('TenderEditModal: Изменено поле', { field, value });
  }, [validateField]);

  const handleStageChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string;
    setFormData((prev) => ({ ...prev, stage: value }));
    setChangedFields((prev) => new Set(prev).add('stage'));
    setErrors((prev) => ({ ...prev, stage: validateField('stage', value) }));
  }, [validateField]);

  const handleDateChange = useCallback((date: Date | null) => {
    const value = date ? date.toISOString().split('T')[0] : '';
    setFormData((prev) => ({ ...prev, end_date: value }));
    setChangedFields((prev) => new Set(prev).add('end_date'));
    setErrors((prev) => ({ ...prev, end_date: validateField('end_date', value) }));
  }, [validateField]);

  const handleNoteChange = useCallback((newState: EditorState) => {
    const contentState = newState.getCurrentContent();
    const noteText = contentState.hasText() ? JSON.stringify(convertToRaw(contentState)) : '';
    setFormData((prev) => ({ ...prev, note: noteText }));
    setChangedFields((prev) => new Set(prev).add('note'));
  }, []);

  const handleAutocompleteChange = useCallback((field: string) => (event: React.SyntheticEvent, newValue: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: newValue || '' }));
    setChangedFields((prev) => new Set(prev).add(field));
  }, []);

  const handleColorClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorElColor(event.currentTarget);
  }, []);

  const handleColorClose = useCallback(() => {
    setAnchorElColor(null);
  }, []);

  const handleColorSelect = useCallback((color: string | null) => {
    setFormData((prev) => ({ ...prev, color_label: color }));
    setChangedFields((prev) => new Set(prev).add('color_label'));
    handleColorClose();
  }, []);

  const handleSave = useCallback(async () => {
    const newErrors: { [key: string]: string } = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field] || '');
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      logger.warn('TenderEditModal: Валидация не пройдена', { errors: newErrors });
      return;
    }

    try {
      await dispatch(updateTender({ id: parseInt(formData.id), tenderData: formData })).unwrap();
      logger.info('TenderEditModal: Тендер успешно обновлён', { id: formData.id });
      onClose();
    } catch (error) {
      logger.error('TenderEditModal: Ошибка при обновлении тендера', error);
    }
  }, [formData, dispatch, onClose]);

  const handleReset = useCallback(() => {
    setFormData(tenderData);
    setErrors({});
    setChangedFields(new Set());
  }, [tenderData]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const getInitialEditorState = useCallback((note: string | undefined): EditorState => {
    if (!note) return EditorState.createEmpty();
    try {
      return EditorState.createWithContent(convertFromRaw(JSON.parse(note)));
    } catch (e) {
      logger.warn('TenderEditModal: Note не в формате JSON, преобразование в текст', { note });
      return EditorState.createWithContent(ContentState.createFromText(note));
    }
  }, []);

  const editableColumns = visibleColumns.filter((col) => col.visible && col.id !== 'id');
  const hasNote = visibleColumns.some((col) => col.id === 'note' && col.visible);
  const platforms = ['Закупки РФ', 'ТендерПро', 'ГосЗакупки']; // Можно вынести в constants

  return (
    <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#1976d2' }}>
        Редактирование тендера #{formData.id} - {formData.subject || 'Без предмета закупки'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Основные данные" />
            <Tab label="Финансы" />
            <Tab label="Примечания" />
          </Tabs>
          {tabValue === 0 && (
            <Grid container spacing={2}>
              {editableColumns
                .filter((col) => !['start_price', 'winner_price', 'total_amount', 'contract_security', 'platform_fee', 'note', 'note_input'].includes(col.id))
                .map((column) =>
                  column.id === 'stage' ? (
                    <Grid item xs={12} sm={6} key={column.id}>
                      <FormControl fullWidth variant="outlined" size="small" error={!!errors[column.id]}>
                        <InputLabel shrink sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : undefined }}>
                          {column.label}
                        </InputLabel>
                        <Select
                          value={formData[column.id] || ''}
                          onChange={handleStageChange}
                          label={column.label}
                          sx={{ backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' }}
                        >
                          {TENDER_STAGES.allStages.map((stage) => (
                            <MenuItem key={stage} value={stage}>
                              {stage}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors[column.id] && <Typography color="error" variant="caption">{errors[column.id]}</Typography>}
                      </FormControl>
                    </Grid>
                  ) : column.id === 'end_date' ? (
                    <Grid item xs={12} sm={6} key={column.id}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label={column.label}
                          value={formData[column.id] ? new Date(formData[column.id]) : null}
                          onChange={handleDateChange}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              size: 'small',
                              InputLabelProps: { shrink: true },
                              error: !!errors[column.id],
                              helperText: errors[column.id],
                              sx: { backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' },
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  ) : column.id === 'law' ? (
                    <Grid item xs={12} sm={6} key={column.id}>
                      <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel shrink sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : undefined }}>
                          {column.label}
                        </InputLabel>
                        <Select
                          value={formData[column.id] || ''}
                          onChange={handleFieldChange(column.id)}
                          label={column.label}
                          sx={{ backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' }}
                        >
                          {TENDER_LAWS.map((law) => (
                            <MenuItem key={law} value={law}>
                              {law}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  ) : column.id === 'platform_name' ? (
                    <Grid item xs={12} sm={6} key={column.id}>
                      <Autocomplete
                        options={platforms}
                        value={formData[column.id] || ''}
                        onChange={handleAutocompleteChange(column.id)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={column.label}
                            fullWidth
                            variant="outlined"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' }}
                          />
                        )}
                      />
                    </Grid>
                  ) : column.id === 'color_label' ? (
                    <Grid item xs={12} sm={6} key={column.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          label={column.label}
                          value={
                            formData[column.id]
                              ? COLORS.find((c) => c.value === formData[column.id])?.label || 'Без цвета'
                              : 'Без цвета'
                          }
                          fullWidth
                          variant="outlined"
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          InputProps={{ readOnly: true }}
                          sx={{ mr: 1, backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' }}
                        />
                        <IconButton onClick={handleColorClick}>
                          <ColorLens style={{ color: formData[column.id] || '#bdbdbd' }} />
                        </IconButton>
                        <Popover
                          open={Boolean(anchorElColor)}
                          anchorEl={anchorElColor}
                          onClose={handleColorClose}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                        >
                          <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 150 }}>
                            {COLORS.map((color) => (
                              <IconButton
                                key={color.value}
                                onClick={() => handleColorSelect(color.value === '' ? null : color.value)}
                                sx={{ backgroundColor: color.value || '#bdbdbd', width: 24, height: 24 }}
                                title={color.label}
                              />
                            ))}
                          </Box>
                        </Popover>
                      </Box>
                    </Grid>
                  ) : (
                    <Grid item xs={12} sm={6} key={column.id}>
                      <TextField
                        label={column.label}
                        value={formData[column.id] || ''}
                        onChange={handleFieldChange(column.id)}
                        fullWidth
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors[column.id]}
                        helperText={errors[column.id]}
                        sx={{ backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' }}
                      />
                    </Grid>
                  )
                )}
            </Grid>
          )}
          {tabValue === 1 && (
            <Grid container spacing={2}>
              {editableColumns
                .filter((col) => ['start_price', 'winner_price', 'total_amount', 'contract_security', 'platform_fee'].includes(col.id))
                .map((column) => (
                  <Grid item xs={12} sm={6} key={column.id}>
                    <TextField
                      label={column.label}
                      value={formData[column.id] || ''}
                      onChange={handleFieldChange(column.id)}
                      fullWidth
                      variant="outlined"
                      size="small"
                      type="number"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors[column.id]}
                      helperText={errors[column.id]}
                      sx={{ backgroundColor: changedFields.has(column.id) ? '#fff3e0' : 'inherit' }}
                    />
                  </Grid>
                ))}
            </Grid>
          )}
          {tabValue === 2 && (
            <Grid container spacing={2}>
              {hasNote && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Заголовок примечания"
                      value={formData.note_input || ''}
                      onChange={handleFieldChange('note_input')}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ backgroundColor: changedFields.has('note_input') ? '#fff3e0' : 'inherit' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#1976d2' }}>
                      Примечание:
                    </Typography>
                    <Editor
                      editorState={getInitialEditorState(formData.note)}
                      onEditorStateChange={handleNoteChange}
                      wrapperClassName="demo-wrapper"
                      editorClassName="demo-editor"
                      toolbarStyle={{ marginBottom: 8 }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset} sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#f44336' }}>
          Сбросить
        </Button>
        <Button onClick={onClose} sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#1976d2' }}>
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ backgroundColor: COLORS.BLUE_700, '&:hover': { backgroundColor: COLORS.BLUE_900 } }}
          disabled={Object.keys(errors).some((key) => errors[key])}
        >
          Сохранить
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default TenderEditModal;