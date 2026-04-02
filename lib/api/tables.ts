import HTTP from '../http';

export type Table = {
  id: string;
  tenant_id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied';
  qr_code?: string;
  payment_requested?: boolean;
  last_active_at?: string;
  session_id?: string | null;
  current_total?: number;
  created_at: string;
};

export type CreateTablePayload = {
  number: number;
  seats: number;
  status?: 'available' | 'occupied';
};

export type UpdateTablePayload = Partial<CreateTablePayload> & { id: string };

export type CheckoutPayload = {
  tableId: string;
  billAdjustments?: Array<{
    type: 'discount' | 'service_charge' | 'tax';
    amount: number;
    description?: string;
  }>;
};

export type BillAdjustment = {
  type: 'discount' | 'service_charge' | 'tax';
  amount: number;
  description?: string;
};

export const tablesApi = {
  getTables: (tenantSlug: string) => {
    return HTTP.GET<Table[]>(`/api/admin/${tenantSlug}/tables`);
  },

  getTable: (tenantSlug: string, tableId: string) => {
    return HTTP.GET<Table>(`/api/admin/${tenantSlug}/tables?id=${tableId}`);
  },

  createTable: (tenantSlug: string, payload: CreateTablePayload) => {
    return HTTP.POST<Table>(`/api/admin/${tenantSlug}/tables`, {
      body: payload,
    });
  },
  updateTable: (tenantSlug: string, payload: UpdateTablePayload) => {
    return HTTP.PUT<Table>(`/api/admin/${tenantSlug}/tables`, {
      body: payload,
    });
  },

  // Delete a table
  deleteTable: (tenantSlug: string, tableId: string) => {
    return HTTP.DELETE<{ success: boolean }>(`/api/admin/${tenantSlug}/tables?id=${tableId}`);
  },

  // Checkout a table
  checkout: (tenantSlug: string, payload: CheckoutPayload) => {
    return HTTP.POST<{ success: boolean }>(`/api/admin/${tenantSlug}/tables/checkout`, {
      body: payload,
    });
  },

  saveBillAdjustments: (tenantSlug: string, tableId: string, adjustments: BillAdjustment[]) => {
    return HTTP.POST<{ success: boolean }>(
      `/api/admin/${tenantSlug}/tables/${tableId}/bill-adjustments`,
      {
        body: { adjustments },
      }
    );
  },
  requestPayment: (tenantSlug: string, tableId: string) => {
    return HTTP.POST<{ success: boolean }>(
      `/api/tenants/${tenantSlug}/tables/${tableId}/payment-request`
    );
  },

  clearPaymentRequest: (tenantSlug: string, tableId: string) => {
    return HTTP.DELETE<{ success: boolean }>(
      `/api/admin/${tenantSlug}/tables/${tableId}/payment-request`
    );
  },

  addSessionItems: (tenantSlug: string, tableId: string, items: Array<{ menu_item_id: string, quantity: number, unit_price: number }>) => {
    return HTTP.POST<{ success: boolean }>(`/api/admin/${tenantSlug}/tables/${tableId}/order-items`, {
      body: { items },
    });
  },
  updateSessionItem: (tenantSlug: string, tableId: string, menuItemId: string, quantity: number) => {
    return HTTP.PATCH<{ success: boolean }>(`/api/admin/${tenantSlug}/tables/${tableId}/order-items`, {
      body: { menuItemId, quantity },
    });
  },
  deleteSessionItem: (tenantSlug: string, tableId: string, menuItemId: string) => {
    return HTTP.DELETE<{ success: boolean }>(`/api/admin/${tenantSlug}/tables/${tableId}/order-items?menuItemId=${menuItemId}`);
  },
};
