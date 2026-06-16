import { create } from 'zustand';
import type { Transaction, SplitAccountDetail, MatchRecord } from '@/types';
import { transactionService, CreateManualTransactionParams } from '@/services/transactionService';

interface TransactionState {
  transactions: Transaction[];
  splitDetails: SplitAccountDetail[];
  loading: boolean;
  error: string | null;
}

interface TransactionActions {
  setTransactions: (transactions: Transaction[]) => void;
  setSplitDetails: (details: SplitAccountDetail[]) => void;
  addTransaction: (transaction: Transaction, splitDetails?: SplitAccountDetail[]) => void;
  createTransactionFromMatch: (matchRecord: MatchRecord, sellerTotalSales: number) => {
    transaction: Transaction;
    splitDetails: SplitAccountDetail[];
  };
  createManualTransactionFromForm: (params: CreateManualTransactionParams) => {
    transaction: Transaction;
    splitDetails: SplitAccountDetail[];
  };
  createRefund: (transactionId: string) => Transaction | null;
  getTransactionById: (id: string) => Transaction | undefined;
  getSplitDetailsByTransactionId: (transactionId: string) => SplitAccountDetail[];
  getTransactionsBySeller: (sellerId: string) => Transaction[];
  getTransactionsByBuyer: (buyerId: string) => Transaction[];
  getMonthlyTransactions: (month: string) => Transaction[];
  getTransactionSummary: (filters?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sellerId?: string;
    buyerId?: string;
  }) => ReturnType<typeof transactionService.calculateTransactionSummary>;
  filterTransactions: (filters: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sellerId?: string;
    buyerId?: string;
  }) => Transaction[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTransactionStore = create<TransactionState & TransactionActions>((set, get) => ({
  transactions: [],
  splitDetails: [],
  loading: false,
  error: null,

  setTransactions: (transactions) => set({ transactions }),
  setSplitDetails: (splitDetails) => set({ splitDetails }),

  addTransaction: (transaction, splitDetails) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
      ...(splitDetails ? { splitDetails: [...state.splitDetails, ...splitDetails] } : {})
    })),

  createTransactionFromMatch: (matchRecord, sellerTotalSales) => {
    const result = transactionService.createTransaction({ matchRecord, sellerTotalSales });

    set((state) => ({
      transactions: [result.transaction, ...state.transactions],
      splitDetails: [...state.splitDetails, ...result.splitDetails]
    }));

    return result;
  },

  createManualTransactionFromForm: (params) => {
    const result = transactionService.createManualTransaction(params);

    set((state) => ({
      transactions: [result.transaction, ...state.transactions],
      splitDetails: [...state.splitDetails, ...result.splitDetails]
    }));

    return result;
  },

  createRefund: (transactionId) => {
    const state = get();
    const originalTransaction = state.transactions.find((t) => t.id === transactionId);

    if (!originalTransaction) {
      console.error('[TransactionStore] 退款失败：未找到原始交易', { transactionId });
      return null;
    }

    const refundTransaction = transactionService.createRefundTransaction(originalTransaction);

    set((state) => ({
      transactions: [refundTransaction, ...state.transactions]
    }));

    return refundTransaction;
  },

  getTransactionById: (id) => get().transactions.find((t) => t.id === id),

  getSplitDetailsByTransactionId: (transactionId) =>
    get().splitDetails.filter((d) => d.transactionId === transactionId),

  getTransactionsBySeller: (sellerId) =>
    get().transactions.filter((t) => t.sellerId === sellerId),

  getTransactionsByBuyer: (buyerId) =>
    get().transactions.filter((t) => t.buyerId === buyerId),

  getMonthlyTransactions: (month) =>
    get().transactions.filter((t) => t.createdAt.substring(0, 7) === month),

  getTransactionSummary: (filters) => {
    const state = get();
    const filteredTransactions = filters
      ? transactionService.filterTransactions(state.transactions, filters)
      : state.transactions;
    return transactionService.calculateTransactionSummary(filteredTransactions);
  },

  filterTransactions: (filters) => {
    const state = get();
    return transactionService.filterTransactions(state.transactions, filters);
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
