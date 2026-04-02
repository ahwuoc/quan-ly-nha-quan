import HTTP from '../http';

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  subscription_plan?: string;
  subscription_status?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateTenantPayload = {
  name: string;
  slug: string;
};

export type TenantSettings = {
  allowed_ips: string[];
  ip_restriction_enabled: boolean;
  name: string;
  slug: string;
  currentIp: string;
};

export type UpdateSettingsPayload = Partial<Omit<TenantSettings, 'currentIp' | 'name' | 'slug'>>;

export const tenantsApi = {
  getTenants: () => {
    return HTTP.GET<Tenant[]>('/api/tenants');
  },

  getArchivedTenants: () => {
    return HTTP.GET<Tenant[]>('/api/tenants?archived=true');
  },

  getSubscription: () => {
    return HTTP.GET<{
      plans: Array<{ id: string; name: string; price_monthly: number; max_tables: number; max_members: number; duration_days: number; description: string }>;
      subscriptions: Array<{ tenant_id: string; plan_id: string; expires_at: string; plan: { name: string } }>;
    }>('/api/tenants/subscription');
  },

  createTenant: (payload: CreateTenantPayload) => {
    return HTTP.POST<Tenant>('/api/tenants/create', {
      body: payload,
    });
  },

  // Delete a tenant
  deleteTenant: (tenantId: string, hard: boolean = false) => {
    return HTTP.DELETE<{ success: boolean }>(
      `/api/tenants?id=${tenantId}${hard ? '&hard=true' : ''}`
    );
  },

  // Restore an archived tenant
  restoreTenant: (tenantId: string) => {
    return HTTP.PATCH<{ success: boolean }>(`/api/tenants?id=${tenantId}&restore=true`);
  },

  checkTenant: (slug: string) => {
    return HTTP.GET<{ deleted: boolean; tenant?: { id: string; slug: string }; error?: string }>(
      `/api/tenants/check?slug=${slug}`
    );
  },

  getSettings: (tenantSlug: string) => {
    return HTTP.GET<TenantSettings>(`/api/admin/${tenantSlug}/settings`);
  },

  updateSettings: (tenantSlug: string, payload: UpdateSettingsPayload) => {
    return HTTP.PATCH<TenantSettings>(`/api/admin/${tenantSlug}/settings`, {
      body: payload,
    });
  },
};
