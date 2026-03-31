"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  ShoppingCart,
  ChevronRight,
  MapPin,
  PartyPopper,
  Clock,
  ChefHat,
  CheckCircle2,
  History,
  X,
  Timer,
  Search,
  ArrowLeft,
  Utensils
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string;
  description: string | null;
  available: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  menu_item?: MenuItem;
}

interface Order {
  id: string;
  table_id: string;
  tenant_id: string;
  session_id: string;
  status: "pending" | "preparing" | "completed" | "cancelled";
  created_at: string;
  order_items: OrderItem[];
}

const supabase = getSupabaseClient();


export default function TableMenu() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const tableId = params.tableId as string;

  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchAllData() {
    try {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", tenantSlug).single() as { data: { id: string } | null };
      if (!tenant) return;

      const [{ data: itemsData }, { data: categoriesData }, { data: tableData }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("tenant_id", tenant.id).order("name"),
        supabase.from("categories").select("*").eq("tenant_id", tenant.id).order("name"),
        supabase.from("tables").select("*").eq("id", tableId).single() as any,
      ]);

      setItems(itemsData || []);
      setCategories(categoriesData || []);
      if (tableData) setTableNumber(tableData.number);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  const [tenantId, setTenantId] = useState<string | null>(null);

  async function fetchActiveOrders(currentTid?: string | null) {
    const tidToUse = currentTid || tenantId;
    if (!tidToUse || !tableId) return;

    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("table_session_id="))
      ?.split("=")[1];

    if (!cookieValue) {
      console.log("[Guest] No session cookie found, skipping order fetch");
      return;
    }

    console.log(`[Guest] Fetching orders for Table: ${tableId}, Session: ${cookieValue}`);

    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items (*, menu_item:menu_items(*))`)
      .eq("table_id", tableId)
      .eq("tenant_id", tidToUse)
      .eq("session_id", cookieValue)
      .in("status", ["pending", "preparing", "completed"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Guest] Fetch error:", error);
    } else {
      console.log(`[Guest] Received ${data?.length || 0} active orders`);
      setActiveOrders(data || []);
    }
  }

  useEffect(() => {
    if (!tenantSlug) return;
    supabase.from("tenants").select("id").eq("slug", tenantSlug).single().then(({ data }: { data: any }) => {
      if (data) {
        console.log(`[Guest] Tenant identified: ${data.id}`);
        setTenantId(data.id);
        fetchAllData();
      }
    });
  }, [tenantSlug]);

  useEffect(() => {
    if (!tenantId || !tableId) return;

    // Initial fetch
    fetchActiveOrders(tenantId);
    
    // Polling every 3 seconds as fallback
    const pollInterval = setInterval(() => {
      console.log("[Guest] Polling for updates...");
      fetchActiveOrders(tenantId);
    }, 3000);

    console.log(`[Guest] Subscribing to Realtime for Table ${tableId}...`);
    
    const channel = supabase
      .channel(`rt-table-${tableId}-${Date.now()}`, {
        config: {
          broadcast: { self: true },
          presence: { key: tableId }
        }
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `table_id=eq.${tableId}`
        },
        (payload) => {
          console.log("🔥 [KITCHEN UPDATE] New event received!", payload.eventType, payload.new);
          fetchActiveOrders(tenantId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
          filter: `id=eq.${tableId}`
        },
        (payload) => {
          console.log("🔥 [TABLE UPDATE] Table status changed!", payload.new);
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 [Realtime Status]: ${status} (Table ${tableId})`);
        if (err) {
          console.error("❌ [Realtime Error]:", err);
        }
        if (status === 'SUBSCRIBED') {
          console.log("✅ [Realtime] Successfully subscribed!");
        }
        if (status === 'CHANNEL_ERROR') {
          console.error("❌ [Realtime] Channel error - using polling fallback");
        }
      });

    return () => {
      console.log(`[Guest] Cleaning up Realtime for Table ${tableId}`);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [tenantId, tableId]);

  const trackingSummary = useMemo(() => {
    const allItems = activeOrders.flatMap(o => o.order_items.map((it: any) => ({ ...it, status: o.status })));
    const pending = allItems.filter(i => i.status === "pending").length;
    const preparing = allItems.filter(i => i.status === "preparing").length;
    return { pending, preparing, totalActive: pending + preparing, totalItems: allItems.length };
  }, [activeOrders]);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const cartTotal = items.reduce((total, item) => total + (cart[item.id] || 0) * item.price, 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Group all order items for bill display
  const billItems = useMemo(() => {
    const grouped: Record<string, { name: string; quantity: number; unit_price: number }> = {};
    activeOrders
      .filter(o => ["pending", "preparing", "completed"].includes(o.status))
      .forEach(order => {
        order.order_items.forEach(it => {
          const key = it.menu_item_id;
          if (!grouped[key]) {
            grouped[key] = { name: it.menu_item?.name || "Món đã ngưng", quantity: 0, unit_price: it.unit_price };
          }
          grouped[key].quantity += it.quantity;
        });
      });
    return Object.values(grouped);
  }, [activeOrders]);

  const billTotal = billItems.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);

  const statusMap = {
    pending: { label: "Đang chờ", color: "text-rose-500 bg-rose-50", icon: Clock },
    preparing: { label: "Đang chuẩn bị", color: "text-orange-500 bg-orange-50", icon: ChefHat },
    completed: { label: "Đã phục vụ", color: "text-emerald-500 bg-emerald-50", icon: CheckCircle2 },
  };

  async function handleRequestPayment() {
    setRequestingPayment(true);
    try {
      await fetch(`/api/tenants/${tenantSlug}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId, type: "payment" }),
      });
      setPaymentRequested(true);
      setShowBill(false);
    } catch {
      alert("Lỗi khi gửi yêu cầu!");
    } finally {
      setRequestingPayment(false);
    }
  }

  async function handleSendOrder() {
    if (cartCount === 0 || isSubmitting) {
      console.log("[Guest] Blocked: cartCount=", cartCount, "isSubmitting=", isSubmitting);
      return;
    }
    
    console.log("[Guest] Starting order submission...");
    setIsSubmitting(true);
    
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = items.find(i => i.id === itemId);
        return { menu_item_id: itemId, quantity, unit_price: item?.price || 0 };
      });
      
      console.log("[Guest] Sending order:", { table_id: tableId, items: orderItems });
      
      const res = await fetch(`/api/tenants/${tenantSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId, items: orderItems }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error("[Guest] Order failed:", data);
        throw new Error(data.error || "Failed");
      }
      
      console.log("[Guest] Order success:", data);
      setCart({});
      setShowConfirm(false);
      setShowSuccess(true);
      await fetchActiveOrders(tenantId);
    } catch (error) {
      console.error("[Guest] Order error:", error);
      alert("Lỗi khi gửi đơn hàng!");
    } finally {
      setIsSubmitting(false);
      console.log("[Guest] Order submission complete");
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fcfcfc]">
      <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex justify-center pb-40 font-sans transition-all duration-500 overflow-x-hidden md:items-center md:py-20">
      <div className="w-full max-w-5xl bg-white min-h-screen md:min-h-[85vh] md:rounded-[60px] md:shadow-2xl md:shadow-slate-200/50 relative shadow-none border-x border-slate-100 overflow-x-hidden no-scrollbar">

        <div className="p-8 pb-4 pt-12 md:pt-16 md:px-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">@{tenantSlug}</h1>
              <div className="flex items-center gap-2 mt-4 md:mt-6">
                <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] md:text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-sm uppercase tracking-widest">
                  <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                  Bàn số {tableNumber || "..."}
                </Badge>
              </div>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="size-16 md:size-20 rounded-[32px] md:rounded-[40px] border-slate-100 bg-white shadow-xl shadow-slate-100 active:scale-90 transition-all relative"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="size-6 md:size-8 text-slate-600" />
              {trackingSummary.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 size-7 bg-primary text-white text-[10px] md:text-xs font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  {trackingSummary.totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>

        {!showHistory ? (
          <>
            {/* Soft Search & Tabs */}
            <div className="px-6 md:px-12 py-6 pb-2 sticky top-0 bg-white/80 backdrop-blur-md z-40 space-y-6 md:space-y-8">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-5 md:size-6 text-slate-300 group-focus-within:text-primary transition-all" />
                <Input
                  placeholder="Hôm nay bạn muốn dùng gì?"
                  className="pl-16 h-16 md:h-20 rounded-[32px] bg-slate-50 border-none text-[16px] font-bold placeholder:text-slate-300 focus-visible:ring-primary/10 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                <Button
                  variant={activeCategory === "all" ? "default" : "secondary"}
                  className={cn("h-12 md:h-14 rounded-[28px] px-8 md:px-10 font-black text-xs md:text-sm uppercase transition-all whitespace-nowrap", activeCategory === "all" ? "shadow-xl shadow-primary/20" : "bg-white text-slate-400 border border-slate-100")}
                  onClick={() => setActiveCategory("all")}
                >
                  Tất cả
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "secondary"}
                    className={cn("h-12 md:h-14 rounded-[28px] px-8 md:px-10 font-black text-xs md:text-sm uppercase transition-all whitespace-nowrap", activeCategory === cat.id ? "shadow-xl shadow-primary/20" : "bg-white text-slate-400 border border-slate-100")}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Optimized Menu Grid for Mobile - Compact View */}
            <div className="px-4 md:px-12 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8 mt-2 pb-20">
              {filteredItems.map(item => (
                <div key={item.id} className="flex flex-col group animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-3xl md:rounded-[48px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                  {/* Compact Image */}
                  <div className="aspect-square w-full overflow-hidden bg-slate-50 relative">
                    <img
                      src={item.image_url || `https://ui-avatars.com/api/?name=${item.name}&background=f1f5f9&color=64748b&bold=true`}
                      className="size-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={item.name}
                    />
                  </div>

                  {/* Compact Info */}
                  <div className="flex-1 p-3 md:p-5 space-y-2 md:space-y-3">
                    <h3 className="font-black text-sm md:text-lg text-slate-900 tracking-tight leading-tight line-clamp-2">{item.name}</h3>
                    
                    {/* Price & Add Button */}
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-lg md:text-2xl font-black text-primary tracking-tighter">
                        {item.price.toLocaleString()}<span className="text-xs ml-0.5">đ</span>
                      </span>

                      <div className="flex items-center bg-slate-900 text-white rounded-2xl md:rounded-[24px] p-1 shadow-lg">
                        {cart[item.id] > 0 ? (
                          <div className="flex items-center w-full justify-between">
                            <button 
                              onClick={() => setCart(p => ({ ...p, [item.id]: Math.max(0, p[item.id] - 1) }))} 
                              className="size-8 md:size-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 active:scale-90 transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="flex-1 text-center font-black text-sm md:text-base">{cart[item.id]}</span>
                            <button 
                              onClick={() => setCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))} 
                              className="size-8 md:size-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white active:scale-90 transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <Button
                            className="h-8 md:h-10 w-full rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95"
                            onClick={() => setCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}
                          >
                            THÊM
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-300 font-bold italic text-sm">Không tìm thấy món bạn yêu cầu</div>
              )}
            </div>
          </>
        ) : (
          /* History View (Refined) */
          <div className="p-8 space-y-8 animate-in slide-in-from-left duration-500">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowHistory(false)} className="size-12 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-500 active:scale-90 transition-all">
                <ArrowLeft size={24} />
              </button>
              <div className="flex flex-col">
                <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Món đã đặt</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Theo dõi trạng thái các món bạn đã gọi.</p>
              </div>
              {billItems.length > 0 && (
                <button
                  onClick={() => setShowBill(true)}
                  className="ml-auto flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  <ShoppingCart size={14} />
                  HÓA ĐƠN
                </button>
              )}
            </div>

            <div className="space-y-6">
              {activeOrders.length === 0 ? (
                <div className="py-24 text-center bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-100">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Bạn chưa gọi món nào</p>
                </div>
              ) : activeOrders.map((order) => (
                <div key={order.id} className="bg-white border border-slate-100 rounded-[40px] p-6 space-y-4 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="uppercase tracking-[0.1em]">Đơn #{order.id.slice(-4).toUpperCase()}</span>
                    <span>{new Date(order.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="space-y-3">
                    {order.order_items.map((it) => {
                      const St = statusMap[order.status as keyof typeof statusMap] || statusMap.pending;
                      return (
                        <div key={it.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{it.quantity}</span>
                            <span className="text-sm font-bold text-slate-700">{it.menu_item?.name || "Món đã bị ngưng"}</span>
                          </div>
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase", St.color)}>
                            {St.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="fixed bottom-6 left-6 right-6 z-[100] space-y-3">

          {trackingSummary.totalActive > 0 && (
            <div
              onClick={() => setShowHistory(true)}
              className="w-full bg-slate-900/95 backdrop-blur-xl py-3.5 px-6 rounded-[24px] border border-white/10 flex items-center justify-between shadow-2xl cursor-pointer animate-in slide-in-from-bottom duration-500"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 bg-primary rounded-xl flex items-center justify-center text-white">
                  <Utensils className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tiến độ bếp</p>
                  <p className="text-[13px] font-bold text-white leading-none">
                    {trackingSummary.totalActive} món đang thực hiện
                  </p>
                </div>
              </div>
              <ChevronRight className="size-5 text-white/40" />
            </div>
          )}

          {/* Cart Bar */}
          {cartCount > 0 && !showHistory && (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
              className="w-full h-18 rounded-[30px] bg-primary border-[6px] border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] active:scale-95 transition-all text-white flex items-center justify-between px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 bg-white/20 rounded-2xl flex items-center justify-center relative">
                  <ShoppingCart className="size-5 text-white" />
                  <span className="absolute -top-2 -right-2 size-6 bg-slate-900 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-primary">
                    {cartCount}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5 leading-none">Tổng đơn hàng</p>
                  <p className="text-xl font-black text-white tracking-tighter leading-none">{cartTotal.toLocaleString()}đ</p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest bg-white/10 px-4 py-2 rounded-xl">
                XÁC NHẬN
              </div>
            </Button>
          )}
        </div>

        {/* Dialogs */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="sm:max-w-md rounded-[54px] p-10 border-none bg-white">
            <DialogHeader className="text-center">
              <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Bạn muốn chốt đơn?</DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-400 italic">
                Kiểm tra lại danh sách các món trước khi gửi vào bếp.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pt-4 no-scrollbar">
              {Object.entries(cart).map(([id, qty]) => {
                const item = items.find(i => i.id === id);
                if (!item || qty === 0) return null;
                return (
                  <div key={id} className="flex justify-between items-center py-3 border-b border-slate-50">
                    <p className="font-bold text-slate-800">{item.name} x{qty}</p>
                    <span className="font-bold text-slate-900">{(item.price * qty).toLocaleString()}đ</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-6 border-t flex justify-between items-baseline">
              <span className="font-black text-slate-400 uppercase text-xs">Tổng cộng</span>
              <span className="text-3xl font-black text-primary tracking-tighter">{cartTotal.toLocaleString()}đ</span>
            </div>
            <Button onClick={handleSendOrder} disabled={isSubmitting} className="w-full h-16 rounded-[28px] font-black text-xl shadow-xl shadow-primary/20 mt-4">
              {isSubmitting ? "ĐANG GỬI..." : "GỬI BẾP NGAY"}
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="sm:max-w-sm rounded-[60px] p-12 text-center border-none shadow-3xl bg-white">
            <div className="size-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <DialogHeader className="pt-8">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Đã nhận đơn!</DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                Bếp đang nấu cực nhanh đây! Bạn chờ một chút nhé.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setShowSuccess(false)} className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-900 mt-6">TIẾP TỤC CHỌN MÓN</Button>
          </DialogContent>
        </Dialog>

        {/* Bill Modal */}
        <Dialog open={showBill} onOpenChange={setShowBill}>
          <DialogContent className="sm:max-w-md rounded-[48px] p-10 border-none bg-white">
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Hóa đơn bàn {tableNumber}</DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Tổng kết các món đã gọi
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pt-4 no-scrollbar">
              {billItems.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black">{it.quantity}</span>
                    <p className="font-bold text-slate-800 text-sm">{it.name}</p>
                  </div>
                  <span className="font-black text-slate-900 text-sm">{(it.unit_price * it.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t flex justify-between items-baseline">
              <span className="font-black text-slate-400 uppercase text-xs">Tổng cộng</span>
              <span className="text-4xl font-black text-primary tracking-tighter">{billTotal.toLocaleString()}đ</span>
            </div>
            {paymentRequested ? (
              <div className="mt-4 w-full h-14 rounded-[28px] bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-2 text-emerald-600 font-black text-sm uppercase tracking-widest">
                <CheckCircle2 className="size-5" /> Đã gửi yêu cầu
              </div>
            ) : (
              <Button
                onClick={handleRequestPayment}
                disabled={requestingPayment || billItems.length === 0}
                className="w-full h-14 rounded-[28px] font-black text-sm shadow-xl shadow-primary/20 mt-4 uppercase tracking-widest"
              >
                {requestingPayment ? "Đang gửi..." : "Yêu cầu thanh toán"}
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
