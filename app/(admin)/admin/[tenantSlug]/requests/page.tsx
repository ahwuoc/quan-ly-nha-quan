"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useParams } from "next/navigation";
import { Bell, CheckCircle2, RefreshCw, CreditCard, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const supabase = getSupabaseClient();

type ReqType = "payment" | "staff";
type ReqStatus = "pending" | "done";

interface TableRequest {
  id: string;
  table_id: string;
  type: ReqType;
  note: string | null;
  status: ReqStatus;
  created_at: string;
  table?: { number: number };
}

const TYPE_CONFIG: Record<ReqType, { label: string; icon: React.ElementType; accent: string; bg: string }> = {
  payment: { label: "Thanh toán",    icon: CreditCard, accent: "text-amber-600",  bg: "bg-amber-50 border-amber-100"  },
  staff:   { label: "Gọi nhân viên", icon: Users,      accent: "text-blue-600",   bg: "bg-blue-50 border-blue-100"    },
};

export default function RequestsPage() {
  const { tenantSlug } = useParams() as { tenantSlug: string };
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [activeType, setActiveType] = useState<ReqType | "all">("all");

  useEffect(() => {
    fetch_();
    const channel = supabase
      .channel("requests-admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_requests" }, fetch_)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantSlug]);

  async function fetch_() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/requests`);
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } finally {
      setLoading(false);
    }
  }

  async function markDone(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "done" } : r));
    await fetch(`/api/admin/${tenantSlug}/requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "done" }),
    });
  }

  const pending = requests.filter(r => r.status === "pending");
  const filtered = requests.filter(r => {
    if (!showDone && r.status === "done") return false;
    if (activeType !== "all" && r.type !== activeType) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Bell className="size-4 md:size-5" />
            <h1 className="text-lg md:text-2xl font-bold tracking-tight">Yêu cầu từ khách</h1>
            {pending.length > 0 && (
              <span className="size-5 md:size-6 bg-red-500 text-white text-[10px] md:text-xs font-black rounded-full flex items-center justify-center animate-pulse">
                {pending.length}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Nhận và xử lý yêu cầu từ các bàn theo thời gian thực.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowDone(p => !p)}
            className={cn("rounded-full font-black text-[9px] md:text-[10px] uppercase shadow-sm h-8 md:h-9 px-3 md:px-4", showDone && "bg-primary text-white border-primary")}
          >
            {showDone ? "Ẩn" : "Hiện"} đã xong
          </Button>
          <Button variant="outline" size="sm" onClick={fetch_} disabled={loading} className="rounded-full font-black text-[9px] md:text-[10px] uppercase shadow-sm h-8 md:h-9">
            <RefreshCw className={cn("size-2.5 md:size-3 mr-1", loading && "animate-spin")} /> Làm mới
          </Button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex overflow-x-auto p-1 md:p-1.5 bg-muted/60 rounded-[20px] md:rounded-[28px] w-full md:w-fit border shadow-inner gap-1 scrollbar-hide">
        {([
          { id: "all",     label: "Tất cả",        count: pending.length },
          { id: "payment", label: "Thanh toán",     count: pending.filter(r => r.type === "payment").length },
          { id: "staff",   label: "Gọi nhân viên",  count: pending.filter(r => r.type === "staff").length },
        ] as const).map(tab => (
          <Button
            key={tab.id}
            variant={activeType === tab.id ? "default" : "ghost"}
            className={cn("rounded-[16px] md:rounded-[22px] px-4 md:px-6 font-black uppercase text-[9px] md:text-[11px] tracking-widest h-9 md:h-10 transition-all whitespace-nowrap flex-shrink-0",
              activeType === tab.id ? "shadow-xl shadow-primary/30" : "text-muted-foreground hover:bg-white/50"
            )}
            onClick={() => setActiveType(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1.5 md:ml-2 py-0.5 px-1.5 md:px-2 bg-red-500 text-white rounded-full text-[8px] md:text-[9px]">{tab.count}</span>}
          </Button>
        ))}
      </div>

      {/* Cards */}
      {loading && requests.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-[20px] md:rounded-[32px] bg-muted/40 animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {filtered.map(req => {
            const cfg = TYPE_CONFIG[req.type] || TYPE_CONFIG.staff;
            const Icon = cfg.icon;
            const done = req.status === "done";
            return (
              <div key={req.id} className={cn(
                "rounded-[20px] md:rounded-[28px] border p-4 md:p-6 space-y-3 md:space-y-4 transition-all duration-300",
                done ? "opacity-40 bg-slate-50 border-slate-100" : `${cfg.bg} shadow-sm hover:shadow-md`
              )}>
                <div className="flex items-start justify-between">
                  <div className={cn("size-9 md:size-11 rounded-xl md:rounded-2xl flex items-center justify-center border", cfg.bg)}>
                    <Icon className={cn("size-4 md:size-5", cfg.accent)} />
                  </div>
                  <Badge className="rounded-full font-black text-[8px] md:text-[9px] uppercase tracking-widest border-none bg-white text-slate-700 shadow-sm px-2 md:px-3 py-1">
                    BÀN {req.table?.number ?? req.table_id}
                  </Badge>
                </div>

                <div>
                  <p className={cn("font-black text-sm md:text-base tracking-tight", cfg.accent)}>{cfg.label}</p>
                  {req.note && <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 italic">"{req.note}"</p>}
                  <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                    <Clock className="size-2.5 md:size-3" />
                    {new Date(req.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {new Date(req.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>

                {!done && (
                  <Button
                    className="w-full h-9 md:h-10 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest bg-slate-900 hover:bg-black text-white"
                    onClick={() => markDone(req.id)}
                  >
                    <CheckCircle2 className="size-3 md:size-4 mr-1.5 md:mr-2" /> Đã xử lý
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 border-4 border-dashed rounded-[40px] md:rounded-[60px] border-muted-foreground/10 opacity-30">
          <Bell className="size-12 md:size-16 mb-4 md:mb-6" />
          <h3 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">Không có yêu cầu nào</h3>
        </div>
      )}
    </div>
  );
}
