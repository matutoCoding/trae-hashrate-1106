import { create } from 'zustand';
import dayjs from 'dayjs';
import type { CommissionTier, SellerSalesStats } from '@/types';
import { commissionService } from '@/services/commissionService';

interface CommissionState {
  tiers: CommissionTier[];
  sellerStats: SellerSalesStats[];
  currentSellerId: string;
  currentMonth: string;
  loading: boolean;
  error: string | null;
}

interface CommissionActions {
  setTiers: (tiers: CommissionTier[]) => void;
  setSellerStats: (stats: SellerSalesStats[]) => void;
  setCurrentSellerId: (sellerId: string) => void;
  setCurrentMonth: (month: string) => void;
  getTiers: () => CommissionTier[];
  getCurrentTier: (totalSales: number) => ReturnType<typeof commissionService.calculateCurrentTier>;
  getCurrentRate: (totalSales: number) => number;
  calculateCommission: (
    amount: number,
    totalSales: number
  ) => ReturnType<typeof commissionService.calculateCommission>;
  getSellerStats: (sellerId: string, month?: string) => SellerSalesStats | undefined;
  getCurrentSellerStats: () => SellerSalesStats | undefined;
  calculateNextTierRequirement: (totalSales: number) => ReturnType<typeof commissionService.calculateNextTierRequirement>;
  estimateSavings: (
    totalSales: number,
    nextAmount: number
  ) => ReturnType<typeof commissionService.estimateSavings>;
  formatRate: (rate: number) => string;
  updateSellerStatsAfterTransaction: (params: {
    sellerId: string;
    sellerName: string;
    amount: number;
    commissionAmount: number;
    sellerReceiveAmount: number;
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCommissionStore = create<CommissionState & CommissionActions>((set, get) => ({
  tiers: commissionService.getCommissionTiers(),
  sellerStats: [],
  currentSellerId: 'SELLER_001',
  currentMonth: dayjs().format('YYYY-MM'),
  loading: false,
  error: null,

  setTiers: (tiers) => set({ tiers }),
  setSellerStats: (sellerStats) => set({ sellerStats }),
  setCurrentSellerId: (currentSellerId) => set({ currentSellerId }),
  setCurrentMonth: (currentMonth) => set({ currentMonth }),

  getTiers: () => get().tiers,

  getCurrentTier: (totalSales) => commissionService.calculateCurrentTier(totalSales),

  getCurrentRate: (totalSales) => commissionService.getCurrentRate(totalSales),

  calculateCommission: (amount, totalSales) =>
    commissionService.calculateCommission(amount, totalSales),

  getSellerStats: (sellerId, month) => {
    const state = get();
    const targetMonth = month || state.currentMonth;
    return state.sellerStats.find((s) => s.sellerId === sellerId && s.month === targetMonth);
  },

  getCurrentSellerStats: () => {
    const state = get();
    return state.sellerStats.find(
      (s) => s.sellerId === state.currentSellerId && s.month === state.currentMonth
    );
  },

  calculateNextTierRequirement: (totalSales) =>
    commissionService.calculateNextTierRequirement(totalSales),

  estimateSavings: (totalSales, nextAmount) =>
    commissionService.estimateSavings(totalSales, nextAmount),

  formatRate: (rate) => commissionService.formatRate(rate),

  updateSellerStatsAfterTransaction: (params) => {
    const { sellerId, sellerName, amount, commissionAmount, sellerReceiveAmount } = params;
    const currentMonth = dayjs().format('YYYY-MM');
    const state = get();
    const existingIndex = state.sellerStats.findIndex(
      (s) => s.sellerId === sellerId && s.month === currentMonth
    );

    if (existingIndex !== -1) {
      const existing = state.sellerStats[existingIndex];
      const updatedStats = [...state.sellerStats];
      const totalSales = existing.totalSales + amount;
      const { tier } = commissionService.calculateCurrentTier(totalSales);
      updatedStats[existingIndex] = {
        ...existing,
        totalSales,
        totalOrders: existing.totalOrders + 1,
        totalCommission: existing.totalCommission + commissionAmount,
        totalReceive: existing.totalReceive + sellerReceiveAmount,
        currentTier: tier.tier,
        currentRate: tier.rate
      };
      set({ sellerStats: updatedStats });
    } else {
      const { tier } = commissionService.calculateCurrentTier(amount);
      const newRecord: SellerSalesStats = {
        sellerId,
        sellerName,
        month: currentMonth,
        totalSales: amount,
        totalOrders: 1,
        totalCommission: commissionAmount,
        totalReceive: sellerReceiveAmount,
        currentTier: tier.tier,
        currentRate: tier.rate
      };
      set({ sellerStats: [...state.sellerStats, newRecord] });
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
