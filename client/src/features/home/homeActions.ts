// src/features/home/homeActions.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { homeService } from '../../services/homeService';

export const fetchHomeData = createAsyncThunk(
  'home/fetchHomeData',
  async (_, { rejectWithValue }) => {
    try {
      return await homeService.fetchHomeData();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Ошибка загрузки главной страницы';
      return rejectWithValue(message);
    }
  }
);
