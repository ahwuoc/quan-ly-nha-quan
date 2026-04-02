import HTTP from '../http';

export type Role = 'owner' | 'admin' | 'member';

export type Member = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: Role;
  email: string;
  created_at: string;
};

export type InviteMemberPayload = {
  email: string;
  role: Role;
};

export type UpdateMemberRolePayload = {
  memberId: string;
  role: Role;
};

export const membersApi = {
  // Get all members for a tenant
  getMembers: (tenantSlug: string) => {
    return HTTP.GET<{ members: Member[] }>(`/api/admin/${tenantSlug}/members`);
  },

  // Invite a new member
  inviteMember: (tenantSlug: string, payload: InviteMemberPayload) => {
    return HTTP.POST<Member>(`/api/admin/${tenantSlug}/members`, {
      body: payload,
    });
  },

  // Update member role
  updateMemberRole: (tenantSlug: string, payload: UpdateMemberRolePayload) => {
    return HTTP.PATCH<Member>(`/api/admin/${tenantSlug}/members`, {
      body: payload,
    });
  },

  // Delete a member
  deleteMember: (tenantSlug: string, memberId: string) => {
    return HTTP.DELETE<{ success: boolean }>(
      `/api/admin/${tenantSlug}/members?id=${memberId}`
    );
  },
};
