import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { CommissionTier } from '@/types';
import { commissionService } from '@/services/commissionService';
import styles from './index.module.scss';

interface CommissionTierCardProps {
  tier: CommissionTier;
  isActive?: boolean;
  isNext?: boolean;
  progress?: number;
}

const CommissionTierCard: React.FC<CommissionTierCardProps> = ({ tier, isActive, isNext, progress = 0 }) => {
  return (
    <View className={classnames(styles.card, { [styles.active]: isActive, [styles.next]: isNext })}>
      <View className={styles.header}>
        <View className={classnames(styles.tierBadge, { [styles.activeBadge]: isActive })}>
          <Text className={styles.tierText}>第{tier.tier}档</Text>
        </View>
        {isActive && (
          <View className={styles.activeTag}>
            <Text className={styles.activeText}>当前档位</Text>
          </View>
        )}
        {isNext && (
          <View className={styles.nextTag}>
            <Text className={styles.nextText}>下一档</Text>
          </View>
        )}
      </View>

      <View className={styles.content}>
        <Text className={styles.rateText}>抽成 {commissionService.formatRate(tier.rate)}</Text>
        <Text className={styles.descText}>{commissionService.formatTierDescription(tier)}</Text>
      </View>

      {isNext && progress > 0 && progress < 100 && (
        <View className={styles.progressWrapper}>
          <View className={styles.progressBar}>
            <View className={styles.progressFill} style={{ width: `${progress}%` }} />
          </View>
          <Text className={styles.progressText}>{progress.toFixed(1)}%</Text>
        </View>
      )}

      {isActive && (
        <View className={styles.savingTip}>
          <Text className={styles.savingText}>✨ 比第1档少抽{(0.15 - tier.rate) * 100}%</Text>
        </View>
      )}
    </View>
  );
};

export default CommissionTierCard;
