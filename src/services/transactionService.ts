import dayjs from 'dayjs';
import type { Transaction, SplitAccountDetail, MatchRecord } from '@/types';
import { commissionService } from './commissionService';

interface CreateTransactionParams {
  matchRecord: MatchRecord;
  sellerTotalSales: number;
}

export interface CreateManualTransactionParams {
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  boxId?: string;
  boxName?: string;
  amount: number;
  sellerTotalSales: number;
}

export const transactionService = {
  createTransaction(params: CreateTransactionParams): {
    transaction: Transaction;
    splitDetails: SplitAccountDetail[];
  } {
    console.log('[TransactionService] 创建交易流水', params);

    const { matchRecord, sellerTotalSales } = params;

    const commissionResult = commissionService.calculateCommission(
      matchRecord.price,
      sellerTotalSales
    );

    const now = dayjs();
    const transaction: Transaction = {
      id: `TXN_${now.valueOf()}`,
      type: 'sale',
      amount: matchRecord.price,
      boxId: matchRecord.boxId,
      boxName: matchRecord.boxName,
      sellerId: matchRecord.sellerId,
      sellerName: matchRecord.sellerName,
      buyerId: matchRecord.buyerId,
      buyerName: matchRecord.buyerName,
      commissionRate: commissionResult.commissionRate,
      commissionAmount: commissionResult.commissionAmount,
      sellerReceiveAmount: commissionResult.sellerReceive,
      platformReceiveAmount: commissionResult.platformReceive,
      status: 'completed',
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      remark: `盲盒【${matchRecord.boxName}】交易成功`
    };

    const splitDetails: SplitAccountDetail[] = [
      {
        id: `SPLIT_SELLER_${now.valueOf()}`,
        transactionId: transaction.id,
        subject: '卖家货款',
        amount: commissionResult.sellerReceive,
        rate: 1 - commissionResult.commissionRate,
        type: 'seller',
        createdAt: now.toISOString()
      },
      {
        id: `SPLIT_PLATFORM_${now.valueOf()}`,
        transactionId: transaction.id,
        subject: '平台服务费',
        amount: commissionResult.commissionAmount,
        rate: commissionResult.commissionRate,
        type: 'platform',
        createdAt: now.toISOString()
      }
    ];

    console.log('[TransactionService] 流水创建成功', {
      transactionId: transaction.id,
      amount: transaction.amount,
      sellerReceive: transaction.sellerReceiveAmount,
      platformReceive: transaction.platformReceiveAmount
    });

    return { transaction, splitDetails };
  },

  createManualTransaction(params: CreateManualTransactionParams): {
    transaction: Transaction;
    splitDetails: SplitAccountDetail[];
  } {
    const { sellerId, sellerName, buyerId, buyerName, boxId, boxName, amount, sellerTotalSales } = params;

    const commissionResult = commissionService.calculateCommission(amount, sellerTotalSales);

    const now = dayjs();
    const transaction: Transaction = {
      id: `TXN_${now.valueOf()}`,
      type: 'sale',
      amount,
      boxId,
      boxName,
      sellerId,
      sellerName,
      buyerId,
      buyerName,
      commissionRate: commissionResult.commissionRate,
      commissionAmount: commissionResult.commissionAmount,
      sellerReceiveAmount: commissionResult.sellerReceive,
      platformReceiveAmount: commissionResult.platformReceive,
      status: 'completed',
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      remark: boxName ? `盲盒【${boxName}】手动登记成交` : '手动登记成交'
    };

    const splitDetails: SplitAccountDetail[] = [
      {
        id: `SPLIT_SELLER_${now.valueOf()}`,
        transactionId: transaction.id,
        subject: '卖家货款',
        amount: commissionResult.sellerReceive,
        rate: 1 - commissionResult.commissionRate,
        type: 'seller',
        createdAt: now.toISOString()
      },
      {
        id: `SPLIT_PLATFORM_${now.valueOf()}`,
        transactionId: transaction.id,
        subject: '平台服务费',
        amount: commissionResult.commissionAmount,
        rate: commissionResult.commissionRate,
        type: 'platform',
        createdAt: now.toISOString()
      }
    ];

    return { transaction, splitDetails };
  },

  createRefundTransaction(originalTransaction: Transaction): Transaction {
    console.log('[TransactionService] 创建退款流水', { originalTxnId: originalTransaction.id });

    const now = dayjs();
    const refundTransaction: Transaction = {
      id: `TXN_REFUND_${now.valueOf()}`,
      type: 'refund',
      amount: -originalTransaction.amount,
      boxId: originalTransaction.boxId,
      boxName: originalTransaction.boxName,
      sellerId: originalTransaction.sellerId,
      sellerName: originalTransaction.sellerName,
      buyerId: originalTransaction.buyerId,
      buyerName: originalTransaction.buyerName,
      commissionRate: originalTransaction.commissionRate,
      commissionAmount: -originalTransaction.commissionAmount,
      sellerReceiveAmount: -originalTransaction.sellerReceiveAmount,
      platformReceiveAmount: -originalTransaction.platformReceiveAmount,
      status: 'completed',
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      remark: `退款：${originalTransaction.remark || ''}`
    };

    console.log('[TransactionService] 退款流水创建成功', { refundId: refundTransaction.id });
    return refundTransaction;
  },

  filterTransactions(
    transactions: Transaction[],
    filters: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      sellerId?: string;
      buyerId?: string;
    }
  ): Transaction[] {
    console.log('[TransactionService] 筛选流水', filters);

    return transactions.filter(t => {
      if (filters.type && t.type !== filters.type) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.sellerId && t.sellerId !== filters.sellerId) return false;
      if (filters.buyerId && t.buyerId !== filters.buyerId) return false;
      if (filters.startDate && dayjs(t.createdAt).isBefore(filters.startDate)) return false;
      if (filters.endDate && dayjs(t.createdAt).isAfter(filters.endDate)) return false;
      return true;
    });
  },

  calculateTransactionSummary(transactions: Transaction[]): {
    totalAmount: number;
    totalCommission: number;
    totalSellerReceive: number;
    totalPlatformReceive: number;
    count: number;
  } {
    console.log('[TransactionService] 计算流水汇总', { count: transactions.length });

    const summary = transactions.reduce(
      (acc, t) => {
        acc.totalAmount += t.amount;
        acc.totalCommission += t.commissionAmount;
        acc.totalSellerReceive += t.sellerReceiveAmount;
        acc.totalPlatformReceive += t.platformReceiveAmount;
        return acc;
      },
      {
        totalAmount: 0,
        totalCommission: 0,
        totalSellerReceive: 0,
        totalPlatformReceive: 0,
        count: transactions.length
      }
    );

    console.log('[TransactionService] 流水汇总结果', summary);
    return summary;
  },

  getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      sale: '销售收入',
      refund: '退款',
      commission: '抽成结算',
      settlement: '打款结算'
    };
    return labels[type] || type;
  },

  getTransactionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '处理中',
      completed: '已完成',
      failed: '失败'
    };
    return labels[status] || status;
  },

  formatAmount(amount: number): string {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}¥${amount.toFixed(2)}`;
  },

  generateTransactionNo(): string {
    const now = dayjs();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN${now.format('YYYYMMDDHHmmss')}${random}`;
  }
};
