import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import ReconciliationCard from '@/components/ReconciliationCard';
import Empty from '@/components/Empty';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { mockReconciliations, mockReconciliationItems } from '@/data/reconciliationData';
import styles from './index.module.scss';

const ReconciliationPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    reconciliations,
    setReconciliations,
    setReconciliationItems,
    confirmReconciliation,
    getReconciliationItems: getItems
  } = useReconciliationStore();

  useEffect(() => {
    console.log('[ReconciliationPage] 初始化对账数据');
    setReconciliations(mockReconciliations);
    setReconciliationItems(mockReconciliationItems);
  }, [setReconciliations, setReconciliationItems]);

  usePullDownRefresh(() => {
    console.log('[ReconciliationPage] 下拉刷新');
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const handleConfirm = useCallback((id: string) => {
    console.log('[ReconciliationPage] 确认对账', { id });
    Taro.showModal({
      title: '确认对账',
      content: '确认后将无法修改，是否继续？',
      success: (res) => {
        if (res.confirm) {
          const result = confirmReconciliation(id);
          if (result) {
            Taro.showToast({ title: '对账确认成功', icon: 'success' });
          }
        }
      }
    });
  }, [confirmReconciliation]);

  const handleViewDetail = useCallback((id: string) => {
    console.log('[ReconciliationPage] 查看对账详情', { id });
    const items = getItems(id);
    console.log('[ReconciliationPage] 对账明细数量', items.length);
  }, [getItems]);

  const filteredReconciliations = reconciliations.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const pendingCount = reconciliations.filter(r => r.status === 'pending').length;
  const matchedCount = reconciliations.filter(r => r.status === 'matched').length;
  const confirmedCount = reconciliations.filter(r => r.status === 'confirmed').length;

  const totalAmount = filteredReconciliations.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCommission = filteredReconciliations.reduce((sum, r) => sum + r.totalCommission, 0);
  const totalSettle = filteredReconciliations.reduce((sum, r) => sum + r.totalSettle, 0);

  const statusFilters = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待对账' },
    { key: 'matched', label: '已匹配' },
    { key: 'mismatch', label: '有差异' },
    { key: 'confirmed', label: '已确认' }
  ];

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>📋 对账中心</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={classnames(styles.statNumber, styles.pending)}>{pendingCount}</Text>
            <Text className={styles.statLabel}>待对账</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={classnames(styles.statNumber, styles.matched)}>{matchedCount}</Text>
            <Text className={styles.statLabel}>已匹配</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={classnames(styles.statNumber, styles.confirmed)}>{confirmedCount}</Text>
            <Text className={styles.statLabel}>已确认</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.filterSection}>
          <Text className={styles.filterLabel}>对账状态</Text>
          <ScrollView
            scrollX
            className={styles.filterRow}
            enhanced
            showScrollbar={false}
          >
            {statusFilters.map(filter => (
              <View
                key={filter.key}
                className={classnames(styles.filterItem, { [styles.active]: statusFilter === filter.key })}
                onClick={() => setStatusFilter(filter.key)}
              >
                <Text className={styles.filterText}>{filter.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className={styles.summaryCard}>
          <Text className={styles.summaryTitle}>筛选汇总</Text>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>对账单数</Text>
            <Text className={styles.value}>{filteredReconciliations.length} 份</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>交易总额</Text>
            <Text className={classnames(styles.value, styles.highlight)}>¥{totalAmount.toLocaleString()}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>平台抽成</Text>
            <Text className={styles.value}>¥{totalCommission.toLocaleString()}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>应结算</Text>
            <Text className={styles.value}>¥{totalSettle.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView scrollY>
          <View className={styles.listSection}>
            <Text className={styles.listTitle}>对账单列表</Text>

            {filteredReconciliations.length > 0 ? (
              filteredReconciliations.map(reconciliation => (
                <ReconciliationCard
                  key={reconciliation.id}
                  reconciliation={reconciliation}
                  onConfirm={handleConfirm}
                  onViewDetail={handleViewDetail}
                />
              ))
            ) : (
                <Empty text="暂无对账单" />
              )}

            {filteredReconciliations.length > 0 && (
              <View className={styles.loadMore}>
                <Text className={styles.loadMoreText}>— 已加载全部 —</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default ReconciliationPage;
