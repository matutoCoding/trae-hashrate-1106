import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { BlindBox } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { matchService } from '@/services/matchService';
import styles from './index.module.scss';

interface BoxCardProps {
  box: BlindBox;
  onMatch?: (boxId: string) => void;
  onViewDetail?: (boxId: string) => void;
  onCompleteTransaction?: (boxId: string) => void;
  transactionInfo?: { transactionId: string; sellerReceive: number };
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onMatch, onViewDetail, onCompleteTransaction, transactionInfo }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (box.status === 'locked' && box.lockedAt) {
      const remaining = matchService.getRemainingLockTime(box.lockedAt);
      setCountdown(remaining);

      const timer = setInterval(() => {
        const newRemaining = matchService.getRemainingLockTime(box.lockedAt!);
        setCountdown(newRemaining);
        if (newRemaining <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [box.status, box.lockedAt]);

  const statusMap = {
    available: { text: '可购买', status: 'available' },
    locked: { text: '已锁定', status: 'locked' },
    sold: { text: '已售出', status: 'sold' },
    released: { text: '已释放', status: 'released' }
  };

  const handleMatch = () => {
    const lockStatus = matchService.checkBoxLockStatus(box);
    if (!lockStatus.canMatch) {
      Taro.showToast({ title: lockStatus.reason || '无法购买', icon: 'none' });
      return;
    }
    onMatch?.(box.id);
  };

  const handleCardClick = () => {
    onViewDetail?.(box.id);
  };

  return (
    <View className={styles.card} onClick={handleCardClick}>
      <View className={styles.imageWrapper}>
        <Image
          className={styles.image}
          src={`https://picsum.photos/id/${box.imageId}/300/300`}
          mode="aspectFill"
        />
        <View className={styles.seriesTag}>
          <Text className={styles.seriesText}>{box.series}</Text>
        </View>
        <StatusBadge
          status={statusMap[box.status].status as any}
          text={statusMap[box.status].text}
          size="sm"
        />
      </View>

      <View className={styles.content}>
        <View className={styles.nameRow}>
          <Text className={styles.name}>{box.name}</Text>
          <Text className={styles.price}>¥{box.price}</Text>
        </View>

        <View className={styles.sellerRow}>
          <Text className={styles.sellerLabel}>卖家：</Text>
          <Text className={styles.sellerName}>{box.sellerName}</Text>
        </View>

        {box.status === 'locked' && countdown !== null && countdown > 0 && (
          <View className={styles.lockInfo}>
            <Text className={styles.lockText}>
              已被{box.lockedByName}锁定，剩余
              <Text className={styles.countdown}>
                {matchService.formatLockTime(countdown)}
              </Text>
              后释放
            </Text>
          </View>
        )}

        <View className={styles.actionRow}>
          <Button
            className={classnames(styles.matchBtn, {
              [styles.disabled]: box.status !== 'available'
            })}
            onClick={(e) => {
              e.stopPropagation();
              handleMatch();
            }}
            disabled={box.status !== 'available'}
          >
            <Text className={styles.btnText}>
              {box.status === 'available' ? '立即购买' : box.status === 'locked' ? '锁定中' : '已售出'}
            </Text>
          </Button>
          {box.status === 'locked' && onCompleteTransaction && (
            <Button
              className={styles.completeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onCompleteTransaction(box.id);
              }}
            >
              <Text className={styles.btnText}>完成交易</Text>
            </Button>
          )}
        </View>

        {box.status === 'sold' && transactionInfo && (
          <View className={styles.transactionInfo}>
            <Text className={styles.transactionText}>
              流水号 {transactionInfo.transactionId} | 卖家实收 ¥{transactionInfo.sellerReceive.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default BoxCard;
