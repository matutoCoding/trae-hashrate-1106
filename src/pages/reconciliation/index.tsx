import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import ReconciliationCard from '@/components/ReconciliationCard';
import Empty from '@/components/Empty';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { mockReconciliations, mockReconciliationItems } from '@/data/reconciliationData';
import styles from './index.module.scss';

const statusLabelMap: Record<string, string> = {
  pending: '待对账',
  matched: '已匹配',
  mismatch: '有差异',
  confirmed: '已确认'
};

const ReconciliationPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailReconciliationId, setDetailReconciliationId] = useState<string | null>(null);

  const {
    reconciliations,
    setReconciliations,
    setReconciliationItems,
    confirmReconciliation,
    getReconciliationItems: getItems,
    getReconciliationById
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
    setDetailReconciliationId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailReconciliationId(null);
  }, []);

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

  const detailReconciliation = detailReconciliationId ? getReconciliationById(detailReconciliationId) : null;
  const detailItems = detailReconciliationId ? getItems(detailReconciliationId) : [];

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

      {detailReconciliationId && detailReconciliation && (
        <View className={styles.overlay}>
          <View className={styles.mask} onClick={handleCloseDetail} />
          <View className={styles.detailPanel}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>对账详情</Text>
              <View className={styles.closeBtn} onClick={handleCloseDetail}>
                <Text className={styles.closeIcon}>✕</Text>
              </View>
            </View>

            <ScrollView scrollY className={styles.detailBody}>
              <View className={styles.detailInfoCard}>
                <View className={styles.detailInfoRow}>
                  <Text className={styles.detailInfoLabel}>对账期间</Text>
                  <Text className={styles.detailInfoValue}>{detailReconciliation.period}</Text>
                </View>
                <View className={styles.detailInfoRow}>
                  <Text className={styles.detailInfoLabel}>卖家</Text>
                  <Text className={styles.detailInfoValue}>{detailReconciliation.sellerName}</Text>
                </View>
                <View className={styles.detailInfoRow}>
                  <Text className={styles.detailInfoLabel}>交易总额</Text>
                  <Text className={styles.detailInfoValue}>¥{detailReconciliation.totalAmount.toLocaleString()}</Text>
                </View>
                <View className={styles.detailInfoRow}>
                  <Text className={styles.detailInfoLabel}>状态</Text>
                  <Text className={classnames(styles.detailInfoValue, styles[detailReconciliation.status])}>
                    {statusLabelMap[detailReconciliation.status] || detailReconciliation.status}
                  </Text>
                </View>
              </View>

              {detailReconciliation.confirmedAt && (
                <View className={styles.confirmedInfo}>
                  <Text className={styles.confirmedText}>
                    已确认 · {new Date(detailReconciliation.confirmedAt).toLocaleString('zh-CN')}
                  </Text>
                </View>
              )}

              <View className={styles.detailListHeader}>
                <Text className={styles.detailListTitle}>交易明细</Text>
                <Text className={styles.detailListCount}>{detailItems.length} 条</Text>
              </View>

              {detailItems.length > 0 ? (
                detailItems.map(item => {
                  const isMismatch = item.status === 'mismatch' || item.difference !== 0;
                  return (
                    <View
                      key={item.id}
                      className={classnames(styles.detailItem, { [styles.mismatchItem]: isMismatch })}
                    >
                      <View className={styles.detailItemRow}>
                        <Text className={styles.detailItemLabel}>交易金额</Text>
                        <Text className={styles.detailItemValue}>¥{item.transactionAmount.toLocaleString()}</Text>
                      </View>
                      <View className={styles.detailItemRow}>
                        <Text className={styles.detailItemLabel}>系统金额</Text>
                        <Text className={styles.detailItemValue}>¥{item.systemAmount.toLocaleString()}</Text>
                      </View>
                      <View className={styles.detailItemRow}>
                        <Text className={styles.detailItemLabel}>差异金额</Text>
                        <Text className={classnames(styles.detailItemValue, { [styles.diffText]: isMismatch })}>
                          {item.difference > 0 ? '+' : ''}¥{item.difference.toLocaleString()}
                        </Text>
                      </View>
                      {item.remark && (
                        <View className={styles.detailItemRow}>
                          <Text className={styles.detailItemLabel}>备注</Text>
                          <Text className={styles.detailItemValue}>{item.remark}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className={styles.detailEmpty}>
                  <Text className={styles.detailEmptyText}>暂无交易明细</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default ReconciliationPage;
