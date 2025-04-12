// src/features/finance/components/FinanceStyles.tsx
import { styled, Theme } from '@mui/system';
import {
  Box,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Typography,
  Dialog,
  ListItem,
  ListItemProps,
  ButtonProps,
} from '@mui/material';

// Обёртка страницы с градиентным фоном
export const FinancePageWrapper = styled(Box)({
  background: 'linear-gradient(135deg, #e0f7fa, #f3e5f5)',
  minHeight: '100vh',
  fontFamily: "'Montserrat', sans-serif",
  margin: 0,
  padding: '20px',
});

// Основной контейнер
export const FinancePageContainer = styled(Box)({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '20px',
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  position: 'relative',
});

// Стили для шапки (Summary и Top Actions)
export const SummaryContainer = styled(Box)({
  display: 'flex',
  gap: '20px',
  flexWrap: 'wrap',
});

export const SummaryItem = styled(Box)({
  background: 'linear-gradient(135deg, #ffffff, #e0f7fa)',
  borderRadius: '10px',
  padding: '10px 15px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  minWidth: '120px',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  '& p': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '0.9rem',
    color: '#424242',
    fontWeight: 400,
    margin: 0,
  },
  '& p.amount': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1.1rem',
    color: '#1976d2',
    fontWeight: 600,
  },
});

export const TopActions = styled(Box)({
  display: 'flex',
  gap: '15px',
});

export const TopActionButton = styled(Button)({
  padding: '10px 20px',
  borderRadius: '10px',
  background: 'linear-gradient(45deg, #4caf50, #81c784)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontFamily: "'Poppins', sans-serif",
  fontSize: '1rem',
  fontWeight: 500,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  textTransform: 'none',
  '&:hover': {
    background: 'linear-gradient(45deg, #388e3c, #66bb6a)',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
    transform: 'translateY(-2px)',
  },
});

// Декоративные элементы
export const DecorLine = styled(Box)({
  position: 'absolute',
  width: '150px',
  height: '2px',
  background: 'linear-gradient(90deg, #80deea, transparent)',
  top: '10px',
  left: '20px',
  zIndex: -1,
});

export const DecorDots = styled(Box)({
  position: 'absolute',
  width: '10px',
  height: '10px',
  background: '#b39ddb',
  borderRadius: '50%',
  bottom: '20px',
  right: '20px',
  boxShadow: '20px -20px 0 #80deea, -20px 20px 0 #ce93d8',
});

// Заголовки
export const SectionTitle: StyledComponent<{}, { variant?: 'h1' | 'h2' | 'h3' }, { theme: Theme }> = styled(Typography)(
  ({ theme, variant }: { theme: Theme; variant?: 'h1' | 'h2' | 'h3' }) => ({
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 600,
    color: '#1976d2',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
    ...(variant === 'h1' && { fontSize: '2rem' }),
    ...(variant === 'h2' && { fontSize: '1.5rem' }),
    ...(variant === 'h3' && { fontSize: '1.2rem' }),
    [theme.breakpoints.down('sm')]: {
      fontSize: variant === 'h1' ? '1.5rem' : variant === 'h2' ? '1.3rem' : '1rem',
    },
  })
);

// Стили для блока сумм счетов
export const AccountsSummary = styled(Box)({
  display: 'flex',
  gap: '15px',
  marginBottom: '15px',
  flexWrap: 'wrap',
  justifyContent: 'center',
});

export const AccountsSummaryItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: '10px 15px',
  background: '#fff',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  minWidth: '220px',
  borderLeft: '4px solid',
  '&.debit': { borderLeftColor: '#4caf50' },
  '&.credit': { borderLeftColor: '#f44336' },
  '&.loan': { borderLeftColor: '#7e57c2' },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
  },
  '& p': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1rem',
    color: '#424242',
    fontWeight: 400,
    margin: 0,
  },
  '& p.label': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '0.85rem',
    color: '#424242',
    fontWeight: 500,
  },
  '& p.amount': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1.1rem',
    color: '#1976d2',
    fontWeight: 600,
  },
});

// Стили для таблицы долгов
export const DebtTableContainer = styled(Box)({
  marginTop: '20px',
});

export const DebtTableStyled = styled(Table)({
  width: '100%',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  background: '#fff',
  '& th, & td': {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '1rem',
    fontWeight: 400,
  },
  '& tr:last-child': {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: '1rem',
  },
});

export const DebtTableHead = styled(TableHead)({
  background: '#e3f2fd',
});

export const DebtTableRow = styled(TableRow)({
  transition: 'background 0.3s',
  '&:hover': {
    background: '#f5f5f5',
  },
});

export const DebtTableCell = styled(TableCell)({
  padding: '12px',
});

// Стили для формы добавления операций
export const TransactionFormContainer = styled(Box)({
  padding: '20px',
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  margin: '20px 0',
  '& .MuiTextField-root, & .MuiFormControl-root': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1rem',
    fontWeight: 400,
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      '& fieldset': {
        border: '1px solid #b0bec5',
      },
      '& input, & select': {
        padding: '10px',
        fontFamily: "'Poppins', sans-serif",
        fontSize: '1rem',
        fontWeight: 400,
      },
    },
  },
});

// Стили для кнопок
export const StyledButton = styled(Button)({
  marginTop: '15px',
  padding: '10px 20px',
  borderRadius: '8px',
  background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  fontFamily: "'Poppins', sans-serif",
  fontSize: '0.85rem',
  fontWeight: 400,
  textTransform: 'none',
  '&:hover': {
    background: 'linear-gradient(45deg, #1565c0, #2196f3)',
    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
  },
  '&.add-btn': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1rem',
    fontWeight: '400',
    color: '#fff',
  },
});

// Стили для кнопки "Отмена" в диалогах
export const CancelButton = styled(Button)({
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #b0bec5',
  background: 'none',
  color: '#424242',
  fontFamily: "'Poppins', sans-serif",
  fontSize: '0.85rem',
  fontWeight: 400,
  textTransform: 'none',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: '#f5f5f5',
  },
});

// Стили для карточек счетов (AccountCards)
export const AccountCard = styled(Box)({
  background: 'linear-gradient(135deg, #ffffff, #e0f7fa)',
  borderRadius: '16px',
  boxShadow: '0 6px 15px rgba(0, 0, 0, 0.1)',
  padding: '20px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  },
  '& .decor-pattern': {
    position: 'absolute',
    top: '-20px',
    right: '-20px',
    width: '80px',
    height: '80px',
    background: 'radial-gradient(circle, #80deea 10%, transparent 10%)',
    backgroundSize: '10px 10px',
    opacity: 0.2,
  },
  '& .card-header': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  '& .card-title': {
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1.2rem',
    color: '#1976d2',
    fontWeight: 500,
    cursor: 'pointer',
    '&:hover': { color: '#1565c0' },
  },
  '& .edit-input': {
    display: 'block',
    width: '100%',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #b0bec5',
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1.2rem',
    color: '#1976d2',
    fontWeight: 400,
  },
  '& .card-actions': {
    display: 'flex',
    gap: '10px',
    '& span': {
      fontFamily: "'Montserrat', sans-serif",
      fontSize: '1.2rem',
      fontWeight: 400,
      cursor: 'pointer',
      transition: 'color 0.3s ease, transform 0.3s ease',
    },
    '& .expand-btn': {
      color: '#42a5f5',
      '&:hover': {
        transform: 'rotate(180deg)',
        cursor: 'pointer',
      },
    },
    '& .delete-btn': {
      color: '#f44336',
      '&:hover': {
        color: '#d32f2f',
      },
    },
  },
  '& .card-balance': {
    fontFamily: 'Montserrat',
    fontSize: '1.4rem',
    color: '#4caf50',
    fontWeight: 600,
    marginBottom: '15px',
  },
  '& .card-info': {
    display: 'grid',
    gap: '5px 10px',
    gridTemplateColumns: '1fr 1fr',
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '0.9rem',
    color: '#424242',
    fontWeight: 400,
    marginBottom: '1rem',
    '& .highlight': {
      fontSize: '1.1rem',
      fontWeight: 600,
    },
    '& .balance': {
      color: '#4caf50',
    },
    '& .debt': {
      color: '#f44336',
    },
    '& .due-date': {
      color: '#757575',
      fontStyle: 'italic',
    },
  },
  '& .month': {
    marginBottom: '10px',
  },
  '& .month-header': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    '&:hover': {
      background: 'rgba(224, 247, 250, 0.9)',
    },
    '& span': {
      fontFamily: "'Montserrat', sans-serif",
      fontSize: '1rem',
      color: '#1976d2',
      fontWeight: 400,
      transition: 'transform 0.3s ease',
    },
  },
  '& .month-title': {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1rem',
    color: '#424242',
    fontWeight: 500,
    margin: 0,
  },
  '& .transactions': {
    padding: '10px 0',
  },
  '& .transaction': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '10px',
    marginBottom: '6px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
    transition: 'background 0.3s ease',
    '&:hover': {
      background: 'rgba(224, 247, 250, 0.9)',
    },
  },
  '& .transaction-info': {
    flexGrow: 1,
  },
  '& .transaction-amount': {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  '& .transaction-amount.income': {
    color: '#4caf50',
  },
  '& .transaction-amount.expense': {
    color: '#f44336',
  },
  '& .transaction-desc': {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '0.85rem',
    color: '#757575',
    fontWeight: 400,
    margin: 0,
  },
  '& .transaction-date': {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '0.75rem',
    color: '#b0bec5',
    fontWeight: 400,
    margin: 0,
  },
});

// Стили для диалогов
export const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: 'none', // Убрали тень
    width: '400px', // Ширина 400px, как в HTML
    padding: '10px', // Уменьшили padding
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    margin: 0, // Убираем любые внешние отступы
  },
  '& .MuiDialog-container': {
    background: 'unset', // Полностью убираем фон, чтобы не было серого затемнения
    backdropFilter: 'none', // Убираем любые эффекты затемнения
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  '& .dialog': {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: 'none', // Убрали тень
    padding: '10px', // Уменьшили padding с 20px до 10px
    width: '100%', // Форма занимает всю доступную ширину контейнера (400px)
    position: 'relative',
    boxSizing: 'border-box', // Учитываем padding в ширине
  },
  '& .decor-line': {
    position: 'absolute',
    width: '120px',
    height: '2px',
    background: 'linear-gradient(90deg, #80deea, transparent)',
    bottom: '10px',
    right: '20px',
  },
  '& h3': {
    textAlign: 'center',
    color: '#1976d2',
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 600,
    marginBottom: '20px',
    // Размер шрифта не указан явно, используется значение браузера по умолчанию для <h3> (~19.2px)
  },
  '& .form-field': {
    position: 'relative',
    marginBottom: '20px', // Отступ между полями
  },
  '& label': {
    position: 'absolute',
    top: '-10px', // Подпись на верхней границе поля
    left: '10px', // Отступ слева
    background: '#fff', // Фон подписи совпадает с фоном формы
    padding: '0 5px', // Отступы внутри подписи
    fontFamily: "'Poppins', sans-serif",
    fontSize: '0.9rem', // Меньший размер шрифта для подписи
    color: '#757575', // Серый цвет для подписи
    fontWeight: 500,
    transition: 'all 0.2s ease', // Плавный переход для эффекта
  },
  '& input': {
    width: '100%',
    padding: '10px',
    margin: 0, // Убрали margin, так как теперь есть .form-field
    borderRadius: '8px',
    border: '1px solid #b0bec5',
    fontFamily: "'Poppins', sans-serif",
    boxSizing: 'border-box',
    // Размер шрифта не указан явно, используется значение браузера по умолчанию (16px)
    // Вес шрифта не указан, используется по умолчанию (400)
  },
  '& .date-input': {
    width: '100%',
    padding: '10px',
    margin: 0, // Убрали margin, так как теперь есть .form-field
    borderRadius: '8px',
    border: '1px solid #b0bec5',
    fontFamily: "'Poppins', sans-serif",
    boxSizing: 'border-box',
    // Размер шрифта не указан явно, используется значение браузера по умолчанию (16px)
    // Вес шрифта не указан, используется по умолчанию (400)
  },
  '& .buttons': {
    textAlign: 'right',
    marginTop: '20px',
  },
  '& button': {
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    // Шрифт наследуется от body ('Montserrat', sans-serif)
    // Размер шрифта не указан явно, используется значение браузера по умолчанию (16px)
    // Вес шрифта не указан, используется по умолчанию (400)
  },
  '& .cancel-btn': {
    border: '1px solid #b0bec5',
    background: 'none',
    marginRight: '10px',
    // Цвет текста не указан, используется по умолчанию (обычно #000)
  },
  '& .save-btn': {
    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
    color: '#fff',
    border: 'none',
    '&:hover': {
      background: 'linear-gradient(45deg, #1565c0, #2196f3)',
      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
    },
  },
});