import HTTP from '../http';

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled' | 'paid';

export type Order = {
  id: string;
  tenant_id: string;
  table_id: string;
  session_id?: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  table?: { number: number | string };
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    menu_item: {
      name: string;
      price: number;
      image_url: string | null;
    };
  }>;
};

export type CreateOrderPayload = {
  tableId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
  }>;
};

export type UpdateOrderStatusPayload = {
  status: OrderStatus;
};

export const ordersApi = {
  getOrders: (tenantSlug: string) => {
    return HTTP.GET<Order[]>(`/api/admin/${tenantSlug}/orders`);
  },

  getOrdersByTable: (tenantSlug: string, tableId: string) => {
    return HTTP.GET<Order[]>(`/api/admin/${tenantSlug}/orders?tableId=${tableId}`);
  },

  getOrdersBySession: (tenantSlug: string, sessionId: string) => {
    return HTTP.GET<Order[]>(`/api/admin/${tenantSlug}/orders?sessionId=${sessionId}`);
  },

  createOrder: (tenantSlug: string, payload: CreateOrderPayload) => {
    return HTTP.POST<Order>(`/api/tenants/${tenantSlug}/orders`, {
      body: payload,
    });
  },

  updateOrderStatus: (tenantSlug: string, orderId: string, payload: UpdateOrderStatusPayload) => {
    return HTTP.PATCH<Order>(`/api/admin/${tenantSlug}/orders?id=${orderId}`, {
      body: payload,
    });
  },
};
