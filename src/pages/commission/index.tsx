import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import CommissionTierCard from '@/components/CommissionTierCard';
import { useCommissionStore } from '@/store/useCommissionStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useSettlementStore } from '@/store/useSettlementStore';
import { useAppInitStore } from '@/store/useAppInitStore';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const sellers = [
  { id: 'SELLER_001', name: '张明' },
  { id: 'SELLER_002', name: '李华' },
  { id: 'SELLER_003', name: '王芳' },
  { id: 'SELLER_004', name: '刘伟' },
  { id: 'SELLER_005', name: '陈静' }
];

const CommissionPage: React.FC = () => {

  const {
    tiers,
    sellerStats,
    currentSellerId,
    setCurrentSellerId,
    getCurrentTier,
    getCurrentSellerStats,
    calculateNextTierRequirement,
    formatRate
  } = useCommissionStore();

  const { getTransactionsBySeller } = useTransactionStore();
  const { getSettlementsBySeller } = useSettlementStore();

  const [sellerPickerIndex, setSellerPickerIndex] = useState(
    sellers.findIndex(s => s.id === currentSellerId)
  );

  useEffect(() => {
    useAppInitStore.getState().ensureInitialized();
  }, []);

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const currentStats = getCurrentSellerStats();
  const currentSales = currentStats?.totalSales || 0;
  const currentOrders = currentStats?.totalOrders || 0;
  const totalReceive = currentStats?.totalReceive || 0;
  const currentRate = currentStats?.currentRate || 0.15;
  const commissionSaved = currentSales * (0.15 - currentRate);

  const { tier: currentTier, nextTier, progress } = getCurrentTier(currentSales);
  const nextRequirement = calculateNextTierRequirement(currentSales);

  const lastMonthStats = useMemo(() => sellerStats.find(
    s => s.sellerId === currentSellerId && s.month === dayjs().subtract(1, 'month').format('YYYY-MM')
  ), [sellerStats, currentSellerId]);

  const settledAmount = useMemo(() => {
    return getSettlementsBySeller(currentSellerId)
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [currentSellerId, getSettlementsBySeller]);

  const pendingSettleAmount = totalReceive - settledAmount;

  const monthlyTrend = useMemo(() => {
    return sellerStats
      .filter(s => s.sellerId === currentSellerId)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [sellerStats, currentSellerId]);

  const recentTransactions = useMemo(() => {
    const sellerTxns = getTransactionsBySeller(currentSellerId)
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
    return sellerTxns.slice(0, 5);
  }, [currentSellerId, getTransactionsBySeller]);

  const handleSellerChange = (e) => {
    const index = e.detail.value;
    setSellerPickerIndex(index);
    setCurrentSellerId(sellers[index].id);
  };

  const handleMonthClick = (month: string) => {
    Taro.navigateTo({ url: `/pages/transaction-detail/index?month=${month}&sellerId=${currentSellerId}` });
  };

  const handleGoSettlement = () => {
    Taro.navigateTo({ url: `/pages/settlement/index?sellerId=${currentSellerId}` });
  };

  const currentSellerName = sellers.find(s => s.id === currentSellerId)?.name || '';

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.title}>📊 卖家月度经营看板</Text>
          <Picker
            mode='selector'
            range={sellers.map(s => s.name)}
            value={sellerPickerIndex}
            onChange={handleSellerChange}
          >
            <View className={styles.sellerPicker}>
              <Text className={styles.sellerPickerText}>{currentSellerName} ▾</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.currentTierCard}>
          <View className={styles.tierInfo}>
            <View>
              <Text className={styles.tierLabel}>当前档位</Text>
              <View className={styles.tierValue}>
                <Text className={styles.tierNumber}>第{currentTier.tier}档</Text>
                <Text className={styles.tierRate}>（{formatRate(currentTier.rate)}）</Text>
              </View>
            </View>
            <View className={styles.rateBadge}>
              <Text className={styles.rateText}>抽成 {formatRate(currentTier.rate)}</Text>
            </View>
          </View>

          <View className={styles.statsGrid}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>¥{currentSales.toLocaleString()}</Text>
              <Text className={styles.statLabel}>本月成交额</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{currentOrders}</Text>
              <Text className={styles.statLabel}>成交订单</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>¥{totalReceive.toFixed(0)}</Text>
              <Text className={styles.statLabel}>预计实收</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={classnames(styles.statValue, styles.highlightValue)}>¥{commissionSaved.toFixed(2)}</Text>
              <Text className={styles.statLabel}>抽成节省</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={classnames(styles.statValue, styles.settledValue)}>¥{settledAmount.toFixed(0)}</Text>
              <Text className={styles.statLabel}>已结算</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={classnames(styles.statValue, styles.pendingValue)}>¥{pendingSettleAmount.toFixed(0)}</Text>
              <Text className={styles.statLabel}>待结算</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <ScrollView scrollY>
          <View className={styles.progressSection}>
            <Text className={styles.progressTitle}>升档进度</Text>
            <View className={styles.progressInfo}>
              <Text className={styles.currentSales}>当前：¥{currentSales.toLocaleString()}</Text>
              {nextRequirement && (
                <Text className={styles.nextTier}>
                  再卖 ¥{nextRequirement.needSales.toLocaleString()} 可降至 {formatRate(nextRequirement.nextRate)}
                </Text>
              )}
            </View>
            <View className={styles.progressBar}>
              <View className={styles.progressFill} style={{ width: `${progress}%` }} />
            </View>
            <Text className={styles.progressText}>
              {progress.toFixed(1)}% 已完成
              {nextRequirement ? `，还需 ¥${nextRequirement.needSales.toLocaleString()} 升级` : '，已达最高档位'}
            </Text>
          </View>

          {nextRequirement && (
            <View className={styles.savingsTip}>
              <Text className={styles.tipTitle}>💡 省钱小提示</Text>
              <Text className={styles.tipContent}>
                升级到下一档后，每笔交易可少抽
                <Text className={styles.highlight}>
                  {((currentTier.rate - nextRequirement.nextRate) * 100).toFixed(1)}%
                </Text>
                ！本月已累计节省抽成约
                <Text className={styles.highlight}>
                  ¥{commissionSaved.toFixed(2)}
                </Text>
              </Text>
            </View>
          )}

          <View className={styles.tiersSection}>
            <Text className={styles.sectionTitle}>阶梯费率表</Text>
            {tiers.map((tier) => (
              <CommissionTierCard
                key={tier.tier}
                tier={tier}
                isActive={tier.tier === currentTier.tier}
                isNext={nextTier && tier.tier === nextTier.tier}
                progress={tier.tier === nextTier?.tier ? progress : undefined}
              />
            ))}
          </View>

          <View className={styles.transactionSection}>
            <Text className={styles.sectionTitle}>最近成交流水</Text>
            {recentTransactions.length === 0 ? (
              <View className={styles.emptyCard}>
                <Text className={styles.emptyText}>暂无成交记录</Text>
              </View>
            ) : (
              recentTransactions.map(txn => (
                <View key={txn.id} className={styles.txnCard}>
                  <View className={styles.txnRow}>
                    <Text className={styles.txnId}>{txn.id}</Text>
                    <Text className={styles.txnAmount}>¥{txn.amount.toFixed(2)}</Text>
                  </View>
                  <View className={styles.txnRow}>
                    <Text className={styles.txnBoxName}>{txn.boxName || '—'}</Text>
                    <Text className={styles.txnDetail}>
                      抽成¥{txn.commissionAmount.toFixed(2)} | 实收¥{txn.sellerReceiveAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View className={styles.historySection}>
            <Text className={styles.sectionTitle}>历史对比</Text>
            <View className={styles.historyCard}>
              <View className={styles.historyRow}>
                <Text className={styles.label}>上月成交额</Text>
                <Text className={styles.value}>
                  ¥{lastMonthStats?.totalSales.toLocaleString() || 0}
                </Text>
              </View>
              <View className={styles.historyRow}>
                <Text className={styles.label}>上月抽成比例</Text>
                <Text className={styles.value}>
                  {formatRate(lastMonthStats?.currentRate || 0.15)}
                </Text>
              </View>
              <View className={styles.historyRow}>
                <Text className={styles.label}>本月预计节省</Text>
                <Text className={classnames(styles.value, styles.highlight)}>
                  ¥{(currentSales * ((lastMonthStats?.currentRate || 0.15) - currentTier.rate)).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View className={styles.monthlyTrendSection}>
            <Text className={styles.sectionTitle}>月度趋势</Text>
            {monthlyTrend.length === 0 ? (
              <View className={styles.emptyCard}>
                <Text className={styles.emptyText}>暂无月度数据</Text>
              </View>
            ) : (
              monthlyTrend.map(item => (
                <View
                  key={item.month}
                  className={styles.trendRow}
                  onClick={() => handleMonthClick(item.month)}
                >
                  <Text className={styles.trendMonth}>{item.month}</Text>
                  <Text className={styles.trendSales}>¥{item.totalSales.toLocaleString()}</Text>
                  <Text className={styles.trendOrders}>{item.totalOrders}单</Text>
                  <Text className={styles.trendCommission}>¥{item.totalCommission.toFixed(0)}</Text>
                  <Text className={styles.trendReceive}>¥{item.totalReceive.toFixed(0)}</Text>
                </View>
              ))
            )}
          </View>

          <View className={styles.settlementEntry}>
            <View className={styles.settlementButton} onClick={handleGoSettlement}>
              <Text className={styles.settlementButtonText}>结算打款</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default CommissionPage;
