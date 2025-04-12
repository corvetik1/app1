// src/features/tenders/components/TenderMenu.tsx
import React, { useCallback, useState } from 'react';
import { Button, Toolbar, Grid, CircularProgress, Tooltip } from '@mui/material';
import { FileUpload, FileDownload, Delete, Description, ViewColumn, CloudDownload } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ColumnSettingsModal from './ColumnSettingsModal';
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';
import logger from '../../../utils/logger';

/**
 * Пропсы для компонента TenderMenu.
 * @property {() => void} handleDeleteTender - Функция для удаления выбранных тендеров.
 * @property {(data: any[]) => void} handleLoadFromExcel - Функция для загрузки данных из Excel.
 * @property {() => void} handleExportToExcel - Функция для экспорта данных в Excel.
 * @property {() => void} handleCreateReport - Функция для создания отчета.
 * @property {() => void} handleLoadFromDB - Функция для загрузки данных из базы данных.
 * @property {(message: string, severity: 'success' | 'error') => void} onNotify - Функция для отправки уведомлений.
 */
interface TenderMenuProps {
  handleDeleteTender: () => void;
  handleLoadFromExcel: (data: any[]) => void;
  handleExportToExcel: () => void;
  handleCreateReport: () => void;
  handleLoadFromDB: () => void;
  onNotify: (message: string, severity: 'success' | 'error') => void;
}

/**
 * Компонент меню для управления тендерами.
 * Предоставляет кнопки для загрузки, экспорта, удаления и настройки отображения тендеров.
 */
const TenderMenu: React.FC<TenderMenuProps> = ({
  handleDeleteTender,
  handleLoadFromExcel,
  handleExportToExcel,
  handleCreateReport,
  handleLoadFromDB,
  onNotify,
}) => {
  const isLoading = useSelector((state: RootState) => state.tenders.loading);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false); // Индикатор загрузки файла

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  /**
   * Обработчик скачивания шаблона Excel.
   * Создаёт и сохраняет файл шаблона с заголовками для импорта тендеров.
   */
  const handleDownloadTemplate = useCallback(() => {
    try {
      const headers = [
        'Этап',
        'Предмет закупки',
        'Номер закупки',
        'Название площадки',
        'Площадки',
        'Регион заказчика',
        'Название заказчика',
        'Дата окончания',
        'Закон',
        'НМЦК',
        'Примечание',
        'Цена победителя',
        'Победитель',
        'Карта рисков',
        'Обеспечение контракта',
        'Комиссия площадки',
      ];
      const data = [headers];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      saveAs(blob, 'TenderTemplate.xlsx');
      logger.info('handleDownloadTemplate: Шаблон Excel успешно скачан');
      onNotify('Шаблон успешно скачан', 'success');
    } catch (error) {
      logger.error('handleDownloadTemplate: Ошибка при скачивании шаблона Excel:', error);
      onNotify('Ошибка при скачивании шаблона', 'error');
    }
  }, [onNotify]);

  /**
   * Обработчик загрузки файла Excel.
   * Проверяет размер файла и читает данные для передачи в handleLoadFromExcel.
   * @param {React.ChangeEvent<HTMLInputElement>} event - Событие изменения input элемента.
   */
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        logger.info('handleFileUpload: Файл не выбран');
        onNotify('Файл не выбран', 'error');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        const errorMsg = `Файл "${file.name}" слишком большой (${(file.size / (1024 * 1024)).toFixed(2)} МБ). Максимальный размер: ${MAX_FILE_SIZE_MB} МБ.`;
        logger.error('handleFileUpload: File size exceeds limit', {
          fileName: file.name,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE_BYTES,
        });
        onNotify(errorMsg, 'error');
        event.target.value = '';
        return;
      }

      setIsFileLoading(true);
      logger.info('handleFileUpload: Файл выбран');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          logger.info('handleFileUpload: Файл Excel успешно прочитан');
          handleLoadFromExcel(jsonData);
          onNotify('Файл успешно загружен', 'success');
        } catch (error) {
          logger.error('handleFileUpload: Ошибка при чтении файла Excel:', error);
          onNotify('Ошибка при чтении файла Excel', 'error');
        } finally {
          setIsFileLoading(false);
          event.target.value = '';
        }
      };
      reader.onerror = (error) => {
        logger.error('handleFileUpload: Ошибка FileReader:', error);
        onNotify('Не удалось прочитать файл', 'error');
        setIsFileLoading(false);
        event.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    },
    [handleLoadFromExcel, onNotify]
  );

  const menuButtons = [
    {
      id: 'loadDB',
      label: 'Загрузить из БД',
      icon: <CloudDownload />,
      onClick: handleLoadFromDB,
      style: { backgroundColor: '#1976D2' },
      disabled: isLoading,
      tooltip: 'Загрузить данные тендеров из базы данных',
    },
    {
      id: 'uploadExcel',
      label: 'Загрузить Excel',
      icon: isFileLoading ? <CircularProgress size={16} color="inherit" /> : <FileUpload />,
      onClick: () => document.getElementById('file-upload')?.click(),
      style: { backgroundColor: '#FF8F00' },
      disabled: isLoading || isFileLoading,
      tooltip: 'Загрузить данные тендеров из файла Excel',
    },
    {
      id: 'downloadTemplate',
      label: 'Шаблон Excel',
      icon: <FileDownload />,
      onClick: handleDownloadTemplate,
      style: { backgroundColor: '#FFA726' },
      disabled: isLoading,
      tooltip: 'Скачать шаблон Excel для импорта тендеров',
    },
    {
      id: 'exportExcel',
      label: 'Экспорт в Excel',
      icon: <FileDownload />,
      onClick: handleExportToExcel,
      style: { backgroundColor: '#388E3C' },
      disabled: isLoading,
      tooltip: 'Экспортировать текущие тендеры в Excel',
    },
    {
      id: 'createReport',
      label: 'Отчет',
      icon: <Description />,
      onClick: handleCreateReport,
      style: { backgroundColor: '#0288D1' },
      disabled: isLoading,
      tooltip: 'Создать отчет по тендерам',
    },
    {
      id: 'columnSettings',
      label: 'Колонки',
      icon: <ViewColumn />,
      onClick: () => setIsColumnSettingsOpen(true),
      style: { backgroundColor: '#757575' },
      disabled: isLoading,
      tooltip: 'Настроить видимость колонок таблицы',
    },
    {
      id: 'delete',
      label: 'Удалить тендер',
      icon: <Delete />,
      onClick: handleDeleteTender,
      style: { backgroundColor: '#D32F2F' },
      disabled: isLoading,
      tooltip: 'Удалить выбранные тендеры',
    },
  ];

  return (
    <>
      <Toolbar sx={{ padding: '8px', minHeight: 'auto', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: 2, flexWrap: 'wrap' }}>
        <Grid container spacing={1} alignItems="center">
          {menuButtons.map((button) => (
            <Grid item key={button.id}>
              <Tooltip title={button.tooltip} arrow>
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    fontSize: '0.8rem',
                    padding: '6px 10px',
                    whiteSpace: 'nowrap',
                    color: '#fff',
                    borderRadius: '4px',
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease',
                    ...button.style,
                    '&:disabled': {
                      backgroundColor: '#BDBDBD',
                      color: '#757575',
                      cursor: 'not-allowed',
                      boxShadow: 'none',
                    },
                    '&:hover:not(:disabled)': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
                    },
                  }}
                  startIcon={button.icon}
                  onClick={button.onClick}
                  disabled={button.disabled}
                >
                  {button.label}
                </Button>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
        <input id="file-upload" type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleFileUpload} />
      </Toolbar>
      <ColumnSettingsModal open={isColumnSettingsOpen} onClose={() => setIsColumnSettingsOpen(false)} />
    </>
  );
};

export default TenderMenu;