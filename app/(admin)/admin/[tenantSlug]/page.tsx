"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  UtensilsCrossed,
  Grid3x3,
  Tag,
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  LayoutDashboard,
  DollarSign,
  Users,
  ChefHat,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase-client";

interface DashboardStats {
  totalItems: number;
  totalTables: number;
  occupiedTables: number;
  totalOrdersCount: number;
  revenue: number;
  orders: any[];
}

export default function TenantDashboard() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalTables: 0,
    occupiedTables: 0,
    totalOrdersCount: 0,
    revenue: 0,
    orders: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const supabase = getSupabaseClient();

  async function fetchStats() {
    try {
      const [itemsRes, tablesRes, ordersRes] = await Promise.all([
        fetch(`/api/admin/${tenantSlug}/menu-items`),
        fetch(`/api/admin/${tenantSlug}/tables`),
        fetch(`/api/admin/${tenantSlug}/orders`),
      ]);

      const [items, tables, orders] = await Promise.all([
        itemsRes.json(),
        tablesRes.json(),
        ordersRes.json(),
      ]);

      const itemsArr = Array.isArray(items) ? items : [];
      const tablesArr = Array.isArray(tables) ? tables : [];
      const ordersArr = Array.isArray(orders) ? orders : [];

      const revenue = ordersArr
        .filter((o: any) => o.status === "completed")
        .reduce((sum: number, o: any) => {
          const orderTotal = o.order_items.reduce((s: number, i: any) => s + (i.unit_price * i.quantity), 0);
          return sum + orderTotal;
        }, 0);

      const occupied = tablesArr.filter((t: any) => t.status === "occupied").length;

      setStats({
        totalItems: itemsArr.length,
        totalTables: tablesArr.length,
        occupiedTables: occupied,
        totalOrdersCount: ordersArr.length,
        revenue,
        orders: ordersArr.slice(0, 5), // Lấy 5 đơn gần nhất
      });
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel("dashboard-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantSlug]);

  const cards = [
    { label: "Doanh thu", value: `${stats.revenue.toLocaleString()}đ`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Đơn hàng", value: stats.totalOrdersCount, icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Món ăn", value: stats.totalItems, icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Đang phục vụ", value: stats.occupiedTables, icon: Users, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const occupancyRate = stats.totalTables > 0 ? (stats.occupiedTables / stats.totalTables) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary/10 p-2 md:p-2.5 rounded-xl md:rounded-2xl">
              <LayoutDashboard className="size-5 md:size-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">Control Center</h1>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">
            Báo cáo cho <span className="text-foreground font-black">@{tenantSlug}</span>
          </p>
        </div>
        <Badge variant="outline" className="h-9 md:h-10 px-3 md:px-4 rounded-full border-primary/20 bg-primary/5 text-primary font-bold text-xs w-fit">
          <Clock className="size-3 md:size-3.5 mr-1.5 md:mr-2 animate-pulse" />
          {lastUpdated || "--:--"}
        </Badge>
      </div>

      {/* Hero Stats - Mobile 2 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {cards.map((c, i) => (
          <Card key={i} className="border-none shadow-lg md:shadow-xl shadow-slate-200/50 rounded-2xl md:rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-4 md:p-8 space-y-2 md:space-y-4">
              <div className={cn("size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", c.bg)}>
                <c.icon className={cn("size-5 md:size-6", c.color)} />
              </div>
              <div>
                <p className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-widest">{c.label}</p>
                <h3 className="text-xl md:text-3xl font-black tracking-tighter mt-0.5 md:mt-1">{loading ? "..." : c.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* Left Column: Orders and Actions */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">

          {/* Recent Orders List - Mobile Optimized */}
          <Card className="border-none shadow-lg md:shadow-xl shadow-slate-200/50 rounded-3xl md:rounded-[40px] overflow-hidden">
            <CardHeader className="p-4 md:p-8 pb-3 md:pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-xl font-black uppercase tracking-tight">Giao dịch mới</CardTitle>
                <CardDescription className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase">Top 5 đơn</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-full font-bold text-xs h-8 md:h-9 px-3">
                <Link href={`/admin/${tenantSlug}/orders`}>Tất cả <ArrowRight size={12} className="ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-8 pt-0">
              <div className="space-y-3 md:space-y-4">
                {stats.orders.length === 0 ? (
                  <div className="py-8 md:py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl md:rounded-[32px] text-sm">Chưa có đơn hàng</div>
                ) : stats.orders.map((o, i) => (
                  <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-muted/20 rounded-2xl md:rounded-3xl border border-transparent hover:border-primary/20 transition-all group">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="size-8 md:size-10 bg-white rounded-full border shadow-sm flex items-center justify-center font-black text-xs text-primary">
                        {o.table?.number || "?"}
                      </div>
                      <div>
                        <p className="font-bold text-xs md:text-sm">Bàn {o.table?.number}</p>
                        <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase">{new Date(o.created_at).toLocaleTimeString("vi-VN")}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1",
                      o.status === "completed" ? "bg-emerald-500" : o.status === "pending" ? "bg-amber-500" : "bg-blue-500"
                    )}>
                      {o.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Shortcuts - Mobile 1 column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <Link href={`/admin/${tenantSlug}/menu`} className="p-6 md:p-8 bg-primary rounded-3xl md:rounded-[40px] text-white shadow-xl md:shadow-2xl shadow-primary/30 group hover:-translate-y-2 transition-all">
              <ChefHat size={32} className="md:size-10 mb-4 md:mb-6 opacity-30 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none">Chỉnh sửa thực đơn</h3>
              <p className="text-white/60 text-xs font-medium mt-2 md:mt-3">Thêm món, đổi giá ngay.</p>
            </Link>
            <Link href={`/admin/${tenantSlug}/tables`} className="p-6 md:p-8 bg-slate-900 rounded-3xl md:rounded-[40px] text-white shadow-xl md:shadow-2xl shadow-slate-900/30 group hover:-translate-y-2 transition-all">
              <div className="size-12 md:size-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:rotate-12 transition-transform">
                <Users size={24} className="md:size-7" />
              </div>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Bàn ăn</h3>
              <p className="text-[10px] md:text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1">Quản lý không gian</p>
            </Link>

            <Link href={`/admin/${tenantSlug}/analysis`} className="p-6 md:p-8 bg-emerald-500 rounded-3xl md:rounded-[40px] text-white shadow-xl md:shadow-2xl shadow-emerald-500/30 group hover:-translate-y-2 transition-all sm:col-span-2 lg:col-span-1">
              <div className="size-12 md:size-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:rotate-12 transition-transform">
                <TrendingUp size={24} className="md:size-7" />
              </div>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Phân tích</h3>
              <p className="text-[10px] md:text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1">Doanh thu & Xu hướng</p>
            </Link>
          </div>
        </div>

        {/* Right Column: Insights */}
        <div className="space-y-6 md:space-y-8">

          {/* Capacity Insights - Mobile Optimized */}
          <Card className="border-none shadow-lg md:shadow-xl shadow-slate-200/50 rounded-3xl md:rounded-[40px] overflow-hidden p-6 md:p-8 space-y-4 md:space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-black uppercase tracking-tighter italic">Lấp đầy bàn</h3>
                <TrendingUp size={14} className="md:size-4 text-primary" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl md:text-5xl font-black tracking-tighter">{stats.occupiedTables}</span>
                <span className="text-slate-400 font-bold text-base md:text-lg mb-1">/ {stats.totalTables} bàn</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] md:text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Mức độ bận rộn</span>
                <span>{Math.round(occupancyRate)}%</span>
              </div>
              <Progress value={occupancyRate} className="h-3 md:h-4 rounded-full bg-slate-100" />
            </div>

            <div className="pt-2 md:pt-4 grid grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-muted/30 rounded-2xl md:rounded-3xl">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground mb-1">Số món</p>
                <p className="text-lg md:text-xl font-bold">{stats.totalItems}</p>
              </div>
              <div className="p-3 md:p-4 bg-muted/30 rounded-2xl md:rounded-3xl">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground mb-1">Đang xem</p>
                <p className="text-lg md:text-xl font-bold">{stats.occupiedTables * 2}+</p>
              </div>
            </div>
          </Card>

          {/* Quick Support / Alert - Mobile Optimized */}
          <Card className="bg-amber-50 border-none rounded-3xl md:rounded-[40px] p-6 md:p-8 space-y-3 md:space-y-4">
            <div className="size-9 md:size-10 bg-amber-200 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-700">
              <AlertCircle size={18} className="md:size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tighter text-amber-900 text-sm md:text-base">Mẹo quản lý</h4>
              <p className="text-xs text-amber-800/70 font-medium leading-relaxed">Luôn đảm bảo hình ảnh món ăn rực rỡ để kích thích vị giác!</p>
            </div>
            <Button size="sm" className="w-full rounded-xl md:rounded-2xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-[10px] uppercase h-9 md:h-10">Tìm hiểu thêm</Button>
          </Card>

        </div>

      </div>

    </div>
  );
}
