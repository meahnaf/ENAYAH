import api from './api';
import { Transaction } from '../types';

export const transactionService = {
  async getTransactions(skip?: number, limit?: number): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/transactions/', { params: { skip, limit } });
    return response.data;
  },

  async getPalletTransactions(palletId: number): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>(`/transactions/pallet/${palletId}`);
    return response.data;
  },

  async getUserTransactions(userId: number, skip?: number, limit?: number): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>(`/transactions/user/${userId}`, { params: { skip, limit } });
    return response.data;
  },
};
