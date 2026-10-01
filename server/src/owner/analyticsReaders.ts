export type AnalyticsPeriod = 'week' | 'month' | 'quarter';

export type SalesAggregate = {
  itemId: string;
  name: string;
  quantity: number;
  revenueVnd: number;
};

export type FoodCostAggregate = {
  itemId: string;
  ingredientCostVnd: number;
};

export type AnalyticsPoint = { label: string; value: number };
export type CategoryAggregate = { name: string; value: number };

export type SalesOverview = {
  revenueVnd: number;
  grossProfitVnd: number;
  averageOrderVnd: number;
  orderCount: number;
  revenueTrend: AnalyticsPoint[];
  categoryRevenue: CategoryAggregate[];
  peakHours: AnalyticsPoint[];
  highlights: string[];
  profitableItems: { name: string; grossProfitVnd: number }[];
};

export type SalesRevenue = {
  revenueVnd: number;
  orderCount: number;
  averageOrderVnd: number;
  bestWindow: string;
  trend: AnalyticsPoint[];
  categories: CategoryAggregate[];
  topItems: SalesAggregate[];
};

export type InventoryOverview = {
  ingredientCount: number;
  lowStockCount: number;
  nearExpiryCount: number;
  stockValueVnd: number;
  consumption: AnalyticsPoint[];
  statusDistribution: CategoryAggregate[];
  byBranch: {
    branchName: string;
    ingredientCount: number;
    lowStockCount: number;
    nearExpiryCount: number;
    stockValueVnd: number;
  }[];
};

export type PromotionSuggestion = {
  id: string;
  title: string;
  reason: string;
  relatedItems: string[];
  evidence: string;
  action: string;
  basis: string;
};

export type SalesAnalyticsReader = {
  overview(businessId: string, period: AnalyticsPeriod): Promise<SalesOverview | null>;
  revenue(businessId: string, period: AnalyticsPeriod): Promise<SalesRevenue | null>;
  itemSales(businessId: string, period: AnalyticsPeriod): Promise<SalesAggregate[] | null>;
};

export type InventoryAnalyticsReader = {
  ownerOverview(businessId: string): Promise<InventoryOverview | null>;
  promotionSuggestions(businessId: string): Promise<PromotionSuggestion[] | null>;
};

export type RecipeCostReader = {
  aggregateFoodCost(
    businessId: string,
    period: AnalyticsPeriod,
  ): Promise<FoodCostAggregate[] | null>;
};

export type OwnerAnalyticsReaders = {
  sales: SalesAnalyticsReader;
  inventory: InventoryAnalyticsReader;
  recipes: RecipeCostReader;
};

const unavailable = async () => null;

let readers: OwnerAnalyticsReaders = {
  sales: {
    overview: unavailable,
    revenue: unavailable,
    itemSales: unavailable,
  },
  inventory: {
    ownerOverview: unavailable,
    promotionSuggestions: unavailable,
  },
  recipes: {
    aggregateFoodCost: unavailable,
  },
};

export function configureOwnerAnalyticsReaders(nextReaders: OwnerAnalyticsReaders) {
  readers = nextReaders;
}

export function getOwnerAnalyticsReaders() {
  return readers;
}

export function calculateMenuProfit(sales: SalesAggregate[], foodCosts: FoodCostAggregate[]) {
  const costsByItem = new Map(foodCosts.map((row) => [row.itemId, row.ingredientCostVnd]));
  if (sales.some((row) => !costsByItem.has(row.itemId))) return null;

  return sales.map((row) => {
    const ingredientCostVnd = costsByItem.get(row.itemId)!;
    const grossProfitVnd = row.revenueVnd - ingredientCostVnd;
    return {
      ...row,
      ingredientCostVnd,
      grossProfitVnd,
      margin: row.revenueVnd > 0 ? (grossProfitVnd / row.revenueVnd) * 100 : 0,
    };
  });
}
