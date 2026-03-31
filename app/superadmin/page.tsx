"use client";

import { useState, useEffect } from "react";
import { Store, Users, Package, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string; name: string; plan: string;
  sub_status: string; created_at: string; owner_email: string;
}

const PLAN_COLOR: Record<string, string> = {
  free: "text-slate-400", starter: "text-blue-400",
  pro: "text-violet-400", enterprise: "text-amber-400",
};

export default function SuperAdminOverview() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/tenants").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTenants(d);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: "Tổng nhà hàng",  value: tenants.length,                                          icon: Store,     color: "text-white"       },
    { label: "Đang hoạt động", value: tenants.filter(t => t.sub_status === "active").length,    icon: TrendingUp, color: "text-emerald-400" },
    { label: "Gói Pro+",       value: tenants.filter(t => ["pro","enterprise"].includes(t.plan)).length, icon: Package, color: "text-violet-400" },
    { label: "Free plan",      value: tenants.filter(t => t.plan === "free").length,             icon: Users,     color: "text-slate-400"   },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white">Tổng quan</h1>
        <p className="text-white/40 text-sm mt-1">Chào mừng trở lại, Super Admin.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-[24px] p-5 space-y-3">
              <Icon className={cn("size-5", s.color)} />
              <div>
                <p className={cn("text-4xl font-black tracking-tighter", s.color)}>
                  {loading ? "—" : s.value}
                </p>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/superadmin/tenants" className="bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 rounded-[24px] p-6 flex items-center gap-4 transition-all group">
          <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Store className="size-6 text-white/60 group-hover:text-primary" />
          </div>
          <div>
            <p className="font-black text-white">Quản lý nhà hàng</p>
            <p className="text-xs text-white/40 mt-0.5">Xem, sửa gói, theo dõi trạng thái</p>
          </div>
        </Link>
        <Link href="/superadmin/plans" className="bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 rounded-[24px] p-6 flex items-center gap-4 transition-all group">
          <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Package className="size-6 text-white/60 group-hover:text-primary" />
          </div>
          <div>
            <p className="font-black text-white">Gói dịch vụ</p>
            <p className="text-xs text-white/40 mt-0.5">Chỉnh sửa giá, giới hạn tính năng</p>
          </div>
        </Link>
      </div>

      {/* Recent tenants */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Nhà hàng mới nhất</p>
        <div className="bg-white/5 border border-white/10 rounded-[24px] divide-y divide-white/5 overflow-hidden">
          {loading ? [1,2,3].map(i => <div key={i} className="h-14 bg-white/5 animate-pulse m-3 rounded-xl" />) :
            tenants.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-bold text-white text-sm">{t.name}</p>
                  <p className="text-[10px] text-white/30">{t.owner_email}</p>
                </div>
                <span className={cn("text-xs font-black uppercase tracking-widest", PLAN_COLOR[t.plan] || "text-slate-400")}>
                  {t.plan}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
