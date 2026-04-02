import HTTP from '../http';

export type Plan = {
  id: string;
  name: string;
  price: number;
  features: string[];
  max_tables?: number;
  max_menu_items?: number;
};

export type Subscription = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  current_period_start: string;
  current_period_end: string;
};

export type UpdateSubscriptionPayload = {
  tenantId: string;
  planId: string;
};

export type UpdatePlanPayload = {
  id: string;
  name?: string;
  price?: number;
  features?: string[];
  max_tables?: number;
  max_menu_items?: number;
};

export const superadminApi = {
  // Check if user is superadmin
  checkSuperadmin: () => {
    return HTTP.GET<{ isSuperadmin: boolean }>('/api/superadmin/check');
  },

  // Get all tenants (superadmin only)
  getAllTenants: () => {
    return HTTP.GET<Record<string, unknown>[]>('/api/superadmin/tenants');
  },

  // Get all plans
  getPlans: () => {
    return HTTP.GET<Plan[]>('/api/superadmin/plans');
  },

  // Update a plan
  updatePlan: (payload: UpdatePlanPayload) => {
    return HTTP.PATCH<Plan>('/api/superadmin/plans', {
      body: payload,
    });
  },

  // Update subscription
  updateSubscription: (payload: UpdateSubscriptionPayload) => {
    return HTTP.PATCH<Subscription>('/api/superadmin/subscriptions', {
      body: payload,
    });
  },
};
