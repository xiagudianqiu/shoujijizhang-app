
import { Transaction, AppSettings } from '../types';

const STORAGE_KEY = 'smartledger_transactions_v2';
const SETTINGS_KEY = 'smartledger_settings_v1';

export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error("Failed to save transactions locally", e);
  }
};

export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load transactions", e);
    return [];
  }
};

export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    // Default: Budget 5000 RMB, Sound ON, Haptics ON
    return data ? JSON.parse(data) : { monthlyBudget: 500000, soundEnabled: true, hapticsEnabled: true };
  } catch (e) {
    return { monthlyBudget: 500000, soundEnabled: true, hapticsEnabled: true };
  }
};
