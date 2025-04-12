// src/features/tenders/components/TenderFilters.tsx
import React, { useCallback } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../app/store';
import { setSelectedStages } from '../tendersSlice';
import logger from '../../../utils/logger'; // Исправлен импорт на default

/**
 * Компонент фильтров для тендеров.
 * Позволяет пользователю выбирать этапы тендеров для фильтрации отображаемых данных.
 */
const TenderFilters: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedStages = useSelector((state: RootState) => state.tenders.selectedStages);

  /**
   * Обработчик изменения выбранных этапов фильтрации.
   * @param {React.MouseEvent<HTMLElement>} event - Событие клика на кнопке фильтра.
   * @param {string[]} newStages - Новый массив выбранных этапов.
   */
  const handleStageFilterChange = useCallback(
    (event: React.MouseEvent<HTMLElement>, newStages: string[]) => {
      dispatch(setSelectedStages(newStages));
      logger.debug('Фильтр по этапам изменён:', newStages);
    },
    [dispatch]
  );

  return (
    <ToggleButtonGroup
      value={selectedStages}
      onChange={handleStageFilterChange}
      aria-label="stage filters"
      sx={{ mb: 2, flexWrap: 'wrap' }}
    >
      <ToggleButton value="Подал ИП" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Подал ИП
      </ToggleButton>
      <ToggleButton value="Подал ТА" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Подал ТА
      </ToggleButton>
      <ToggleButton value="Просчет ИП" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Просчет ИП
      </ToggleButton>
      <ToggleButton value="Победил ИП" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Победил ИП
      </ToggleButton>
      <ToggleButton value="Подписание контракта" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Подписание контракта
      </ToggleButton>
      <ToggleButton value="Исполнение" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Исполнение
      </ToggleButton>
      <ToggleButton value="Ожидание оплаты" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Ожидание оплаты
      </ToggleButton>
      <ToggleButton value="Исполнено" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Исполнено
      </ToggleButton>
      <ToggleButton value="Проиграл ИП" sx={{ fontSize: '0.8rem', padding: '5px 10px' }}>
        Проиграл ИП
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default TenderFilters;