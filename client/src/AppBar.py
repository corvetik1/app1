const AppBarAndMenu = ({ 
  setFileAnchorEl, 
  setActionsAnchorEl, 
  setSettingsAnchorEl, 
  setReportsAnchorEl, 
  setDocumentsAnchorEl, 
  setCompletedAnchorEl,
  handleAddRow,
  handleDeleteRow,
  handleDeleteAll,
  handleColumnSettings,
  handleCreateReport,
  handleUploadDocument,
  handleViewDocuments,
  handleSaveData,
  handleLoadFromExcel,
  handleExportToExcel,
  handleDuplicateRow
}) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button color="inherit" onClick={(e) => setFileAnchorEl(e.currentTarget)}>
            Файл
          </Button>
          <Menu
            anchorEl={fileAnchorEl}
            open={Boolean(fileAnchorEl)}
            onClose={() => setFileAnchorEl(null)}
          >
            <MenuItem onClick={() => setFileAnchorEl(null)}>
              <FileUpload sx={{ mr: 1 }} /> Импорт
            </MenuItem>
            <MenuItem onClick={() => setFileAnchorEl(null)}>
              <FileDownload sx={{ mr: 1 }} /> Экспорт
            </MenuItem>
          </Menu>
          <Button color="inherit" onClick={(e) => setActionsAnchorEl(e.currentTarget)}>
            Действия
          </Button>
          <Menu
            anchorEl={actionsAnchorEl}
            open={Boolean(actionsAnchorEl)}
            onClose={() => setActionsAnchorEl(null)}
          >
            <MenuItem onClick={handleAddRow}>
              <Add sx={{ mr: 1 }} /> Добавить тендер
            </MenuItem>
            <MenuItem onClick={handleDeleteRow}>
              <Delete sx={{ mr: 1 }} /> Удалить тендер
            </MenuItem>
            <MenuItem onClick={handleDeleteAll}>
              <Delete sx={{ mr: 1 }} /> Удалить все
            </MenuItem>
          </Menu>
          <Button color="inherit" onClick={(e) => setSettingsAnchorEl(e.currentTarget)}>
            Настройки
          </Button>
          <Menu
            anchorEl={settingsAnchorEl}
            open={Boolean(settingsAnchorEl)}
            onClose={() => setSettingsAnchorEl(null)}
          >
            <MenuItem onClick={handleColumnSettings}>Настройки столбцов</MenuItem>
            <MenuItem onClick={() => setSettingsAnchorEl(null)}>Настройки кнопок</MenuItem>
          </Menu>
          <Button color="inherit" onClick={(e) => setReportsAnchorEl(e.currentTarget)}>
            Отчеты
          </Button>
          <Menu
            anchorEl={reportsAnchorEl}
            open={Boolean(reportsAnchorEl)}
            onClose={() => setReportsAnchorEl(null)}
          >
            <MenuItem onClick={handleCreateReport}>
              <Description sx={{ mr: 1 }} /> Создать отчет
            </MenuItem>
          </Menu>
          <Button color="inherit" onClick={(e) => setDocumentsAnchorEl(e.currentTarget)}>
            Документы
          </Button>
          <Menu
            anchorEl={documentsAnchorEl}
            open={Boolean(documentsAnchorEl)}
            onClose={() => setDocumentsAnchorEl(null)}
          >
            <MenuItem onClick={handleUploadDocument}>
              <FileUpload sx={{ mr: 1 }} /> Загрузить документ
            </MenuItem>
            <MenuItem onClick={handleViewDocuments}>
              <Description sx={{ mr: 1 }} /> Просмотреть документы
            </MenuItem>
          </Menu>
          <Button color="inherit" onClick={(e) => setCompletedAnchorEl(e.currentTarget)}>
            Завершенные тендеры
          </Button>
          <Menu
            anchorEl={completedAnchorEl}
            open={Boolean(completedAnchorEl)}
            onClose={() => setCompletedAnchorEl(null)}
          >
            <MenuItem onClick={() => setCompletedAnchorEl(null)}>
              Просмотреть завершенные тендеры
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      <Toolbar sx={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd', padding: '8px' }}>
        <Grid container spacing={1} sx={{ padding: '0 8px' }}>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Add />}
              onClick={handleAddRow}
            >
              Добавить строку
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Delete />}
              onClick={handleDeleteRow}
            >
              Удалить строку
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Save />}
              onClick={handleSaveData}
            >
              Сохранить данные
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<FileUpload />}
              onClick={handleLoadFromExcel}
            >
              Загрузить из Excel
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Settings />}
              onClick={handleColumnSettings}
            >
              Настройка столбцов
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<ContentCopy />}
              onClick={handleDuplicateRow}
            >
              Дублировать строку
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Description />}
              onClick={handleCreateReport}
            >
              Создать отчет
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<FileUpload />}
              onClick={handleUploadDocument}
            >
              Загрузить документ
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Description />}
              onClick={handleViewDocuments}
            >
              Просмотреть документы
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<FileDownload />}
              onClick={handleExportToExcel}
            >
              Выгрузка в Excel
            </Button>
          </Grid>
          <Grid item xs>
            <Button
              variant="contained"
              size="small"
              sx={{ width: '100%', fontSize: '12px', whiteSpace: 'nowrap', padding: '6px 12px' }}
              startIcon={<Delete />}
              onClick={handleDeleteAll}
            >
              Удалить все
            </Button>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
};