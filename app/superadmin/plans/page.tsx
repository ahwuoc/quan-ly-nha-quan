"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Plan {
  id: string; name: string; description: string;
  max_tables: number; max_members: number; price_monthly: number;
  duration_days: number; is_active: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/superadmin/plans");
    const data = await res.json();
    if (Array.isArray(data)) setPlans(data);
    setLoading(false);
  }

  function startEdit(p: Plan) {
    setEditing(p.id);
    setForm({ ...p });
  }

  async function saveEdit() {
    setSaving(true);
    await fetch("/api/superadmin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(null);
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white">Gói dịch vụ</h1>
          <p className="text-white/40 text-sm mt-0.5">Quản lý các gói và giới hạn tính năng.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 font-black text-[10px] uppercase">
          <RefreshCw className={cn("size-3 mr-1", loading && "animate-spin")} /> Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? [1,2,3,4].map(i => <div key={i} className="h-48 bg-white/5 rounded-[28px] animate-pulse" />) :
          plans.map(p => {
            const isEditing = editing === p.id;
            const data = isEditing ? form : p;
            return (
              <div key={p.id} className={cn(
                "bg-white/5 border rounded-[28px] p-6 space-y-4 transition-all",
                isEditing ? "border-primary/50 bg-primary/5" : "border-white/10"
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Package className="size-5 text-white/60" />
                    </div>
                    {isEditing ? (
                      <Input value={data.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white font-black h-9 rounded-xl w-32" />
                    ) : (
                      <div>
                        <p className="font-black text-white">{p.name}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">{p.id}</p>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <Button size="sm" onClick={saveEdit} disabled={saving}
                      className="rounded-xl h-8 px-4 font-black text-[10px] uppercase">
                      {saving ? <RefreshCw className="size-3 animate-spin" /> : <><Check className="size-3 mr-1" />Lưu</>}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(p)}
                      className="rounded-xl h-8 px-3 text-white/40 hover:text-white hover:bg-white/10">
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Giá/tháng (VNĐ)", key: "price_monthly", suffix: "đ" },
                    { label: "Số bàn tối đa",    key: "max_tables",    suffix: "" },
                    { label: "Số thành viên",    key: "max_members",   suffix: "" },
                    { label: "Thời hạn (ngày)",  key: "duration_days", suffix: " ngày" },
                  ].map(({ label, key, suffix }) => (
                    <div key={key} className="bg-white/5 rounded-2xl p-3 space-y-1">
                      <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">{label}</p>
                      {isEditing ? (
                        <Input type="number" value={(data as any)[key] ?? ""}
                          onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                          className="bg-white/10 border-white/20 text-white font-black h-8 rounded-xl text-sm p-2" />
                      ) : (
                        <p className="text-lg font-black text-white">
                          {key === "duration_days" && (p as any)[key] === 0
                            ? "∞"
                            : (p as any)[key].toLocaleString() + suffix}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Mô tả</p>
                    <Input value={data.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/20 rounded-xl h-9" />
                    <p className="text-[9px] text-white/20 italic">* Thời hạn = 0 nghĩa là không giới hạn (dùng cho gói Free)</p>
                  </div>
                )}

                {!isEditing && p.description && (
                  <p className="text-xs text-white/40 italic">{p.description}</p>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
