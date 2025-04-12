import { create } from 'zustand';
import { Account } from '../financeSlice';

interface FinanceState {
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  accounts: [],
  setAccounts: (accounts) => set({ accounts }),
})); 