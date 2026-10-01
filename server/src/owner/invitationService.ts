export type BusinessInvitationInput = {
  businessId: string;
  invitedByUserId: string;
  fullName: string;
  email: string;
  role: 'MANAGER' | 'STAFF';
  branchId?: string | null;
};

export type BusinessInvitationResult = {
  invitationId: string;
  status: 'PENDING_DELIVERY';
};

export interface InvitationService {
  invite(input: BusinessInvitationInput): Promise<BusinessInvitationResult>;
}

export const invitationService: InvitationService = {
  async invite(_input) {
    throw new Error('Persistent invitations and transactional email are not configured.');
  },
};
