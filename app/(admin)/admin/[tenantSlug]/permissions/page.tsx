"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { permissionsApi } from "@/lib/api";
import { Shield, Crown, UserCheck, RefreshCw, Check, X } from "lucide-react";
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="size-5" />
            <h1 className="text-2xl font-bold tracking-tight">Quản lý phân quyền</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Cấu hình quyền truy cập cho từng vai trò trong nhà hàng
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPermissions}
          disabled={loading}
          className="rounded-full font-black text-[10px] uppercase shadow-sm"
        >
          <RefreshCw className={cn("size-3 mr-1", loading && "animate-spin")} /> Làm mới
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["owner", "admin", "member"] as Role[]).map((role) => {
          const cfg = ROLE_CONFIG[role];
          const Icon = cfg.icon;
          const count = rolePermissions[role]?.length || 0;
          return (
            <div key={role} className={cn("rounded-[24px] border p-5 space-y-2", cfg.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-4", cfg.color)} />
                  <span className={cn("font-black text-sm uppercase tracking-widest", cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
                <Badge variant="outline" className="rounded-full font-bold">
                  {role === "owner" ? "Toàn quyền" : `${count} quyền`}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-[24px] bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                <h2 className="font-black text-sm uppercase tracking-widest text-slate-700">
                  {CATEGORY_LABELS[category] || category}
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{perm.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                    </div>

                    {/* Permission toggles */}
                    <div className="flex items-center gap-2">
                      {(["owner", "admin", "member"] as Role[]).map((role) => {
                        const cfg = ROLE_CONFIG[role];
                        const hasPermission = rolePermissions[role]?.includes(perm.id);
                        const isSaving = saving === `${role}-${perm.id}`;
                        const isOwner = role === "owner";

                        return (
                          <button
                            key={role}
                            disabled={isOwner || isSaving}
                            onClick={() => !isOwner && togglePermission(role, perm.id, !hasPermission)}
                            className={cn(
                              "size-10 rounded-xl border-2 flex items-center justify-center transition-all",
                              isOwner
                                ? "bg-amber-50 border-amber-200 cursor-not-allowed"
                                : hasPermission
                                ? `${cfg.bg} border-current ${cfg.color} hover:opacity-80`
                                : "border-slate-200 hover:border-slate-300 text-slate-300",
                              isSaving && "animate-pulse"
                            )}
                            title={`${cfg.label}: ${hasPermission ? "Có quyền" : "Không có quyền"}`}
                          >
                            {isOwner ? (
                              <Crown className="size-4 text-amber-500" />
                            ) : hasPermission ? (
                              <Check className="size-5" />
                            ) : (
                              <X className="size-5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-200 rounded-[24px] p-6">
        <div className="flex gap-3">
          <Shield className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-blue-900">Lưu ý về phân quyền</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Chủ sở hữu luôn có toàn quyền và không thể thay đổi</li>
              <li>Thay đổi quyền sẽ áp dụng ngay lập tức cho tất cả thành viên</li>
              <li>Chỉ chủ sở hữu mới có thể quản lý phân quyền</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
