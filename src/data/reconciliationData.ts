import dayjs from 'dayjs';
import type { Reconciliation, ReconciliationItem } from '@/types';

const sellerNames = ['张明', '李华', '王芳', '刘伟', '陈静'];

const generateReconciliations = (): Reconciliation[] => {
  const reconciliations: Reconciliation[] = [];
  const currentMonth = dayjs().format('YYYY-MM');
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');

  const statuses: Reconciliation['status'][] = ['confirmed', 'matched', 'pending', 'mismatch', 'confirmed'];

  for (let i = 0; i < 5; i++) {
    const totalAmount = [125000, 68000, 35000, 12000, 3500][i];
    const totalCommission = totalAmount * [0.03, 0.06, 0.09, 0.12, 0.15][i];
    const totalSettle = totalAmount - totalCommission;

    reconciliations.push({
      id: `REC_${currentMonth}_${(i + 1).toString().padStart(3, '0')}`,
      period: currentMonth,
      sellerId: `SELLER_${(i + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[i],
      totalAmount,
      totalCommission,
      totalSettle,
      transactionCount: [186, 112, 68, 35, 12][i],
      status: statuses[i],
      createdAt: dayjs().startOf('month').add(1, 'day').toISOString(),
      confirmedAt: statuses[i] === 'confirmed' ? dayjs().startOf('month').add(3, 'day').toISOString() : undefined,
      remark: statuses[i] === 'mismatch' ? '存在2笔交易金额差异' : undefined
    });

    reconciliations.push({
      id: `REC_${lastMonth}_${(i + 1).toString().padStart(3, '0')}`,
      period: lastMonth,
      sellerId: `SELLER_${(i + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[i],
      totalAmount: totalAmount * 0.85,
      totalCommission: totalAmount * 0.85 * [0.03, 0.06, 0.09, 0.12, 0.15][i],
      totalSettle: totalAmount * 0.85 * (1 - [0.03, 0.06, 0.09, 0.12, 0.15][i]),
      transactionCount: Math.floor([186, 112, 68, 35, 12][i] * 0.8),
      status: 'confirmed',
      createdAt: dayjs().subtract(1, 'month').startOf('month').add(1, 'day').toISOString(),
      confirmedAt: dayjs().subtract(1, 'month').startOf('month').add(5, 'day').toISOString()
    });
  }

  return reconciliations;
};

const generateReconciliationItems = (reconciliations: Reconciliation[]): ReconciliationItem[] => {
  const items: ReconciliationItem[] = [];

  reconciliations.forEach((rec, recIndex) => {
    const itemCount = Math.min(rec.transactionCount, 5);
    for (let i = 0; i < itemCount; i++) {
      const transactionAmount = [299, 399, 599, 199, 899][i];
      const hasDifference = rec.status === 'mismatch' && i === 2;
      const systemAmount = hasDifference ? transactionAmount - 10 : transactionAmount;

      items.push({
        id: `REC_ITEM_${recIndex}_${i + 1}`,
        reconciliationId: rec.id,
        transactionId: `TXN_${(recIndex * 5 + i + 1).toString().padStart(8, '0')}`,
        transactionAmount,
        systemAmount,
        difference: transactionAmount - systemAmount,
        status: hasDifference ? 'mismatch' : 'matched',
        remark: hasDifference ? '交易金额与系统记录不符' : undefined
      });
    }
  });

  return items;
};

export const mockReconciliations = generateReconciliations();
export const mockReconciliationItems = generateReconciliationItems(mockReconciliations);

export default {
  mockReconciliations,
  mockReconciliationItems
};
