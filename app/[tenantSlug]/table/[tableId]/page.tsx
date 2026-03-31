"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  ShoppingCart,
  ChevronRight,
  UtensilsCrossed,
  Search,
  MapPin,
  Star,
  Info,
  PartyPopper,
  Clock,
  ChefHat,
  CheckCircle2,
  History,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  icon: string | null;
  image_url: string | null;
}

export default function TableMenu() {
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
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemsRes, categoriesRes, tablesRes] = await Promise.all([
          fetch(`/api/admin/${tenantSlug}/menu-items`),
          fetch(`/api/admin/${tenantSlug}/categories`),
          fetch(`/api/admin/${tenantSlug}/tables`),
        ]);

        const [itemsData, categoriesData, tablesData] = await Promise.all([
          itemsRes.json(),
          categoriesRes.json(),
          tablesRes.json(),
        ]);

        setItems(Array.isArray(itemsData) ? itemsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        if (Array.isArray(tablesData)) {
          const table = tablesData.find(t => t.id === tableId);
          if (table) setTableNumber(table.number);
        }
      } catch (error) {
        console.error("Failed to fetch menu data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    fetchActiveOrders();

    const interval = setInterval(fetchActiveOrders, 15000); // Check orders every 15s
    return () => clearInterval(interval);
  }, [tenantSlug]);

  async function fetchActiveOrders() {
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/orders`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter orders for THIS table that are not cancelled
        const tableOrders = data.filter(o => o.table_id === tableId && o.status !== "cancelled");
        setActiveOrders(tableOrders);
      }
    } catch (error) {
      console.error("Failed to fetch active orders:", error);
    }
  }

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = items.reduce((total, item) => {
    return total + (cart[item.id] || 0) * item.price;
  }, 0);

  const cartItems = Object.entries(cart).map(([itemId, quantity]) => {
    const item = items.find(i => i.id === itemId);
    return { ...item, quantity };
  }).filter(i => i.quantity > 0);

  const allOrderedItemsGrouped = activeOrders.flatMap(order =>
    order.order_items.map((item: any) => ({
      ...item,
      status: order.status,
    }))
  ).reduce((acc: any[], item: any) => {
    const existing = acc.find(i => i.menu_item_id === item.menu_item_id && i.status === item.status);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, []);

  const allOrderedItems = allOrderedItemsGrouped;

  const statusMap = {
    pending: { label: "Chờ duyệt", color: "bg-red-500", icon: Clock },
    preparing: { label: "Đang nấu", color: "bg-orange-500", icon: ChefHat },
    completed: { label: "Đã phục vụ", color: "bg-emerald-500", icon: CheckCircle2 },
  };

  function addToCart(id: string) {
    setCart(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  }

  async function handleSendOrder() {
    if (cartCount === 0) return;

    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = items.find(i => i.id === itemId);
        return {
          menu_item_id: itemId,
          quantity,
          unit_price: item?.price || 0
        };
      });

      const res = await fetch(`/api/tenants/${tenantSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          items: orderItems,
        }),
      });

      if (!res.ok) throw new Error("Failed to send order");

      setCart({});
      setShowConfirm(false);
      setShowSuccess(true);
      fetchActiveOrders(); // Refresh immediately
    } catch (error) {
      console.error("Order error:", error);
      alert("Lỗi khi gửi đơn hàng!");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Đang chuẩn bị thực đơn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex justify-center">
      <div className="w-full max-w-lg bg-white min-h-screen shadow-2xl shadow-black/5 flex flex-col pb-32">
        {/* Header with Background */}
        <div className="relative h-48 bg-primary overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <div className="absolute inset-0 p-6 flex flex-col justify-end gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-md">
                  <MapPin className="size-3 mr-1" />
                  Bàn {tableNumber || tableId}
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/80 text-white border-none">
                  Online
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full bg-white/10 text-white border-transparent backdrop-blur-md hover:bg-white/20",
                  showHistory && "bg-white text-primary hover:bg-white"
                )}
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="size-4 mr-2" />
                {showHistory ? "Xem thực đơn" : `Đơn đã gọi (${allOrderedItems.length})`}
              </Button>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight uppercase">@{tenantSlug}</h1>
            <p className="text-white/80 text-xs flex items-center gap-1">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 font-bold">5.0</span>
              <span className="opacity-60 ml-1">• Gợi ý món ngon mỗi ngày</span>
            </p>
          </div>
          <div className="absolute top-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/20 text-white cursor-pointer hover:bg-white/20 transition-colors">
            <Info className="size-5" />
          </div>
        </div>

        {!showHistory ? (
          <>
            <div className="sticky top-0 z-20 bg-[#fafafa]/80 backdrop-blur-xl border-b border-black/5 pt-4">
              <div className="px-4 mb-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Tìm món ăn yêu thích..."
                    className="pl-10 h-11 rounded-2xl bg-white border-black/5 shadow-sm focus-visible:ring-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
                <Button
                  variant={activeCategory === "all" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full px-5 h-9 font-bold transition-all",
                    activeCategory === "all" ? "shadow-lg shadow-primary/20 scale-105" : "bg-white border-black/5 text-muted-foreground"
                  )}
                  onClick={() => setActiveCategory("all")}
                >
                  Tất cả
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full pl-1.5 pr-5 h-9 font-bold whitespace-nowrap transition-all flex items-center gap-2",
                      activeCategory === cat.id ? "shadow-lg shadow-primary/20 scale-105" : "bg-white border-black/5 text-muted-foreground"
                    )}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <div className="size-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="size-full object-cover" />
                      ) : (
                        <span className="text-xs">{cat.icon}</span>
                      )}
                    </div>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Menu List */}
            <div className="p-4 space-y-6">
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredItems.map((item) => {
                    const itemInCart = cart[item.id] || 0;
                    return (
                      <Card key={item.id} className="group relative overflow-hidden border-none shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                        <CardContent className="p-3 flex gap-4">
                          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
                            <img
                              src={item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=efefef&size=200`}
                              alt={item.name}
                              className="size-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            {!item.available && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Hết món</span>
                              </div>
                            )}
                            {itemInCart > 0 && (
                              <div className="absolute top-1 right-1 size-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm scale-110 animate-in zoom-in duration-300">
                                {itemInCart}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div className="space-y-0.5">
                              <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.description || "Hương vị đậm đà, được chế biến từ những nguyên liệu tươi ngon nhất trong ngày."}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground/60 line-through">{(item.price * 1.1).toLocaleString()}đ</span>
                                <span className="font-black text-primary text-lg">
                                  {item.price.toLocaleString()}<span className="text-xs ml-0.5 uppercase tracking-tighter">đ</span>
                                </span>
                              </div>
                              <Button
                                size="icon"
                                onClick={() => addToCart(item.id)}
                                className="size-9 rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-transform active:scale-90"
                              >
                                <Plus size={18} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 px-10">
                  <div className="bg-muted p-4 rounded-full size-16 mx-auto mb-4 flex items-center justify-center">
                    <UtensilsCrossed className="size-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-bold">Không tìm thấy món</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? "Thử tìm kiếm với từ khóa khác nhé!" : "Danh mục này hiện chưa có món ăn."}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-5 animate-in slide-in-from-right-10 duration-500">
            <div className="flex flex-col gap-1 px-1">
              <h2 className="text-xl font-black text-primary uppercase tracking-tight">Đơn hàng của bạn</h2>
              <p className="text-[10px] text-muted-foreground font-semibold italic">Cập nhật trạng thái tự động từ nhà bếp</p>
            </div>

            {allOrderedItems.length > 0 ? (
              <div className="space-y-3 px-1">
                {allOrderedItems.map((item, idx) => {
                  const Status = (statusMap as any)[item.status] || statusMap.pending;
                  return (
                    <div key={`${item.order_id}-${idx}`} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-black/[0.03] shadow-sm">
                      <div className="size-14 shrink-0 rounded-xl bg-muted overflow-hidden border border-black/5">
                        <img
                          src={item.menu_item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.menu_item.name)}&background=efefef`}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <h4 className="font-bold text-[13px] truncate leading-tight">{item.menu_item.name}</h4>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight mt-0.5">SL: {item.quantity}</p>
                        <div className="mt-1.5">
                          <Badge className={cn("px-1.5 py-0 rounded-full text-[8px] font-black uppercase tracking-tighter border-none", Status.color + " text-white shadow-sm")}>
                            <Status.icon className="size-2 mr-1" />
                            {Status.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-center gap-1">
                        <p className="font-black text-primary text-sm tracking-tighter">{(item.unit_price * item.quantity).toLocaleString()}đ</p>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-primary text-white rounded-[32px] border-none shadow-xl shadow-primary/20 mt-6 p-6">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Tổng hóa đơn</p>
                    <p className="text-2xl font-black tracking-tighter">{allOrderedItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0).toLocaleString()}đ</p>
                  </div>
                  <div className="h-[1px] bg-white/10 w-full my-4" />
                  <div className="flex items-center gap-3 text-[10px] font-semibold opacity-60 italic">
                    <Clock size={12} />
                    Chúc bạn ngon miệng !
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 px-10">
                <div className="bg-muted p-6 rounded-full size-20 mx-auto mb-6 flex items-center justify-center">
                  <History className="size-10 text-muted-foreground/20" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-muted-foreground/40">Chưa có đơn hàng</h3>
                <p className="text-sm text-muted-foreground/50 mt-2 font-medium">Bạn chưa gọi món nào. Hãy xem thực đơn và chọn món ngon nhé!</p>
                <Button
                  onClick={() => setShowHistory(false)}
                  className="mt-8 rounded-full px-8 bg-primary hover:bg-primary/90 text-white font-bold"
                >
                  Trở lại Thực đơn
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Floating Bottom Navigation (Cart) */}
        {cartCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-sm:w-[94%] max-w-sm z-50 animate-in slide-in-from-bottom-10 duration-700">
            <Button
              onClick={() => setShowConfirm(true)}
              className="w-full h-14 rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 flex items-center justify-between px-6 border-4 border-white"
            >
              <div className="flex items-center gap-3">
                <div className="relative bg-white/20 p-2 rounded-xl">
                  <ShoppingCart className="size-5" />
                  <span className="absolute -top-1.5 -right-1.5 size-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-primary">{cartCount}</span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest leading-none">Giỏ hàng</p>
                  <p className="text-sm font-black leading-tight uppercase">{cartTotal.toLocaleString()}đ</p>
                </div>
              </div>
              <div className="flex items-center font-black">
                TIẾP TỤC <ChevronRight className="size-4 ml-1" />
              </div>
            </Button>
          </div>
        )}

        {/* Bottom Padding for scroll space */}
        <div className="h-10" />

        {/* Confirm Order Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="sm:max-w-md rounded-[40px] border-none p-0 overflow-hidden shadow-2xl">
            <div className="p-8 bg-muted/30">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight text-center">Xác nhận đơn hàng</h2>
              <p className="text-sm text-muted-foreground text-center mt-2 font-medium">Vui lòng kiểm tra lại các món bạn đã chọn trước khi gửi đến nhà bếp.</p>

              <ScrollArea className="mt-8 max-h-[40vh] pr-4">
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-black/5">
                      <div className="size-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                        <img src={item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "")}`} alt="" className="size-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{item.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground">SL: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{(item.price! * item.quantity).toLocaleString()}đ</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-8 pt-6 border-t border-black/5">
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">{cartTotal.toLocaleString()}đ</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white flex flex-col gap-3">
              <Button
                onClick={handleSendOrder}
                className="w-full h-14 rounded-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 text-lg"
              >
                XÁC NHẬN GỬI ĐƠN
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:bg-muted"
              >
                QUAY LẠI CHỌN TIẾP
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="sm:max-w-sm rounded-[32px] border-none p-0 overflow-hidden shadow-2xl">
            <div className="bg-primary/5 p-8 flex flex-col items-center text-center gap-4">
              <div className="size-20 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/20 animate-bounce">
                <PartyPopper size={40} />
              </div>
              <div className="space-y-2">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-primary text-center">
                    ĐẶT MÓN THÀNH CÔNG!
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium text-center">
                    Đơn hàng của bạn đã được gửi đến nhà bếp. Vui lòng đợi trong giây lát, chúng tôi sẽ phục vụ ngay!
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
            <div className="p-6 bg-white">
              <Button
                onClick={() => {
                  setShowSuccess(false);
                  setShowHistory(true); // Jump to history to see status
                }}
                className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Xem trạng thái đơn hàng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


