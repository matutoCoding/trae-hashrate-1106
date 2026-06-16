import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import TransactionCard from '@/components/TransactionCard';
import Empty from '@/components/Empty';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useCommissionStore } from '@/store/useCommissionStore';
import { mockTransactions, mockSplitDetails } from '@/data/transactionData';
import { mockSellerStats } from '@/data/commissionData';
import styles from './index.module.scss';

const TransactionPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    transactions,
    setTransactions,
    setSplitDetails,
    filterTransactions,
    getTransactionSummary
  } = useTransactionStore();

  const { setSellerStats } = useCommissionStore();

  useEffect(() => {
    console.log('[TransactionPage] 初始化流水数据');
    setTransactions(mockTransactions);
    setSplitDetails(mockSplitDetails);
    setSellerStats(mockSellerStats);
  }, [setTransactions, setSplitDetails, setSellerStats]);

  usePullDownRefresh(() => {
    console.log('[TransactionPage] 下拉刷新');
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const handleViewDetail = useCallback((transactionId: string) => {
    console.log('[TransactionPage] 查看流水详情', { transactionId });
    Taro.navigateTo({ url: '/pages/transaction-detail/index' });
  }, []);

  const filteredTransactions = filterTransactions({
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter
  });

  const summary = getTransactionSummary({
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter
  });

  const typeFilters = [
    { key: 'all', label: '全部' },
    { key: 'sale', label: '销售收入' },
    { key: 'refund', label: '退款' }
  ];

  const statusFilters = [
    { key: 'all', label: '全部状态' },
    { key: 'completed', label: '已完成' },
    { key: 'pending', label: '处理中' },
    { key: 'failed', label: '失败' }
  ];

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  const netIncome = totalIncome - totalExpense;

  return (
    <View className={styles.page}>
      <View className={styles.statsSection}>
        <Text className={styles.title}>💰 流水登记</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statLabel}>总收入</Text>
            <Text className={classnames(styles.statValue, styles.income)}>¥{totalIncome.toFixed(2)}</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statLabel}>总支出</Text>
            <Text className={classnames(styles.statValue, styles.expense)}>¥{totalExpense.toFixed(2)}</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statLabel}>净收入</Text>
            <Text className={classnames(styles.statValue, styles.net)}>¥{netIncome.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.filterSection}>
          <Text className={styles.filterLabel}>交易类型</Text>
          <ScrollView
            scrollX
            className={styles.filterRow}
            enhanced
            showScrollbar={false}
          >
            {typeFilters.map(filter => (
              <View
                key={filter.key}
                className={classnames(styles.filterItem, { [styles.active]: typeFilter === filter.key })}
                onClick={() => setTypeFilter(filter.key)}
              >
                <Text className={styles.filterText}>{filter.label}</Text>
              </View>
            ))}
          </ScrollView>

          <Text className={styles.filterLabel}>交易状态</Text>
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
          <Text className={styles.summaryTitle}>筛选结果汇总</Text>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>交易笔数</Text>
            <Text className={styles.value}>{summary.count} 笔</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>交易总额</Text>
            <Text className={classnames(styles.value, styles.highlight)}>¥{summary.totalAmount.toFixed(2)}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>平台抽成</Text>
            <Text className={styles.value}>¥{summary.totalCommission.toFixed(2)}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.label}>卖家实收</Text>
            <Text className={styles.value}>¥{summary.totalSellerReceive.toFixed(2)}</Text>
          </View>
        </View>

        <ScrollView scrollY>
          <View className={styles.listSection}>
            <Text className={styles.listTitle}>流水明细</Text>

            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(transaction => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onClick={handleViewDetail}
                />
              ))
            ) : (
              <Empty text="暂无流水记录" />
            )}

            {filteredTransactions.length > 0 && (
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

export default TransactionPage;
