import dayjs from 'dayjs';
import type { Transaction, SplitAccountDetail } from '@/types';

const boxNames = [
  '隐藏款-金色独角兽', '经典款-粉色小熊', '限定款-星空漫游', '普通款-森林精灵',
  '隐藏款-海洋之心', '经典款-彩虹小马', '限定款-未来战士', '普通款-梦境仙子',
  '隐藏款-烈焰凤凰', '经典款-冰雪女王'
];
const sellerNames = ['张明', '李华', '王芳', '刘伟', '陈静'];
const buyerNames = ['赵强', '孙丽', '周杰', '吴敏', '郑涛'];

const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const rates = [0.15, 0.12, 0.09, 0.06, 0.03];

  for (let i = 0; i < 15; i++) {
    const amount = [299, 399, 599, 199, 899, 499, 699, 349, 799, 449, 549, 249][i % 12];
    const rateIndex = Math.min(Math.floor(i / 3), 4);
    const rate = rates[rateIndex];
    const commissionAmount = amount * rate;
    const sellerReceive = amount - commissionAmount;
    const type = i === 10 ? 'refund' : 'sale';
    const sign = type === 'refund' ? -1 : 1;

    transactions.push({
      id: `TXN_${(i + 1).toString().padStart(8, '0')}`,
      type,
      amount: amount * sign,
      boxId: `BOX_${(i % 12 + 1).toString().padStart(4, '0')}`,
      boxName: boxNames[i % boxNames.length],
      sellerId: `SELLER_${((i % 5) + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[i % sellerNames.length],
      buyerId: `BUYER_${((i % 5) + 1).toString().padStart(3, '0')}`,
      buyerName: buyerNames[i % buyerNames.length],
      commissionRate: rate,
      commissionAmount: commissionAmount * sign,
      sellerReceiveAmount: sellerReceive * sign,
      platformReceiveAmount: commissionAmount * sign,
      status: i === 12 ? 'pending' : 'completed',
      createdAt: dayjs().subtract(i * 5, 'hour').toISOString(),
      completedAt: i !== 12 ? dayjs().subtract(i * 5, 'hour').add(2, 'minute').toISOString() : undefined,
      remark: type === 'refund'
        ? `退款：盲盒【${boxNames[i % boxNames.length]}】`
        : `盲盒【${boxNames[i % boxNames.length]}】交易成功`
    });
  }

  return transactions;
};

const generateSplitDetails = (transactions: Transaction[]): SplitAccountDetail[] => {
  const details: SplitAccountDetail[] = [];

  transactions.forEach((t, index) => {
    details.push(
      {
        id: `SPLIT_SELLER_${(index + 1).toString().padStart(6, '0')}`,
        transactionId: t.id,
        subject: '卖家货款',
        amount: t.sellerReceiveAmount,
        rate: 1 - t.commissionRate,
        type: 'seller',
        createdAt: t.createdAt
      },
      {
        id: `SPLIT_PLATFORM_${(index + 1).toString().padStart(6, '0')}`,
        transactionId: t.id,
        subject: '平台服务费',
        amount: t.platformReceiveAmount,
        rate: t.commissionRate,
        type: 'platform',
        createdAt: t.createdAt
      }
    );
  });

  return details;
};

export const mockTransactions = generateTransactions();
export const mockSplitDetails = generateSplitDetails(mockTransactions);

export default {
  mockTransactions,
  mockSplitDetails
};
