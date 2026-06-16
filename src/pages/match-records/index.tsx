import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

const MatchRecordsPage: React.FC = () => {
  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.page}>
      <View className={styles.placeholderCard}>
        <Text className={styles.icon}>📋</Text>
        <Text className={styles.title}>撮合记录</Text>
        <Text className={styles.desc}>此页面为占位页面，展示历史撮合记录、锁定状态、撮合结果等内容</Text>

        <View className={styles.infoBox}>
          <View className={styles.infoRow}>
            <Text className={styles.label}>页面功能</Text>
            <Text className={styles.value}>撮合记录列表</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.label}>包含内容</Text>
            <Text className={styles.value}>撮合时间、买卖双方、锁定状态</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.label}>状态</Text>
            <Text className={styles.value}>开发中</Text>
          </View>
        </View>

        <View className={styles.backBtn} onClick={goBack}>
          <Text>返回撮合大厅</Text>
        </View>
      </View>
    </View>
  );
};

export default MatchRecordsPage;
