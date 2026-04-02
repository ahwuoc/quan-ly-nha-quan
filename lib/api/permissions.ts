import HTTP from '../http';

export type Permission = {
  id: string;
  name: string;
  description?: string;
};

export type RolePermission = {
  role: string;
  permission_id: string;
  granted: boolean;
};

export type UpdatePermissionPayload = {
  role: string;
  permissionId: string;
  enabled: boolean;
};

export const permissionsApi = {
  getPermissions: (tenantSlug: string) => {
    return HTTP.GET<{ permissions: Permission[]; rolePermissions: Record<string, string[]> }>(
      `/api/admin/${tenantSlug}/permissions`
    );
  },
  updatePermission: (tenantSlug: string, payload: UpdatePermissionPayload) => {
    return HTTP.POST<{ success: boolean }>(`/api/admin/${tenantSlug}/permissions`, {
      body: payload,
    });
  },
};
