"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Utensils
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

interface Metric {
  value: number;
  growth: number;
}

interface AnalysisData {
  revenueData: any[];
  topDishes: any[];
  metrics: {
    today: Metric;
    week: Metric;
    month: Metric;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
  };
}

const MetricCard = ({ title, metric, icon: Icon, color }: { title: string, metric?: Metric, icon: any, color: string }) => (
  <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 overflow-hidden group">
    <CardContent className="p-10 relative">
      <div className={`absolute right-0 top-0 size-40 opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 ${color}`} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`size-14 text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6 ${color}`}>
            <Icon size={28} />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        </div>
        {metric && (
          <div className={`flex items-center gap-1 font-black text-xs px-3 py-1.5 rounded-full ${metric.growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {metric.growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(metric.growth)}%
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
          {(metric?.value || 0).toLocaleString()}
        </h2>
        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">VNĐ</span>
      </div>
    </CardContent>
  </Card>
);

export default function AnalysisPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalysis() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/analysis`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Fetch analysis error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalysis();
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="animate-spin size-10 border-4 border-primary border-t-transparent rounded-full" />
        <p className="font-bold text-slate-400 animate-pulse uppercase tracking-widest text-[10px]">Đang tổng hợp dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Phân tích</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" /> Báo cáo hiệu suất kinh doanh đa kỳ
          </p>
        </div>
        <Button
          variant="outline"
          className="h-14 rounded-[28px] px-8 font-black gap-3 border-slate-100 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          onClick={fetchAnalysis}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          LÀM MỚI DỮ LIỆU
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard
          title="Doanh thu hôm nay"
          metric={data?.metrics.today}
          icon={DollarSign}
          color="bg-primary"
        />
        <MetricCard
          title="Doanh thu tuần này"
          metric={data?.metrics.week}
          icon={ShoppingBag}
          color="bg-slate-900"
        />
        <MetricCard
          title="Doanh thu tháng này"
          metric={data?.metrics.month}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="rounded-[48px] border-none shadow-3xl bg-white p-10">
          <CardHeader className="px-0 pt-0 pb-8">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Biểu đồ doanh thu</CardTitle>
            <CardDescription className="font-medium text-slate-400 italic">Thỏa sức theo dõi sự tăng trưởng hàng ngày.</CardDescription>
          </CardHeader>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '20px' }}
                  itemStyle={{ fontWeight: 900, color: '#f43f5e' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#0f172a' }}
                  formatter={(val: any) => val ? [`${val.toLocaleString()} VNĐ`, "Doanh thu"] : ["0 VNĐ", "Doanh thu"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f43f5e"
                  strokeWidth={5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Dishes Chart/Table */}
        <Card className="rounded-[48px] border-none shadow-3xl bg-white p-10">
          <CardHeader className="px-0 pt-0 pb-8">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Top thực đơn thịnh hành</CardTitle>
            <CardDescription className="font-medium text-slate-400 italic">Những món ăn đang thu phục thực khách nhất.</CardDescription>
          </CardHeader>
          <div className="space-y-6">
            {data?.topDishes.map((dish, i) => (
              <div key={dish.name} className="flex items-center gap-6 group">
                <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-2">
                    <p className="font-bold text-slate-800">{dish.name}</p>
                    <p className="text-[13px] font-black text-primary">{dish.revenue.toLocaleString()}đ</p>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full group-hover:opacity-80 transition-all duration-1000"
                      style={{ width: `${(dish.revenue / data.summary.totalRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {data?.topDishes.length === 0 && (
              <div className="py-20 text-center opacity-30 italic font-medium">Chưa có dữ liệu giao dịch</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
