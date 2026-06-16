import dayjs from 'dayjs';
import type { BlindBox, PurchaseRequest, MatchRecord } from '@/types';

const boxSeries = ['泡泡玛特', 'Molly', 'Dimoo', 'Labubu', 'Skullpanda', 'Hirono', 'Crybaby', 'Pucky'];
const boxNames = [
  '隐藏款-金色独角兽', '经典款-粉色小熊', '限定款-星空漫游', '普通款-森林精灵',
  '隐藏款-海洋之心', '经典款-彩虹小马', '限定款-未来战士', '普通款-梦境仙子',
  '隐藏款-烈焰凤凰', '经典款-冰雪女王', '限定款-时光旅人', '普通款-花园猫咪'
];
const sellerNames = ['张明', '李华', '王芳', '刘伟', '陈静'];
const buyerNames = ['赵强', '孙丽', '周杰', '吴敏', '郑涛'];

const generateBoxes = (): BlindBox[] => {
  const boxes: BlindBox[] = [];
  const imageIds = [237, 659, 718, 783, 1025, 292, 312, 326, 401, 431, 570, 580];

  for (let i = 0; i < 12; i++) {
    const statuses: BlindBox['status'][] = ['available', 'available', 'available', 'locked', 'sold'];
    const status = statuses[i % statuses.length];
    const sellerIndex = i % sellerNames.length;
    const buyerIndex = i % buyerNames.length;

    boxes.push({
      id: `BOX_${(i + 1).toString().padStart(4, '0')}`,
      name: boxNames[i % boxNames.length],
      description: `精美${boxSeries[i % boxSeries.length]}系列盲盒，全新未拆封，官方正品。`,
      series: boxSeries[i % boxSeries.length],
      price: [299, 399, 599, 199, 899, 499, 699, 349, 799, 449, 549, 249][i],
      sellerId: `SELLER_${(sellerIndex + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[sellerIndex],
      status,
      lockedBy: status === 'locked' ? `BUYER_${(buyerIndex + 1).toString().padStart(3, '0')}` : undefined,
      lockedByName: status === 'locked' ? buyerNames[buyerIndex] : undefined,
      lockedAt: status === 'locked' ? dayjs().subtract(Math.random() * 10, 'minute').toISOString() : undefined,
      createdAt: dayjs().subtract(i, 'day').toISOString(),
      imageId: imageIds[i]
    });
  }

  return boxes;
};

const generatePurchaseRequests = (): PurchaseRequest[] => {
  const requests: PurchaseRequest[] = [];

  for (let i = 0; i < 6; i++) {
    requests.push({
      id: `REQ_${(i + 1).toString().padStart(4, '0')}`,
      series: boxSeries[i % boxSeries.length],
      maxPrice: [400, 500, 300, 600, 800, 350][i],
      buyerId: `BUYER_${(i + 1).toString().padStart(3, '0')}`,
      buyerName: buyerNames[i % buyerNames.length],
      createdAt: dayjs().subtract(i * 2, 'hour').toISOString(),
      status: i < 4 ? 'pending' : 'matched'
    });
  }

  return requests;
};

const generateMatchRecords = (): MatchRecord[] => {
  const records: MatchRecord[] = [];

  for (let i = 0; i < 8; i++) {
    const statuses: MatchRecord['status'][] = ['matched', 'completed', 'matched', 'completed', 'cancelled', 'completed', 'matched', 'completed'];
    const boxIndex = i % boxNames.length;
    const sellerIndex = i % sellerNames.length;
    const buyerIndex = i % buyerNames.length;

    records.push({
      id: `MATCH_${(i + 1).toString().padStart(6, '0')}`,
      boxId: `BOX_${(boxIndex + 1).toString().padStart(4, '0')}`,
      boxName: boxNames[boxIndex],
      sellerId: `SELLER_${(sellerIndex + 1).toString().padStart(3, '0')}`,
      sellerName: sellerNames[sellerIndex],
      buyerId: `BUYER_${(buyerIndex + 1).toString().padStart(3, '0')}`,
      buyerName: buyerNames[buyerIndex],
      price: [299, 399, 599, 199, 899, 499, 699, 349][i],
      matchedAt: dayjs().subtract(i * 3, 'hour').toISOString(),
      status: statuses[i],
      lockExpiresAt: dayjs().add(15 - i, 'minute').toISOString()
    });
  }

  return records;
};

export const mockBoxes = generateBoxes();
export const mockPurchaseRequests = generatePurchaseRequests();
export const mockMatchRecords = generateMatchRecords();

export default {
  mockBoxes,
  mockPurchaseRequests,
  mockMatchRecords
};
