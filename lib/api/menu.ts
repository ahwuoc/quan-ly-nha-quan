import HTTP from '../http';

export type MenuItem = {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateMenuItemPayload = {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  available?: boolean;
};

export type UpdateMenuItemPayload = Partial<CreateMenuItemPayload> & {
  id: string;
};

export const menuApi = {
  // Get all menu items for a tenant
  getMenuItems: (tenantSlug: string) => {
    return HTTP.GET<MenuItem[]>(`/api/admin/${tenantSlug}/menu-items`);
  },

  // Create a new menu item
  createMenuItem: (tenantSlug: string, payload: CreateMenuItemPayload) => {
    return HTTP.POST<MenuItem>(`/api/admin/${tenantSlug}/menu-items`, {
      body: payload,
    });
  },

  // Update a menu item
  updateMenuItem: (tenantSlug: string, payload: UpdateMenuItemPayload) => {
    return HTTP.PUT<MenuItem>(`/api/admin/${tenantSlug}/menu-items`, {
      body: payload,
    });
  },

  // Delete a menu item
  deleteMenuItem: (tenantSlug: string, itemId: string) => {
    return HTTP.DELETE<{ success: boolean }>(
      `/api/admin/${tenantSlug}/menu-items?id=${itemId}`
    );
  },

  // Toggle menu item availability
  toggleAvailability: (tenantSlug: string, itemId: string, available: boolean) => {
    return HTTP.PATCH<MenuItem>(`/api/admin/${tenantSlug}/menu-items?id=${itemId}`, {
      body: { available },
    });
  },
};
