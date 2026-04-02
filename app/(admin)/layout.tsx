"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Grid3x3, Tag, ShoppingCart, Shield, ChevronLeft, TrendingUp, Bell, Users, Key, CreditCard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase-client";
import { tenantsApi, tablesApi } from "@/lib/api";

function PaymentHeader({ tenantSlug }: { tenantSlug: string }) {
  const [requestingTables, setRequestingTables] = useState<any[]>([]);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchRequests() {
      const { data } = await supabase
        .from("tables")
        .select("id, number, payment_requested")
        .eq("payment_requested", true);
      setRequestingTables(data || []);
    }
    fetchRequests();

    const channel = supabase
      .channel("payment-header-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tables" },
        (payload) => {
          if (payload.new.payment_requested) {
            setRequestingTables(prev => {
              if (prev.find(t => t.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else {
            setRequestingTables(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantSlug, supabase]);

  const handleDismiss = async (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await tablesApi.clearPaymentRequest(tenantSlug, tableId);
      toast.success("Đã ghi nhận yêu cầu!");
    } catch (error) {
      toast.error("Lỗi khi xóa yêu cầu!");
    }
  };

  if (requestingTables.length === 0) return null;

  return (
    <div className="bg-rose-500 text-white py-2.5 px-4 flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500 sticky top-0 z-50 shadow-lg overflow-x-auto no-scrollbar whitespace-nowrap">
      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tighter shrink-0">
        <CreditCard className="size-4 animate-pulse" />
        <span>Yêu cầu thanh toán:</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4">
        {requestingTables.sort((a, b) => a.number - b.number).map(table => (
          <div
            key={table.id}
            className="group/item flex items-center gap-0.5"
          >
            <Link
              href={`/admin/${tenantSlug}/tables`}
              className="bg-white/20 hover:bg-white/40 transition-colors px-3 py-1 rounded-l-full text-xs font-black ring-1 ring-white/30 flex items-center gap-1.5"
            >
              Bàn {table.number}
            </Link>
            <button
              onClick={(e) => handleDismiss(e, table.id)}
              className="bg-white/10 hover:bg-white/40 transition-colors px-2 py-1 rounded-r-full text-[10px] font-black ring-1 ring-white/30 border-l border-white/20"
              title="Đã xem"
            >
              <X size={10} strokeWidth={4} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            duration: 0,
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
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    let mounted = true;

    async function fetchRole() {
      if (!tenantSlug || !mounted) return;
      setUserRole("...");

      try {
        // Try session first (fastest)
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = session?.user;

        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user;
        }

        if (!user) {
          if (mounted) setUserRole("Chưa Login");
          return;
        }

        // 1. Get tenant
        const { data: tenant }: any = await supabase
          .from("tenants")
          .select("id, owner_id")
          .eq("slug", tenantSlug)
          .single();

        if (!tenant) {
          if (mounted) setUserRole("Lỗi quán");
          return;
        }

        // 2. Get membership
        const { data: membership }: any = await supabase
          .from("tenant_users")
          .select("role")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .single();

        if (membership) {
          const roleMap: Record<string, string> = {
            owner: "Chủ quán 👑",
            admin: "Quản trị viên ⚡",
            member: "Nhân viên 👤",
          };
          if (mounted) setUserRole(roleMap[membership.role] || membership.role);
          return;
        }

        // 3. Fallback to owner check
        if (tenant.owner_id === user.id) {
          if (mounted) setUserRole("Chủ quán 👑");
        } else {
          if (mounted) setUserRole("Thành viên 👤");
        }
      } catch (err) {
        console.error("Role error:", err);
        if (mounted) setUserRole("Lỗi kết nối");
      }
    }

    // Listen for auth changes to auto-update
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && mounted) {
        fetchRole();
      }
    });

    fetchRole();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [tenantSlug, supabase]);

  const navItems = [
    { href: `/admin/${tenantSlug}`, label: "Tổng quan", icon: LayoutDashboard },
    { href: `/admin/${tenantSlug}/analysis`, label: "Phân tích dữ liệu", icon: TrendingUp },
    { href: `/admin/${tenantSlug}/orders`, label: "Điều phối đơn", icon: ShoppingCart },
    { href: `/admin/${tenantSlug}/requests`, label: "Yêu cầu bàn", icon: Bell },
    { href: `/admin/${tenantSlug}/menu`, label: "Thực đơn", icon: UtensilsCrossed },
    { href: `/admin/${tenantSlug}/categories`, label: "Danh mục", icon: Tag },
    { href: `/admin/${tenantSlug}/tables`, label: "Sơ đồ bàn", icon: Grid3x3 },
    { href: `/admin/${tenantSlug}/members`, label: "Nhân sự", icon: Users },
    { href: `/admin/${tenantSlug}/permissions`, label: "Phân quyền", icon: Key },
    { href: `/admin/${tenantSlug}/banking`, label: "Tài khoản ngân hàng", icon: CreditCard },
    { href: `/admin/${tenantSlug}/settings`, label: "Cài đặt bảo mật", icon: Shield },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 size-12 bg-primary text-white rounded-2xl shadow-xl flex items-center justify-center"
      >
        {isOpen ? <ChevronLeft className="size-6" /> : <LayoutDashboard className="size-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "shrink-0 flex flex-col bg-card border-r border-border h-screen sticky top-0 z-40 transition-all duration-300 ease-in-out",
        "lg:translate-x-0",
        isCollapsed ? "lg:w-20" : "lg:w-64",
        isOpen ? "fixed translate-x-0 w-64" : "fixed -translate-x-full lg:relative"
      )}>
        <div className={cn("px-4 py-4 flex items-center justify-between", isCollapsed && "lg:px-0 lg:justify-center")}>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300">
              <p className="font-bold text-sm leading-tight text-slate-800">Quản Lý Quán</p>
              <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Admin Panel</p>
                {userRole && (
                  <>
                    <span className="size-0.5 rounded-full bg-slate-300" />
                    <p className="text-[10px] text-primary font-black uppercase tracking-tighter italic">Role: {userRole}</p>
                  </>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex size-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title={isCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            <ChevronLeft className={cn("size-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
          </button>
        </div>
        <Separator />
        <nav className="flex-1 p-2 flex flex-col gap-0.5 mt-1 overflow-y-auto font-black text-[12px]">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-primary-foreground" : "text-slate-400")} />
                {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300 uppercase tracking-tight">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-2 border-t border-border mt-auto", isCollapsed && "lg:p-1")}>
          <a
            href="/tenants?back=true"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10px] font-black text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-widest",
              isCollapsed && "lg:justify-center lg:px-0"
            )}
            title="Đổi nhà hàng"
          >
            <ChevronLeft className="size-3.5 shrink-0" />
            {!isCollapsed && <span className="animate-in fade-in duration-300">Đổi nhà hàng</span>}
          </a>

          {userRole && !isCollapsed && (
            <div className="px-3 py-2 mt-1.5 bg-slate-50 rounded-xl border border-slate-100 animate-in zoom-in-95 duration-500">
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1.5 opacity-70">Phân quyền</p>
              <div className="flex items-center gap-2">
                <Shield size={10} className="text-primary" />
                <p className="text-[10px] font-black text-primary tracking-tight uppercase">Role: {userRole}</p>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <p className="px-2 mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center animate-in fade-in duration-300">
              v2.0 Premium Edition
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const [isChecking, setIsChecking] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    if (pathname && pathname.startsWith("/admin/")) {
      document.cookie = `last_admin_path=${pathname}; expires=${new Date(Date.now() + 7 * 864e5).toUTCString()}; path=/`;
    }
  }, [pathname]);

  useEffect(() => {
    if (!tenantSlug) return;
    async function checkTenant() {
      try {
        const result = await tenantsApi.checkTenant(tenantSlug);
        const data = result.payload;

        if (result.status !== 200 || data.deleted) {
          setIsDeleted(true);
          document.cookie = "last_admin_path=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "last_tenant_slug=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          toast.error("Nhà hàng này đã bị tạm dừng hoạt động", {
            description: "Bạn sẽ được chuyển về trang chủ",
            duration: 2000,
          });

          setTimeout(() => {
            router.push("/tenants");
          }, 2000);
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Failed to check tenant:", error);
        setIsChecking(false);
      }
    }

    checkTenant();
  }, [tenantSlug, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-muted-foreground">Nhà hàng đã bị tạm dừng</p>
          <p className="text-sm text-muted-foreground">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <PaymentHeader tenantSlug={tenantSlug} />
      <div className="flex flex-1">
        <Sidebar />
        <RealtimeNotifier />
        <main className="flex-1 overflow-auto bg-muted/30 lg:ml-0">{children}</main>
      </div>
      <Toaster position="top-right" richColors expand />
    </div>
  );
}
