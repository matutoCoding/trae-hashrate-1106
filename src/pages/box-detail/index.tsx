import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

const BoxDetailPage: React.FC = () => {
  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.page}>
      <View className={styles.placeholderCard}>
        <Text className={styles.icon}>📦</Text>
        <Text className={styles.title}>盲盒详情</Text>
        <Text className={styles.desc}>此页面为占位页面，展示盲盒详细信息、历史交易记录、分账明细等内容</Text>

        <View className={styles.infoBox}>
          <View className={styles.infoRow}>
            <Text className={styles.label}>页面功能</Text>
            <Text className={styles.value}>盲盒详情展示</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.label}>包含内容</Text>
            <Text className={styles.value}>商品信息、交易历史、分账明细</Text>
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

export default BoxDetailPage;
