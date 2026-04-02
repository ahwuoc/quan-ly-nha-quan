"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { permissionsApi } from "@/lib/api";
import { Shield, Crown, UserCheck, RefreshCw, Check, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

type Role = "owner" | "admin" | "member";

const ROLE_CONFIG = {
  owner: { label: "Chủ sở hữu", icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
  admin: { label: "Quản lý", icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
  member: { label: "Nhân viên", icon: UserCheck, color: "text-slate-600", bg: "bg-slate-50" },
};

const CATEGORY_LABELS: Record<string, string> = {
  menu: "Thực đơn",
  orders: "Đơn hàng",
  tables: "Bàn",
  members: "Nhân sự",
  settings: "Cài đặt",
};

export default function PermissionsPage() {
  const { tenantSlug } = useParams() as { tenantSlug: string };
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<Role, string[]>>({
    owner: [],
    admin: [],
    member: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPermissions = useCallback(async function () {
    setLoading(true);
    try {
      const result = await permissionsApi.getPermissions(tenantSlug);
      const data = result.payload;
      if (data.permissions) {
        setPermissions(data.permissions as any);
        setRolePermissions(data.rolePermissions as any);
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  async function togglePermission(role: Role, permissionId: string, enabled: boolean) {
    setSaving(`${role}-${permissionId}`);
    try {
      await permissionsApi.updatePermission(tenantSlug, { role, permissionId, enabled });
      await fetchPermissions();
    } catch (error) {
      console.error("Failed to update permission:", error);
    } finally {
      setSaving(null);
    }
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="p-3 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="size-10 md:size-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="size-5 md:size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight uppercase leading-none">Phân quyền hệ thống</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-70">
                Điều chỉnh quyền hạn cho từng vị trí làm việc
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPermissions}
          disabled={loading}
          className="h-10 md:h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 hover:bg-slate-50 transition-all active:scale-95 self-start md:self-auto"
        >
          <RefreshCw className={cn("size-3 mr-2", loading && "animate-spin")} /> Làm mới dữ liệu
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-[32px] bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="relative">
              <div className="flex items-center gap-4 mb-6 px-1">
                <div className="h-px flex-1 bg-slate-100" />
                <h2 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 bg-white px-4">
                  QUYỀN {CATEGORY_LABELS[category] || category}
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_repeat(3,100px)] lg:grid-cols-[1fr_repeat(3,140px)] border-b border-slate-50 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                  <div className="p-6 hidden md:block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Tính năng</span>
                  </div>
                  {(["owner", "admin", "member"] as Role[]).map((role) => {
                    const cfg = ROLE_CONFIG[role];
                    const Icon = cfg.icon;
                    return (
                      <div key={role} className="p-4 md:p-6 flex flex-col items-center justify-center gap-1 border-l border-slate-50/50">
                        <Icon className={cn("size-4 md:size-5", cfg.color)} />
                        <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-tighter", cfg.color)}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                  {perms.map((perm) => (
                    <div
                      key={perm.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_repeat(3,100px)] lg:grid-cols-[1fr_repeat(3,140px)] items-center group hover:bg-slate-50/30 transition-colors"
                    >
                      <div className="p-6">
                        <p className="font-extrabold text-slate-900 group-hover:text-primary transition-colors">{perm.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed opacity-80">{perm.description}</p>
                      </div>

                      {(["owner", "admin", "member"] as Role[]).map((role) => {
                        const cfg = ROLE_CONFIG[role];
                        const hasPermission = rolePermissions[role]?.includes(perm.id);
                        const isSaving = saving === `${role}-${perm.id}`;
                        const isOwner = role === "owner";

                        return (
                          <div key={role} className="p-4 md:p-6 flex items-center justify-center border-l border-slate-50/50">
                            <button
                              disabled={isOwner || isSaving}
                              onClick={() => !isOwner && togglePermission(role, perm.id, !hasPermission)}
                              className={cn(
                                "size-10 md:size-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                                isOwner
                                  ? "bg-amber-100/50 text-amber-600 border-2 border-amber-200/50 cursor-not-allowed scale-90"
                                  : hasPermission
                                    ? `${cfg.bg} ${cfg.color} border-2 border-current shadow-lg shadow-current/10 ring-4 ring-current/5`
                                    : "bg-slate-50 text-slate-300 border-2 border-slate-100 hover:border-slate-300 hover:bg-white",
                                isSaving && "animate-pulse scale-90"
                              )}
                            >
                              {isOwner ? (
                                <Crown className="size-4 md:size-5" />
                              ) : isSaving ? (
                                <RefreshCw className="size-4 md:size-5 animate-spin" />
                              ) : hasPermission ? (
                                <Check className="size-5 md:size-6 stroke-[3px]" />
                              ) : (
                                <X className="size-4 md:size-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Info Footer */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[32px] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
        <div className="relative bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="size-16 bg-blue-50 rounded-3xl flex items-center justify-center shrink-0">
            <Shield className="size-8 text-blue-600" />
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <p className="font-black text-slate-900 uppercase tracking-tight">Quy tắc bảo mật hệ thống</p>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lưu ý dành cho cấp quản lý</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Crown size={10} className="text-amber-600" /></div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed"><strong>Owner:</strong> Luôn có toàn quyền và tuyệt đối không thể thay đổi để đảm bảo bạn không bị mất quyền kiểm soát.</p>
              </div>
              <div className="flex gap-3">
                <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5"><Zap size={10} className="text-blue-600" /></div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed"><strong>Thời gian thực:</strong> Mọi thay đổi về quyền hạn sẽ được áp dụng ngay lập tức cho nhân viên sau khi bạn nhấn nút.</p>
              </div>
              <div className="flex gap-3">
                <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5"><Check size={10} className="text-emerald-600" /></div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed"><strong>Đối soát:</strong> Hệ thống sẽ ghi lại lịch sử thay đổi để bạn có thể kiểm tra lại ai đã điều chỉnh quyền nhân sự.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
