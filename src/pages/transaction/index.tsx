import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Picker, Input } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import TransactionCard from '@/components/TransactionCard';
import Empty from '@/components/Empty';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useCommissionStore } from '@/store/useCommissionStore';
import { useBoxStore } from '@/store/useBoxStore';
import { useAppInitStore } from '@/store/useAppInitStore';
import styles from './index.module.scss';

const sellerNames = [
  { id: 'SELLER_001', name: '张明' },
  { id: 'SELLER_002', name: '李华' },
  { id: 'SELLER_003', name: '王芳' },
  { id: 'SELLER_004', name: '刘伟' },
  { id: 'SELLER_005', name: '陈静' }
];

const buyerNames = [
  { id: 'BUYER_001', name: '赵强' },
  { id: 'BUYER_002', name: '孙丽' },
  { id: 'BUYER_003', name: '周杰' },
  { id: 'BUYER_004', name: '吴敏' },
  { id: 'BUYER_005', name: '郑涛' }
];

const TransactionPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [selectedSellerIndex, setSelectedSellerIndex] = useState(0);
  const [selectedBuyerIndex, setSelectedBuyerIndex] = useState(0);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(-1);
  const [boxSelected, setBoxSelected] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const {
    transactions,
    filterTransactions,
    getTransactionSummary,
    createManualTransactionFromForm
  } = useTransactionStore();

  const { getSellerStats, getCurrentRate, updateSellerStatsAfterTransaction } = useCommissionStore();
  const { getAvailableBoxes, markBoxAsSold } = useBoxStore();

  useEffect(() => {
    useAppInitStore.getState().ensureInitialized();
  }, []);

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const handleViewDetail = useCallback((_transactionId: string) => {
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

  const seller = sellerNames[selectedSellerIndex];
  const buyer = buyerNames[selectedBuyerIndex];

  const availableBoxes = useMemo(() => {
    const allAvailable = getAvailableBoxes();
    return allAvailable.filter(b => b.sellerId === seller.id);
  }, [getAvailableBoxes, seller.id, transactions]);

  const box = boxSelected && selectedBoxIndex >= 0 && selectedBoxIndex < availableBoxes.length ? availableBoxes[selectedBoxIndex] : null;

  const sellerStats = getSellerStats(seller.id);
  const sellerTotalSales = sellerStats?.totalSales || 0;
  const currentRate = getCurrentRate(sellerTotalSales);

  const amount = parseFloat(amountInput) || 0;
  const platformCommission = amount * currentRate;
  const sellerReceive = amount - platformCommission;

  const handleSellerChange = useCallback((e) => {
    setSelectedSellerIndex(e.detail.value);
    setSelectedBoxIndex(-1);
    setBoxSelected(false);
  }, []);

  const handleBuyerChange = useCallback((e) => {
    setSelectedBuyerIndex(e.detail.value);
  }, []);

  const handleBoxChange = useCallback((e) => {
    setSelectedBoxIndex(e.detail.value);
    setBoxSelected(true);
  }, []);

  const handleAmountInput = useCallback((e) => {
    setAmountInput(e.detail.value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!boxSelected || !box) {
      Taro.showToast({ title: '请选择盲盒', icon: 'none' });
      return;
    }

    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    createManualTransactionFromForm({
      sellerId: seller.id,
      sellerName: seller.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      boxId: box?.id,
      boxName: box?.name,
      amount,
      sellerTotalSales
    });

    updateSellerStatsAfterTransaction({
      sellerId: seller.id,
      sellerName: seller.name,
      amount,
      commissionAmount: platformCommission,
      sellerReceiveAmount: sellerReceive
    });

    if (box) {
      markBoxAsSold(box.id);
    }

    Taro.showToast({ title: '新增成功', icon: 'success' });

    setShowForm(false);
    setAmountInput('');
    setSelectedSellerIndex(0);
    setSelectedBuyerIndex(0);
    setSelectedBoxIndex(-1);
    setBoxSelected(false);
  }, [amount, seller, buyer, box, boxSelected, sellerTotalSales, platformCommission, sellerReceive, createManualTransactionFromForm, updateSellerStatsAfterTransaction, markBoxAsSold]);

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
        <View
          className={classnames(styles.addBtn, { [styles.addBtnActive]: showForm })}
          onClick={() => setShowForm(!showForm)}
        >
          <Text className={styles.addBtnText}>{showForm ? '收起表单' : '＋ 新增流水'}</Text>
        </View>

        {showForm && (
          <View className={styles.formSection}>
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>选择卖家</Text>
              <Picker mode='selector' range={sellerNames.map(s => s.name)} value={selectedSellerIndex} onChange={handleSellerChange}>
                <View className={styles.pickerValue}>
                  <Text className={styles.pickerText}>{seller.name}</Text>
                  <Text className={styles.pickerArrow}>▼</Text>
                </View>
              </Picker>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>选择买家</Text>
              <Picker mode='selector' range={buyerNames.map(b => b.name)} value={selectedBuyerIndex} onChange={handleBuyerChange}>
                <View className={styles.pickerValue}>
                  <Text className={styles.pickerText}>{buyer.name}</Text>
                  <Text className={styles.pickerArrow}>▼</Text>
                </View>
              </Picker>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>选择盲盒<Text className={styles.required}>（必选）</Text></Text>
              <Picker
                mode='selector'
                range={availableBoxes.length > 0 ? availableBoxes.map(b => b.name) : ['暂无可用盲盒']}
                value={availableBoxes.length > 0 ? Math.max(selectedBoxIndex, 0) : 0}
                onChange={availableBoxes.length > 0 ? handleBoxChange : undefined}
              >
                <View className={styles.pickerValue}>
                  <Text className={styles.pickerText}>
                    {availableBoxes.length > 0 ? (boxSelected ? box?.name : '请选择盲盒') : '暂无可用盲盒'}
                  </Text>
                  <Text className={styles.pickerArrow}>▼</Text>
                </View>
              </Picker>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>成交金额</Text>
              <Input
                className={styles.amountInput}
                type='digit'
                placeholder='请输入成交金额'
                value={amountInput}
                onInput={handleAmountInput}
              />
            </View>

            {seller.id && (
              <View className={styles.calcResult}>
                <View className={styles.calcRow}>
                  <Text className={styles.calcLabel}>当月累计成交额</Text>
                  <Text className={styles.calcValue}>¥{sellerTotalSales.toFixed(2)}</Text>
                </View>
                <View className={styles.calcRow}>
                  <Text className={styles.calcLabel}>当前抽成比例</Text>
                  <Text className={styles.calcValue}>{(currentRate * 100).toFixed(1)}%</Text>
                </View>
                <View className={styles.calcRow}>
                  <Text className={styles.calcLabel}>平台抽成</Text>
                  <Text className={classnames(styles.calcValue, styles.expense)}>¥{platformCommission.toFixed(2)}</Text>
                </View>
                <View className={styles.calcRow}>
                  <Text className={styles.calcLabel}>卖家实收</Text>
                  <Text className={classnames(styles.calcValue, styles.income)}>¥{sellerReceive.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View className={styles.submitBtn} onClick={handleSubmit}>
              <Text className={styles.submitBtnText}>确认提交</Text>
            </View>
          </View>
        )}

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
