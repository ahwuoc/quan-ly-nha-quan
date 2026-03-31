"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Tenant {
  id: string; name: string; slug: string; created_at: string;
  owner_email: string; member_count: number; plan: string;
  sub_status: "active" | "expired" | "cancelled"; expires_at: string | null;
}

const PLANS = [
  { id: "free",       label: "Miễn phí",   color: "bg-slate-700 text-slate-300" },
  { id: "starter",    label: "Starter",    color: "bg-blue-900 text-blue-300"   },
  { id: "pro",        label: "Pro",        color: "bg-violet-900 text-violet-300"},
  { id: "enterprise", label: "Enterprise", color: "bg-amber-900 text-amber-300" },
];

const STATUS_CONFIG = {
  active:    { label: "Hoạt động", icon: CheckCircle2, color: "text-emerald-400" },
  expired:   { label: "Hết hạn",   icon: AlertCircle,  color: "text-amber-400"   },
  cancelled: { label: "Đã hủy",    icon: XCircle,      color: "text-red-400"     },
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState<{ open: boolean; tenant?: Tenant }>({ open: false });
  const [editPlan, setEditPlan] = useState("free");
  const [editExpiry, setEditExpiry] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/tenants");
      const data = await res.json();
      if (Array.isArray(data)) setTenants(data);
    } finally { setLoading(false); }
  }

  function openEdit(t: Tenant) {
    setEditPlan(t.plan);
    setEditExpiry(t.expires_at ? t.expires_at.slice(0, 10) : "");
    setEditNote("");
    setEditModal({ open: true, tenant: t });
  }

  async function handleSave() {
    if (!editModal.tenant) return;
    setSaving(true);
    try {
      await fetch("/api/superadmin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: editModal.tenant.id, plan_id: editPlan, expires_at: editExpiry || null, note: editNote || null }),
      });
      setEditModal({ open: false });
      await load();
    } finally { setSaving(false); }
  }

  const filtered = tenants.filter(t =>
    [t.name, t.slug, t.owner_email].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white">Nhà hàng</h1>
          <p className="text-white/40 text-sm mt-0.5">{tenants.length} nhà hàng đang đăng ký.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 font-black text-[10px] uppercase">
          <RefreshCw className={cn("size-3 mr-1", loading && "animate-spin")} /> Làm mới
        </Button>
      </div>

      <Input placeholder="Tìm nhà hàng, slug, email..." value={search} onChange={e => setSearch(e.target.value)}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl h-11" />

      <div className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/30">
          <span>Nhà hàng</span><span>Chủ sở hữu</span><span>TV</span><span>Gói</span><span></span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-white/20 font-black uppercase text-sm">Không tìm thấy</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(t => {
              const plan = PLANS.find(p => p.id === t.plan) || PLANS[0];
              const st = STATUS_CONFIG[t.sub_status] || STATUS_CONFIG.active;
              const StIcon = st.icon;
              return (
                <div key={t.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-black text-white">{t.name}</p>
                    <p className="text-[10px] text-white/30 font-mono">@{t.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 truncate">{t.owner_email}</p>
                    <p className="text-[10px] text-white/30">{new Date(t.created_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <div className="flex items-center gap-1 text-white/40 text-sm font-bold">
                    <Users className="size-3.5" /> {t.member_count}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={cn("rounded-xl px-2.5 py-1 border-none font-black text-[10px] uppercase", plan.color)}>{plan.label}</Badge>
                    <StIcon className={cn("size-3.5", st.color)} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}
                    className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-black text-[10px] uppercase h-8 px-4">
                    Sửa
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={editModal.open} onOpenChange={open => !open && setEditModal({ open: false })}>
        <DialogContent className="bg-slate-900 border-white/10 text-white rounded-[28px] p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">{editModal.tenant?.name}</DialogTitle>
            <DialogDescription className="text-white/40 text-xs">@{editModal.tenant?.slug} · {editModal.tenant?.owner_email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Gói dịch vụ</label>
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map(p => (
                  <button key={p.id} onClick={() => setEditPlan(p.id)}
                    className={cn("h-11 rounded-2xl border font-black text-sm uppercase tracking-widest transition-all",
                      editPlan === p.id ? "border-primary bg-primary text-white" : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                    )}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Ngày hết hạn (trống = không giới hạn)</label>
              <Input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-2xl h-11 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Ghi chú</label>
              <Input placeholder="VD: Đã thanh toán tháng 4..." value={editNote} onChange={e => setEditNote(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl h-11" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-2xl font-black uppercase text-sm">
              {saving ? <RefreshCw className="size-4 animate-spin" /> : "Lưu thay đổi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
