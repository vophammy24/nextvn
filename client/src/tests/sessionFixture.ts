import type { BusinessRole } from '@/app/navigation';
export const sessionFixture = (role: BusinessRole = 'STAFF') => ({
  user: { id: 'real-user', fullName: 'Nguyễn An', email: 'an@example.test', phone: '0900000000' },
  membership: {
    role,
    business: { id: 'business-1', name: 'Doanh nghiệp kiểm thử' },
    branch: role === 'OWNER' ? null : { id: 'branch-1', name: 'Chi nhánh kiểm thử' },
  },
});
