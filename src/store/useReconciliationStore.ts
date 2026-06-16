import { create } from 'zustand';
import type { Reconciliation, ReconciliationItem, Transaction } from '@/types';

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
  confirmReconciliation: (id: string, confirmedBy?: string) => Reconciliation | null;
  updateSettlementStatus: (
    reconciliationId: string,
    settlementStatus: 'none' | 'pending' | 'completed',
    settlementId?: string
  ) => Reconciliation | null;
  generateReconciliationFromTransactions: (params: {
    period: string;
    sellerId: string;
    sellerName: string;
    transactions: Transaction[];
  }) => Reconciliation | null;
  syncReconciliationFromTransactions: (params: {
    period: string;
    sellerId: string;
    sellerName: string;
    transactions: Transaction[];
  }) => Reconciliation | null;
  updateReconciliationItem: (params: {
    itemId: string;
    systemAmount: number;
    remark?: string;
  }) => ReconciliationItem | null;
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

  generateReconciliationFromTransactions: ({ period, sellerId, sellerName, transactions }) => {
    const state = get();
    const existing = state.getReconciliationByPeriod(period, sellerId);
    if (existing) return null;

    const filtered = transactions.filter(
      (t) =>
        t.sellerId === sellerId &&
        t.createdAt.slice(0, 7) === period &&
        t.status === 'completed' &&
        t.type === 'sale'
    );

    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
    const totalCommission = filtered.reduce((sum, t) => sum + t.commissionAmount, 0);
    const totalSettle = totalAmount - totalCommission;

    const reconciliation: Reconciliation = {
      id: `rec-${Date.now()}`,
      period,
      sellerId,
      sellerName,
      totalAmount,
      totalCommission,
      totalSettle,
      transactionCount: filtered.length,
      status: 'pending',
      settlementStatus: 'none',
      createdAt: new Date().toISOString()
    };

    const items: ReconciliationItem[] = filtered.map((t) => ({
      id: `item-${Date.now()}-${t.id}`,
      reconciliationId: reconciliation.id,
      transactionId: t.id,
      transactionAmount: t.amount,
      systemAmount: t.amount,
      difference: 0,
      status: 'matched' as const,
      editable: true
    }));

    set((state) => ({
      reconciliations: [...state.reconciliations, reconciliation],
      reconciliationItems: [...state.reconciliationItems, ...items]
    }));

    return reconciliation;
  },

  syncReconciliationFromTransactions: ({ period, sellerId, sellerName, transactions }) => {
    const state = get();
    const existing = state.getReconciliationByPeriod(period, sellerId);

    if (!existing) {
      return state.generateReconciliationFromTransactions({ period, sellerId, sellerName, transactions });
    }

    if (existing.status === 'confirmed') return null;

    if (existing.settlementStatus === 'completed') return null;

    const filtered = transactions.filter(
      (t) =>
        t.sellerId === sellerId &&
        t.createdAt.slice(0, 7) === period &&
        t.status === 'completed' &&
        t.type === 'sale'
    );

    const existingItems = state.reconciliationItems.filter(
      (item) => item.reconciliationId === existing.id
    );
    const existingTransactionIds = new Set(existingItems.map((item) => item.transactionId));

    const newTransactions = filtered.filter((t) => !existingTransactionIds.has(t.id));

    if (newTransactions.length === 0) return existing;

    const newItems: ReconciliationItem[] = newTransactions.map((t) => ({
      id: `item-${Date.now()}-${t.id}`,
      reconciliationId: existing.id,
      transactionId: t.id,
      transactionAmount: t.amount,
      systemAmount: t.amount,
      difference: 0,
      status: 'matched' as const,
      editable: true
    }));

    const allItems = [...existingItems, ...newItems];

    const totalAmount = allItems.reduce((sum, i) => sum + i.transactionAmount, 0);
    const totalCommission = filtered.reduce((sum, t) => sum + t.commissionAmount, 0);
    const totalSettle = totalAmount - totalCommission;

    const hasMismatch = allItems.some((i) => i.status === 'mismatch');
    const status: Reconciliation['status'] = hasMismatch ? 'mismatch' : 'matched';

    const updatedReconciliation: Reconciliation = {
      ...existing,
      totalAmount,
      totalCommission,
      totalSettle,
      transactionCount: allItems.length,
      status
    };

    set((state) => ({
      reconciliations: state.reconciliations.map((r) =>
        r.id === existing.id ? updatedReconciliation : r
      ),
      reconciliationItems: [...state.reconciliationItems, ...newItems]
    }));

    return updatedReconciliation;
  },

  updateReconciliationItem: ({ itemId, systemAmount, remark }) => {
    const state = get();
    const item = state.reconciliationItems.find((i) => i.id === itemId);
    if (!item) return null;

    const reconciliation = state.reconciliations.find(
      (r) => r.id === item.reconciliationId
    );
    if (!reconciliation) return null;

    if (reconciliation.status === 'confirmed') return null;

    if (reconciliation.settlementStatus === 'completed') return null;

    const difference = item.transactionAmount - systemAmount;
    const updatedItem: ReconciliationItem = {
      ...item,
      systemAmount,
      remark,
      difference,
      status: difference !== 0 ? 'mismatch' : 'matched'
    };

    set((state) => ({
      reconciliationItems: state.reconciliationItems.map((i) =>
        i.id === itemId ? updatedItem : i
      )
    }));

    const updatedItems = state.reconciliationItems.map((i) =>
      i.id === itemId ? updatedItem : i
    );
    const recItems = updatedItems.filter(
      (i) => i.reconciliationId === item.reconciliationId
    );

    const hasMismatch = recItems.some((i) => i.status === 'mismatch');
    const totalAmount = recItems.reduce((sum, i) => sum + i.transactionAmount, 0);
    const totalCommission = reconciliation.totalCommission;
    const totalSettle = totalAmount - totalCommission;

    const updatedReconciliation: Reconciliation = {
      ...reconciliation,
      totalAmount,
      totalSettle,
      status: hasMismatch ? 'mismatch' : 'matched'
    };

    set((state) => ({
      reconciliations: state.reconciliations.map((r) =>
        r.id === reconciliation.id ? updatedReconciliation : r
      )
    }));

    return updatedItem;
  },

  confirmReconciliation: (id, confirmedBy) => {
    const state = get();
    const reconciliation = state.reconciliations.find((r) => r.id === id);

    if (!reconciliation) return null;

    if (reconciliation.status === 'confirmed') return null;

    if (reconciliation.settlementStatus === 'completed') return null;

    const updatedReconciliation: Reconciliation = {
      ...reconciliation,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy
    };

    const updatedItems = state.reconciliationItems.map((item) =>
      item.reconciliationId === id ? { ...item, editable: false } : item
    );

    set((state) => ({
      reconciliations: state.reconciliations.map((r) =>
        r.id === id ? updatedReconciliation : r
      ),
      reconciliationItems: updatedItems
    }));

    return updatedReconciliation;
  },

  updateSettlementStatus: (reconciliationId, settlementStatus, settlementId) => {
    const state = get();
    const reconciliation = state.reconciliations.find((r) => r.id === reconciliationId);

    if (!reconciliation) return null;

    if (settlementStatus === 'completed' && reconciliation.status !== 'confirmed') return null;

    const updatedReconciliation: Reconciliation = {
      ...reconciliation,
      settlementStatus,
      settlementId,
      ...(settlementStatus === 'completed' ? { status: 'confirmed' as const } : {})
    };

    let updatedItems = state.reconciliationItems;
    if (settlementStatus === 'completed') {
      updatedItems = state.reconciliationItems.map((item) =>
        item.reconciliationId === reconciliationId ? { ...item, editable: false } : item
      );
    }

    set((state) => ({
      reconciliations: state.reconciliations.map((r) =>
        r.id === reconciliationId ? updatedReconciliation : r
      ),
      reconciliationItems: updatedItems
    }));

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
