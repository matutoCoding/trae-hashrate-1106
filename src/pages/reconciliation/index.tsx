import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Picker, Input } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import ReconciliationCard from '@/components/ReconciliationCard';
import Empty from '@/components/Empty';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useAppInitStore } from '@/store/useAppInitStore';
import styles from './index.module.scss';

const sellers = [
  { id: 'SELLER_001', name: '张明' },
  { id: 'SELLER_002', name: '李华' },
  { id: 'SELLER_003', name: '王芳' },
  { id: 'SELLER_004', name: '刘伟' },
  { id: 'SELLER_005', name: '陈静' }
];

const statusLabelMap: Record<string, string> = {
  pending: '待对账',
  matched: '已匹配',
  mismatch: '有差异',
  confirmed: '已确认'
};

const ReconciliationPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailReconciliationId, setDetailReconciliationId] = useState<string | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(dayjs().format('YYYY-MM'));
  const [generateSellerIndex, setGenerateSellerIndex] = useState(0);
  const [editValues, setEditValues] = useState<Record<string, { systemAmount: string; remark: string }>>({});

  const {
    reconciliations,
    confirmReconciliation,
    getReconciliationItems: getItems,
    getReconciliationById,
    generateReconciliationFromTransactions,
    syncReconciliationFromTransactions,
    updateReconciliationItem
  } = useReconciliationStore();

  const { transactions } = useTransactionStore();

  useEffect(() => {
    useAppInitStore.getState().ensureInitialized();
  }, []);

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 1000);
  });

  const handleConfirm = useCallback((id: string) => {
    const items = getItems(id);
    const hasMismatch = items.some(i => i.status === 'mismatch' || i.difference !== 0);

    const content = hasMismatch
      ? `该对账单存在差异记录（${items.filter(i => i.status === 'mismatch').length}条），确认后将无法修改，是否继续？`
      : '确认后将无法修改，是否继续？';

    Taro.showModal({
      title: hasMismatch ? '⚠️ 存在差异' : '确认对账',
      content,
      success: (res) => {
        if (res.confirm) {
          const result = confirmReconciliation(id, '当前操作员');
          if (result) {
            Taro.showToast({ title: '对账确认成功', icon: 'success' });
          } else {
            Taro.showToast({ title: '确认失败，可能已确认', icon: 'none' });
          }
        }
      }
    });
  }, [confirmReconciliation, getReconciliationById, getItems]);

  const handleViewDetail = useCallback((id: string) => {
    setDetailReconciliationId(id);
    setEditValues({});
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailReconciliationId(null);
    setEditValues({});
  }, []);

  const handleGenerate = useCallback(() => {
    const seller = sellers[generateSellerIndex];
    const result = generateReconciliationFromTransactions({
      period: generateMonth,
      sellerId: seller.id,
      sellerName: seller.name,
      transactions
    });
    if (result) {
      Taro.showToast({ title: '生成成功', icon: 'success' });
      setShowGenerateForm(false);
    } else {
      Taro.showToast({ title: '该月该卖家对账单已存在', icon: 'none' });
    }
  }, [generateMonth, generateSellerIndex, generateReconciliationFromTransactions, transactions]);

  const handleSync = useCallback(() => {
    const seller = sellers[generateSellerIndex];
    const result = syncReconciliationFromTransactions({
      period: generateMonth,
      sellerId: seller.id,
      sellerName: seller.name,
      transactions
    });
    if (result) {
      Taro.showToast({ title: '增量同步成功', icon: 'success' });
      setShowGenerateForm(false);
    } else {
      Taro.showToast({ title: '该账单已确认，无法同步', icon: 'none' });
    }
  }, [generateMonth, generateSellerIndex, syncReconciliationFromTransactions, transactions]);

  const handleSystemAmountChange = useCallback((itemId: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { systemAmount: '', remark: '' }),
        systemAmount: value
      }
    }));
  }, []);

  const handleRemarkChange = useCallback((itemId: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { systemAmount: '', remark: '' }),
        remark: value
      }
    }));
  }, []);

  const handleItemBlur = useCallback((itemId: string) => {
    const edit = editValues[itemId];
    if (!edit) return;
    const systemAmount = parseFloat(edit.systemAmount);
    if (isNaN(systemAmount)) return;
    updateReconciliationItem({
      itemId,
      systemAmount,
      remark: edit.remark
    });
  }, [editValues, updateReconciliationItem]);

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
            <View className={styles.listTitleRow}>
              <Text className={styles.listTitle}>对账单列表</Text>
              <View
                className={styles.generateBtn}
                onClick={() => setShowGenerateForm(prev => !prev)}
              >
                <Text className={styles.generateBtnText}>
                  {showGenerateForm ? '收起' : '+ 生成对账单'}
                </Text>
              </View>
            </View>

            {showGenerateForm && (
              <View className={styles.generateForm}>
                <View className={styles.formRow}>
                  <Text className={styles.formLabel}>月份</Text>
                  <Picker
                    mode='date'
                    fields='month'
                    value={generateMonth}
                    onChange={e => setGenerateMonth(e.detail.value)}
                  >
                    <View className={styles.pickerValue}>
                      <Text>{generateMonth}</Text>
                    </View>
                  </Picker>
                </View>
                <View className={styles.formRow}>
                  <Text className={styles.formLabel}>卖家</Text>
                  <Picker
                    mode='selector'
                    range={sellers.map(s => s.name)}
                    value={generateSellerIndex}
                    onChange={e => setGenerateSellerIndex(Number(e.detail.value))}
                  >
                    <View className={styles.pickerValue}>
                      <Text>{sellers[generateSellerIndex].name}</Text>
                    </View>
                  </Picker>
                </View>
                <View className={styles.formActions}>
                  <View className={styles.formSubmitBtn} onClick={handleGenerate}>
                    <Text className={styles.formSubmitBtnText}>生成</Text>
                  </View>
                  <View className={styles.formSubmitBtn} onClick={handleSync}>
                    <Text className={styles.formSubmitBtnText}>增量同步</Text>
                  </View>
                </View>
              </View>
            )}

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

              {detailReconciliation.status === 'confirmed' && detailReconciliation.confirmedAt && (
                <View className={styles.confirmedInfo}>
                  <Text className={styles.confirmedText}>
                    确认人：{detailReconciliation.confirmedBy || '未知'} · 确认时间：{dayjs(detailReconciliation.confirmedAt).format('YYYY-MM-DD HH:mm')}
                  </Text>
                  <Text className={styles.lockedText}>已锁定，不可修改</Text>
                </View>
              )}

              <View className={styles.detailListHeader}>
                <Text className={styles.detailListTitle}>交易明细</Text>
                <Text className={styles.detailListCount}>{detailItems.length} 条</Text>
              </View>

              {detailItems.length > 0 ? (
                detailItems.map(item => {
                  const isMismatch = item.status === 'mismatch' || item.difference !== 0;
                  const canEdit = item.editable && detailReconciliation.status !== 'confirmed';
                  const editValue = editValues[item.id];
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
                        {canEdit ? (
                          <Input
                            className={styles.editInput}
                            type='digit'
                            value={editValue?.systemAmount ?? String(item.systemAmount)}
                            onInput={e => handleSystemAmountChange(item.id, e.detail.value)}
                            onBlur={() => handleItemBlur(item.id)}
                          />
                        ) : (
                          <Text className={styles.detailItemValue}>¥{item.systemAmount.toLocaleString()}</Text>
                        )}
                      </View>
                      <View className={styles.detailItemRow}>
                        <Text className={styles.detailItemLabel}>差异金额</Text>
                        <Text className={classnames(styles.detailItemValue, { [styles.diffText]: isMismatch })}>
                          {item.difference > 0 ? '+' : ''}¥{item.difference.toLocaleString()}
                        </Text>
                      </View>
                      <View className={styles.detailItemRow}>
                        <Text className={styles.detailItemLabel}>差异备注</Text>
                        {canEdit ? (
                          <Input
                            className={styles.editInput}
                            value={editValue?.remark ?? item.remark ?? ''}
                            placeholder='输入备注'
                            onInput={e => handleRemarkChange(item.id, e.detail.value)}
                            onBlur={() => handleItemBlur(item.id)}
                          />
                        ) : (
                          <Text className={styles.detailItemValue}>{item.remark || '-'}</Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className={styles.detailEmpty}>
                  <Text className={styles.detailEmptyText}>暂无交易明细</Text>
                </View>
              )}

              {detailReconciliation.status !== 'confirmed' && (
                <View className={styles.detailActions}>
                  <View
                    className={styles.confirmBtn}
                    onClick={() => handleConfirm(detailReconciliation.id)}
                  >
                    <Text className={styles.confirmBtnText}>确认对账</Text>
                  </View>
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
