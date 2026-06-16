import type { CommissionTier, SellerSalesStats, Transaction } from '@/types';

export const COMMISSION_TIERS: CommissionTier[] = [
  { tier: 1, minSales: 0, maxSales: 5000, rate: 0.15, description: '月成交额0-5000元，抽成15%' },
  { tier: 2, minSales: 5000, maxSales: 20000, rate: 0.12, description: '月成交额5000-20000元，抽成12%' },
  { tier: 3, minSales: 20000, maxSales: 50000, rate: 0.09, description: '月成交额2-5万元，抽成9%' },
  { tier: 4, minSales: 50000, maxSales: 100000, rate: 0.06, description: '月成交额5-10万元，抽成6%' },
  { tier: 5, minSales: 100000, maxSales: Infinity, rate: 0.03, description: '月成交额10万元以上，抽成3%' }
];

export const commissionService = {
  getCommissionTiers(): CommissionTier[] {
    return COMMISSION_TIERS;
  },

  calculateCurrentTier(totalSales: number): { tier: CommissionTier; nextTier?: CommissionTier; progress: number } {
    console.log('[CommissionService] 计算当前档位', { totalSales });

    let currentTier = COMMISSION_TIERS[0];
    let nextTier: CommissionTier | undefined;

    for (let i = 0; i < COMMISSION_TIERS.length; i++) {
      const tier = COMMISSION_TIERS[i];
      if (totalSales >= tier.minSales && totalSales < tier.maxSales) {
        currentTier = tier;
        nextTier = COMMISSION_TIERS[i + 1];
        break;
      }
      if (totalSales >= tier.minSales && tier.maxSales === Infinity) {
        currentTier = tier;
        nextTier = undefined;
        break;
      }
    }

    let progress = 0;
    if (nextTier) {
      const tierRange = nextTier.minSales - currentTier.minSales;
      const currentProgress = totalSales - currentTier.minSales;
      progress = Math.min(100, (currentProgress / tierRange) * 100);
    } else {
      progress = 100;
    }

    console.log('[CommissionService] 当前档位信息', {
      tier: currentTier.tier,
      rate: currentTier.rate,
      nextTier: nextTier?.tier,
      progress: progress.toFixed(2) + '%'
    });

    return { tier: currentTier, nextTier, progress };
  },

  getCurrentRate(totalSales: number): number {
    const { tier } = this.calculateCurrentTier(totalSales);
    return tier.rate;
  },

  calculateCommission(amount: number, totalSales: number): {
    commissionRate: number;
    commissionAmount: number;
    sellerReceive: number;
    platformReceive: number;
  } {
    console.log('[CommissionService] 计算抽成', { amount, totalSales });

    const rate = this.getCurrentRate(totalSales);
    const commissionAmount = amount * rate;
    const sellerReceive = amount - commissionAmount;
    const platformReceive = commissionAmount;

    console.log('[CommissionService] 抽成计算结果', {
      rate: (rate * 100).toFixed(1) + '%',
      commissionAmount,
      sellerReceive,
      platformReceive
    });

    return {
      commissionRate: rate,
      commissionAmount,
      sellerReceive,
      platformReceive
    };
  },

  calculateSellerStats(sellerId: string, sellerName: string, transactions: Transaction[], month: string): SellerSalesStats {
    console.log('[CommissionService] 计算卖家销量统计', { sellerId, month });

    const monthTransactions = transactions.filter(t => {
      const transactionMonth = t.createdAt.substring(0, 7);
      return t.sellerId === sellerId && transactionMonth === month && t.status === 'completed';
    });

    const totalSales = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalOrders = monthTransactions.length;
    const totalCommission = monthTransactions.reduce((sum, t) => sum + t.commissionAmount, 0);
    const totalReceive = monthTransactions.reduce((sum, t) => sum + t.sellerReceiveAmount, 0);

    const { tier } = this.calculateCurrentTier(totalSales);

    const stats: SellerSalesStats = {
      sellerId,
      sellerName,
      month,
      totalSales,
      totalOrders,
      currentTier: tier.tier,
      currentRate: tier.rate,
      totalCommission,
      totalReceive
    };

    console.log('[CommissionService] 卖家统计结果', stats);
    return stats;
  },

  calculateNextTierRequirement(totalSales: number): { needSales: number; nextRate: number } | null {
    const { nextTier, tier } = this.calculateCurrentTier(totalSales);

    if (!nextTier) {
      return null;
    }

    const needSales = nextTier.minSales - totalSales;
    const savingRate = tier.rate - nextTier.rate;

    console.log('[CommissionService] 下一档位信息', {
      needSales,
      nextRate: nextTier.rate,
      savingRate: (savingRate * 100).toFixed(1) + '%'
    });

    return {
      needSales,
      nextRate: nextTier.rate
    };
  },

  estimateSavings(totalSales: number, nextAmount: number): {
    currentCommission: number;
    newCommission: number;
    savings: number;
    newRate: number;
  } {
    console.log('[CommissionService] 估算优惠', { totalSales, nextAmount });

    const newTotalSales = totalSales + nextAmount;
    const currentRate = this.getCurrentRate(totalSales);
    const newRate = this.getCurrentRate(newTotalSales);

    const currentCommission = nextAmount * currentRate;
    const newCommission = nextAmount * newRate;
    const savings = currentCommission - newCommission;

    console.log('[CommissionService] 优惠估算结果', {
      currentRate: (currentRate * 100).toFixed(1) + '%',
      newRate: (newRate * 100).toFixed(1) + '%',
      savings
    });

    return {
      currentCommission,
      newCommission,
      savings,
      newRate
    };
  },

  formatRate(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
  },

  formatTierDescription(tier: CommissionTier): string {
    if (tier.maxSales === Infinity) {
      return `月成交额${tier.minSales / 10000}万元以上`;
    }
    if (tier.maxSales >= 10000) {
      return `月成交额${tier.minSales / 10000}-${tier.maxSales / 10000}万元`;
    }
    return `月成交额${tier.minSales}-${tier.maxSales}元`;
  }
};
