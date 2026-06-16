import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import type { BlindBox } from '@/types';
import BoxCard from '@/components/BoxCard';
import Empty from '@/components/Empty';
import { useBoxStore } from '@/store/useBoxStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useCommissionStore } from '@/store/useCommissionStore';
import { useAppInitStore } from '@/store/useAppInitStore';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');

  const {
    boxes,
    tryMatchBox,
    completeMatch,
    releaseBoxLock,
    matchRecords,
    getAvailableBoxes,
    getLockedBoxes,
    cleanupExpiredLocks
  } = useBoxStore();

  const { createTransactionFromMatch, transactions } = useTransactionStore();
  const { updateSellerStatsAfterTransaction, getSellerStats } = useCommissionStore();

  useEffect(() => {
    useAppInitStore.getState().ensureInitialized();

    const timer = setInterval(() => {
      const expired = cleanupExpiredLocks();
      if (expired.length > 0) {
        console.log('[HomePage] 自动释放超时锁定', expired);
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [cleanupExpiredLocks]);

  useDidShow(() => {
    console.log('[HomePage] 页面显示，清理超时锁定');
    cleanupExpiredLocks();
  });

  usePullDownRefresh(() => {
    console.log('[HomePage] 下拉刷新');
    setTimeout(() => {
      cleanupExpiredLocks();
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const handleMatch = useCallback((boxId: string) => {
    console.log('[HomePage] 发起撮合', { boxId });

    const result = tryMatchBox(boxId, 'BUYER_CURRENT', '当前用户');

    if (result.success && result.record) {
      Taro.showModal({
        title: '撮合成功',
        content: `已锁定【${result.record.boxName}】，请在15分钟内完成支付。\n\n价格：¥${result.record.price}\n卖家：${result.record.sellerName}`,
        confirmText: '确认支付',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            console.log('[HomePage] 用户确认支付', { matchId: result.record!.id });

            const sellerStat = getSellerStats(result.record!.sellerId);
            const totalSales = sellerStat?.totalSales || 0;

            const { transaction } = createTransactionFromMatch(result.record!, totalSales);
            completeMatch(result.record!.id);
            updateSellerStatsAfterTransaction({
              sellerId: result.record!.sellerId,
              sellerName: result.record!.sellerName,
              amount: result.record!.price,
              commissionAmount: transaction.commissionAmount,
              sellerReceiveAmount: transaction.sellerReceiveAmount
            });

            console.log('[HomePage] 交易完成', { transactionId: transaction.id });
            Taro.showModal({
              title: '购买成功！',
              content: `流水编号：${transaction.id}\n卖家实收：¥${transaction.sellerReceiveAmount.toFixed(2)}\n平台抽成：¥${transaction.commissionAmount.toFixed(2)}`,
              showCancel: false
            });
          } else {
            console.log('[HomePage] 用户取消支付');
            releaseBoxLock(boxId);
            Taro.showToast({
              title: '已取消，锁定已释放',
              icon: 'none',
              duration: 2000
            });
          }
        }
      });
    } else {
      Taro.showToast({
        title: result.message,
        icon: 'none',
        duration: 2000
      });
    }
  }, [tryMatchBox, createTransactionFromMatch, completeMatch, updateSellerStatsAfterTransaction, releaseBoxLock]);

  const handleViewDetail = useCallback((boxId: string) => {
    console.log('[HomePage] 查看盲盒详情', { boxId });
    Taro.navigateTo({ url: '/pages/box-detail/index' });
  }, []);

  const handleCompleteTransaction = useCallback((boxId: string) => {
    const activeRecord = matchRecords.find(
      r => r.boxId === boxId && r.status === 'matched'
    );

    if (!activeRecord) {
      Taro.showToast({ title: '未找到活跃的撮合记录', icon: 'none' });
      return;
    }

    const sellerStat = getSellerStats(activeRecord.sellerId);
    const totalSales = sellerStat?.totalSales || 0;

    const { transaction } = createTransactionFromMatch(activeRecord, totalSales);
    completeMatch(activeRecord.id);
    updateSellerStatsAfterTransaction({
      sellerId: activeRecord.sellerId,
      sellerName: activeRecord.sellerName,
      amount: activeRecord.price,
      commissionAmount: transaction.commissionAmount,
      sellerReceiveAmount: transaction.sellerReceiveAmount
    });

    Taro.showModal({
      title: '购买成功！',
      content: `流水编号：${transaction.id}\n卖家实收：¥${transaction.sellerReceiveAmount.toFixed(2)}\n平台抽成：¥${transaction.commissionAmount.toFixed(2)}`,
      showCancel: false
    });
  }, [matchRecords, createTransactionFromMatch, completeMatch, updateSellerStatsAfterTransaction]);

  const filterBoxes = useCallback((boxes: BlindBox[]): BlindBox[] => {
    switch (filterType) {
      case 'available':
        return getAvailableBoxes();
      case 'locked':
        return getLockedBoxes();
      case 'sold':
        return boxes.filter(b => b.status === 'sold');
      default:
        return boxes;
    }
  }, [filterType, getAvailableBoxes, getLockedBoxes]);

  const filteredBoxes = filterBoxes(boxes);
  const availableCount = getAvailableBoxes().length;
  const lockedCount = getLockedBoxes().length;

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'available', label: '可购买' },
    { key: 'locked', label: '锁定中' },
    { key: 'sold', label: '已售出' }
  ];

  const getTransactionInfo = useCallback((boxId: string) => {
    const txn = transactions.find(t => t.boxId === boxId && t.status === 'completed');
    if (!txn) return undefined;
    return { transactionId: txn.id, sellerReceive: txn.sellerReceiveAmount };
  }, [transactions]);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>🎁 撮合大厅</Text>
        <View className={styles.statsRow}>
          <View className={classnames(styles.statCard, styles.available)}>
            <Text className={styles.statNumber}>{availableCount}</Text>
            <Text className={styles.statLabel}>可购买</Text>
          </View>
          <View className={classnames(styles.statCard, styles.locked)}>
            <Text className={styles.statNumber}>{lockedCount}</Text>
            <Text className={styles.statLabel}>锁定中</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <ScrollView
          scrollY
          className={styles.filterBar}
          enhanced
          showScrollbar={false}
        >
          {filters.map(filter => (
            <View
              key={filter.key}
              className={classnames(styles.filterItem, { [styles.active]: filterType === filter.key })}
              onClick={() => setFilterType(filter.key)}
            >
              <Text className={styles.filterText}>{filter.label}</Text>
            </View>
          ))}
        </ScrollView>

        <ScrollView scrollY>
          {filteredBoxes.length > 0 ? (
            <View className={styles.gridList}>
              {filteredBoxes.map(box => (
                <View key={box.id} className={styles.gridItem}>
                  <BoxCard
                    box={box}
                    onMatch={handleMatch}
                    onViewDetail={handleViewDetail}
                    onCompleteTransaction={handleCompleteTransaction}
                    transactionInfo={getTransactionInfo(box.id)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Empty text="暂无盲盒商品" />
          )}

          {filteredBoxes.length > 0 && (
            <View className={styles.loadMore}>
              <Text className={styles.loadMoreText}>— 已加载全部 —</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default HomePage;
