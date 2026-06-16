import dayjs from 'dayjs';
import type { BlindBox, MatchRecord, LockInfo, PurchaseRequest } from '@/types';

const LOCK_TIMEOUT = 15 * 60 * 1000;

interface LockResult {
  success: boolean;
  message: string;
  record?: MatchRecord;
}

export const matchService = {
  checkBoxLockStatus(box: BlindBox): { isLocked: boolean; canMatch: boolean; reason?: string } {
    console.log('[MatchService] 检查盲盒锁定状态', { boxId: box.id, status: box.status });

    if (box.status === 'sold') {
      return { isLocked: true, canMatch: false, reason: '该盲盒已售出' };
    }

    if (box.status === 'locked' && box.lockedAt) {
      const lockExpired = dayjs().valueOf() - dayjs(box.lockedAt).valueOf() > LOCK_TIMEOUT;
      if (lockExpired) {
        return { isLocked: false, canMatch: true };
      }
      return { isLocked: true, canMatch: false, reason: `该盲盒已被${box.lockedByName}锁定` };
    }

    return { isLocked: false, canMatch: true };
  },

  tryMatch(
    box: BlindBox,
    buyerId: string,
    buyerName: string,
    activeLocks: Map<string, LockInfo>
  ): LockResult {
    console.log('[MatchService] 尝试撮合', { boxId: box.id, buyerId, buyerName });

    const lockStatus = this.checkBoxLockStatus(box);
    if (!lockStatus.canMatch) {
      console.warn('[MatchService] 撮合失败：盲盒不可撮合', lockStatus.reason);
      return {
        success: false,
        message: lockStatus.reason || '撮合失败'
      };
    }

    if (activeLocks.has(box.id)) {
      const existingLock = activeLocks.get(box.id)!;
      const lockExpired = dayjs().valueOf() - dayjs(existingLock.lockedAt).valueOf() > LOCK_TIMEOUT;

      if (!lockExpired) {
        console.warn('[MatchService] 撮合失败：重复撮合拦截', {
          existingBuyer: existingLock.buyerName
        });
        return {
          success: false,
          message: `该盲盒已被${existingLock.buyerName}锁定，无法重复撮合`
        };
      }
    }

    if (box.sellerId === buyerId) {
      console.warn('[MatchService] 撮合失败：不能购买自己的商品');
      return {
        success: false,
        message: '不能购买自己寄售的盲盒'
      };
    }

    const now = dayjs();
    const lockInfo: LockInfo = {
      boxId: box.id,
      buyerId,
      buyerName,
      lockedAt: now.toISOString(),
      expiresAt: now.add(LOCK_TIMEOUT, 'millisecond').toISOString()
    };

    activeLocks.set(box.id, lockInfo);
    console.log('[MatchService] 撮合成功，已锁定盲盒', { boxId: box.id, expiresAt: lockInfo.expiresAt });

    const matchRecord: MatchRecord = {
      id: `MATCH_${now.valueOf()}`,
      boxId: box.id,
      boxName: box.name,
      sellerId: box.sellerId,
      sellerName: box.sellerName,
      buyerId,
      buyerName,
      price: box.price,
      matchedAt: now.toISOString(),
      status: 'matched',
      lockExpiresAt: lockInfo.expiresAt
    };

    return {
      success: true,
      message: '撮合成功，盲盒已锁定15分钟',
      record: matchRecord
    };
  },

  releaseLock(boxId: string, activeLocks: Map<string, LockInfo>): boolean {
    console.log('[MatchService] 释放锁定', { boxId });

    if (activeLocks.has(boxId)) {
      activeLocks.delete(boxId);
      console.log('[MatchService] 锁定已释放', { boxId });
      return true;
    }

    console.warn('[MatchService] 释放锁定失败：未找到锁定记录', { boxId });
    return false;
  },

  cleanupExpiredLocks(activeLocks: Map<string, LockInfo>): string[] {
    const now = dayjs().valueOf();
    const expiredBoxIds: string[] = [];

    activeLocks.forEach((lockInfo, boxId) => {
      if (now - dayjs(lockInfo.lockedAt).valueOf() > LOCK_TIMEOUT) {
        expiredBoxIds.push(boxId);
      }
    });

    expiredBoxIds.forEach(boxId => {
      activeLocks.delete(boxId);
      console.log('[MatchService] 自动释放超时锁定', { boxId });
    });

    return expiredBoxIds;
  },

  completeMatch(matchRecord: MatchRecord): MatchRecord {
    console.log('[MatchService] 完成撮合', { matchId: matchRecord.id });
    return {
      ...matchRecord,
      status: 'completed'
    };
  },

  cancelMatch(matchRecord: MatchRecord): MatchRecord {
    console.log('[MatchService] 取消撮合', { matchId: matchRecord.id });
    return {
      ...matchRecord,
      status: 'cancelled'
    };
  },

  findMatchingBoxes(
    request: PurchaseRequest,
    availableBoxes: BlindBox[]
  ): BlindBox[] {
    console.log('[MatchService] 查找匹配盲盒', { series: request.series, maxPrice: request.maxPrice });

    const matchingBoxes = availableBoxes.filter(box => {
      const lockStatus = this.checkBoxLockStatus(box);
      return (
        lockStatus.canMatch &&
        box.series === request.series &&
        box.price <= request.maxPrice
      );
    });

    console.log('[MatchService] 找到匹配盲盒数量', matchingBoxes.length);
    return matchingBoxes;
  },

  getRemainingLockTime(lockedAt: string): number {
    const elapsed = dayjs().valueOf() - dayjs(lockedAt).valueOf();
    const remaining = Math.max(0, LOCK_TIMEOUT - elapsed);
    return Math.ceil(remaining / 1000);
  },

  formatLockTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};
