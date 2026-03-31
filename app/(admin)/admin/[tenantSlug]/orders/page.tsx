"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  RefreshCw,
  MoreVertical,
  ShoppingCart,
  MapPin,
  Calendar,
  AlertCircle
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
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  menu_item: {
    name: string;
    image_url: string | null;
  };
}

interface Order {
  id: string;
  table_id: string;
  table?: { number: string | number };
  status: "pending" | "preparing" | "completed" | "cancelled";
  created_at: string;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  async function fetchOrders() {
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/orders`);
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/orders?id=${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  function handleCancelRequest(orderId: string) {
    setCancelModal({ open: true, orderId });
  }

  function confirmCancel() {
    if (cancelModal.orderId) {
      updateStatus(cancelModal.orderId, "cancelled");
    }
    setCancelModal({ open: false, orderId: null });
  }

  const statusConfig = {
    pending: { label: "Cần duyệt", color: "bg-red-500", icon: Clock },
    preparing: { label: "Đang bếp", color: "bg-orange-500", icon: ChefHat },
    completed: { label: "Đã xong", color: "bg-emerald-500", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "bg-slate-500", icon: XCircle },
  };

  const [activeTab, setActiveTab] = useState<"pending" | "preparing" | "history">("pending");

  const pendingOrders = orders.filter(o => o.status === "pending");
  const preparingOrders = orders.filter(o => o.status === "preparing");
  const historyOrders = orders.filter(o => ["completed", "cancelled"].includes(o.status));

  const currentOrders = activeTab === "pending" ? pendingOrders : activeTab === "preparing" ? preparingOrders : historyOrders;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingCart className="size-5" />
            <h1 className="text-2xl font-bold tracking-tight">Khu vực điều phối đơn</h1>
          </div>
          <p className="text-muted-foreground"> Duyệt đơn hàng mới và theo dỏi quy trình phục vụ tại bếp. </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={loading}
          className="rounded-full bg-background"
        >
          <RefreshCw className={cn("size-4 mr-2", loading && "animate-spin")} />
          Làm mới
        </Button>
      </div>

      {/* Workflow Tabs */}
      <div className="flex p-1 bg-muted rounded-2xl w-fit">
        <Button
          variant={activeTab === "pending" ? "default" : "ghost"}
          className={cn("rounded-xl px-6 font-bold", activeTab === "pending" && "shadow-lg shadow-primary/20")}
          onClick={() => setActiveTab("pending")}
        >
          Chờ duyệt ({pendingOrders.length})
        </Button>
        <Button
          variant={activeTab === "preparing" ? "default" : "ghost"}
          className={cn("rounded-xl px-6 font-bold", activeTab === "preparing" && "shadow-lg shadow-primary/20")}
          onClick={() => setActiveTab("preparing")}
        >
          Nhà bếp ({preparingOrders.length})
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          className={cn("rounded-xl px-6 font-bold", activeTab === "history" && "shadow-lg shadow-primary/20")}
          onClick={() => setActiveTab("history")}
        >
          Lịch sử
        </Button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : currentOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentOrders.map((order) => {
            const Config = statusConfig[order.status] || statusConfig.pending;
            const total = order.order_items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);

            return (
              <Card key={order.id} className="overflow-hidden rounded-[32px] border-primary/5 shadow-sm hover:shadow-xl transition-all group">
                <CardHeader className="pb-3 bg-muted/40">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1 bg-white border shadow-sm">
                      <MapPin className="size-3 mr-1.5 text-primary" />
                      {order.table?.number ? `Bàn ${order.table?.number}` : `ID: ${order.table_id}`}
                    </Badge>
                    <Badge className={cn("text-white border-none rounded-full", Config.color)}>
                      <Config.icon className="size-3 mr-1.5" />
                      {Config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Clock className="size-3" />
                    {new Date(order.created_at).toLocaleTimeString("vi-VN")}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-4">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border">
                          {item.menu_item.image_url ? (
                            <img src={item.menu_item.image_url} alt="" className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-muted-foreground">
                              <ChefHat className="size-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate">{item.menu_item.name}</p>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Số lượng: {item.quantity}</p>
                        </div>
                        <div className="text-sm font-black text-primary">
                          {(item.unit_price * item.quantity).toLocaleString()}đ
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-primary/5" />

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Thành tiền</p>
                    <p className="text-xl font-black text-primary tracking-tighter">
                      {total.toLocaleString()}<span className="text-xs ml-0.5">đ</span>
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex gap-2">
                  {order.status === "pending" && (
                    <>
                      <Button 
                        className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 h-12" 
                        size="sm"
                        onClick={() => updateStatus(order.id, "preparing")}
                      >
                        <CheckCircle2 className="size-4 mr-2" /> DUYỆT ĐƠN
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-2xl border-destructive/20 text-destructive hover:bg-destructive hover:text-white font-black h-12 px-4 shadow-sm"
                        onClick={() => handleCancelRequest(order.id)}
                      >
                        <XCircle className="size-4 mr-1.5" /> TỪ CHỐI
                      </Button>
                    </>
                  )}
                  {order.status === "preparing" && (
                    <>
                      <Button 
                        className="flex-1 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/20 h-12" 
                        size="sm"
                        onClick={() => updateStatus(order.id, "completed")}
                      >
                        HOÀN TẤT MÓN
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="rounded-2xl text-muted-foreground hover:bg-muted font-bold h-12 shadow-sm"
                        onClick={() => handleCancelRequest(order.id)}
                      >
                        HỦY ĐƠN
                      </Button>
                    </>
                  )}
                  {order.status === "completed" && (
                     <div className="w-full text-center text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 py-3 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100">
                       <CheckCircle2 className="size-4" /> Đã hoàn thành & Phục vụ
                     </div>
                  )}
                  {order.status === "cancelled" && (
                     <div className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 py-3 rounded-2xl flex items-center justify-center gap-2 border border-slate-200">
                       <XCircle className="size-4" /> Đơn đã bị từ chối/hủy
                     </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-muted/30 rounded-[40px] border-4 border-dashed border-muted text-center max-w-2xl mx-auto">
          <div className="bg-muted p-6 rounded-full mb-6">
            <AlertCircle className="size-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-2xl font-black text-muted-foreground/50 tracking-tight uppercase">Trống lịch</h3>
          <p className="text-muted-foreground/60 text-sm mt-2 px-20 font-medium">
            {activeTab === "pending" ? "Hiện tại không có đơn hàng nào đang chờ bạn duyệt. Tuyệt vời!" : activeTab === "preparing" ? "Nhà bếp đang rảnh rỗi. Hãy sẵn sàng cho những đơn tiếp theo." : "Lịch sử đơn hàng hiện đang trống."}
          </p>
        </div>
      )}

      {/* Confirmation Dialog for Refusal */}
      <AlertDialog open={cancelModal.open} onOpenChange={(open) => setCancelModal({ ...cancelModal, open })}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-destructive uppercase tracking-tight">Xác nhận từ chối đơn hàng?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Hành động này không thể hoàn tác. Đơn hàng sẽ bị hủy và chuyển vào mục lịch sử. Bạn có chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl font-bold border-none bg-muted hover:bg-muted/80 h-12"> Quay lại </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel}
              className="rounded-2xl font-black bg-destructive hover:bg-destructive/90 text-white h-12 shadow-lg shadow-destructive/20"
            > 
              XÁC NHẬN TỪ CHỐI 
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
