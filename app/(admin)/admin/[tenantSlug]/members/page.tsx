"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Users, Crown, Shield, UserCheck, Trash2, Plus, Mail, RefreshCw, ChevronDown, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Role = "owner" | "admin" | "member";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: Role;
  created_at: string;
}

interface SubscriptionLimit {
  maxMembers: number;
  currentMembers: number;
}

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ElementType; color: string; bg: string; desc: string }> = {
  owner:  { label: "Chủ sở hữu", icon: Crown,     color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",  desc: "Toàn quyền, không thể bị xóa hay thay đổi" },
  admin:  { label: "Quản lý",    icon: Shield,     color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",    desc: "Quản lý menu, bàn, đơn hàng, nhân viên" },
  member: { label: "Nhân viên",  icon: UserCheck,  color: "text-slate-600",  bg: "bg-slate-50 border-slate-200",  desc: "Xem đơn hàng và yêu cầu bàn" },
};

export default function MembersPage() {
  const { tenantSlug } = useParams() as { tenantSlug: string };
  const [members, setMembers] = useState<Member[]>([]);
  const [limits, setLimits] = useState<SubscriptionLimit>({ maxMembers: 3, currentMembers: 0 });
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Member | null>(null);

  useEffect(() => { fetch_(); }, [tenantSlug]);
  async function fetch_() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/members`);
      const data = await res.json();
      if (data.members) {
        setMembers(data.members);
        setCurrentRole(data.currentRole);
        setLimits({
          maxMembers: data.maxMembers || 3,
          currentMembers: data.members.length,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      console.log("Add member response:", { status: res.status, data });
      if (!res.ok) { 
        alert(data.error || "Thêm thất bại"); 
        return; 
      }
      setInviteEmail("");
      await fetch_();
      alert("Thêm thành viên thành công!");
    } catch (err) {
      console.error("Add member error:", err);
      alert("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeRole(memberId: string, role: Role) {
    await fetch(`/api/admin/${tenantSlug}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    await fetch_();
  }

  async function handleDelete(memberId: string) {
    await fetch(`/api/admin/${tenantSlug}/members?id=${memberId}`, { method: "DELETE" });
    setDeleteTarget(null);
    await fetch_();
  }

  async function handleResetPassword(email: string) {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        alert(`Đã gửi email đặt lại mật khẩu đến ${email}`);
        setResetPasswordTarget(null);
      } else {
        alert("Gửi email thất bại");
      }
    } catch {
      alert("Lỗi kết nối");
    }
  }

  const isOwner = currentRole === "owner";
  const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Users className="size-4 md:size-5" />
            <h1 className="text-lg md:text-2xl font-bold tracking-tight">Quản lý nhân sự</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">{members.length} thành viên trong nhà hàng này.</p>
          {limits.currentMembers >= limits.maxMembers && (
            <p className="text-[10px] md:text-xs text-amber-600 font-bold mt-1">
              ⚠️ Đã đạt giới hạn {limits.maxMembers} thành viên
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetch_} disabled={loading} className="rounded-full font-black text-[9px] md:text-[10px] uppercase shadow-sm h-8 md:h-9">
          <RefreshCw className={cn("size-2.5 md:size-3 mr-1", loading && "animate-spin")} /> Làm mới
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={role} className={cn("rounded-[18px] md:rounded-[24px] border p-4 md:p-5 space-y-2", cfg.bg)}>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Icon className={cn("size-3 md:size-4", cfg.color)} />
                <span className={cn("font-black text-[10px] md:text-sm uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Invite form */}
      {isAdminOrOwner && (
        <div className="bg-white rounded-[20px] md:rounded-[32px] border border-slate-100 shadow-sm p-4 md:p-6 space-y-3 md:space-y-4">
          <p className="font-black text-[10px] md:text-sm uppercase tracking-widest text-slate-500">Thêm thành viên mới</p>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-3 md:size-4 text-slate-400" />
              <Input
                placeholder="Email nhân viên..."
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
                className="pl-9 md:pl-11 h-10 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 border-none font-medium placeholder:text-slate-300 text-sm"
              />
            </div>
            {/* Role selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 md:h-12 rounded-xl md:rounded-2xl border-slate-100 font-black text-[10px] md:text-xs uppercase tracking-widest gap-2 min-w-[110px] md:min-w-[130px]">
                  {ROLE_CONFIG[inviteRole].label} <ChevronDown className="size-2.5 md:size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl md:rounded-2xl p-2">
                {isOwner && (
                  <DropdownMenuItem onClick={() => setInviteRole("admin")} className="rounded-xl font-bold text-xs md:text-sm">
                    <Shield className="size-3 md:size-4 mr-2 text-blue-500" /> Quản lý
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setInviteRole("member")} className="rounded-xl font-bold text-xs md:text-sm">
                  <UserCheck className="size-3 md:size-4 mr-2 text-slate-500" /> Nhân viên
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={handleInvite}
              disabled={saving || !inviteEmail.trim() || limits.currentMembers >= limits.maxMembers}
              className="h-10 md:h-12 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest px-4 md:px-6 shadow-lg shadow-primary/20"
            >
              {saving ? <RefreshCw className="size-3 md:size-4 animate-spin" /> : <><Plus className="size-3 md:size-4 mr-1" /> Thêm</>}
            </Button>
          </div>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-medium">
            Nếu email chưa có tài khoản, hệ thống sẽ gửi lời mời qua email. 
            ({limits.currentMembers}/{limits.maxMembers} thành viên)
          </p>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2 md:space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-16 md:h-20 rounded-[18px] md:rounded-[24px] bg-muted/40 animate-pulse" />)
        ) : members.map(member => {
          const cfg = ROLE_CONFIG[member.role];
          const Icon = cfg.icon;
          const canEdit = isOwner && member.role !== "owner";
          const canDelete = isAdminOrOwner && member.role !== "owner";

          return (
            <div key={member.id} className="bg-white rounded-[18px] md:rounded-[24px] border border-slate-100 shadow-sm px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-4">
              <div className={cn("size-8 md:size-10 rounded-xl md:rounded-2xl flex items-center justify-center border shrink-0", cfg.bg)}>
                <Icon className={cn("size-4 md:size-5", cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm md:text-base text-slate-900 truncate">{member.email}</p>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Tham gia {new Date(member.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>

              {/* Role badge / changer */}
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn("flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border text-[9px] md:text-xs font-black uppercase tracking-widest transition-all hover:opacity-80", cfg.bg, cfg.color)}>
                      {cfg.label} <ChevronDown className="size-2.5 md:size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-xl md:rounded-2xl p-2">
                    <DropdownMenuItem onClick={() => handleChangeRole(member.id, "admin")} className="rounded-xl font-bold text-xs md:text-sm">
                      <Shield className="size-3 md:size-4 mr-2 text-blue-500" /> Quản lý
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeRole(member.id, "member")} className="rounded-xl font-bold text-xs md:text-sm">
                      <UserCheck className="size-3 md:size-4 mr-2 text-slate-500" /> Nhân viên
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge className={cn("rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 border font-black text-[9px] md:text-xs uppercase tracking-widest", cfg.bg, cfg.color)}>
                  {cfg.label}
                </Badge>
              )}

              {canDelete && (
                <>
                  <Button
                    variant="ghost" size="icon"
                    className="size-8 md:size-9 rounded-lg md:rounded-xl text-slate-300 hover:text-amber-500 hover:bg-amber-50 shrink-0"
                    onClick={() => setResetPasswordTarget(member)}
                    title="Đặt lại mật khẩu"
                  >
                    <KeyRound className="size-3 md:size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="size-8 md:size-9 rounded-lg md:rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                    onClick={() => setDeleteTarget(member)}
                  >
                    <Trash2 className="size-3 md:size-4" />
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-[32px] border-none p-8 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Xóa thành viên?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">
              <span className="font-black text-slate-900">{deleteTarget?.email}</span> sẽ mất quyền truy cập vào nhà hàng này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-3">
            <AlertDialogCancel className="rounded-2xl border-none bg-slate-100 font-bold h-12">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black h-12 px-6"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password confirm */}
      <AlertDialog open={!!resetPasswordTarget} onOpenChange={open => !open && setResetPasswordTarget(null)}>
        <AlertDialogContent className="rounded-[32px] border-none p-8 max-w-sm">
          <AlertDialogHeader>
            <div className="size-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound className="size-8 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-center">Đặt lại mật khẩu?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500 text-center">
              Gửi email đặt lại mật khẩu đến<br />
              <span className="font-black text-slate-900">{resetPasswordTarget?.email}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-3">
            <AlertDialogCancel className="rounded-2xl border-none bg-slate-100 font-bold h-12">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black h-12 px-6"
              onClick={() => resetPasswordTarget && handleResetPassword(resetPasswordTarget.email)}
            >
              Gửi email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
