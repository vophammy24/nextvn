export const ownerViews = [
  'owner',
  'branches',
  'revenue',
  'menuProfit',
  'inventoryOverview',
  'promotions',
  'users',
  'subscription',
  'settings',
] as const;
export type OwnerView = (typeof ownerViews)[number];
export const isOwnerView = (key: string): key is OwnerView =>
  ownerViews.some((view) => view === key);
