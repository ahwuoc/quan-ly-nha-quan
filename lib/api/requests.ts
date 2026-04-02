import HTTP from '../http';

export type RequestType = 'payment' | 'staff' | 'water' | 'other';
export type RequestStatus = 'pending' | 'done';

export type Request = {
  id: string;
  tenant_id: string;
  table_id: string;
  type: RequestType;
  status: RequestStatus;
  note: string | null;
  created_at: string;
  table?: { number: number };
};

export type CreateRequestPayload = {
  tableId: string;
  type: RequestType;
  message?: string;
};

export type UpdateRequestStatusPayload = {
  id: string;
  status: RequestStatus;
};

export const requestsApi = {
  getRequests: (tenantSlug: string) => {
    return HTTP.GET<Request[]>(`/api/admin/${tenantSlug}/requests`);
  },

  // Create a new request
  createRequest: (tenantSlug: string, payload: CreateRequestPayload) => {
    return HTTP.POST<Request>(`/api/tenants/${tenantSlug}/requests`, {
      body: payload,
    });
  },

  // Update request status
  updateRequestStatus: (tenantSlug: string, payload: UpdateRequestStatusPayload) => {
    return HTTP.PATCH<Request>(`/api/admin/${tenantSlug}/requests`, {
      body: payload,
    });
  },
};
