import { RootState } from '../../app/store';

export const selectWelcomeMessage = (state: RootState): string => state.home.welcomeMessage;