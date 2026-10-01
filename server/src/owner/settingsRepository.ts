import { db } from '../prisma/db.js';

export type BusinessSettingsInput = {
  businessName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  taxRate: number;
  serviceFeeRate: number;
  invoicePrefix: string;
  receiptTitle: string | null;
  receiptFooter: string | null;
  notifyLowStock: boolean;
  notifyNearExpiry: boolean;
};

type SettingsModel = typeof db.orm.public.BusinessSettings;

export function createSettingsRepository(
  settingsModel: SettingsModel,
  businessModel: typeof db.orm.public.Business,
  transaction: typeof db.transaction,
) {
  return {
    async get(businessId: string): Promise<BusinessSettingsInput | null> {
      const [business, settings] = await Promise.all([
        businessModel.where({ id: businessId }).first(),
        settingsModel.where({ businessId }).first(),
      ]);
      if (!business) return null;
      return {
        businessName: business.name,
        contactEmail: settings?.contactEmail ?? null,
        contactPhone: settings?.contactPhone ?? null,
        address: settings?.address ?? null,
        taxRate: settings?.taxRate ?? 0,
        serviceFeeRate: settings?.serviceChargeRate ?? 0,
        invoicePrefix: settings?.invoicePrefix ?? 'NEXTVN',
        receiptTitle: settings?.receiptTitle ?? null,
        receiptFooter: settings?.receiptFooter ?? null,
        notifyLowStock: settings?.notifyLowStock ?? true,
        notifyNearExpiry: settings?.notifyNearExpiry ?? true,
      };
    },

    async save(businessId: string, input: BusinessSettingsInput) {
      await transaction(async (tx) => {
        await tx.orm.public.Business.where({ id: businessId }).update({ name: input.businessName });
        await tx.orm.public.BusinessSettings.where({ businessId }).upsert({
          create: {
            businessId,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            address: input.address,
            taxRate: input.taxRate,
            serviceChargeRate: input.serviceFeeRate,
            currency: 'VND',
            locale: 'vi-VN',
            invoicePrefix: input.invoicePrefix,
            receiptTitle: input.receiptTitle,
            receiptFooter: input.receiptFooter,
            notifyLowStock: input.notifyLowStock,
            notifyNearExpiry: input.notifyNearExpiry,
          },
          update: {
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            address: input.address,
            taxRate: input.taxRate,
            serviceChargeRate: input.serviceFeeRate,
            invoicePrefix: input.invoicePrefix,
            receiptTitle: input.receiptTitle,
            receiptFooter: input.receiptFooter,
            notifyLowStock: input.notifyLowStock,
            notifyNearExpiry: input.notifyNearExpiry,
          },
        });
      });
      return this.get(businessId);
    },
  };
}

export const settingsRepository = createSettingsRepository(
  db.orm.public.BusinessSettings,
  db.orm.public.Business,
  db.transaction,
);
