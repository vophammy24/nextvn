import { db } from '../prisma/db.js';
import { unavailableSubscriptionPaymentProvider } from './subscriptionPaymentProvider.js';

type SubscriptionModel = typeof db.orm.public.BusinessSubscription;
type PlanModel = typeof db.orm.public.SubscriptionPlan;
type BillingModel = typeof db.orm.public.BillingRecord;
type BranchModel = typeof db.orm.public.Branch;

export function createSubscriptionRepository(
  subscriptionModel: SubscriptionModel,
  planModel: PlanModel,
  billingModel: BillingModel,
  branchModel: BranchModel = db.orm.public.Branch,
) {
  return {
    async getBusinessView(businessId: string) {
      const [subscription, plans, billingHistory, branches] = await Promise.all([
        subscriptionModel.where({ businessId }).include('plan').first(),
        planModel
          .where({ isActive: true })
          .orderBy((plan) => plan.monthlyPriceVnd.asc())
          .all(),
        billingModel
          .where({ businessId })
          .orderBy((record) => record.createdAt.desc())
          .all(),
        branchModel.where({ businessId, isActive: true }).select('id').all(),
      ]);

      return {
        plan: subscription?.plan.name ?? 'Chưa đăng ký gói',
        usage: `${branches.length} chi nhánh đang hoạt động`,
        renewalDate: subscription?.periodEndsAt ?? null,
        status: subscription?.status ?? 'Chưa đăng ký',
        billingHistory: billingHistory.map((record) => ({
          date: record.createdAt,
          description: `Thanh toán gói ${subscription?.plan.name ?? 'nextvn'}`,
          amountVnd: record.amountVnd,
          status: record.status,
        })),
        plans: plans.map((plan) => ({
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          monthlyPriceVnd: plan.monthlyPriceVnd,
          annualPriceVnd: plan.annualPriceVnd,
        })),
        payOSAvailable: unavailableSubscriptionPaymentProvider.available,
        billing: 'not-connected' as const,
      };
    },
  };
}

export const subscriptionRepository = createSubscriptionRepository(
  db.orm.public.BusinessSubscription,
  db.orm.public.SubscriptionPlan,
  db.orm.public.BillingRecord,
);
