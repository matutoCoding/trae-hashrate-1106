import { create } from 'zustand';
import type { BlindBox, MatchRecord, LockInfo, PurchaseRequest } from '@/types';
import { matchService } from '@/services/matchService';

interface BoxState {
  boxes: BlindBox[];
  purchaseRequests: PurchaseRequest[];
  matchRecords: MatchRecord[];
  activeLocks: Map<string, LockInfo>;
  loading: boolean;
  error: string | null;
}

interface BoxActions {
  setBoxes: (boxes: BlindBox[]) => void;
  setPurchaseRequests: (requests: PurchaseRequest[]) => void;
  setMatchRecords: (records: MatchRecord[]) => void;
  addBox: (box: BlindBox) => void;
  updateBoxStatus: (boxId: string, status: BlindBox['status'], lockedBy?: string, lockedByName?: string) => void;
  addPurchaseRequest: (request: PurchaseRequest) => void;
  tryMatchBox: (
    boxId: string,
    buyerId: string,
    buyerName: string
  ) => { success: boolean; message: string; record?: MatchRecord };
  releaseBoxLock: (boxId: string) => boolean;
  completeMatch: (matchId: string) => MatchRecord | null;
  cancelMatch: (matchId: string) => MatchRecord | null;
  cleanupExpiredLocks: () => string[];
  getAvailableBoxes: () => BlindBox[];
  getLockedBoxes: () => BlindBox[];
  getBoxById: (boxId: string) => BlindBox | undefined;
  markBoxAsSold: (boxId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBoxStore = create<BoxState & BoxActions>((set, get) => ({
  boxes: [],
  purchaseRequests: [],
  matchRecords: [],
  activeLocks: new Map(),
  loading: false,
  error: null,

  setBoxes: (boxes) => set({ boxes }),
  setPurchaseRequests: (purchaseRequests) => set({ purchaseRequests }),
  setMatchRecords: (matchRecords) => set({ matchRecords }),

  addBox: (box) => set((state) => ({ boxes: [...state.boxes, box] })),

  updateBoxStatus: (boxId, status, lockedBy, lockedByName) =>
    set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === boxId
          ? {
              ...box,
              status,
              lockedBy,
              lockedByName,
              lockedAt: status === 'locked' ? new Date().toISOString() : undefined
            }
          : box
      )
    })),

  addPurchaseRequest: (request) =>
    set((state) => ({ purchaseRequests: [...state.purchaseRequests, request] })),

  tryMatchBox: (boxId, buyerId, buyerName) => {
    const state = get();
    const box = state.boxes.find((b) => b.id === boxId);

    if (!box) {
      return { success: false, message: '盲盒不存在' };
    }

    const result = matchService.tryMatch(box, buyerId, buyerName, state.activeLocks);

    if (result.success && result.record) {
      set((state) => ({
        boxes: state.boxes.map((b) =>
          b.id === boxId
            ? {
                ...b,
                status: 'locked',
                lockedBy: buyerId,
                lockedByName: buyerName,
                lockedAt: result.record!.matchedAt
              }
            : b
        ),
        matchRecords: [...state.matchRecords, result.record!]
      }));
    }

    return result;
  },

  releaseBoxLock: (boxId) => {
    const state = get();
    const success = matchService.releaseLock(boxId, state.activeLocks);

    if (success) {
      set((state) => ({
        boxes: state.boxes.map((b) =>
          b.id === boxId
            ? { ...b, status: 'available', lockedBy: undefined, lockedByName: undefined, lockedAt: undefined }
            : b
        )
      }));
    }

    return success;
  },

  completeMatch: (matchId) => {
    const state = get();
    const record = state.matchRecords.find((r) => r.id === matchId);

    if (!record) {
      return null;
    }

    const updatedRecord = matchService.completeMatch(record);

    set((state) => ({
      matchRecords: state.matchRecords.map((r) => (r.id === matchId ? updatedRecord : r)),
      boxes: state.boxes.map((b) => (b.id === record.boxId ? { ...b, status: 'sold' } : b)),
      activeLocks: (() => {
        const newLocks = new Map(state.activeLocks);
        newLocks.delete(record.boxId);
        return newLocks;
      })()
    }));

    return updatedRecord;
  },

  cancelMatch: (matchId) => {
    const state = get();
    const record = state.matchRecords.find((r) => r.id === matchId);

    if (!record) {
      return null;
    }

    const updatedRecord = matchService.cancelMatch(record);

    set((state) => ({
      matchRecords: state.matchRecords.map((r) => (r.id === matchId ? updatedRecord : r)),
      boxes: state.boxes.map((b) =>
        b.id === record.boxId
          ? { ...b, status: 'available', lockedBy: undefined, lockedByName: undefined, lockedAt: undefined }
          : b
      ),
      activeLocks: (() => {
        const newLocks = new Map(state.activeLocks);
        newLocks.delete(record.boxId);
        return newLocks;
      })()
    }));

    return updatedRecord;
  },

  cleanupExpiredLocks: () => {
    const state = get();
    const expiredBoxIds = matchService.cleanupExpiredLocks(state.activeLocks);

    if (expiredBoxIds.length > 0) {
      set((state) => ({
        boxes: state.boxes.map((b) =>
          expiredBoxIds.includes(b.id)
            ? { ...b, status: 'available', lockedBy: undefined, lockedByName: undefined, lockedAt: undefined }
            : b
        )
      }));
    }

    return expiredBoxIds;
  },

  getAvailableBoxes: () => {
    const state = get();
    return state.boxes.filter((box) => {
      const lockStatus = matchService.checkBoxLockStatus(box);
      return lockStatus.canMatch;
    });
  },

  getLockedBoxes: () => {
    const state = get();
    return state.boxes.filter((box) => box.status === 'locked');
  },

  getBoxById: (boxId) => {
    return get().boxes.find((b) => b.id === boxId);
  },

  markBoxAsSold: (boxId) => {
    set(state => ({
      boxes: state.boxes.map(b => b.id === boxId ? { ...b, status: 'sold' as const } : b)
    }));
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
