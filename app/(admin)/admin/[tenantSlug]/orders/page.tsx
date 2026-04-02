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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Duy nhất 1 client bên ngoài để tránh nghẽn mạch Realtime
const supabase = getSupabaseClient();

interface PaymentSession {
  session_id: string;
  table_id: string;
  table_number: string | number;
  orders: Order[];
  total: number;
  paid_at: string; // latest updated_at among orders
}

export default function OrdersPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });

  const fetchOrders = useCallback(async function () {
    setLoading(true);
    try {
      const result = await ordersApi.getOrders(tenantSlug);
      if (Array.isArray(result.payload)) setOrders(result.payload);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  // Fix Hydration mismatch: Đảm bảo chỉ render nút bấm sau khi trang đã tải xong ở trình duyệt
  useEffect(() => {
    setMounted(true);
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!tenantSlug) return;

    console.log("Admin Orders: Bắt đầu lắng nghe đơn hàng mới...");
    const channel = supabase
      .channel("admin-orders-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("ADMIN: Đã nhận được cập nhật đơn hàng mới!", payload);
          fetchOrders();
        }
      )
      .subscribe((status) => {
        console.log(`ADMIN REALTIME STATUS: ${status}`);
      });

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

  const statusConfig = {
    pending: { label: "Cần duyệt", color: "bg-red-500", icon: Clock },
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

// Group paid orders by session_id
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
    .filter(s => {
      if (!paymentSearch) return true;
      return String(s.table_number).includes(paymentSearch);
    })
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
})();

const currentOrders = activeTab === "pending" ? pendingOrders : activeTab === "preparing" ? preparingOrders : historyOrders;

if (!mounted) return null; // Quan trọng để tránh Hydration Mismatch

return (
  <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <ShoppingCart className="size-4 md:size-5" />
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">Khu vực điều phối đơn</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground"> Duyệt đơn hàng mới và theo dỏi quy trình phục vụ tại bếp. </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchOrders}
        disabled={loading}
        className="rounded-full bg-background font-black text-[10px] uppercase shadow-sm h-9 md:h-10"
      >
        <RefreshCw className={cn("size-3 mr-2", loading && "animate-spin")} />
        Làm mới
      </Button>
    </div>

    {/* Workflow Tabs */}
    <div className="flex overflow-x-auto p-1 md:p-1.5 bg-muted/60 rounded-[20px] md:rounded-[28px] w-full md:w-fit border shadow-inner scrollbar-hide">
      {[
        { id: "pending", label: "Chờ duyệt", count: pendingOrders.length },
        { id: "preparing", label: "Trong bếp", count: preparingOrders.length },
        { id: "history", label: "Lịch sử", count: null },
        { id: "payment", label: "Thanh toán", count: null },
      ].map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          className={cn(
            "rounded-[16px] md:rounded-[22px] px-4 md:px-8 font-black uppercase text-[9px] md:text-[11px] tracking-widest h-9 md:h-11 transition-all whitespace-nowrap flex-shrink-0",
            activeTab === tab.id ? "shadow-xl shadow-primary/30" : "text-muted-foreground hover:bg-white/50"
          )}
          onClick={() => setActiveTab(tab.id as any)}
        >
          {tab.label} {tab.count !== null && <span className="ml-1 md:ml-2 py-0.5 px-1.5 md:px-2 bg-white/20 rounded-full text-[8px] md:text-[9px]">{tab.count}</span>}
        </Button>
      ))}
    </div>

    {/* History filters */}
    {activeTab === "history" && (
      <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-3 md:size-4 text-slate-400" />
          <Input
            placeholder="Tìm bàn hoặc tên món..."
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            className="pl-9 md:pl-11 h-9 md:h-11 rounded-xl md:rounded-2xl bg-white border-slate-100 font-medium placeholder:text-slate-300 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {([
            { id: "all", label: "Tất cả" },
            { id: "completed", label: "Đã xong" },
            { id: "cancelled", label: "Đã hủy" },
          ] as const).map(f => (
            <Button
              key={f.id}
              size="sm"
              variant={historyFilter === f.id ? "default" : "outline"}
              className="rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest h-9 md:h-11 border-slate-100 whitespace-nowrap flex-shrink-0"
              onClick={() => setHistoryFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>
    )}

    {/* Payment search */}
    {activeTab === "payment" && (
      <div className="relative max-w-sm">
        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-3 md:size-4 text-slate-400" />
        <Input
          placeholder="Tìm theo số bàn..."
          value={paymentSearch}
          onChange={e => setPaymentSearch(e.target.value)}
          className="pl-9 md:pl-11 h-9 md:h-11 rounded-xl md:rounded-2xl bg-white border-slate-100 font-medium placeholder:text-slate-300 text-sm"
        />
      </div>
    )}

    {/* Payment sessions list */}
    {activeTab === "payment" ? (
      paymentSessions.length > 0 ? (
        <div className="space-y-3 md:space-y-4">
          {paymentSessions.map(session => (
            <div key={session.session_id} className="bg-white rounded-[20px] md:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              {/* Session header */}
              <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 border-b border-slate-50">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="size-8 md:size-10 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="size-4 md:size-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-black text-sm md:text-base text-slate-900 tracking-tight">Bàn {session.table_number}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(session.paid_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <p className="text-lg md:text-2xl font-black text-emerald-600 tracking-tighter">{session.total.toLocaleString()}đ</p>
              </div>
              {/* Items breakdown */}
              <div className="px-4 md:px-8 py-3 md:py-4 space-y-2">
                {(() => {
                  const grouped: Record<string, { name: string; quantity: number; unit_price: number }> = {};
                  session.orders.forEach(o => o.order_items.forEach(it => {
                    const k = it.menu_item?.name || "Món đã ngưng";
                    if (!grouped[k]) grouped[k] = { name: k, quantity: 0, unit_price: it.unit_price };
                    grouped[k].quantity += it.quantity;
                  }));
                  return Object.values(grouped).map((it, i) => (
                    <div key={i} className="flex justify-between items-center text-xs md:text-sm">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="size-5 md:size-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] md:text-[10px] font-black">{it.quantity}</span>
                        <span className="font-medium text-slate-700">{it.name}</span>
                      </div>
                      <span className="font-black text-slate-600 text-[10px] md:text-xs">{(it.quantity * it.unit_price).toLocaleString()}đ</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 border-4 border-dashed rounded-[40px] md:rounded-[60px] text-center max-w-xl mx-auto border-muted-foreground/10 opacity-30">
          <CheckCircle2 className="size-12 md:size-16 mb-4 md:mb-6" />
          <h3 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">Chưa có thanh toán nào</h3>
        </div>
      )
    ) : loading && orders.length === 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 rounded-[24px] md:rounded-[40px] bg-muted/40 animate-pulse" />
        ))}
      </div>
    ) : currentOrders.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {currentOrders.map((order) => {
          const Config = statusConfig[order.status] || statusConfig.pending;
          const total = order.order_items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);

          return (
            <Card key={order.id} className={cn(
              "overflow-hidden rounded-[24px] md:rounded-[40px] border-none transition-all group",
              activeTab === "history"
                ? "shadow-sm bg-slate-50/80 hover:bg-white hover:shadow-md"
                : "shadow-xl md:shadow-2xl shadow-slate-200/50 hover:scale-[1.02]"
            )}>
              <CardHeader className="pb-3 md:pb-4 bg-muted/30 px-4 md:px-6 pt-4 md:pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="rounded-full px-2 md:px-4 py-1 md:py-1.5 bg-white border-primary/10 shadow-sm font-black text-primary italic tracking-tight text-[9px] md:text-[10px]">
                    <MapPin className="size-2.5 md:size-3 mr-1 md:mr-1.5 text-primary" />
                    {order.table?.number ? `BÀN ${order.table?.number}` : `BÀN ID: ${order.table_id}`}
                  </Badge>
                  <div className={cn("size-2 md:size-3 rounded-full animate-pulse", Config.color)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                    <Clock className="size-2.5 md:size-3" />
                    {new Date(order.created_at).toLocaleTimeString("vi-VN")}
                  </div>
                  <Badge className={cn("text-white border-none rounded-full font-black text-[8px] md:text-[9px] px-2 md:px-3 uppercase tracking-widest", Config.color)}>
                    {Config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                <div className="space-y-3 md:space-y-5">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 md:gap-5">
                      <div className="size-12 md:size-14 rounded-2xl md:rounded-3xl overflow-hidden bg-muted flex-shrink-0 border-2 border-white shadow-sm">
                        {item.menu_item?.image_url ? (
                          <Image src={item.menu_item.image_url} alt="" className="size-full object-cover" fill />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-slate-50 opacity-20">
                            <ChefHat className="size-5 md:size-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-black truncate leading-none mb-1 md:mb-1.5 tracking-tight">{item.menu_item?.name || "Món đã bị xóa"}</p>
                        <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest">SL: {item.quantity}</p>
                      </div>
                      <div className="text-xs md:text-sm font-black text-slate-900 tracking-tighter italic">
                        {(item.unit_price * item.quantity).toLocaleString()}đ
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between h-12 md:h-14 px-4 md:px-6 bg-primary/[0.03] rounded-2xl md:rounded-3xl border border-primary/5">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tổng Bill</p>
                    <p className="text-xl md:text-2xl font-black text-primary tracking-tighter italic">
                      {total.toLocaleString()}<span className="text-[10px] md:text-xs ml-0.5">đ</span>
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 md:p-8 pt-0 flex gap-2 md:gap-3">
                {order.status === "pending" && (
                  <>
                    <Button
                      className="flex-1 rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg md:shadow-xl shadow-emerald-500/30 h-10 md:h-14 text-[10px] md:text-xs uppercase tracking-widest"
                      onClick={() => updateStatus(order.id, "preparing")}
                    >
                      <CheckCircle2 className="size-3 md:size-4 mr-1.5 md:mr-2" /> CHẤP NHẬN
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-xl md:rounded-2xl text-destructive hover:bg-destructive/10 font-black h-10 md:h-14 px-3 md:px-4 text-[10px] md:text-xs tracking-tighter"
                      onClick={() => setCancelModal({ open: true, orderId: order.id })}
                    >
                      HỦY
                    </Button>
                  </>
                )}
                {order.status === "preparing" && (
                  <Button
                    className="flex-1 rounded-xl md:rounded-2xl bg-slate-900 hover:bg-black text-white font-black shadow-lg md:shadow-xl shadow-slate-900/30 h-10 md:h-14 text-[10px] md:text-xs uppercase tracking-widest"
                    onClick={() => updateStatus(order.id, "completed")}
                  >
                    PHỤC VỤ XONG
                  </Button>
                )}
                {order.status === "completed" && (
                  <div className="w-full text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 py-3 md:py-4 rounded-2xl md:rounded-3xl border border-emerald-100 flex items-center justify-center gap-1.5 md:gap-2">
                    <CheckCircle2 className="size-3 md:size-4" /> ĐÃ GIAO MÓN TẬN BÀN
                  </div>
                )}
                {order.status === "cancelled" && (
                  <div className="w-full text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 py-3 md:py-4 rounded-2xl md:rounded-3xl border border-dotted flex items-center justify-center gap-1.5 md:gap-2">
                    <XCircle className="size-3 md:size-4" /> ĐƠN ĐÃ BỊ HỦY BỎ
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 border-4 border-dashed rounded-[40px] md:rounded-[60px] text-center max-w-xl mx-auto border-muted-foreground/10 opacity-30">
        <AlertCircle className="size-12 md:size-16 mb-4 md:mb-6" />
        <h3 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">Mọi thứ đã sẵn sàng</h3>
        <p className="text-xs md:text-sm mt-1 font-medium italic underline underline-offset-4">Chưa có đơn hàng nào trong mục này</p>
      </div>
    )}

    {/* Confirmation Modal */}
    <AlertDialog open={cancelModal.open} onOpenChange={(open) => setCancelModal({ ...cancelModal, open })}>
      <AlertDialogContent className="rounded-[24px] md:rounded-[40px] border-none p-6 md:p-10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg md:text-2xl font-black uppercase tracking-tight italic">Hủy đơn hàng này?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs md:text-sm text-muted-foreground font-medium pt-2"> Thao tác này sẽ chuyển đơn hàng vào mục đã hủy. Bạn có chắc chắn không? </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4 md:pt-6 flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="rounded-xl md:rounded-2xl font-bold h-10 md:h-12 border-none bg-muted">Quay lại</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl md:rounded-2xl font-black bg-destructive hover:bg-destructive/90 text-white h-10 md:h-12 px-6 md:px-8"
            onClick={() => {
              if (cancelModal.orderId) updateStatus(cancelModal.orderId, "cancelled");
              setCancelModal({ open: false, orderId: null });
            }}
          >
            CÓ, HỦY ĐƠN
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
}
