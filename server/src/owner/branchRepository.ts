import { randomUUID } from 'node:crypto';

import { db } from '../prisma/db.js';

export type BranchRecord = {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BranchInput = {
  name: string;
  address?: string;
  phone?: string;
};

export type BranchPatch = Partial<BranchInput> & { isActive?: boolean };

export interface BranchRepository {
  list(businessId: string): Promise<BranchRecord[]>;
  find(businessId: string, id: string): Promise<BranchRecord | null>;
  create(businessId: string, input: BranchInput): Promise<BranchRecord>;
  update(businessId: string, id: string, input: BranchPatch): Promise<BranchRecord | null>;
}

type BranchModel = typeof db.orm.public.Branch;

export function createBranchRepository(model: BranchModel): BranchRepository {
  return {
    find(businessId, id) {
      return model.where({ businessId, id }).first();
    },
    async list(businessId) {
      return await model
        .where({ businessId })
        .orderBy((branch) => branch.name.asc())
        .all();
    },
    create(businessId, input) {
      return model.create({
        id: randomUUID(),
        businessId,
        name: input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
        isActive: true,
      });
    },
    async update(businessId, id, input) {
      const updated = await model
        .where({ id, businessId })
        .select(
          'id',
          'businessId',
          'name',
          'address',
          'phone',
          'isActive',
          'createdAt',
          'updatedAt',
        )
        .update(input);
      return updated;
    },
  };
}

export const branchRepository = createBranchRepository(db.orm.public.Branch);
