import HTTP from '../http';

export type GuestCreateOrderPayload = {
  table_id: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price: number;
  }>;
};

export type GuestRequestStaffPayload = {
  table_id: string;
  type: string;
};

export const guestApi = {
  createOrder: (tenantSlug: string, payload: GuestCreateOrderPayload) => {
    return HTTP.POST<{ id: string }>(`/api/tenants/${tenantSlug}/orders`, {
      body: payload,
    });
  },

  requestStaff: (tenantSlug: string, payload: GuestRequestStaffPayload) => {
    return HTTP.POST<{ success: boolean }>(`/api/tenants/${tenantSlug}/requests`, {
      body: payload,
    });
  },

  // Request payment for a table (deprecated/variant)
  requestPayment: (tenantSlug: string, tableId: string) => {
    return HTTP.POST<{ success: boolean }>(
      `/api/tenants/${tenantSlug}/tables/${tableId}/payment-request`
    );
  },
};
