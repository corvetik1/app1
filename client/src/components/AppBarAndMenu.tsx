import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  AccountBalance as AccountBalanceIcon,
  BarChart as BarChartIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  Note as NoteIcon,
  AccountCircle,
  AdminPanelSettings as AdminIcon,
  Photo as GalleryIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import logger from '../utils/logger';
import { RootState } from '../app/store';

interface AuthState {
  isAuthenticated: boolean;
  user?: {
    username: string;
  };
}

interface AppBarAndMenuProps {
  onLogout: () => Promise<void>;
}

const AppBarAndMenu: React.FC<AppBarAndMenuProps> = React.memo(({ onLogout }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth || {}) as AuthState;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const token = localStorage.getItem('token');
  const decodedToken = useMemo(() => {
    try {
      return token ? JSON.parse(atob(token.split('.')[1])) : {};
    } catch (error) {
      const err = error as Error;
      logger.error('Ошибка декодирования токена:', err.message);
      return {};
    }
  }, [token]);
  const userRole = decodedToken.role || 'user';
  const isAdmin = userRole === 'admin';

  const t = {
    home: 'Главная',
    tenders: 'Тендеры',
    finance: 'Финансы',
    analytics: 'Аналитика',
    accounting: 'Бухгалтерия',
    investments: 'Инвестиции',
    notes: 'Заметки',
    admin: 'Админка',
    gallery: 'Галерея',
    logout: 'Выйти',
  };

  const menuItems = useMemo(
    () => [
      { label: t.home, path: '/home', icon: <HomeIcon />, pageId: 'home' },
      { label: t.tenders, path: '/tenders', icon: <GavelIcon />, pageId: 'tenders' },
      { label: t.finance, path: '/finance', icon: <AccountBalanceIcon />, pageId: 'finance' },
      { label: t.analytics, path: '/analytics', icon: <BarChartIcon />, pageId: 'analytics' },
      { label: t.accounting, path: '/accounting', icon: <ReceiptIcon />, pageId: 'accounting' },
      { label: t.investments, path: '/investments', icon: <TrendingUpIcon />, pageId: 'investments' },
      { label: t.notes, path: '/notes', icon: <NoteIcon />, pageId: 'notes' },
      { label: t.gallery, path: '/gallery', icon: <GalleryIcon />, pageId: 'gallery' },
      ...(isAdmin ? [{ label: t.admin, path: '/users', icon: <AdminIcon />, pageId: 'users' }] : []),
    ],
    [t, isAdmin]
  );

  const currentTabIndex = useMemo(() => {
    return menuItems.findIndex(item => item.path === location.pathname);
  }, [location.pathname, menuItems]);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
    logger.debug('Мобильное меню переключено:', !mobileMenuOpen);
  }, [mobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      logger.debug('Успешный выход из системы');
    } catch (error) {
      logger.error('Ошибка при выходе:', (error as Error).message);
    } finally {
      setIsLoggingOut(false);
    }
  }, [onLogout]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    const path = menuItems[newValue].path;
    navigate(path);
  }, [menuItems, navigate]);

  const handleMobileItemClick = useCallback((path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <Box>
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(45deg, #2E7D32 30%, #4CAF50 90%)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Toolbar sx={{ minHeight: '48px', padding: { xs: '0 8px', md: '0 16px' }, gap: '8px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleMobileMenuToggle}
              sx={{ display: { xs: 'block', md: 'none' } }}
              aria-label="Открыть мобильное меню"
            >
              <MenuIcon sx={{ fontSize: '1.2rem' }} />
            </IconButton>
            <Tabs
              value={currentTabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexGrow: 1,
                '& .MuiTabs-indicator': { backgroundColor: '#FF6D00', height: '2px', borderRadius: '2px 2px 0 0' },
              }}
              aria-label="Навигационное меню"
            >
              {menuItems.map((item, index) => (
                <Tab
                  key={item.path}
                  value={index}
                  icon={item.icon}
                  iconPosition="start"
                  label={item.label}
                  sx={{
                    minWidth: '80px',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    color: '#FFFFFF',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
                    '&.Mui-selected': { color: '#FFFFFF', backgroundColor: '#00C853' },
                  }}
                />
              ))}
            </Tabs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '6px', md: '12px' }, flexShrink: 0 }}>
              {isAuthenticated && user && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '16px',
                  }}
                >
                  <AccountCircle sx={{ color: '#FFFFFF', fontSize: '1.2rem' }} />
                  <Typography sx={{ color: '#FFFFFF', fontSize: '0.75rem' }}>
                    {user.username} ({userRole})
                  </Typography>
                </Box>
              )}
              {isAuthenticated && (
                <Button
                  color="inherit"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  sx={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    border: '1px solid #FFFFFF',
                  }}
                  aria-label={t.logout}
                >
                  {isLoggingOut ? (
                    <>
                      <CircularProgress size={12} color="inherit" />
                      {t.logout}...
                    </>
                  ) : (
                    t.logout
                  )}
                </Button>
              )}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: '250px',
            background: 'rgba(46, 125, 50, 0.9)',
            color: '#FFFFFF',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              sx={{
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  transform: 'translateX(4px)',
                  transition: 'all 0.2s ease',
                },
                backgroundColor: location.pathname === item.path ? '#00C853' : 'transparent',
                textDecoration: 'none',
                padding: '12px 16px',
                margin: '4px 8px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                '& .MuiListItemIcon-root': {
                  minWidth: '40px',
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.9rem',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                },
              }}
            >
              <ListItemIcon sx={{ color: '#FFFFFF' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
});

AppBarAndMenu.displayName = 'AppBarAndMenu';

export default AppBarAndMenu;