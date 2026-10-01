import { db } from '../prisma/db.js';

type MemberModel = typeof db.orm.public.BusinessMember;
export type MemberUpdate = {
  role?: 'MANAGER' | 'STAFF';
  isActive?: boolean;
  branchId?: string | null;
};

export function createMemberRepository(model: MemberModel) {
  return {
    async list(businessId: string) {
      return await model
        .where({ businessId })
        .include('user', (user) => user.select('id', 'fullName', 'email', 'status'))
        .include('branch', (branch) => branch.select('id', 'name'))
        .orderBy((member) => member.createdAt.asc())
        .all();
    },
    find(businessId: string, id: string) {
      return model
        .where({ businessId, id })
        .include('user', (user) => user.select('id', 'fullName', 'email', 'status'))
        .include('branch', (branch) => branch.select('id', 'name'))
        .first();
    },
    update(businessId: string, id: string, update: MemberUpdate) {
      return model
        .where({ businessId, id })
        .select(
          'id',
          'businessId',
          'userId',
          'role',
          'isActive',
          'branchId',
          'createdAt',
          'updatedAt',
        )
        .update(update);
    },
  };
}

export const memberRepository = createMemberRepository(db.orm.public.BusinessMember);
