"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useParams } from "next/navigation";
import { ordersApi, type Order, type OrderStatus } from "@/lib/api/orders";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  RefreshCw,
  ShoppingCart,
  MapPin,
  AlertCircle,
  Search,
  User,
  Hash,
  Hourglass,
  Settings,
  Save
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const supabase = getSupabaseClient();

interface PaymentSession {
  session_id: string;
  table_id: string;
  table_number: string | number;
  orders: Order[];
  total: number;
  paid_at: string;
}

export default function OrdersPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const [newWindowSeconds, setNewWindowSeconds] = useState<number>(120);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = useCallback(async function () {
    setLoading(true);
    try {
      const result = await ordersApi.getOrders(tenantSlug);
      if (Array.isArray(result.payload)) setOrders(result.payload);

      const { data: tData } = (await supabase.from("tenants").select("*").eq("slug", tenantSlug).maybeSingle()) as { data: any };
      if (tData) {
        setTenantConfig(tData);
        setNewWindowSeconds(tData.order_cancel_window || 120);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    setMounted(true);
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!tenantSlug) return;
    const channel = supabase
      .channel("admin-orders-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { fetchOrders(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tenants" }, () => { fetchOrders(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantSlug, fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    try {
      await ordersApi.updateOrderStatus(tenantSlug, orderId, { status: status as OrderStatus });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  async function handleSaveConfig() {
    if (!tenantConfig?.id) return;
    setIsSavingConfig(true);
    try {
      const { error } = await (supabase as any).from("tenants")
        .update({ order_cancel_window: newWindowSeconds })
        .eq("id", tenantConfig.id);

      if (error) throw error;
      setShowSettings(false);
      await fetchOrders();
    } catch (err) {
      alert("Lỗi khi lưu cấu hình!");
    } finally {
      setIsSavingConfig(false);
    }
  }

  const statusConfig = {
    pending: { label: "Cần duyệt", color: "bg-rose-500", icon: Clock },
    preparing: { label: "Đang bếp", color: "bg-orange-500", icon: ChefHat },
    completed: { label: "Đã xong", color: "bg-emerald-500", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "bg-slate-500", icon: XCircle },
    paid: { label: "Đã thanh toán", color: "bg-emerald-700", icon: CheckCircle2 },
  };

  const [activeTab, setActiveTab] = useState<"pending" | "preparing" | "history" | "payment">("pending");
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const pendingOrders = orders.filter(o => o.status === "pending");
  const preparingOrders = orders.filter(o => o.status === "preparing");
  const historyOrders = orders.filter(o => {
    if (!["completed", "cancelled"].includes(o.status)) return false;
    if (historyFilter !== "all" && o.status !== historyFilter) return false;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      const tableMatch = String(o.table?.number ?? o.table_id).includes(q);
      const itemMatch = o.order_items.some(i => i.menu_item?.name?.toLowerCase().includes(q));
      return tableMatch || itemMatch;
    }
    return true;
  });

  const paymentSessions: PaymentSession[] = (() => {
    const paid = orders.filter(o => o.status === "paid");
    const map: Record<string, PaymentSession> = {};
    paid.forEach(o => {
      const key = o.session_id || o.id;
      if (!map[key]) {
        map[key] = {
          session_id: key,
          table_id: o.table_id,
          table_number: o.table?.number ?? o.table_id,
          orders: [],
          total: 0,
          paid_at: o.created_at,
        };
      }
      map[key].orders.push(o);
      map[key].total += o.order_items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      if (o.created_at > map[key].paid_at) map[key].paid_at = o.created_at;
    });
    return Object.values(map)
      .filter(s => !paymentSearch || String(s.table_number).includes(paymentSearch))
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
  })();

  const currentOrders = activeTab === "pending" ? pendingOrders : activeTab === "preparing" ? preparingOrders : historyOrders;

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 bg-[#f8fafc] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-slate-900">
            <div className="size-12 bg-primary/10 rounded-[20px] flex items-center justify-center">
              <ShoppingCart className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none uppercase italic">Bảng bếp điều phối</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sẵn sàng phục vụ thực khách</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="size-14 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-primary">
            <Settings className="size-6" />
          </Button>
          <Button variant="outline" onClick={fetchOrders} disabled={loading} className="rounded-2xl bg-white font-black text-[10px] uppercase shadow-sm border-slate-200 h-14 px-8">
            <RefreshCw className={cn("size-4 mr-2", loading && "animate-spin")} /> Làm mới
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto p-1.5 bg-slate-100 rounded-[28px] w-fit border border-slate-200/50 shadow-inner no-scrollbar">
        {[
          { id: "pending", label: "Chờ duyệt", count: pendingOrders.length },
          { id: "preparing", label: "Trong bếp", count: preparingOrders.length },
          { id: "history", label: "Lịch sử", count: null },
          { id: "payment", label: "Thanh toán", count: null },
        ].map((tab) => (
          <Button
            key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"}
            className={cn("rounded-[22px] px-8 font-black uppercase text-[11px] tracking-widest h-12 transition-all", activeTab === tab.id ? "bg-slate-900 text-white shadow-xl" : "text-slate-500 hover:bg-white/50")}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label} {tab.count !== null && <Badge className="ml-2 bg-primary/20 text-primary border-none font-black text-[9px]">{tab.count}</Badge>}
          </Button>
        ))}
      </div>

      <ActiveOrdersContent
        activeTab={activeTab} currentOrders={currentOrders} paymentSessions={paymentSessions} loading={loading}
        statusConfig={statusConfig} updateStatus={updateStatus} setCancelModal={setCancelModal}
        historySearch={historySearch} setHistorySearch={setHistorySearch} historyFilter={historyFilter} setHistoryFilter={setHistoryFilter}
        paymentSearch={paymentSearch} setPaymentSearch={setPaymentSearch}
        tenantConfig={tenantConfig} currentTime={currentTime}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="rounded-[40px] border-none p-10 bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Cấu hình nhà hàng</DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tùy chỉnh thời gian chờ hủy đơn</p>
          </DialogHeader>
          <div className="py-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Thời hạn hủy (Giây)</label>
              <div className="flex gap-4">
                <Input
                  type="number"
                  className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-black text-2xl text-center"
                  value={newWindowSeconds}
                  onChange={(e) => setNewWindowSeconds(parseInt(e.target.value) || 0)}
                />
                <div className="flex flex-col justify-center">
                  <span className="text-sm font-black text-slate-900 italic">~ {Math.floor(newWindowSeconds / 60)} PHÚT</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">THỜI GIAN CHỜ</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-6 border-t">
            <Button variant="ghost" className="h-14 rounded-2xl font-bold bg-slate-50" onClick={() => setShowSettings(false)}>ĐÓNG</Button>
            <Button disabled={isSavingConfig} className="h-14 rounded-2xl font-black bg-slate-900 text-white" onClick={handleSaveConfig}>
              {isSavingConfig ? <RefreshCw className="animate-spin" /> : <><Save size={16} className="mr-2" /> LƯU LẠI</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelModal.open} onOpenChange={(open) => setCancelModal({ ...cancelModal, open })}>
        <AlertDialogContent className="rounded-[40px] border-none p-10 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tight">Hủy đơn hàng này?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-slate-400">Bạn có chắc chắn muốn bỏ qua đơn hàng này không?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3">
            <AlertDialogCancel className="rounded-2xl font-bold h-14 border-none bg-slate-100">QUAY LẠI</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl font-black bg-rose-500 hover:bg-rose-600 text-white h-14 px-8"
              onClick={() => { if (cancelModal.orderId) updateStatus(cancelModal.orderId, "cancelled"); setCancelModal({ open: false, orderId: null }); }}
            > CÓ, HỦY NGAY </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActiveOrdersContent({
  activeTab, currentOrders, paymentSessions, loading, statusConfig, updateStatus, setCancelModal,
  historySearch, setHistorySearch, historyFilter, setHistoryFilter, paymentSearch, setPaymentSearch,
  tenantConfig, currentTime
}: any) {
  if (activeTab === "payment") {
    return (
      <div className="space-y-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input placeholder="Tìm số bàn..." value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} className="pl-12 h-14 rounded-2xl bg-white border-slate-200 font-bold" />
        </div>
        {paymentSessions.length > 0 ? (
          <div className="space-y-4">
            {paymentSessions.map((session: any) => (
              <div key={session.session_id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="size-14 bg-emerald-100 rounded-3xl flex items-center justify-center"><CheckCircle2 className="size-6 text-emerald-600" /></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Bàn {session.table_number}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(session.paid_at).toLocaleString("vi-VN")}</p>
                  </div>
                </div>
                <div><p className="text-3xl font-black text-emerald-600 tracking-tighter">{session.total.toLocaleString()}đ</p></div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={AlertCircle} label="Chưa có thanh toán" />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTab === "history" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input placeholder="Tìm kiếm bàn, món..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="pl-12 h-14 rounded-2xl bg-white border-slate-200 font-bold" />
        </div>
      )}
      {currentOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {currentOrders.map((order: any) => {
            const Config = statusConfig[order.status] || statusConfig.pending;
            const total = order.order_items.reduce((acc: any, item: any) => acc + (item.unit_price * item.quantity), 0);

            const cancelWindow = tenantConfig?.order_cancel_window || 0;
            const createdTime = new Date(order.created_at).getTime();
            const secondsLeft = cancelWindow - Math.floor((currentTime - createdTime) / 1000);
            const isWaitingForGuest = order.status === "pending" && secondsLeft > 0;

            return (
              <Card key={order.id} className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.01] transition-all relative">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-dashed border-slate-200">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge className="bg-slate-900 text-white border-none font-black text-[10px] px-3 py-1 rounded-full uppercase italic"><MapPin size={10} className="mr-1" /> Bàn {order.table?.number || "..."}</Badge>
                      <div className="flex items-center gap-1.5 mt-2"><User size={12} className="text-slate-400" /><span className="text-xs font-black text-slate-600 uppercase tracking-tight">{order.customer_name || "Khách ẩn danh"}</span></div>
                    </div>
                    <Badge className={cn("text-white font-black uppercase text-[9px] px-3 py-1 rounded-full", Config.color)}>{Config.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    {order.order_items.map((it: any) => (
                      <div key={it.id} className="flex items-center gap-4">
                        <span className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-600 border border-slate-200">x{it.quantity}</span>
                        <div className="flex-1"><p className="font-bold text-sm text-slate-800 leading-tight">{it.menu_item?.name || "Món đã ngưng"}</p></div>
                        <span className="font-black text-slate-900 text-sm italic">{(it.unit_price * it.quantity).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-16 bg-slate-50 rounded-3xl flex items-center justify-between px-6 border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng bill</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter italic">{total.toLocaleString()}đ</span>
                  </div>
                </CardContent>
                <CardFooter className="p-8 pt-0 flex gap-3">
                  {order.status === "pending" && (
                    <>
                      <Button
                        disabled={isWaitingForGuest}
                        className={cn(
                          "flex-1 h-14 font-black rounded-2xl shadow-xl text-xs uppercase transition-all",
                          isWaitingForGuest
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                        )}
                        onClick={() => updateStatus(order.id, "preparing")}
                      >
                        {isWaitingForGuest ? (
                          <span className="flex items-center gap-2">
                            <Hourglass className="size-4 animate-spin" />
                            CHỜ KHÁCH ({Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')})
                          </span>
                        ) : (
                          <span className="flex items-center gap-2"><CheckCircle2 className="size-4" /> CHẤP NHẬN</span>
                        )}
                      </Button>
                      <Button variant="outline" className="size-14 rounded-2xl border-rose-100 text-rose-500 hover:bg-rose-50" onClick={() => setCancelModal({ open: true, orderId: order.id })}><XCircle /></Button>
                    </>
                  )}
                  {order.status === "preparing" && (
                    <Button className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl shadow-xl text-xs uppercase" onClick={() => updateStatus(order.id, "completed")}>GIAO MÓN XONG</Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : <EmptyState icon={AlertCircle} label="Hiện tại chưa có đơn hàng nào" />}
    </div>
  );
}

function EmptyState({ icon: Icon, label }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-40 border-[6px] border-dashed rounded-[60px] text-center border-slate-200/50 opacity-50">
      <Icon className="size-20 text-slate-300 mb-6" />
      <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter italic">{label}</h3>
    </div>
  );
}
