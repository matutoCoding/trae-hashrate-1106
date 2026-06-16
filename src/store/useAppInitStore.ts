import { create } from 'zustand';
import { useBoxStore } from './useBoxStore';
import { useTransactionStore } from './useTransactionStore';
import { useCommissionStore } from './useCommissionStore';
import { useReconciliationStore } from './useReconciliationStore';
import { mockBoxes, mockMatchRecords } from '@/data/boxData';
import { mockTransactions, mockSplitDetails } from '@/data/transactionData';
import { mockSellerStats } from '@/data/commissionData';
import { mockReconciliations, mockReconciliationItems } from '@/data/reconciliationData';

interface AppInitState {
  initialized: boolean;
}

interface AppInitActions {
  ensureInitialized: () => void;
}

export const useAppInitStore = create<AppInitState & AppInitActions>((set, get) => ({
  initialized: false,

  ensureInitialized: () => {
    if (get().initialized) return;

    useBoxStore.getState().setBoxes(mockBoxes);
    useBoxStore.getState().setMatchRecords(mockMatchRecords);
    useTransactionStore.getState().setTransactions(mockTransactions);
    useTransactionStore.getState().setSplitDetails(mockSplitDetails);
    useCommissionStore.getState().setSellerStats(mockSellerStats);
    useReconciliationStore.getState().setReconciliations(mockReconciliations);
    useReconciliationStore.getState().setReconciliationItems(mockReconciliationItems);

    set({ initialized: true });
  }
}));
