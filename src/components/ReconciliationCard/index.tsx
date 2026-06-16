import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Reconciliation } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import type { ITouchEvent } from '@tarojs/components';
import styles from './index.module.scss';

interface ReconciliationCardProps {
  reconciliation: Reconciliation;
  onConfirm?: (id: string) => void;
  onViewDetail?: (id: string) => void;
}

const ReconciliationCard: React.FC<ReconciliationCardProps> = ({
  reconciliation,
  onConfirm,
  onViewDetail
}) => {
  const handleConfirm = (e: ITouchEvent) => {
    e.stopPropagation();
    onConfirm?.(reconciliation.id);
  };

  const handleViewDetail = () => {
    onViewDetail?.(reconciliation.id);
  };

  return (
    <View className={styles.card} onClick={handleViewDetail}>
      <View className={styles.header}>
        <View className={styles.periodInfo}>
          <Text className={styles.periodText}>{reconciliation.period} 对账单</Text>
          <Text className={styles.timeText}>
            创建于 {dayjs(reconciliation.createdAt).format('MM-DD HH:mm')}
          </Text>
        </View>
        <StatusBadge
          status={reconciliation.status as any}
          text={
            reconciliation.status === 'pending'
              ? '待对账'
              : reconciliation.status === 'matched'
              ? '已匹配'
              : reconciliation.status === 'mismatch'
              ? '有差异'
              : '已确认'
          }
          size="sm"
        />
      </View>

      <View className={styles.sellerInfo}>
        <Text className={styles.sellerLabel}>卖家：</Text>
        <Text className={styles.sellerName}>{reconciliation.sellerName}</Text>
      </View>

      <View className={styles.statsRow}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>¥{reconciliation.totalAmount.toFixed(2)}</Text>
          <Text className={styles.statLabel}>交易总额</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statValue}>¥{reconciliation.totalCommission.toFixed(2)}</Text>
          <Text className={styles.statLabel}>平台抽成</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={classnames(styles.statValue, styles.settleValue)}>
            ¥{reconciliation.totalSettle.toFixed(2)}
          </Text>
          <Text className={styles.statLabel}>应结算</Text>
        </View>
      </View>

      <View className={styles.transactionCount}>
        <Text className={styles.countLabel}>交易笔数：</Text>
        <Text className={styles.countValue}>{reconciliation.transactionCount} 笔</Text>
      </View>

      {reconciliation.remark && (
        <View className={styles.remarkRow}>
          <Text className={styles.remarkLabel}>备注：</Text>
          <Text className={styles.remarkText}>{reconciliation.remark}</Text>
        </View>
      )}

      {reconciliation.status === 'matched' && (
        <View className={styles.actionRow}>
          <Button className={styles.confirmBtn} onClick={handleConfirm}>
            <Text className={styles.btnText}>确认对账</Text>
          </Button>
        </View>
      )}
    </View>
  );
};

export default ReconciliationCard;
