"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Grid3x3, Tag, ShoppingCart, Shield, ChevronLeft, TrendingUp, Bell, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase-client";

function RealtimeNotifier() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const initialized = useRef(false);

  useEffect(() => {
    if (!tenantSlug || initialized.current) return;
    initialized.current = true;

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`admin-notifier-${tenantSlug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload: any) => {
          const { data: table } = await supabase
            .from("tables")
            .select("number")
            .eq("id", payload.new.table_id)
            .single() as any;

          toast("🛎️ Đơn mới!", {
            description: `Bàn ${table?.number ?? payload.new.table_id} vừa gọi món`,
            duration: 6000,
            action: { label: "Xem", onClick: () => window.location.href = `/admin/${tenantSlug}/orders` },
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tables", filter: "payment_requested=eq.true" },
        (payload: any) => {
          if (!payload.new.payment_requested) return;
          toast("💳 Yêu cầu thanh toán!", {
            description: `Bàn ${payload.new.number} muốn thanh toán`,
            duration: 0, // không tự tắt
            action: { label: "Xem bàn", onClick: () => window.location.href = `/admin/${tenantSlug}/tables` },
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantSlug]);

  return null;
}

function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const navItems = [
    { href: `/admin/${tenantSlug}`, label: "Tổng quan", icon: LayoutDashboard },
    { href: `/admin/${tenantSlug}/analysis`, label: "Phân tích dữ liệu", icon: TrendingUp },
    { href: `/admin/${tenantSlug}/orders`, label: "Điều phối đơn", icon: ShoppingCart },
    { href: `/admin/${tenantSlug}/requests`, label: "Yêu cầu bàn", icon: Bell },
    { href: `/admin/${tenantSlug}/menu`, label: "Thực đơn", icon: UtensilsCrossed },
    { href: `/admin/${tenantSlug}/categories`, label: "Danh mục", icon: Tag },
    { href: `/admin/${tenantSlug}/tables`, label: "Sơ đồ bàn", icon: Grid3x3 },
    { href: `/admin/${tenantSlug}/members`, label: "Nhân sự", icon: Users },
    { href: `/admin/${tenantSlug}/settings`, label: "Cài đặt bảo mật", icon: Shield },
  ];

  return (
    <aside className="w-52 shrink-0 flex flex-col bg-card border-r border-border h-screen sticky top-0">
      <div className="px-4 py-4 flex items-center gap-2.5">
        <div>
          <p className="font-semibold text-sm leading-tight">Quản Lý Quán</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 p-2 flex flex-col gap-0.5 mt-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border mt-auto">
        <Link
          href="/tenants?back=true"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <ChevronLeft className="size-4 shrink-0" />
          Đổi nhà hàng
        </Link>
        <p className="px-2 mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">
          v2.0 Premium Edition
        </p>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && pathname.startsWith("/admin/")) {
      document.cookie = `last_admin_path=${pathname}; expires=${new Date(Date.now() + 7 * 864e5).toUTCString()}; path=/`;
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <RealtimeNotifier />
      <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
      <Toaster position="top-right" richColors expand />
    </div>
  );
}
