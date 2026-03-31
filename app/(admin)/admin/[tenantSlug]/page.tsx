"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  UtensilsCrossed,
  Grid3x3,
  Tag,
  QrCode,
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Store,
  LayoutDashboard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function TenantDashboard() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [counts, setCounts] = useState({ items: 0, tables: 0, categories: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
    async function fetchStats() {
      try {
        const [itemsRes, tablesRes, categoriesRes, ordersRes] = await Promise.all([
          fetch(`/api/admin/${tenantSlug}/menu-items`),
          fetch(`/api/admin/${tenantSlug}/tables`),
          fetch(`/api/admin/${tenantSlug}/categories`),
          fetch(`/api/admin/${tenantSlug}/orders`),
        ]);

        const [items, tables, categories, orders] = await Promise.all([
          itemsRes.json(),
          tablesRes.json(),
          categoriesRes.json(),
          ordersRes.json(),
        ]);

        setCounts({
          items: Array.isArray(items) ? items.length : 0,
          tables: Array.isArray(tables) ? tables.length : 0,
          categories: Array.isArray(categories) ? categories.length : 0,
          orders: Array.isArray(orders) ? orders.length : 0,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [tenantSlug]);

  const stats = [
    { label: "Món ăn", value: counts.items, icon: UtensilsCrossed, color: "text-blue-500", bg: "bg-blue-500/10", href: `/admin/${tenantSlug}/menu` },
    { label: "Bàn ăn", value: counts.tables, icon: Grid3x3, color: "text-emerald-500", bg: "bg-emerald-500/10", href: `/admin/${tenantSlug}/tables` },
    { label: "Đơn hàng", value: counts.orders, icon: Zap, color: "text-red-500", bg: "bg-red-500/10", href: `/admin/${tenantSlug}/orders` },
    { label: "Danh mục", value: counts.categories, icon: Tag, color: "text-orange-500", bg: "bg-orange-500/10", href: `/admin/${tenantSlug}/categories` },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <LayoutDashboard className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Tổng quan quản trị</h1>
          </div>
          <p className="text-muted-foreground ml-1">
            Theo dõi trạng thái và quản lý nội dung của <span className="text-foreground font-semibold">@{tenantSlug}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-background px-3 py-1.5 rounded-full border-primary/20 text-xs font-semibold uppercase tracking-tighter">
            <Clock className="size-3 mr-1.5 text-primary" />
            Mới cập nhật: {lastUpdated || "Đang tải..."}
          </Badge>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-primary/5">
              <div className={cn("absolute top-0 right-0 size-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-20", bg)} />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2.5 rounded-xl transition-colors duration-300", bg)}>
                    <Icon className={cn("size-5", color)} />
                  </div>
                  <TrendingUp className="size-4 text-muted-foreground/30" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-3xl font-black tracking-tight tracking-[-0.05em]">{loading ? "..." : value}</p>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 border-primary/5 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Truy cập nhanh</CardTitle>
                <CardDescription>Tiên ích quản lý dành cho chủ quán</CardDescription>
              </div>
              <Zap className="size-5 text-yellow-500 fill-yellow-500/20" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href={`/admin/${tenantSlug}/menu`} className="group flex items-start gap-4 p-4 rounded-2xl border bg-card hover:bg-primary/5 hover:border-primary/20 transition-all">
                <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <UtensilsCrossed className="size-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="font-bold">Quản lý thực đơn</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Cập nhật món ăn, hình ảnh và giá cả linh hoạt.</p>
                  <div className="flex items-center text-[10px] font-bold text-primary pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    MỞ NGAY <ArrowRight className="size-3 ml-1" />
                  </div>
                </div>
              </Link>

              <Link href={`/admin/${tenantSlug}/tables`} className="group flex items-start gap-4 p-4 rounded-2xl border bg-card hover:bg-primary/5 hover:border-primary/20 transition-all">
                <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Grid3x3 className="size-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="font-bold">Sơ đồ nhà hàng</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Sắp xếp bàn ăn, gán số bàn và tải mã QR Code.</p>
                  <div className="flex items-center text-[10px] font-bold text-primary pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    MỞ NGAY <ArrowRight className="size-3 ml-1" />
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
          <Separator />
          <div className="p-4 bg-muted/20 flex items-center justify-center">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              Xem thêm tiện ích <ArrowRight className="size-3 ml-1.5" />
            </Button>
          </div>
        </Card>

        {/* Steps Card */}
        <Card className="border-primary/5 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary pb-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <CardTitle className="text-xl">Bắt đầu nào! 🚀</CardTitle>
            <CardDescription className="text-primary-foreground/80">Quy trình 4 bước để quán vận hành</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
              {[
                { title: "Thiết lập thực đơn", desc: "Tạo danh mục và món ăn đầu tiên.", done: counts.items > 0 },
                { title: "Khai báo bàn", desc: "Định danh số bàn cho từng khu vực.", done: counts.tables > 0 },
                { title: "In mã QR Code", desc: "Dán QR lên bàn để khách quét gọi món.", done: counts.tables > 0 },
                { title: "Sẵn sàng phục vụ", desc: "Hệ thống đã sẵn sàng nhận đơn hàng.", done: counts.items > 0 && counts.tables > 0 },
              ].map((step, i) => (
                <div key={i} className="relative flex gap-4 pl-0">
                  <div className={cn(
                    "relative z-10 size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 shadow-sm border-2",
                    step.done
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "bg-background border-border text-muted-foreground"
                  )}>
                    {step.done ? <CheckCircle2 className="size-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className={cn("text-sm font-bold transition-colors", step.done ? "text-foreground" : "text-muted-foreground")}>{step.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full mt-8 rounded-xl shadow-lg shadow-primary/20">
              Khám phá đầy đủ <ArrowRight className="size-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
