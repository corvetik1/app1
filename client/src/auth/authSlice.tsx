// src/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import logger from '../utils/logger';
import { login, refreshToken, checkAuth } from './authActions';

// Определение типа Ability для CASL
type AppAbility = Ability<[string, string]>;

/**
 * Интерфейс пользователя.
 */
interface User {
  id: number;
  username: string;
  role: string;
  permissions?: Array<{ action: string; subject: string }>;
}

/**
 * Интерфейс уведомления для Snackbar.
 */
interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

/**
 * Интерфейс темы приложения.
 */
interface ThemeState {
  text: string;
  secondaryBackground: string;
  chartStroke: string;
  positive: string;
  negative: string;
}

/**
 * Интерфейс состояния аутентификации.
 */
interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  role: string | null;
  userId: number | null;
  token: string | null;
  ability: AppAbility | null;
  permissions: {
    columnVisibility: boolean;
    exportToExcel: boolean;
    manageUsers: boolean;
    manageFinance: boolean;
    manageInvestments: boolean;
  };
  supplierSearchOpen: boolean;
  supplierSearchMinimized: boolean;
  error: string | null;
  loading: boolean;
  snackbar: SnackbarState;
  lastLogin: string | null;
  themeMode: 'light' | 'dark';
  theme: ThemeState;
  webSocketStatus: 'connected' | 'disconnected' | 'error' | 'failed';
}

/**
 * Начальное состояние для аутентификации.
 */
const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  role: null,
  userId: null,
  token: null,
  ability: null,
  permissions: {
    columnVisibility: false,
    exportToExcel: false,
    manageUsers: false,
    manageFinance: false,
    manageInvestments: false,
  },
  supplierSearchOpen: false,
  supplierSearchMinimized: false,
  error: null,
  loading: false,
  snackbar: {
    open: false,
    message: '',
    severity: 'info',
    duration: 6000,
  },
  lastLogin: null,
  themeMode: 'light',
  theme: {
    text: '#333',
    secondaryBackground: '#f5f5f5',
    chartStroke: '#555',
    positive: '#2e7d32',
    negative: '#d32f2f',
  },
  webSocketStatus: 'disconnected',
};

/**
 * Определение правил разрешений с использованием CASL.
 * @param {User} user - Данные пользователя.
 * @returns {AppAbility} Правила разрешений CASL.
 * @throws {Error} Если данные пользователя некорректны.
 */
const defineAbilitiesFor = (user: User): AppAbility => {
  const startTime = Date.now();
  logger.debug('defineAbilitiesFor: Начало определения разрешений для пользователя', { id: user.id, role: user.role });

  if (!user || typeof user.id !== 'number' || !user.role) {
    logger.error('defineAbilitiesFor: Некорректные данные пользователя', { user });
    throw new Error('Некорректные данные пользователя для определения разрешений');
  }

  const { can, cannot, build } = new AbilityBuilder(Ability as AbilityClass<AppAbility>);
  const userRole = user.role.toLowerCase();

  if (userRole === 'admin') {
    can('manage', 'all');
  } else if (userRole === 'user') {
    can(['read', 'create', 'update', 'delete'], 'Tender', { user_id: user.id });
    can('read', 'Account', { user_id: user.id });
    can(['read', 'create', 'update'], 'Transaction', { user_id: user.id });
    can(['read', 'create', 'update', 'delete'], 'Portfolio', { user_id: user.id });
    can(['read', 'create', 'update', 'delete'], 'Asset', { portfolio_id: { user_id: user.id } });
  } else {
    cannot('manage', 'all');
    logger.warn('defineAbilitiesFor: Неизвестная роль пользователя', { role: userRole });
  }

  if (Array.isArray(user.permissions)) {
    user.permissions.forEach((permission) => {
      if (permission.action && permission.subject) {
        can(permission.action, permission.subject);
      } else {
        logger.warn('defineAbilitiesFor: Некорректное разрешение', { permission });
      }
    });
  }

  const ability = build();
  logger.debug('defineAbilitiesFor: Разрешения определены', {
    rules: ability.rules,
    duration: `${Date.now() - startTime}ms`,
  });
  return ability;
};

/**
 * Slice для аутентификации с улучшенной обработкой состояния.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Начало запроса на вход.
     * @param state - Текущее состояние.
     */
    loginRequest: (state) => {
      logger.debug('loginRequest: Начало процесса входа');
      state.loading = true;
      state.error = null;
      state.snackbar = { ...state.snackbar, open: false };
    },

    /**
     * Успешный вход с обновлением состояния.
     * @param state - Текущее состояние.
     * @param action - Данные токена и пользователя.
     */
    loginSuccess: (state, action: PayloadAction<{ token: string; user: User }>) => {
      const { token, user } = action.payload;
      const userRole = user.role.toLowerCase();
      logger.info('loginSuccess: Успешный вход', {
        userId: user.id,
        username: user.username,
        role: userRole,
        tokenPreview: token.substring(0, 10) + '...',
      });

      state.isAuthenticated = true;
      state.currentUser = user.username;
      state.role = userRole;
      state.userId = user.id;
      state.token = token;
      state.ability = defineAbilitiesFor({ ...user, role: userRole });
      state.permissions = {
        columnVisibility: userRole === 'admin',
        exportToExcel: userRole === 'admin',
        manageUsers: userRole === 'admin',
        manageFinance: userRole === 'admin',
        manageInvestments: userRole === 'admin',
      };
      state.loading = false;
      state.error = null;
      state.lastLogin = new Date().toISOString();
      state.snackbar = {
        open: true,
        message: `Добро пожаловать, ${user.username}!`,
        severity: 'success',
        duration: 6000,
      };
    },

    /**
     * Ошибка входа.
     * @param state - Текущее состояние.
     * @param action - Текст ошибки.
     */
    loginFailure: (state, action: PayloadAction<string>) => {
      logger.error('loginFailure: Ошибка входа', { error: action.payload });
      state.loading = false;
      state.error = action.payload;
      state.snackbar = {
        open: true,
        message: action.payload || 'Ошибка входа',
        severity: 'error',
        duration: 6000,
      };
    },

    /**
     * Выход из системы с сохранением темы.
     * @param state - Текущее состояние.
     */
    logout: (state) => {
      logger.info('logout: Выход из системы, сброс состояния');
      return {
        ...initialState,
        snackbar: {
          ...initialState.snackbar,
          open: true,
          message: 'Вы успешно вышли из системы',
          severity: 'info',
          duration: 4000,
        },
        themeMode: state.themeMode,
        theme: state.theme,
      };
    },

    /**
     * Обновление профиля пользователя.
     * @param state - Текущее состояние.
     * @param action - Обновлённые данные пользователя.
     */
    updateProfile: (state, action: PayloadAction<User>) => {
      const updatedRole = action.payload.role ? action.payload.role.toLowerCase() : state.role;
      logger.info('updateProfile: Обновление профиля', { userId: action.payload.id, role: updatedRole });

      state.currentUser = action.payload.username || state.currentUser;
      state.role = updatedRole;
      state.userId = action.payload.id || state.userId;
      state.ability = defineAbilitiesFor({
        id: action.payload.id || state.userId!,
        role: updatedRole!,
        permissions: action.payload.permissions || state.ability?.rules.map((rule) => ({
          action: rule.action,
          subject: rule.subject,
        })),
      });
      state.permissions = {
        columnVisibility: updatedRole === 'admin',
        exportToExcel: updatedRole === 'admin',
        manageUsers: updatedRole === 'admin',
        manageFinance: updatedRole === 'admin',
        manageInvestments: updatedRole === 'admin',
      };
      state.snackbar = {
        open: true,
        message: 'Профиль успешно обновлён',
        severity: 'success',
        duration: 4000,
      };
    },

    /**
     * Очистка ошибки.
     * @param state - Текущее состояние.
     */
    clearError: (state) => {
      logger.debug('clearError: Очистка ошибки');
      state.error = null;
    },

    /**
     * Установка состояния поиска поставщиков.
     * @param state - Текущее состояние.
     * @param action - Флаг открытия поиска.
     */
    setSupplierSearchOpen: (state, action: PayloadAction<boolean>) => {
      logger.debug('setSupplierSearchOpen: Установка состояния поиска поставщиков', { open: action.payload });
      state.supplierSearchOpen = action.payload;
    },

    /**
     * Установка свёрнутости поиска поставщиков.
     * @param state - Текущее состояние.
     * @param action - Флаг свёрнутости.
     */
    setSupplierSearchMinimized: (state, action: PayloadAction<boolean>) => {
      logger.debug('setSupplierSearchMinimized: Установка свёрнутости поиска поставщиков', { minimized: action.payload });
      state.supplierSearchMinimized = action.payload;
    },

    /**
     * Обновление токена.
     * @param state - Текущее состояние.
     * @param action - Новый токен.
     */
    refreshTokenAction: (state, action: PayloadAction<string>) => {
      logger.info('refreshTokenAction: Обновление токена', { tokenPreview: action.payload.substring(0, 10) + '...' });
      state.token = action.payload;
      state.snackbar = {
        open: true,
        message: 'Токен успешно обновлён',
        severity: 'info',
        duration: 4000,
      };
    },

    /**
     * Установка уведомления в Snackbar.
     * @param state - Текущее состояние.
     * @param action - Данные уведомления.
     */
    setSnackbar: (state, action: PayloadAction<Partial<SnackbarState>>) => {
      logger.debug('setSnackbar: Установка уведомления', action.payload);
      state.snackbar = {
        ...state.snackbar,
        ...action.payload,
        open: true,
      };
    },

    /**
     * Очистка уведомления Snackbar.
     * @param state - Текущее состояние.
     */
    clearSnackbar: (state) => {
      logger.debug('clearSnackbar: Очистка уведомления');
      state.snackbar = { ...state.snackbar, open: false, message: '' };
    },

    /**
     * Установка статуса WebSocket.
     * @param state - Текущее состояние.
     * @param action - Статус и дополнительная информация.
     */
    setWebSocketStatus: (
      state,
      action: PayloadAction<{ status: AuthState['webSocketStatus']; error?: string; reason?: string }>
    ) => {
      logger.debug('setWebSocketStatus: Установка статуса WebSocket', action.payload);
      state.webSocketStatus = action.payload.status;
      state.snackbar = {
        open: true,
        message: `WebSocket: ${action.payload.status}${action.payload.error ? ` (${action.payload.error})` : ''}`,
        severity: action.payload.status === 'connected' ? 'success' : 'error',
        duration: 4000,
      };
    },

    /**
     * Установка режима темы и обновление стилей.
     * @param state - Текущее состояние.
     * @param action - Новый режим темы ('light' | 'dark').
     */
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      const newThemeMode = action.payload;
      logger.debug('setTheme: Установка режима темы', { themeMode: newThemeMode });

      state.themeMode = newThemeMode;
      state.theme = newThemeMode === 'dark'
        ? {
            text: '#fff',
            secondaryBackground: '#1E1E1E',
            chartStroke: '#b0bec5',
            positive: '#00C853',
            negative: '#D32F2F',
          }
        : {
            text: '#333',
            secondaryBackground: '#f5f5f5',
            chartStroke: '#555',
            positive: '#2e7d32',
            negative: '#d32f2f',
          };
      state.snackbar = {
        open: true,
        message: `Тема изменена на ${newThemeMode === 'dark' ? 'тёмную' : 'светлую'}`,
        severity: 'info',
        duration: 3000,
      };
    },
  },
  extraReducers: (builder) => {
    // login
    builder
      .addCase(login.pending, (state) => {
        logger.debug('login.pending: Начало процесса входа');
        state.loading = true;
        state.error = null;
        state.snackbar = { ...state.snackbar, open: false };
      })
      .addCase(login.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        const userRole = user.role.toLowerCase();
        logger.info('login.fulfilled: Успешный вход', {
          userId: user.id,
          username: user.username,
          role: userRole,
          tokenPreview: token.substring(0, 10) + '...',
        });

        state.isAuthenticated = true;
        state.currentUser = user.username;
        state.role = userRole;
        state.userId = user.id;
        state.token = token;
        state.ability = defineAbilitiesFor({ ...user, role: userRole });
        state.permissions = {
          columnVisibility: userRole === 'admin',
          exportToExcel: userRole === 'admin',
          manageUsers: userRole === 'admin',
          manageFinance: userRole === 'admin',
          manageInvestments: userRole === 'admin',
        };
        state.loading = false;
        state.error = null;
        state.lastLogin = new Date().toISOString();
        state.snackbar = {
          open: true,
          message: `Добро пожаловать, ${user.username}!`,
          severity: 'success',
          duration: 6000,
        };
      })
      .addCase(login.rejected, (state, action) => {
        logger.error('login.rejected: Ошибка входа', { error: action.payload });
        state.loading = false;
        state.error = action.payload as string;
        state.snackbar = {
          open: true,
          message: action.payload || 'Ошибка входа',
          severity: 'error',
          duration: 6000,
        };
      })

      // refreshToken
      .addCase(refreshToken.pending, (state) => {
        logger.debug('refreshToken.pending: Начало обновления токена');
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        logger.info('refreshToken.fulfilled: Токен обновлён', { tokenPreview: action.payload.substring(0, 10) + '...' });
        state.token = action.payload;
        state.loading = false;
        state.error = null;
        state.snackbar = {
          open: true,
          message: 'Токен успешно обновлён',
          severity: 'info',
          duration: 4000,
        };
      })
      .addCase(refreshToken.rejected, (state, action) => {
        logger.error('refreshToken.rejected: Ошибка обновления токена', { error: action.payload });
        state.loading = false;
        state.error = action.payload as string;
        state.snackbar = {
          open: true,
          message: 'Ошибка обновления токена',
          severity: 'error',
          duration: 6000,
        };
      })

      // checkAuth
      .addCase(checkAuth.pending, (state) => {
        logger.debug('checkAuth.pending: Начало проверки аутентификации');
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        const userRole = user.role.toLowerCase();
        logger.info('checkAuth.fulfilled: Аутентификация подтверждена', {
          userId: user.id,
          username: user.username,
          role: userRole,
          tokenPreview: token.substring(0, 10) + '...',
        });

        state.isAuthenticated = true;
        state.currentUser = user.username;
        state.role = userRole;
        state.userId = user.id;
        state.token = token;
        state.ability = defineAbilitiesFor({ ...user, role: userRole });
        state.permissions = {
          columnVisibility: userRole === 'admin',
          exportToExcel: userRole === 'admin',
          manageUsers: userRole === 'admin',
          manageFinance: userRole === 'admin',
          manageInvestments: userRole === 'admin',
        };
        state.loading = false;
        state.error = null;
        state.lastLogin = new Date().toISOString();
        state.snackbar = {
          open: true,
          message: `Аутентификация подтверждена, добро пожаловать, ${user.username}!`,
          severity: 'success',
          duration: 4000,
        };
      })
      .addCase(checkAuth.rejected, (state, action) => {
        logger.error('checkAuth.rejected: Ошибка проверки аутентификации', { error: action.payload });
        state.loading = false;
        state.error = action.payload as string;
        state.snackbar = {
          open: true,
          message: 'Ошибка проверки аутентификации',
          severity: 'error',
          duration: 6000,
        };
      });
  },
});

// Экспорт действий из slice
export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  updateProfile,
  clearError,
  setSupplierSearchOpen,
  setSupplierSearchMinimized,
  refreshTokenAction,
  setSnackbar,
  clearSnackbar,
  setWebSocketStatus,
  setTheme,
} = authSlice.actions;

// Экспорт редьюсера
export default authSlice.reducer;