import dayjs from 'dayjs';
import type { SellerSalesStats } from '@/types';

const sellerNames = ['张明', '李华', '王芳', '刘伟', '陈静'];

const generateSellerStats = (): SellerSalesStats[] => {
  const stats: SellerSalesStats[] = [];
  const currentMonth = dayjs().format('YYYY-MM');
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');

  const salesData = [
    { totalSales: 125000, totalOrders: 186, tier: 5, rate: 0.03 },
    { totalSales: 68000, totalOrders: 112, tier: 4, rate: 0.06 },
    { totalSales: 35000, totalOrders: 68, tier: 3, rate: 0.09 },
    { totalSales: 12000, totalOrders: 35, tier: 2, rate: 0.12 },
    { totalSales: 3500, totalOrders: 12, tier: 1, rate: 0.15 }
  ];

  salesData.forEach((data, index) => {
    const totalCommission = data.totalSales * data.rate;
    const totalReceive = data.totalSales - totalCommission;

    stats.push({
      sellerId: `SELLER_${(index + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[index],
      month: currentMonth,
      totalSales: data.totalSales,
      totalOrders: data.totalOrders,
      currentTier: data.tier,
      currentRate: data.rate,
      totalCommission,
      totalReceive
    });

    stats.push({
      sellerId: `SELLER_${(index + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[index],
      month: lastMonth,
      totalSales: data.totalSales * 0.85,
      totalOrders: Math.floor(data.totalOrders * 0.8),
      currentTier: data.tier - (data.totalSales * 0.85 < 5000 ? 0 : 1),
      currentRate: data.rate + 0.03,
      totalCommission: data.totalSales * 0.85 * (data.rate + 0.03),
      totalReceive: data.totalSales * 0.85 * (1 - data.rate - 0.03)
    });
  });

  return stats;
};

export const mockSellerStats = generateSellerStats();

export default {
  mockSellerStats
};
