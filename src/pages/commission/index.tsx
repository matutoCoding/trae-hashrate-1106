import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import CommissionTierCard from '@/components/CommissionTierCard';
import { useCommissionStore } from '@/store/useCommissionStore';
import { mockSellerStats } from '@/data/commissionData';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const CommissionPage: React.FC = () => {

  const {
    tiers,
    sellerStats,
    currentSellerId,
    setSellerStats,
    getCurrentTier,
    getCurrentSellerStats,
    calculateNextTierRequirement,
    formatRate
  } = useCommissionStore();

  useEffect(() => {
    console.log('[CommissionPage] 初始化抽成数据');
    setSellerStats(mockSellerStats);
  }, [setSellerStats]);

  usePullDownRefresh(() => {
    console.log('[CommissionPage] 下拉刷新');
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const currentStats = getCurrentSellerStats();
  const currentSales = currentStats?.totalSales || 0;
  const currentOrders = currentStats?.totalOrders || 0;
  const totalReceive = currentStats?.totalReceive || 0;

  const { tier: currentTier, nextTier, progress } = getCurrentTier(currentSales);
  const nextRequirement = calculateNextTierRequirement(currentSales);

  const lastMonthStats = useMemo(() => sellerStats.find(
    s => s.sellerId === currentSellerId && s.month === dayjs().subtract(1, 'month').format('YYYY-MM')
  ), [sellerStats, currentSellerId]);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>📊 阶梯抽成</Text>

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
                  ¥{(currentSales * (0.15 - currentTier.rate)).toFixed(2)}
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
        </ScrollView>
      </View>
    </View>
  );
};

export default CommissionPage;
