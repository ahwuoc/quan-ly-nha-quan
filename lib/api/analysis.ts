import HTTP from '../http';

export type AnalysisData = {
  revenueData: Array<{ date: string; label: string; revenue: number }>;
  topDishes: Array<{ name: string; count: number; revenue: number }>;
  metrics: {
    today: { value: number; growth: number };
    week: { value: number; growth: number };
    month: { value: number; growth: number };
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
  };
};

export const analysisApi = {
  getAnalysis: (tenantSlug: string) => {
    return HTTP.GET<AnalysisData>(`/api/admin/${tenantSlug}/analysis`);
  },
};
