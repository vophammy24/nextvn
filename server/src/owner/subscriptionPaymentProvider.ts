export type SubscriptionPaymentInput = {
  businessId: string;
  subscriptionId: string;
  planId: string;
  amountVnd: number;
  returnUrl: string;
  cancelUrl: string;
};

export type SubscriptionPaymentLink = {
  available: true;
  providerReference: string;
  checkoutUrl: string;
};

export type PaymentUnavailable = {
  available: false;
  reason: 'PROVIDER_NOT_CONFIGURED';
};

export type VerifiedBillingEvent = {
  providerReference: string;
  businessId: string;
  subscriptionId: string;
  status: 'PAID' | 'FAILED' | 'REFUNDED';
  amountVnd: number;
  currency: 'VND';
  providerEventId: string;
};

export interface SubscriptionPaymentProvider {
  readonly available: boolean;
  createPaymentLink(
    input: SubscriptionPaymentInput,
  ): Promise<SubscriptionPaymentLink | PaymentUnavailable>;
  verifyWebhook(payload: string, signature: string): Promise<VerifiedBillingEvent | null>;
}

export const unavailableSubscriptionPaymentProvider: SubscriptionPaymentProvider = {
  available: false,
  async createPaymentLink() {
    return { available: false, reason: 'PROVIDER_NOT_CONFIGURED' };
  },
  async verifyWebhook() {
    return null;
  },
};
