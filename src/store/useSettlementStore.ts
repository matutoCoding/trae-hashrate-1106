import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Settlement, Transaction } from '@/types';

interface SettlementState {
  settlements: Settlement[];
  loading: boolean;
  error: string | null;
}

interface SettlementActions {
  setSettlements: (settlements: Settlement[]) => void;
  generateSettlement: (params: {
    period: string;
    sellerId: string;
    sellerName: string;
    reconciliationIds: string[];
    totalAmount: number;
  }) => Settlement | null;
  confirmSettlement: (id: string, confirmedBy?: string) => { settlement: Settlement; transactionId?: string } | null;
  getSettlementsBySeller: (sellerId: string) => Settlement[];
  getSettlementsByPeriod: (period: string, sellerId: string) => Settlement | undefined;
  getSettlementById: (id: string) => Settlement | undefined;
  getStatusLabel: (status: string) => string;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

let _useTransactionStore: any = null;
let _useReconciliationStore: any = null;

export const bindTransactionStore = (store: any) => {
  _useTransactionStore = store;
};

export const bindReconciliationStore = (store: any) => {
  _useReconciliationStore = store;
};

export const useSettlementStore = create<SettlementState & SettlementActions>((set, get) => ({
  settlements: [],
  loading: false,
  error: null,

  setSettlements: (settlements) => set({ settlements }),

  generateSettlement: ({ period, sellerId, sellerName, reconciliationIds, totalAmount }) => {
    const state = get();
    const existing = state.getSettlementsByPeriod(period, sellerId);
    if (existing) return null;

    const settlement: Settlement = {
      id: `settle-${Date.now()}`,
      period,
      sellerId,
      sellerName,
      totalAmount,
      status: 'pending',
      reconciliationIds,
      createdAt: dayjs().toISOString()
    };

    set((state) => ({
      settlements: [...state.settlements, settlement]
    }));

    if (_useReconciliationStore) {
      const recActions = _useReconciliationStore.getState();
      reconciliationIds.forEach((rid) => {
        recActions.updateSettlementStatus?.(rid, 'pending', settlement.id);
      });
    }

    return settlement;
  },

  confirmSettlement: (id, confirmedBy) => {
    const state = get();
    const settlement = state.settlements.find((s) => s.id === id);
    if (!settlement) return null;
    if (settlement.status === 'completed') return null;

    const updated: Settlement = {
      ...settlement,
      status: 'completed',
      confirmedAt: dayjs().toISOString(),
      confirmedBy
    };

    let transactionId: string | undefined;

    if (_useTransactionStore) {
      const txnActions = _useTransactionStore.getState();
      const txnId = `txn-settle-${Date.now()}`;
      const settlementTxn: Transaction = {
        id: txnId,
        type: 'settlement',
        amount: settlement.totalAmount,
        sellerId: settlement.sellerId,
        sellerName: settlement.sellerName,
        commissionRate: 0,
        commissionAmount: 0,
        sellerReceiveAmount: settlement.totalAmount,
        platformReceiveAmount: 0,
        status: 'completed',
        createdAt: dayjs().toISOString(),
        completedAt: dayjs().toISOString(),
        remark: `结算打款: ${settlement.period}`
      };

      if (txnActions.addTransaction) {
        txnActions.addTransaction(settlementTxn);
      } else if (txnActions.setTransactions) {
        txnActions.setTransactions([settlementTxn, ..._useTransactionStore.getState().transactions]);
      }

      transactionId = txnId;
    }

    if (_useReconciliationStore) {
      const recActions = _useReconciliationStore.getState();
      settlement.reconciliationIds.forEach((rid) => {
        recActions.updateSettlementStatus?.(rid, 'completed', settlement.id);
      });
    }

    set((state) => ({
      settlements: state.settlements.map((s) => (s.id === id ? updated : s))
    }));

    return { settlement: updated, transactionId };
  },

  getSettlementsBySeller: (sellerId) =>
    get().settlements.filter((s) => s.sellerId === sellerId),

  getSettlementsByPeriod: (period, sellerId) =>
    get().settlements.find((s) => s.period === period && s.sellerId === sellerId),

  getSettlementById: (id) =>
    get().settlements.find((s) => s.id === id),

  getStatusLabel: (status) => {
    const labels: Record<string, string> = {
      pending: '待结算',
      processing: '结算中',
      completed: '已结算',
      failed: '结算失败'
    };
    return labels[status] || status;
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
