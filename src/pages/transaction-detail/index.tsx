import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

const TransactionDetailPage: React.FC = () => {
  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.page}>
      <View className={styles.placeholderCard}>
        <Text className={styles.icon}>💰</Text>
        <Text className={styles.title}>流水详情</Text>
        <Text className={styles.desc}>此页面为占位页面，展示交易流水详细信息、分账明细、对账信息等内容</Text>

        <View className={styles.infoBox}>
          <View className={styles.infoRow}>
            <Text className={styles.label}>页面功能</Text>
            <Text className={styles.value}>流水详情展示</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.label}>包含内容</Text>
            <Text className={styles.value}>交易信息、分账明细、对账状态</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.label}>状态</Text>
            <Text className={styles.value}>开发中</Text>
          </View>
        </View>

        <View className={styles.backBtn} onClick={goBack}>
          <Text>返回流水登记</Text>
        </View>
      </View>
    </View>
  );
};

export default TransactionDetailPage;
