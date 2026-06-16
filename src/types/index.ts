// 盲盒商品状态
export type BoxStatus = 'available' | 'locked' | 'sold' | 'released';

// 盲盒商品类型
export interface BlindBox {
  id: string;
  name: string;
  description: string;
  series: string;
  price: number;
  sellerId: string;
  sellerName: string;
  status: BoxStatus;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: string;
  createdAt: string;
  imageId: number;
}

// 求购信息类型
export interface PurchaseRequest {
  id: string;
  series: string;
  maxPrice: number;
  buyerId: string;
  buyerName: string;
  createdAt: string;
  status: 'pending' | 'matched' | 'cancelled';
}

// 撮合记录类型
export interface MatchRecord {
  id: string;
  boxId: string;
  boxName: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  price: number;
  matchedAt: string;
  status: 'matched' | 'completed' | 'cancelled';
  lockExpiresAt: string;
}

// 流水类型
export type TransactionType = 'sale' | 'refund' | 'commission' | 'settlement';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

// 交易流水
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  boxId?: string;
  boxName?: string;
  sellerId: string;
  sellerName: string;
  buyerId?: string;
  buyerName?: string;
  commissionRate: number;
  commissionAmount: number;
  sellerReceiveAmount: number;
  platformReceiveAmount: number;
  status: TransactionStatus;
  createdAt: string;
  completedAt?: string;
  remark?: string;
}

// 分账明细
export interface SplitAccountDetail {
  id: string;
  transactionId: string;
  subject: string;
  amount: number;
  rate: number;
  type: 'seller' | 'platform' | 'other';
  createdAt: string;
}

// 阶梯费率配置
export interface CommissionTier {
  tier: number;
  minSales: number;
  maxSales: number;
  rate: number;
  description: string;
}

// 卖家销量统计
export interface SellerSalesStats {
  sellerId: string;
  sellerName: string;
  month: string;
  totalSales: number;
  totalOrders: number;
  currentTier: number;
  currentRate: number;
  totalCommission: number;
  totalReceive: number;
}

// 对账单状态
export type ReconciliationStatus = 'pending' | 'matched' | 'mismatch' | 'confirmed';

// 对账单
export interface Reconciliation {
  id: string;
  period: string;
  sellerId: string;
  sellerName: string;
  totalAmount: number;
  totalCommission: number;
  totalSettle: number;
  transactionCount: number;
  status: ReconciliationStatus;
  createdAt: string;
  confirmedAt?: string;
  remark?: string;
}

// 对账明细项
export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  transactionId: string;
  transactionAmount: number;
  systemAmount: number;
  difference: number;
  status: 'matched' | 'mismatch';
  remark?: string;
}

// 锁定信息
export interface LockInfo {
  boxId: string;
  buyerId: string;
  buyerName: string;
  lockedAt: string;
  expiresAt: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页结果
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
