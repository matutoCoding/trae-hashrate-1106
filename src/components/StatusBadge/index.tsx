import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatusBadgeProps {
  status: 'available' | 'locked' | 'sold' | 'released' | 'matched' | 'completed' | 'cancelled' | 'pending' | 'mismatch' | 'confirmed';
  text: string;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, size = 'md' }) => {
  return (
    <View className={classnames(styles.badge, styles[status], styles[size])}>
      <Text className={styles.text}>{text}</Text>
    </View>
  );
};

export default StatusBadge;
