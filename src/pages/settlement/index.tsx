import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useSettlementStore, bindTransactionStore, bindReconciliationStore } from '@/store/useSettlementStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { useAppInitStore } from '@/store/useAppInitStore';
import Empty from '@/components/Empty';
import styles from './index.module.scss';

const sellers = [
  { id: 'SELLER_001', name: '张明' },
  { id: 'SELLER_002', name: '李华' },
  { id: 'SELLER_003', name: '王芳' },
  { id: 'SELLER_004', name: '刘伟' },
  { id: 'SELLER_005', name: '陈静' }
];

const formatMoney = (value: number): string => {
  return value.toFixed(2).toLocaleString();
};

const SettlementPage: React.FC = () => {
  const [generateMonth, setGenerateMonth] = useState(dayjs().format('YYYY-MM'));
  const [generateSellerIndex, setGenerateSellerIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    settlements,
    generateSettlement,
    confirmSettlement,
    getStatusLabel
  } = useSettlementStore();

  const { reconciliations, getReconciliationById } = useReconciliationStore();

  useEffect(() => {
    bindTransactionStore(useTransactionStore);
    bindReconciliationStore(useReconciliationStore);
  }, []);

  useEffect(() => {
    useAppInitStore.getState().ensureInitialized();
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    if (params?.sellerId) {
      const index = sellers.findIndex(s => s.id === params.sellerId);
      if (index >= 0) {
        setGenerateSellerIndex(index);
      }
    }
  }, []);

  const completedTotal = useMemo(
    () => settlements.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0),
    [settlements]
  );

  const pendingTotal = useMemo(
    () => settlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.totalAmount, 0),
    [settlements]
  );

  const grandTotal = useMemo(
    () => settlements.reduce((sum, s) => sum + s.totalAmount, 0),
    [settlements]
  );

  const handleGenerate = useCallback(() => {
    const seller = sellers[generateSellerIndex];
    const confirmedRecs = reconciliations.filter(
      r => r.period === generateMonth && r.sellerId === seller.id && r.status === 'confirmed'
    );

    if (confirmedRecs.length === 0) {
      Taro.showToast({ title: '没有已确认的对账单', icon: 'none' });
      return;
    }

    const totalSettle = confirmedRecs.reduce((sum, r) => sum + r.totalSettle, 0);
    const recIds = confirmedRecs.map(r => r.id);

    const result = generateSettlement({
      period: generateMonth,
      sellerId: seller.id,
      sellerName: seller.name,
      reconciliationIds: recIds,
      totalAmount: totalSettle
    });

    if (result) {
      Taro.showToast({ title: '生成打款批次成功', icon: 'success' });
    } else {
      Taro.showToast({ title: '该月该卖家打款批次已存在', icon: 'none' });
    }
  }, [generateMonth, generateSellerIndex, reconciliations, generateSettlement]);

  const handleConfirm = useCallback((id: string) => {
    Taro.showModal({
      title: '确认打款',
      content: '确认已打款？此操作不可撤销',
      success: (res) => {
        if (res.confirm) {
          const result = confirmSettlement(id, '当前操作员');
          if (result) {
            const { settlement, transactionId } = result;
            Taro.showModal({
              title: '打款成功！',
              content: `流水编号：${transactionId ?? '-'}\n打款金额：¥${formatMoney(settlement.totalAmount)}\n卖家：${settlement.sellerName}\n关联对账单：${settlement.reconciliationIds.length}份`,
              showCancel: false
            });
          }
        }
      }
    });
  }, [confirmSettlement]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>💰 结算打款</Text>
      </View>

      <View className={styles.content}>
        <View className={styles.summaryCard}>
          <Text className={styles.summaryTitle}>打款汇总</Text>
          <View className={styles.summaryGrid}>
            <View className={styles.summaryItem}>
              <Text className={classnames(styles.summaryValue, styles.completed)}>
                ¥{formatMoney(completedTotal)}
              </Text>
              <Text className={styles.summaryLabel}>已结算</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={classnames(styles.summaryValue, styles.pending)}>
                ¥{formatMoney(pendingTotal)}
              </Text>
              <Text className={styles.summaryLabel}>待结算</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={classnames(styles.summaryValue, styles.total)}>
                ¥{formatMoney(grandTotal)}
              </Text>
              <Text className={styles.summaryLabel}>总打款</Text>
            </View>
          </View>
        </View>

        <View className={styles.generateSection}>
          <Text className={styles.generateTitle}>生成打款批次</Text>
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
            <View className={styles.submitBtn} onClick={handleGenerate}>
              <Text className={styles.submitBtnText}>生成打款批次</Text>
            </View>
          </View>
        </View>

        <View className={styles.settlementList}>
          <View className={styles.listTitleRow}>
            <Text className={styles.listTitle}>结算批次列表</Text>
          </View>

          {settlements.length > 0 ? (
            settlements.map(settlement => {
              const isExpanded = expandedId === settlement.id;
              const linkedRecs = settlement.reconciliationIds
                .map(rid => getReconciliationById(rid))
                .filter(Boolean);

              return (
                <View key={settlement.id} className={styles.settlementCard}>
                  <View className={styles.cardHeader}>
                    <Text className={styles.cardTitle}>
                      {settlement.sellerName} - {settlement.period}
                    </Text>
                    <Text className={classnames(styles.statusBadge, styles[settlement.status])}>
                      {getStatusLabel(settlement.status)}
                    </Text>
                  </View>

                  <View className={styles.cardBody}>
                    <View className={styles.cardRow}>
                      <Text className={styles.cardLabel}>打款金额</Text>
                      <Text className={classnames(styles.cardValue, styles.amount)}>
                        ¥{formatMoney(settlement.totalAmount)}
                      </Text>
                    </View>
                    <View className={styles.cardRow}>
                      <Text className={styles.cardLabel}>关联对账单</Text>
                      <Text className={styles.cardValue}>{settlement.reconciliationIds.length} 份</Text>
                    </View>
                    <View className={styles.cardRow}>
                      <Text className={styles.cardLabel}>创建时间</Text>
                      <Text className={styles.cardValue}>
                        {dayjs(settlement.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </View>
                    {settlement.confirmedBy && (
                      <View className={styles.cardRow}>
                        <Text className={styles.cardLabel}>操作人</Text>
                        <Text className={styles.cardValue}>{settlement.confirmedBy}</Text>
                      </View>
                    )}
                  </View>

                  <View className={styles.cardFooter}>
                    <Text
                      className={styles.expandBtn}
                      onClick={() => handleToggleExpand(settlement.id)}
                    >
                      {isExpanded ? '收起详情' : '查看关联对账单'}
                    </Text>
                    {settlement.status === 'pending' && (
                      <View
                        className={styles.confirmBtn}
                        onClick={() => handleConfirm(settlement.id)}
                      >
                        <Text className={styles.confirmBtnText}>确认打款</Text>
                      </View>
                    )}
                  </View>

                  {isExpanded && (
                    <View className={styles.detailSection}>
                      <Text className={styles.detailTitle}>关联对账单</Text>
                      {linkedRecs.length > 0 ? (
                        linkedRecs.map((linkedRec, idx) => (
                          <View key={linkedRec?.id ?? idx} className={styles.detailRow}>
                            <View className={styles.detailLine}>
                              <Text className={styles.detailText}>
                                {linkedRec?.period ?? '-'} 对账
                              </Text>
                              <Text className={styles.detailSep}>|</Text>
                              <Text className={styles.detailText}>
                                交易{linkedRec?.transactionCount ?? 0}笔
                              </Text>
                              <Text className={styles.detailSep}>|</Text>
                              <Text className={styles.detailText}>
                                抽成¥{formatMoney(linkedRec?.totalCommission ?? 0)}
                              </Text>
                              <Text className={styles.detailSep}>|</Text>
                              <Text className={styles.detailText}>
                                应结算¥{formatMoney(linkedRec?.totalSettle ?? 0)}
                              </Text>
                              <Text className={styles.detailSep}>|</Text>
                              <Text className={styles.detailText}>
                                确认人{linkedRec?.confirmedBy ?? '-'}
                              </Text>
                            </View>
                          </View>
                        ))) : (
                        <View className={styles.detailRow}>
                          <Text className={styles.detailLabel}>暂无关联对账单</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Empty text="暂无结算批次" />
          )}

          {settlements.length > 0 && (
            <View className={styles.loadMore}>
              <Text className={styles.loadMoreText}>— 已加载全部 —</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default SettlementPage;
