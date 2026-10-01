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
