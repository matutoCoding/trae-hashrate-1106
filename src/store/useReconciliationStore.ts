import { create } from 'zustand';
import type { Reconciliation, ReconciliationItem } from '@/types';

interface ReconciliationState {
  reconciliations: Reconciliation[];
  reconciliationItems: ReconciliationItem[];
  loading: boolean;
  error: string | null;
}

interface ReconciliationActions {
  setReconciliations: (reconciliations: Reconciliation[]) => void;
  setReconciliationItems: (items: ReconciliationItem[]) => void;
  getReconciliationById: (id: string) => Reconciliation | undefined;
  getReconciliationItems: (reconciliationId: string) => ReconciliationItem[];
  getReconciliationsBySeller: (sellerId: string) => Reconciliation[];
  getReconciliationByPeriod: (period: string, sellerId: string) => Reconciliation | undefined;
  confirmReconciliation: (id: string) => Reconciliation | null;
  getStatusLabel: (status: string) => string;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useReconciliationStore = create<ReconciliationState & ReconciliationActions>((set, get) => ({
  reconciliations: [],
  reconciliationItems: [],
  loading: false,
  error: null,

  setReconciliations: (reconciliations) => set({ reconciliations }),
  setReconciliationItems: (reconciliationItems) => set({ reconciliationItems }),

  getReconciliationById: (id) => get().reconciliations.find((r) => r.id === id),

  getReconciliationItems: (reconciliationId) =>
    get().reconciliationItems.filter((item) => item.reconciliationId === reconciliationId),

  getReconciliationsBySeller: (sellerId) =>
    get().reconciliations.filter((r) => r.sellerId === sellerId),

  getReconciliationByPeriod: (period, sellerId) =>
    get().reconciliations.find((r) => r.period === period && r.sellerId === sellerId),

  confirmReconciliation: (id) => {
    const state = get();
    const reconciliation = state.reconciliations.find((r) => r.id === id);

    if (!reconciliation) {
      console.error('[ReconciliationStore] 确认对账失败：未找到对账单', { id });
      return null;
    }

    const updatedReconciliation: Reconciliation = {
      ...reconciliation,
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    };

    set((state) => ({
      reconciliations: state.reconciliations.map((r) => (r.id === id ? updatedReconciliation : r))
    }));

    console.log('[ReconciliationStore] 对账已确认', { id });
    return updatedReconciliation;
  },

  getStatusLabel: (status) => {
    const labels: Record<string, string> = {
      pending: '待对账',
      matched: '已匹配',
      mismatch: '有差异',
      confirmed: '已确认'
    };
    return labels[status] || status;
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
