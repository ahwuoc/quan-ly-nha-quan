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

    if (!cookieValue) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items (*, menu_item:menu_items(*))`)
      .eq("table_id", tableId)
      .eq("tenant_id", tidToUse)
      .eq("session_id", cookieValue)
      .in("status", ["pending", "preparing", "completed"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActiveOrders(data || []);
    }
  }

  useEffect(() => {
    if (!tenantSlug) return;
    supabase.from("tenants").select("id").eq("slug", tenantSlug).single().then(({ data }: { data: any }) => {
      if (data) {
        setTenantId(data.id);
        fetchAllData();
      }
    });
  }, [tenantSlug]);

  useEffect(() => {
    if (!tenantId || !tableId) return;

    fetchActiveOrders(tenantId);
    
    const pollInterval = setInterval(() => {
      fetchActiveOrders(tenantId);
    }, 3000);
    
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
        () => {
          fetchActiveOrders(tenantId);
        }
      )
      .subscribe();

    return () => {
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
    if (cartCount === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = items.find(i => i.id === itemId);
        return { menu_item_id: itemId, quantity, unit_price: item?.price || 0 };
      });
      
      const res = await fetch(`/api/tenants/${tenantSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId, items: orderItems }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed");
      }
      
      setCart({});
      setShowConfirm(false);
      setShowSuccess(true);
      await fetchActiveOrders(tenantId);
    } catch (error) {
      alert("Lỗi khi gửi đơn hàng!");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fcfcfc]">
      <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex justify-center pb-32 font-sans transition-all duration-500 overflow-x-hidden md:items-center md:py-12">
      <div className="w-full max-w-6xl bg-white min-h-screen md:min-h-[90vh] md:rounded-[48px] md:shadow-2xl md:shadow-slate-900/10 relative shadow-none overflow-hidden">

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

        {/* Header */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="p-5 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  {tenantSlug}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                    <MapPin className="size-3" />
                    Bàn {tableNumber || "..."}
                  </Badge>
                  {trackingSummary.totalActive > 0 && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-none font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-orange-500/20 animate-pulse">
                      <ChefHat className="size-3" />
                      {trackingSummary.totalActive} món đang nấu
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="size-14 md:size-16 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 shadow-lg hover:shadow-xl active:scale-95 transition-all relative group"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="size-5 md:size-6 text-slate-600 group-hover:text-primary transition-colors" />
                {trackingSummary.totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 size-6 bg-gradient-to-br from-primary to-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                    {trackingSummary.totalItems}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {!showHistory ? (
          <>
            {/* Search & Category Tabs */}
            <div className="px-4 md:px-8 py-4 space-y-4">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Tìm món ăn yêu thích..."
                  className="pl-14 h-14 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary/20 text-base font-medium placeholder:text-slate-400 focus-visible:ring-0 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                <Button
                  variant={activeCategory === "all" ? "default" : "secondary"}
                  className={cn(
                    "h-11 rounded-xl px-6 font-bold text-sm transition-all whitespace-nowrap flex-shrink-0",
                    activeCategory === "all" 
                      ? "bg-gradient-to-r from-primary to-rose-500 text-white shadow-lg shadow-primary/30" 
                      : "bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-200"
                  )}
                  onClick={() => setActiveCategory("all")}
                >
                  Tất cả
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "secondary"}
                    className={cn(
                      "h-11 rounded-xl px-6 font-bold text-sm transition-all whitespace-nowrap flex-shrink-0",
                      activeCategory === cat.id 
                        ? "bg-gradient-to-r from-primary to-rose-500 text-white shadow-lg shadow-primary/30" 
                        : "bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-200"
                    )}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Menu Grid - Beautiful Cards */}
            <div className="px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-32">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className="group animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-3xl overflow-hidden border-2 border-slate-100 hover:border-primary/30 shadow-sm hover:shadow-xl transition-all"
                >
                  {/* Image with Gradient Overlay */}
                  <div className="aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 relative">
                    <img
                      src={item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f1f5f9&color=64748b&bold=true&size=400`}
                      className="size-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={item.name}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Info Section */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-black text-sm leading-tight line-clamp-2 text-slate-900 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-medium">
                          {item.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium">Giá</span>
                        <span className="text-xl font-black text-primary tracking-tight">
                          {item.price.toLocaleString()}<span className="text-xs">đ</span>
                        </span>
                      </div>

                      {/* Add to Cart Button */}
                      <div className="flex-1">
                        {cart[item.id] > 0 ? (
                          <div className="flex items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-1 shadow-lg">
                            <button 
                              onClick={() => setCart(p => ({ ...p, [item.id]: Math.max(0, p[item.id] - 1) }))} 
                              className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center active:scale-90 transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="flex-1 text-center font-black text-sm">{cart[item.id]}</span>
                            <button 
                              onClick={() => setCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))} 
                              className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center active:scale-90 transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <Button
                            className="h-9 w-full rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            onClick={() => setCart(p => ({ ...p, [item.id]: 1 }))}
                          >
                            <Plus size={12} className="mr-1" />
                            Thêm
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <div className="size-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Search className="size-10 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-bold">Không tìm thấy món ăn phù hợp</p>
                  <p className="text-xs text-slate-300 mt-1">Thử tìm kiếm với từ khóa khác</p>
                </div>
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

            <div className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">Bạn chưa gọi món nào</p>
                </Card>
              ) : activeOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>Đơn #{order.id.slice(-4).toUpperCase()}</span>
                    <span>{new Date(order.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="space-y-2">
                    {order.order_items.map((it) => {
                      const St = statusMap[order.status as keyof typeof statusMap] || statusMap.pending;
                      const Icon = St.icon;
                      return (
                        <div key={it.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="h-6 w-6 p-0 justify-center">
                              {it.quantity}
                            </Badge>
                            <span className="text-sm font-medium">{it.menu_item?.name || "Món đã ngưng"}</span>
                          </div>
                          <Badge variant="outline" className="gap-1">
                            <Icon className="size-3" />
                            {St.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t space-y-2">
          {trackingSummary.totalActive > 0 && !showHistory && (
            <Button
              variant="secondary"
              className="w-full justify-between"
              onClick={() => setShowHistory(true)}
            >
              <div className="flex items-center gap-2">
                <ChefHat className="size-4" />
                <span>{trackingSummary.totalActive} món đang chuẩn bị</span>
              </div>
              <ChevronRight className="size-4" />
            </Button>
          )}

          {cartCount > 0 && !showHistory && (
            <Button
              size="lg"
              className="w-full justify-between"
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-4" />
                <span>{cartCount} món</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{cartTotal.toLocaleString()}đ</span>
                <span>→</span>
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
