import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Transaction } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { transactionService } from '@/services/transactionService';
import { commissionService } from '@/services/commissionService';
import styles from './index.module.scss';

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: (transactionId: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onClick }) => {
  const isIncome = transaction.type === 'sale' && transaction.amount > 0;

  const handleClick = () => {
    onClick?.(transaction.id);
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.typeInfo}>
          <View className={classnames(styles.typeIcon, { [styles.income]: isIncome, [styles.expense]: !isIncome })}>
            <Text className={styles.iconText}>{isIncome ? '📈' : '📉'}</Text>
          </View>
          <View className={styles.typeContent}>
            <Text className={styles.typeText}>
              {transactionService.getTransactionTypeLabel(transaction.type)}
            </Text>
            <Text className={styles.timeText}>
              {dayjs(transaction.createdAt).format('MM-DD HH:mm')}
            </Text>
          </View>
        </View>
        <StatusBadge
          status={transaction.status as any}
          text={transactionService.getTransactionStatusLabel(transaction.status)}
          size="sm"
        />
      </View>

      {transaction.boxName && (
        <View className={styles.boxInfo}>
          <Text className={styles.boxLabel}>商品：</Text>
          <Text className={styles.boxName}>{transaction.boxName}</Text>
        </View>
      )}

      <View className={styles.divider} />

      <View className={styles.amountRow}>
        <Text className={styles.amountLabel}>交易金额</Text>
        <Text className={classnames(styles.amountValue, { [styles.positive]: isIncome, [styles.negative]: !isIncome })}>
          {transactionService.formatAmount(transaction.amount)}
        </Text>
      </View>

      <View className={styles.splitRow}>
        <View className={styles.splitItem}>
          <Text className={styles.splitLabel}>卖家实收</Text>
          <Text className={styles.splitValue}>¥{transaction.sellerReceiveAmount.toFixed(2)}</Text>
        </View>
        <View className={styles.splitItem}>
          <Text className={styles.splitLabel}>平台抽成</Text>
          <Text className={styles.splitValue}>¥{transaction.commissionAmount.toFixed(2)}</Text>
        </View>
        <View className={styles.splitItem}>
          <Text className={styles.splitLabel}>抽成比例</Text>
          <Text className={styles.splitValue}>{commissionService.formatRate(transaction.commissionRate)}</Text>
        </View>
      </View>

      {transaction.remark && (
        <View className={styles.remarkRow}>
          <Text className={styles.remarkLabel}>备注：</Text>
          <Text className={styles.remarkText}>{transaction.remark}</Text>
        </View>
      )}
    </View>
  );
};

export default TransactionCard;
