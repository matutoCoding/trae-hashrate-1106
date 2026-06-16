import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Settlement } from '@/types';

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
  confirmSettlement: (id: string, confirmedBy?: string) => Settlement | null;
  getSettlementsBySeller: (sellerId: string) => Settlement[];
  getSettlementsByPeriod: (period: string, sellerId: string) => Settlement | undefined;
  getSettlementById: (id: string) => Settlement | undefined;
  getStatusLabel: (status: string) => string;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

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

    set((state) => ({
      settlements: state.settlements.map((s) => (s.id === id ? updated : s))
    }));

    return updated;
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
