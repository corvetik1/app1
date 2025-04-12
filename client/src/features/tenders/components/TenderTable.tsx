// src/features/tenders/components/TenderTable.tsx
import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  Container,
  Paper,
  Checkbox,
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Popover,
  Tooltip,
  CircularProgress,
  MenuItem,
  useTheme,
} from '@mui/material';
import { ArrowUpward, ArrowDownward, ColorLens, Edit as EditIcon, ViewColumn as ViewColumnIcon } from '@mui/icons-material';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { useDispatch, useSelector } from 'react-redux';
import { AutoSizer, Table as VirtualTable, Column, SortDirection, TableHeaderProps, TableCellProps } from 'react-virtualized';
import 'react-virtualized/styles.css';
import { RootState, AppDispatch } from 'app/store';
import { setVisibleColumns } from '../tendersSlice';
import TenderEditModal from './TenderEditModal';
import logger from 'utils/logger';

/**
 * Интерфейс тендера для таблицы.
 */
interface Tender {
  id: string;
  color_label?: string;
  note?: string;
  note_input?: string;
  end_date?: string;
  nmck?: string;
  winner_price?: string;
  total_amount?: string;
  platform_fee?: string;
  contract_security?: string;
  stage?: string;
  [key: string]: any;
}

/**
 * Интерфейс опции цвета для выбора метки.
 */
interface ColorOption {
  value: string;
  label: string;
}

/**
 * Пропсы для компонента TenderTable.
 * @property {string[]} selectedRows - Массив ID выбранных строк.
 * @property {(id: string) => void} handleRowSelect - Функция для выбора строки.
 * @property {(id: string, color: string | null) => void} handleColorLabelSelect - Функция для выбора цветовой метки.
 * @property {{ key: string; direction: 'asc' | 'desc' }} sortConfig - Конфигурация сортировки.
 * @property {(key: string) => void} handleSort - Функция для сортировки таблицы.
 * @property {{ [key: string]: string }} errors - Объект ошибок для ячеек.
 * @property {(id: string, note: string) => Promise<void>} handleUpdateNote - Функция для обновления заметки.
 * @property {Tender[]} tenders - Массив тендеров для отображения.
 * @property {Record<string, string>} colors - Объект цветов для меток (заменён ColorOption[] на объект).
 * @property {(message: string, severity: 'success' | 'error') => void} onNotify - Функция для отправки уведомлений.
 */
interface TenderTableProps {
  selectedRows: string[];
  handleRowSelect: (id: string) => void;
  handleColorLabelSelect: (id: string, color: string | null) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  handleSort: (key: string) => void;
  errors: { [key: string]: string };
  handleUpdateNote: (id: string, note: string) => Promise<void>;
  tenders: Tender[];
  colors: Record<string, string>;
  onNotify: (message: string, severity: 'success' | 'error') => void;
}

/**
 * Компонент таблицы тендеров с виртуализацией.
 * Отображает тендеры с возможностью сортировки, выбора строк, редактирования заметок и настройки колонок.
 */
const TenderTable: React.FC<TenderTableProps> = memo(
  ({ selectedRows, handleRowSelect, handleColorLabelSelect, sortConfig, handleSort, errors, handleUpdateNote, tenders, colors, onNotify }) => {
    const dispatch = useDispatch<AppDispatch>();
    const theme = useTheme();
    const visibleColumns = useSelector((state: RootState) => state.tenders.visibleColumns);
    const tendersLoading = useSelector((state: RootState) => state.tenders.loading);

    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
    const [editorStates, setEditorStates] = useState<{ [key: string]: EditorState }>({});
    const [isNoteModalOpen, setNoteModalOpen] = useState(false);
    const [currentTenderIdForNote, setCurrentTenderIdForNote] = useState<string | null>(null);
    const [anchorElColor, setAnchorElColor] = useState<HTMLElement | null>(null);
    const [currentTenderIdForColor, setCurrentTenderIdForColor] = useState<string | null>(null);
    const [anchorElColumns, setAnchorElColumns] = useState<HTMLElement | null>(null);

    const handleOpenEditModal = useCallback((tenderData: Tender) => {
      if (!tenderData) {
        logger.info('TenderTable: Попытка открыть модалку без данных тендера');
        onNotify('Нет данных тендера для редактирования', 'error');
        return;
      }
      logger.info('TenderTable: Открытие модалки для тендера', { id: tenderData.id });
      setSelectedTender(tenderData);
      setEditModalOpen(true);
    }, [onNotify]);

    const handleCloseEditModal = useCallback(() => {
      setEditModalOpen(false);
      setTimeout(() => setSelectedTender(null), 300);
    }, []);

    const handleNoteClick = useCallback((tenderId: string, noteContent?: string) => {
      setCurrentTenderIdForNote(tenderId);
      try {
        const contentState = noteContent ? convertFromRaw(JSON.parse(noteContent)) : EditorState.createEmpty().getCurrentContent();
        setEditorStates((prev) => ({ ...prev, [tenderId]: EditorState.createWithContent(contentState) }));
      } catch (e) {
        logger.error('TenderTable: Ошибка парсинга JSON заметки', e);
        setEditorStates((prev) => ({ ...prev, [tenderId]: EditorState.createEmpty() }));
        onNotify('Ошибка при загрузке заметки', 'error');
      }
      setNoteModalOpen(true);
    }, [onNotify]);

    const handleNoteChange = useCallback((newState: EditorState) => {
      if (currentTenderIdForNote) {
        setEditorStates((prev) => ({ ...prev, [currentTenderIdForNote]: newState }));
      }
    }, [currentTenderIdForNote]);

    const handleSaveNote = useCallback(async () => {
      if (!currentTenderIdForNote || !editorStates[currentTenderIdForNote]) return;
      const contentState = editorStates[currentTenderIdForNote].getCurrentContent();
      const noteJson = JSON.stringify(convertToRaw(contentState));
      try {
        await handleUpdateNote(currentTenderIdForNote, noteJson);
        onNotify('Заметка сохранена', 'success');
        setNoteModalOpen(false);
      } catch (error) {
        logger.error('TenderTable: Ошибка сохранения заметки', error);
        onNotify(`Ошибка сохранения заметки: ${(error as Error).message}`, 'error');
      }
    }, [currentTenderIdForNote, editorStates, handleUpdateNote, onNotify]);

    const handleColorLabelClick = useCallback((event: React.MouseEvent<HTMLElement>, tenderId: string) => {
      setAnchorElColor(event.currentTarget);
      setCurrentTenderIdForColor(tenderId);
    }, []);

    const handleColorLabelClose = useCallback(() => {
      setAnchorElColor(null);
      setCurrentTenderIdForColor(null);
    }, []);

    const handleColorSelect = useCallback(
      (color: string | null) => {
        if (currentTenderIdForColor) {
          handleColorLabelSelect(currentTenderIdForColor, color);
        }
        handleColorLabelClose();
      },
      [currentTenderIdForColor, handleColorLabelSelect, handleColorLabelClose]
    );

    const handleColumnsClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
      setAnchorElColumns(event.currentTarget);
    }, []);

    const handleColumnsClose = useCallback(() => {
      setAnchorElColumns(null);
    }, []);

    const handleColumnToggle = useCallback(
      (id: string) => {
        const updatedColumns = visibleColumns.map((col) =>
          col.id === id ? { ...col, visible: !col.visible } : col
        );
        dispatch(setVisibleColumns(updatedColumns));
        onNotify('Настройки колонок обновлены', 'success');
      },
      [visibleColumns, dispatch, onNotify]
    );

    const columns = useMemo(() => {
      const generatedColumns: React.ReactElement[] = [];

      // Колонка для кнопки редактирования
      generatedColumns.push(
        <Column
          key="edit"
          dataKey="id"
          width={50}
          disableSort
          headerRenderer={() => <EditIcon fontSize="small" sx={{ color: theme.palette.grey[500] }} />}
          cellRenderer={({ rowData }: TableCellProps) => (
            <IconButton size="small" onClick={() => handleOpenEditModal(rowData as Tender)} aria-label="Редактировать">
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          cellDataGetter={({ rowData }: { rowData: Tender }) => rowData.id} // Добавлен cellDataGetter
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          headerStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}
        />
      );

      // Колонка для выбора строк
      generatedColumns.push(
        <Column
          key="select"
          dataKey="id"
          width={50}
          disableSort
          headerRenderer={() => <Checkbox size="small" disabled />}
          cellRenderer={({ rowData }: TableCellProps) => (
            <Checkbox
              size="small"
              checked={selectedRows.includes((rowData as Tender).id)}
              onChange={() => handleRowSelect((rowData as Tender).id)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          cellDataGetter={({ rowData }: { rowData: Tender }) => rowData.id} // Добавлен cellDataGetter
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          headerStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}
        />
      );

      // Колонка для выбора цвета
      generatedColumns.push(
        <Column
          key="color_label"
          dataKey="color_label"
          width={50}
          disableSort
          headerRenderer={() => <ColorLens fontSize="small" sx={{ color: theme.palette.grey[500] }} />}
          cellRenderer={({ rowData }: TableCellProps) => (
            <IconButton size="small" onClick={(e) => handleColorLabelClick(e, (rowData as Tender).id)}>
              <ColorLens style={{ color: (rowData as Tender).color_label || '#bdbdbd' }} />
            </IconButton>
          )}
          cellDataGetter={({ rowData }: { rowData: Tender }) => rowData.color_label || ''} // Добавлен cellDataGetter
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          headerStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}
        />
      );

      // Генерация динамических колонок на основе visibleColumns
      visibleColumns
        .filter((col) => col.visible && col.id !== 'id')
        .forEach((column) => {
          generatedColumns.push(
            <Column
              key={column.id}
              label={column.label}
              dataKey={column.id}
              width={Math.max(column.label.length * 12, 150)}
              disableSort={false}
              headerRenderer={({ dataKey, label }: TableHeaderProps) => (
                <Box
                  component="div"
                  onClick={() => handleSort(dataKey)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { color: theme.palette.primary.main },
                    width: '100%',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                    {label}
                  </Typography>
                  {sortConfig.key === dataKey && (
                    <Tooltip title={`Сортировка по ${sortConfig.direction === 'asc' ? 'возрастанию' : 'убыванию'}`}>
                      {sortConfig.direction === 'asc' ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />}
                    </Tooltip>
                  )}
                </Box>
              )}
              cellDataGetter={({ rowData }: { rowData: Tender }) => rowData[column.id] ?? ''} // Добавлен cellDataGetter
              cellRenderer={({ cellData, rowData }: TableCellProps) => {
                const value = cellData ?? '';
                const tender = rowData as Tender;
                switch (column.id) {
                  case 'end_date':
                  case 'nmck':
                  case 'winner_price':
                  case 'total_amount':
                  case 'platform_fee':
                  case 'contract_security':
                  case 'unit_price':
                  case 'supplier_price':
                  case 'quantity':
                  case 'logistics':
                    return <Typography variant="body2" align="right">{formatNumberWithSpaces(value)}</Typography>;
                  case 'note_input':
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="body2" sx={{ flexGrow: 1, mr: 1 }} title={value || '-'}>
                          {value || '-'}
                        </Typography>
                        {tender.note && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNoteClick(tender.id, tender.note);
                            }}
                            sx={{ flexShrink: 0, p: '2px 4px', fontSize: '0.7rem' }}
                          >
                            См.
                          </Button>
                        )}
                      </Box>
                    );
                  case 'note':
                    return null;
                  case 'risk_card':
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="body2" sx={{ flexGrow: 1, mr: 1 }} title={value || '-'}>
                          {value || '-'}
                        </Typography>
                      </Box>
                    );
                  default:
                    return (
                      <Typography variant="body2" title={value}>
                        {value || '-'}
                      </Typography>
                    );
                }
              }}
              style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}
              headerStyle={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}
            />
          );
        });

      return generatedColumns;
    }, [
      visibleColumns,
      selectedRows,
      handleRowSelect,
      sortConfig,
      handleSort,
      handleOpenEditModal,
      handleColorLabelClick,
      handleNoteClick,
      errors,
      theme,
    ]);

    return (
      <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <IconButton onClick={handleColumnsClick} aria-label="Выбор колонок">
            <ViewColumnIcon />
          </IconButton>
          <Popover
            open={Boolean(anchorElColumns)}
            anchorEl={anchorElColumns}
            onClose={handleColumnsClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ p: 2, maxHeight: '400px', overflowY: 'auto' }}>
              {visibleColumns.map((col) => (
                <MenuItem key={col.id} onClick={() => handleColumnToggle(col.id)}>
                  <Checkbox checked={col.visible} />
                  <Typography>{col.label}</Typography>
                </MenuItem>
              ))}
            </Box>
          </Popover>
        </Box>
        <Paper
          sx={{
            flexGrow: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            border: '1px solid #eee',
            borderRadius: '8px',
            overflowX: 'auto',
            overflowY: 'auto',
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
          }}
        >
          {tenders.length > 0 && visibleColumns.length > 0 ? (
            <AutoSizer>
              {({ height, width }: { height: number; width: number }) => {
                const totalWidth = columns.reduce((sum, col) => sum + (col.props.width || 0), 0);
                return (
                  <VirtualTable
                    width={Math.max(totalWidth, width)} // Учитываем минимальную ширину колонок
                    height={height}
                    headerHeight={48}
                    rowHeight={45}
                    rowCount={tenders.length}
                    rowGetter={({ index }: { index: number }) => tenders[index] || {}}
                    sort={({ sortBy }: { sortBy: string }) => handleSort(sortBy)}
                    sortBy={sortConfig.key || undefined}
                    sortDirection={sortConfig.direction === 'asc' ? SortDirection.ASC : SortDirection.DESC}
                    onRowClick={({ rowData }: { rowData: Tender }) => handleOpenEditModal(rowData)}
                    rowClassName={({ index }: { index: number }) =>
                      index === -1 ? 'virtualizedTableHeader' : `virtualizedTableRow clickableRow ${index % 2 === 0 ? 'evenRow' : 'oddRow'}`
                    }
                    overscanRowCount={10}
                    noRowsRenderer={() => (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography>Нет тендеров для отображения</Typography>
                      </Box>
                    )}
                  >
                    {columns}
                  </VirtualTable>
                );
              }}
            </AutoSizer>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              {tendersLoading ? <CircularProgress /> : <Typography color="textSecondary">Нет данных для отображения...</Typography>}
            </Box>
          )}
        </Paper>
        {selectedTender && (
          <TenderEditModal
            open={isEditModalOpen}
            onClose={handleCloseEditModal}
            tenderData={selectedTender}
          />
        )}
        <Dialog open={isNoteModalOpen} onClose={() => setNoteModalOpen(false)} fullWidth maxWidth="md">
          <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#1976d2' }}>
            Редактировать заметку
          </DialogTitle>
          <DialogContent>
            <Editor
              editorState={editorStates[currentTenderIdForNote || ''] || EditorState.createEmpty()}
              onEditorStateChange={handleNoteChange}
              wrapperClassName="demo-wrapper"
              editorClassName="demo-editor"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNoteModalOpen(false)} sx={{ color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#1976d2' }}>
              Отмена
            </Button>
            <Button onClick={handleSaveNote} color="primary">
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
        <Popover
          open={Boolean(anchorElColor)}
          anchorEl={anchorElColor}
          onClose={handleColorLabelClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 150 }}>
            {Object.entries(colors).map(([key, value]) => (
              <IconButton
                key={key}
                onClick={() => handleColorSelect(value === '' ? null : value)}
                sx={{ backgroundColor: value || '#bdbdbd', width: 24, height: 24 }}
                title={key}
              />
            ))}
          </Box>
        </Popover>
      </Container>
    );
  }
);

TenderTable.displayName = 'TenderTable';

const formatNumberWithSpaces = (value?: string | number): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return isNaN(num) ? '-' : num.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
};

const styles = `
.virtualizedTableHeader {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.8rem;
  background-color: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
  color: #555;
}
.virtualizedTableRow {
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}
.virtualizedTableRow.clickableRow {
  cursor: pointer;
}
.virtualizedTableRow.clickableRow:hover {
  background-color: #f0f5f9;
}
.ReactVirtualized__Table__headerColumn,
.ReactVirtualized__Table__rowColumn {
  margin-right: 0;
  padding: 0 8px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}
.ReactVirtualized__Grid {
  overflow-x: auto !important;
  overflow-y: auto !important;
}
.ReactVirtualized__Grid::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.ReactVirtualized__Grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}
.ReactVirtualized__Grid::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 6px;
  border: 2px solid #f1f1f1;
}
.ReactVirtualized__Grid::-webkit-scrollbar-thumb:hover {
  background: #555;
}
@media (prefers-color-scheme: dark) {
  .virtualizedTableHeader {
    background-color: #2e2e2e;
    border-bottom: 1px solid #444;
    color: #e0e0e0;
  }
  .virtualizedTableRow {
    border-bottom: 1px solid #444;
  }
  .virtualizedTableRow.clickableRow:hover {
    background-color: #3e3e3e;
  }
  .ReactVirtualized__Grid::-webkit-scrollbar-track {
    background: #2e2e2e;
  }
  .ReactVirtualized__Grid::-webkit-scrollbar-thumb {
    background: #666;
    border: 2px solid #2e2e2e;
  }
  .ReactVirtualized__Grid::-webkit-scrollbar-thumb:hover {
    background: #888;
  }
}
`;

const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default TenderTable;