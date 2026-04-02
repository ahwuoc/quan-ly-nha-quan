import HTTP from '../http';

export type Category = {
  id: string;
  tenant_id: string;
  name: string;
  icon?: string;
  sort_order: number;
  display_order: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

export type CreateCategoryPayload = {
  name: string;
  icon?: string;
  sort_order?: number;
  display_order?: number;
  image_url?: string;
};

export type UpdateCategoryPayload = Partial<CreateCategoryPayload> & {
  id: string;
};

export const categoriesApi = {
  // Get all categories for a tenant
  getCategories: (tenantSlug: string) => {
    return HTTP.GET<Category[]>(`/api/admin/${tenantSlug}/categories`);
  },

  // Create a new category
  createCategory: (tenantSlug: string, payload: CreateCategoryPayload) => {
    return HTTP.POST<Category>(`/api/admin/${tenantSlug}/categories`, {
      body: payload,
    });
  },

  // Update a category
  updateCategory: (tenantSlug: string, payload: UpdateCategoryPayload) => {
    return HTTP.PUT<Category>(`/api/admin/${tenantSlug}/categories`, {
      body: payload,
    });
  },

  // Delete a category
  deleteCategory: (tenantSlug: string, categoryId: string) => {
    return HTTP.DELETE<{ success: boolean }>(
      `/api/admin/${tenantSlug}/categories?id=${categoryId}`
    );
  },

  // Batch update category order
  updateCategoryOrder: (tenantSlug: string, categories: Array<{ id: string; display_order: number }>) => {
    return HTTP.PATCH<{ success: boolean }>(`/api/admin/${tenantSlug}/categories`, {
      body: { categories },
    });
  },
};
