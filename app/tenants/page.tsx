"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Store, LogOut, Plus, ChevronRight, LayoutDashboard, User, Trash2, ShieldAlert, AlertTriangle, Crown, Check, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tenantsApi } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function TenantsPage() {
  return (
    <Suspense>
      <TenantsContent />
    </Suspense>
  );
}

function TenantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [archivedTenants, setArchivedTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string; name: string; hard: boolean } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    const lastPath = getCookie("last_admin_path");
    const isBack = searchParams.get("back") === "true";

    if (isBack) {
      deleteCookie("last_admin_path");
      deleteCookie("last_tenant_slug");
    } else if (lastPath && lastPath.startsWith("/admin/")) {
      router.push(lastPath);
      return;
    }

    fetchTenants();
  }, [searchParams]);

  async function fetchTenants() {
    try {
      const result = await tenantsApi.getTenants();
      if (result.status === 401) {
        router.push("/auth/login");
        return;
      }
      setTenants(result.payload);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }

    // Fetch archived tenants
    try {
      const result = await tenantsApi.getArchivedTenants();
      setArchivedTenants(result.payload);
    } catch {}

    // Fetch subscription info
    try {
      const result = await tenantsApi.getSubscription();
      const data = result.payload;
      if (data.plans) setPlans(data.plans as any);
      if (data.subscriptions) setSubscriptions(data.subscriptions as any);
    } catch {}
  }

  function selectTenant(tenantSlug: string) {
    const targetPath = `/admin/${tenantSlug}`;
    setCookie("last_tenant_slug", tenantSlug, 7);
    setCookie("last_admin_path", targetPath, 7);
    router.push(targetPath);
  }

  async function executeDelete() {
    if (!deleteConfig) return;

    try {
      const result = await tenantsApi.deleteTenant(deleteConfig.id, deleteConfig.hard);
      if (result.status === 200) {
        fetchTenants();
        setDeleteConfig(null);
        setConfirmText("");
      } else {
        alert("Xóa thất bại. Chỉ chủ sở hữu mới có quyền này.");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
  }

  async function restoreTenant(tenantId: string) {
    try {
      const result = await tenantsApi.restoreTenant(tenantId);
      if (result.status === 200) {
        fetchTenants();
      } else {
        alert("Khôi phục thất bại");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
  }

  function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
  }
  function getCookie(name: string) {
    return document.cookie.split("; ").reduce((r, v) => {
      const parts = v.split("=");
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "");
  }
  function deleteCookie(name: string) {
    setCookie(name, "", -1);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fb]">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 font-medium text-slate-500 animate-pulse">Đang kiểm tra phiên làm việc...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center px-3 md:px-4 py-6 md:py-8 lg:py-16">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl w-full space-y-6 md:space-y-10 z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-slate-200 pb-6 md:pb-8">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold tracking-tight uppercase text-xs md:text-sm">
              <LayoutDashboard className="size-4 md:size-5" />
              <span>Hệ thống quản lý</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Chào mừng trở lại!</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Bạn có {tenants.length} nhà hàng đang hoạt động.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Button onClick={() => router.push("/tenants/create")} className="h-10 md:h-12 px-4 md:px-6 rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 font-bold text-xs md:text-sm">
              <Plus className="mr-1.5 md:mr-2 size-3 md:size-4" /> 
              <span className="hidden sm:inline">Đăng ký nhà hàng mới</span>
              <span className="sm:hidden">Đăng ký mới</span>
            </Button>
            <Button variant="ghost" className="h-10 md:h-12 rounded-xl md:rounded-2xl px-3 md:px-4 text-slate-500 hover:text-red-500 font-bold text-xs md:text-sm" onClick={() => router.push("/auth/logout")}>
              <LogOut className="mr-1 size-3 md:size-4" /> Thoát
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="group relative">
              <Card className="relative h-full bg-white border-slate-100 hover:border-primary/20 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
                <CardContent className="p-5 md:p-8">
                  <div className="flex items-start justify-between">
                    <div onClick={() => selectTenant(tenant.slug)} className="size-12 md:size-14 bg-slate-50 group-hover:bg-primary/5 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors cursor-pointer">
                      <Store className="size-5 md:size-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 md:size-10 p-0 rounded-full text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="size-3 md:size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 md:w-56 rounded-xl md:rounded-2xl p-2 shadow-2xl border-slate-100">
                        <DropdownMenuLabel className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest p-2 md:p-3">Quản lý nhà hàng</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfig({ id: tenant.id, name: tenant.name, hard: false })} className="rounded-lg md:rounded-xl p-2 md:p-3 focus:bg-red-50 focus:text-red-600 cursor-pointer text-xs md:text-sm">
                          <AlertTriangle className="mr-2 size-3 md:size-4" /> Xóa tạm thời (Soft)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteConfig({ id: tenant.id, name: tenant.name, hard: true })} className="rounded-lg md:rounded-xl p-2 md:p-3 focus:bg-red-600 focus:text-white cursor-pointer group text-xs md:text-sm">
                          <ShieldAlert className="mr-2 size-3 md:size-4" /> Xóa vĩnh viễn (Hard)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-6 md:mt-8 cursor-pointer" onClick={() => selectTenant(tenant.slug)}>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{tenant.name}</h3>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {tenant.slug}</p>
                  </div>

                  <div className="mt-6 md:mt-10 pt-4 md:pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-primary">
                      Vào quản lý <ChevronRight className="size-2.5 md:size-3 transition-transform group-hover:translate-x-1" />
                    </div>
                    {(() => {
                      const sub = subscriptions.find((s: any) => s.tenant_id === tenant.id);
                      if (!sub?.expires_at) return null;
                      const days = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000);
                      if (days <= 0) return <span className="text-[9px] md:text-[10px] font-black text-red-500 uppercase">Hết hạn</span>;
                      if (days <= 7) return <span className="text-[9px] md:text-[10px] font-black text-amber-500">⚠ còn {days} ngày</span>;
                      return <span className="text-[9px] md:text-[10px] font-bold text-slate-400">còn {days} ngày</span>;
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Archived Tenants Section */}
        {archivedTenants.length > 0 && (
          <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 md:size-5 text-amber-500" />
              <h2 className="text-lg md:text-xl font-black text-slate-700">Nhà hàng đã tạm dừng ({archivedTenants.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {archivedTenants.map((tenant) => (
                <Card key={tenant.id} className="relative bg-slate-50 border-slate-200 rounded-xl md:rounded-2xl opacity-75">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="size-10 md:size-12 bg-slate-200 rounded-lg md:rounded-xl flex items-center justify-center">
                          <Store className="size-4 md:size-5 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm md:text-base text-slate-700">{tenant.name}</h3>
                          <p className="text-[10px] md:text-xs text-slate-400 font-mono">{tenant.slug}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] md:text-[10px]">
                        Đã tạm dừng
                      </Badge>
                    </div>
                    <div className="mt-3 md:mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreTenant(tenant.id)}
                        className="flex-1 rounded-lg md:rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-9 md:h-10 text-xs"
                      >
                        Khôi phục
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfig({ id: tenant.id, name: tenant.name, hard: true })}
                        className="rounded-lg md:rounded-xl border-red-200 text-red-600 hover:bg-red-50 size-9 md:size-10"
                      >
                        <Trash2 className="size-3 md:size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center pt-6 md:pt-8">
          <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
            © 2026 Quản Lý Nhà Quán • Version 2.0 Premium
          </p>
        </footer>

        {/* Plans section */}
        {plans.length > 0 && (
          <div className="space-y-4 md:space-y-6 pt-3 md:pt-4 border-t border-slate-100">
            <div className="text-center space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Gói dịch vụ</h2>
              <p className="text-slate-500 text-xs md:text-sm">Nâng cấp để mở khóa thêm tính năng cho nhà hàng của bạn.</p>
            </div>

            {/* Current plan badge */}
            {subscriptions.length > 0 && (
              <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                {subscriptions.map((sub: any) => {
                  const tenant = tenants.find(t => t.id === sub.tenant_id);
                  if (!tenant) return null;

                  const daysLeft = sub.expires_at
                    ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)
                    : null;
                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  const isWarning = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;

                  return (
                    <div key={sub.tenant_id} className={cn(
                      "flex items-center gap-2 border rounded-2xl px-4 py-2.5",
                      isExpired ? "bg-red-50 border-red-200" : isWarning ? "bg-amber-50 border-amber-200" : "bg-primary/5 border-primary/20"
                    )}>
                      <Crown className={cn("size-4", isExpired ? "text-red-500" : isWarning ? "text-amber-500" : "text-primary")} />
                      <span className={cn("text-sm font-black", isExpired ? "text-red-600" : isWarning ? "text-amber-600" : "text-primary")}>
                        {tenant.name}
                      </span>
                      <Badge className={cn("border-none rounded-xl font-black text-[10px] uppercase px-2",
                        isExpired ? "bg-red-500 text-white" : isWarning ? "bg-amber-500 text-white" : "bg-primary text-white"
                      )}>
                        {sub.plan?.name || sub.plan_id}
                      </Badge>
                      {daysLeft !== null && (
                        <span className={cn("text-[11px] font-black tabular-nums",
                          isExpired ? "text-red-500" : isWarning ? "text-amber-500" : "text-slate-500"
                        )}>
                          {isExpired ? "Đã hết hạn" : `còn ${daysLeft} ngày`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {plans.map((plan: any) => {
                const isCurrent = subscriptions.some((s: any) => s.plan_id === plan.id);
                const isFree = plan.price_monthly === 0;
                return (
                  <div key={plan.id} className={cn(
                    "relative rounded-[1.5rem] md:rounded-[2rem] border p-4 md:p-6 space-y-3 md:space-y-4 transition-all",
                    isCurrent ? "border-primary bg-primary/5 shadow-xl shadow-primary/10" : "border-slate-100 bg-white shadow-sm hover:shadow-md"
                  )}>
                    {isCurrent && (
                      <div className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-white border-none rounded-full font-black text-[8px] md:text-[9px] uppercase px-2 md:px-3 shadow-lg">
                          Đang dùng
                        </Badge>
                      </div>
                    )}
                    <div>
                      <p className="font-black text-slate-900 text-base md:text-lg">{plan.name}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">{plan.description}</p>
                    </div>
                    <div>
                      {isFree ? (
                        <p className="text-2xl md:text-3xl font-black text-slate-900">Miễn phí</p>
                      ) : (
                        <p className="text-2xl md:text-3xl font-black text-slate-900">
                          {plan.price_monthly.toLocaleString("vi-VN")}
                          <span className="text-xs md:text-sm font-bold text-slate-400">đ/tháng</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                      {[
                        { label: `${plan.max_tables === 999 ? "Không giới hạn" : plan.max_tables} bàn` },
                        { label: `${plan.max_members === 999 ? "Không giới hạn" : plan.max_members} thành viên` },
                        { label: plan.duration_days === 0 ? "Không giới hạn thời gian" : `${plan.duration_days} ngày` },
                      ].map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 md:gap-2 text-slate-600">
                          <Check className="size-3 md:size-3.5 text-emerald-500 shrink-0" />
                          <span className="font-medium">{f.label}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className={cn("w-full rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest h-10 md:h-11",
                        isCurrent ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                      )}
                      variant={isCurrent ? "ghost" : "default"}
                      disabled={isCurrent || isFree}
                      onClick={() => window.open("mailto:delb1k98@gmail.com?subject=Nâng cấp gói " + plan.name, "_blank")}
                    >
                      {isCurrent ? "Đang sử dụng" : isFree ? "Mặc định" : <><Zap className="size-3 md:size-3.5 mr-1" /> Liên hệ nâng cấp</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteConfig}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfig(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-md p-0 overflow-hidden">
          <div className="p-8 space-y-6">
            <AlertDialogHeader className="space-y-4">
              <div className="flex justify-center">
                <div className={cn(
                  "size-20 rounded-3xl flex items-center justify-center transition-transform hover:rotate-3 duration-500 shadow-lg",
                  deleteConfig?.hard
                    ? "bg-red-600 text-white shadow-red-200"
                    : "bg-orange-500 text-white shadow-orange-100"
                )}>
                  {deleteConfig?.hard ? <ShieldAlert className="size-10" /> : <AlertTriangle className="size-10" />}
                </div>
              </div>

              <div className="space-y-2 text-center">
                <AlertDialogTitle className="text-3xl font-black text-slate-900 leading-tight">
                  {deleteConfig?.hard ? "Xóa vĩnh viễn?" : "Tạm dừng hoạt động?"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base font-medium text-slate-500 px-2 leading-relaxed">
                  Hệ thống sẽ {deleteConfig?.hard ? "xóa toàn bộ dữ liệu của" : "tạm thời khóa truy cập"} nhà hàng
                  <span className="text-slate-900 font-black block mt-1 text-lg">“{deleteConfig?.name}”</span>
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>

            <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Xác thực bảo mật
                </label>
                <p className="text-sm font-medium text-slate-600 leading-snug ml-1">
                  Vui lòng nhập lại tên nhà hàng để xác nhận:
                </p>
                <Input
                  autoFocus
                  placeholder="Nhập tên tại đây..."
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-center font-bold h-14 rounded-2xl shadow-sm transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <AlertDialogAction
                onClick={executeDelete}
                disabled={confirmText !== deleteConfig?.name}
                className={cn(
                  "h-14 rounded-2xl font-black text-base shadow-xl transition-all duration-300 disabled:opacity-20 disabled:grayscale",
                  deleteConfig?.hard
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-100"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                )}
              >
                {deleteConfig?.hard ? "XÁC NHẬN XÓA BỎ" : "TẠM DỪNG NGAY"}
              </AlertDialogAction>

              <AlertDialogCancel className="h-14 rounded-2xl border-none bg-transparent hover:bg-slate-100 font-bold text-slate-500 transition-all">
                Hủy và quay lại
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

