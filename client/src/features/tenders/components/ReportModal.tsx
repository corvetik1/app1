// src/features/tenders/components/ReportModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  IconButton,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  Typography,
  Button,
  Fade,
  TextField,
  CircularProgress,
  TablePagination,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { styled, keyframes } from '@mui/system';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';
import logger from '../../../utils/logger';
import { Tender } from '../tendersSlice';

const highlight = keyframes`
  0% { background-color: #e0f7fa; }
  100% { background-color: transparent; }
`;

const StyledTableRow = styled(TableRow)<{ isHighlighted: boolean }>`
  ${({ isHighlighted }) => isHighlighted && `animation: ${highlight} 2s ease-out;`}
  &:hover {
    background-color: #f5f5f5;
  }
`;

const StyledTableCell = styled(TableCell)`
  padding: 8px;
  font-size: 0.875rem;
`;

const StyledTableHeadCell = styled(TableCell)`
  padding: 8px;
  font-weight: bold;
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
`;

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  handleCellChange: (id: string, field: string, value: any) => Promise<void>;
  handleNoteClick: (note: string) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ open, onClose, handleCellChange, handleNoteClick }) => {
  const theme = useTheme();
  const allTenders = useSelector((state: RootState) => Object.values(state.tenders.tenders.byId) as Tender[]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());
  const [loadingExport, setLoadingExport] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [displayedTenders, setDisplayedTenders] = useState<Tender[]>([]);

  const processedTenders = useMemo(() => {
    let filtered = allTenders;
    if (stageFilter) {
      filtered = filtered.filter((tender) => tender.stage === stageFilter);
    }
    if (searchQuery) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tender) =>
          (tender.note_input || '').toLowerCase().includes(lowerSearchQuery) ||
          (tender.customer_name || '').toLowerCase().includes(lowerSearchQuery) ||
          (tender.customer_region || '').toLowerCase().includes(lowerSearchQuery) ||
          (tender.supplier_name || '').toLowerCase().includes(lowerSearchQuery)
      );
    }
    return filtered;
  }, [allTenders, stageFilter, searchQuery]);

  const paginatedTenders = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return processedTenders.slice(startIndex, startIndex + rowsPerPage);
  }, [processedTenders, page, rowsPerPage]);

  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
        return;
      }

      const realSourceIndex = page * rowsPerPage + source.index;
      const realDestinationIndex = page * rowsPerPage + destination.index;

      const items = Array.from(displayedTenders);
      const [reorderedItem] = items.splice(realSourceIndex, 1);
      items.splice(realDestinationIndex, 0, reorderedItem);

      setDisplayedTenders(items);
      setHighlightedRows(new Set([reorderedItem.id.toString()]));
      setTimeout(() => setHighlightedRows(new Set()), 2000);

      logger.info('handleDragEnd: Локальный порядок изменен (оптимистично)');
    },
    [displayedTenders, page, rowsPerPage]
  );

  const handleCellChangeWithHighlight = useCallback(
    async (id: string, field: string, value: any) => {
      try {
        await handleCellChange(id, field, value);
        setHighlightedRows((prev) => new Set(prev).add(id));
        setTimeout(() =>
          setHighlightedRows((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          }),
          2000
        );
      } catch (error) {
        logger.error('Ошибка при обновлении ячейки:', { id, field, value, error });
      }
    },
    [handleCellChange]
  );

  const handleExportToExcel = useCallback(() => {
    if (!processedTenders || processedTenders.length === 0) {
      logger.info('handleExportToExcel: Нет данных для экспорта');
      return;
    }
    setLoadingExport(true);
    try {
      const headers = ['Этап', 'Предмет закупки', 'Номер закупки', 'Название заказчика', 'Дата окончания', 'Цена победителя'];
      const data = processedTenders.map((tender) => [
        tender.stage,
        tender.note_input || '',
        tender.purchase_number || '',
        tender.customer_name || '',
        tender.end_date || '',
        tender.winner_price || '',
      ]);
      const exportData = [headers, ...data];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Тендеры');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, 'Report_Tenders.xlsx');
      logger.info('handleExportToExcel: Экспорт в Excel успешно завершен');
    } catch (error) {
      logger.error('handleExportToExcel: Ошибка при экспорте:', error);
    } finally {
      setLoadingExport(false);
    }
  }, [processedTenders]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth TransitionComponent={Fade} TransitionProps={{ timeout: 400 }}>
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.grey[200]}` }}>
        <Typography variant="h5">Отчет по тендерам</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 4, backgroundColor: '#f9fafb' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, заказчику..."
            size="small"
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as string)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">Все активные этапы</MenuItem>
              <MenuItem value="Победил ИП">Победил ИП</MenuItem>
              <MenuItem value="Подписание контракта">Подписание контракта</MenuItem>
              <MenuItem value="Исполнение">Исполнение</MenuItem>
              <MenuItem value="Ожидание оплаты">Ожидание оплаты</MenuItem>
              <MenuItem value="Исполнено">Исполнено</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={loadingExport ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
            onClick={handleExportToExcel}
            disabled={loadingExport || processedTenders.length === 0}
          >
            Экспорт в Excel
          </Button>
        </Box>
        <DragDropContext onDragEnd={handleDragEnd}>
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <StyledTableHeadCell>Этап</StyledTableHeadCell>
                  <StyledTableHeadCell>Предмет закупки</StyledTableHeadCell>
                  <StyledTableHeadCell>Номер закупки</StyledTableHeadCell>
                  <StyledTableHeadCell>Название заказчика</StyledTableHeadCell>
                  <StyledTableHeadCell>Дата окончания</StyledTableHeadCell>
                  <StyledTableHeadCell>Цена победителя</StyledTableHeadCell>
                  <StyledTableHeadCell>Заметка</StyledTableHeadCell>
                </TableRow>
              </TableHead>
              <Droppable droppableId="report-tenders">
                {(provided) => (
                  <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                    {paginatedTenders.map((tender, index) => (
                      <Draggable key={tender.id.toString()} draggableId={tender.id.toString()} index={index}>
                        {(providedDraggable) => (
                          <StyledTableRow
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            isHighlighted={highlightedRows.has(tender.id.toString())}
                          >
                            <StyledTableCell>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={tender.stage || 'Победил ИП'}
                                  onChange={(e) => handleCellChangeWithHighlight(tender.id.toString(), 'stage', e.target.value)}
                                >
                                  <MenuItem value="Победил ИП">Победил ИП</MenuItem>
                                  <MenuItem value="Подписание контракта">Подписание контракта</MenuItem>
                                  <MenuItem value="Исполнение">Исполнение</MenuItem>
                                  <MenuItem value="Ожидание оплаты">Ожидание оплаты</MenuItem>
                                  <MenuItem value="Исполнено">Исполнено</MenuItem>
                                </Select>
                              </FormControl>
                            </StyledTableCell>
                            <StyledTableCell>{tender.note_input || 'Без названия'}</StyledTableCell>
                            <StyledTableCell>{tender.purchase_number || '-'}</StyledTableCell>
                            <StyledTableCell>{tender.customer_name || '-'}</StyledTableCell>
                            <StyledTableCell>{tender.end_date || '-'}</StyledTableCell>
                            <StyledTableCell>{tender.winner_price || '-'}</StyledTableCell>
                            <StyledTableCell>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleNoteClick(tender.note || '')}
                                disabled={!tender.note}
                              >
                                Просмотр
                              </Button>
                            </StyledTableCell>
                          </StyledTableRow>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {paginatedTenders.length === 0 && processedTenders.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="textSecondary">Тендеры не найдены по текущим фильтрам.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                )}
              </Droppable>
            </Table>
          </TableContainer>
        </DragDropContext>
        {processedTenders.length === 0 && !searchQuery && !stageFilter && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="textSecondary">
              Нет данных для отображения
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.grey[400], mt: 1 }}>
              Выберите этап для отображения тендеров
            </Typography>
          </Box>
        )}
        {processedTenders.length > rowsPerPage && (
          <TablePagination
            component="div"
            count={processedTenders.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;