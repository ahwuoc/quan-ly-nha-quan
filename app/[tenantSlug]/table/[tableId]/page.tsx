"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  ShoppingCart,
  MapPin,
  Clock,
  ChefHat,
  CheckCircle2,
  History,
  Search,
  ArrowLeft,
  Lock,
  User,
  Users2,
  RefreshCw,
  LogOut,
  Share2,
  XCircle,
  QrCode,
  MessageCircle,
  Globe
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { guestApi, GuestCreateOrderPayload } from "@/lib/api";

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
  customer_name?: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [table, setTable] = useState<any>(null);
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [showEntry, setShowEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ name: "", passcode: "" });
  const [isLeader, setIsLeader] = useState(false);
  const [isRefreshingPIN, setIsRefreshingPIN] = useState(false);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [isIpAllowed, setIsIpAllowed] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ips = tenantConfig?.allowed_ips;
    if (!ips || typeof ips !== "string" || ips.trim() === "") {
      setIsIpAllowed(true);
      return;
    }
    async function checkIp() {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const { ip } = await res.json();
        setClientIp(ip);

        const allowedList = ips.split(",").map((i: string) => i.trim());
        setIsIpAllowed(allowedList.includes(ip));
      } catch (err) {
        setIsIpAllowed(true);
      }
    }
    checkIp();
  }, [tenantConfig]);

  useEffect(() => {
    if (!showEntry) return;
    const syncTable = async () => {
      try {
        const { data } = await supabase.from("tables").select("*").eq("id", tableId).maybeSingle() as { data: any };
        if (data) {
          setTable(data);
          if (data.number) setTableNumber(data.number);
          const isActuallyEmpty = !data.session_id || data.session_id.toString() === "";
          if (isActuallyEmpty && entryForm.passcode === "") {
            const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
            setEntryForm(prev => ({ ...prev, passcode: randomPin }));
          }
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    };
    syncTable();
  }, [showEntry, tableId]);

  async function fetchAllData() {
    try {
      const { data: tenant } = (await supabase.from("tenants").select("*").eq("slug", tenantSlug).maybeSingle()) as { data: any };
      if (!tenant) return;
      setTenantConfig(tenant);

      const [{ data: itemsData }, { data: categoriesData }, { data: tableData }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("tenant_id", tenant.id).order("name"),
        supabase.from("categories").select("*").eq("tenant_id", tenant.id).order("name"),
        supabase.from("tables").select("*").eq("id", tableId).maybeSingle() as any,
      ]);

      setItems(itemsData || []);
      setCategories(categoriesData || []);
      setTable(tableData);
      if (tableData) setTableNumber(tableData.number);

      const sidKey = `session_${tableId}`;
      const leaderKey = `is_leader_${tableId}`;
      const currentSessionId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("table_session_id="))
        ?.split("=")[1] || localStorage.getItem(sidKey);

      if (localStorage.getItem(leaderKey) === "true") setIsLeader(true);

      const dbSid = tableData?.session_id?.toString().toLowerCase();
      const localSid = currentSessionId?.toString().toLowerCase();
      const hasValidSession = dbSid && localSid && (dbSid === localSid);

      if (!hasValidSession) {
        setShowEntry(true);
        if (!dbSid) {
          setEntryForm(prev => prev.passcode === "" ? { ...prev, passcode: Math.floor(1000 + Math.random() * 9000).toString() } : prev);
        }
      } else {
        setShowEntry(false);
      }
    } catch (error) {
      console.error("Fetch all data error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEntrySubmit() {
    if (!entryForm.name) {
      alert("Vui lòng nhập tên của bạn!");
      return;
    }
    const isNewlyCreated = !table?.session_id || table.session_id.toString() === "";
    if (isNewlyCreated && entryForm.passcode.length < 4) {
      alert("Vui lòng nhập mã PIN 4 số!");
      return;
    }
    const sid = table?.session_id || (typeof window !== "undefined" ? window.crypto.randomUUID() : "00000000-0000-0000-0000-000000000000");
    setIsSubmitting(true);
    try {
      const { data: res, error: rpcErr } = await (supabase.rpc as any)("claim_table_session", {
        p_table_id: tableId,
        p_session_id: sid,
        p_passcode: entryForm.passcode,
        p_leader_name: isNewlyCreated ? entryForm.name : undefined,
      });
      if (rpcErr) {
        alert(`Lỗi: ${rpcErr.message}`);
        return;
      }
      if (res?.success) {
        const finalSid = (res.session_id || sid).toString();
        document.cookie = `table_session_id=${finalSid}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `member_name=${encodeURIComponent(entryForm.name)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        localStorage.setItem(`session_${tableId}`, finalSid);
        localStorage.setItem(`name_${tableId}`, entryForm.name);
        setShowEntry(false);
        if (res.type === "new") {
          setIsLeader(true);
          localStorage.setItem(`is_leader_${tableId}`, "true");
        }
        fetchAllData();
      } else {
        alert(`Lỗi: ${res?.message}`);
      }
    } catch (err) {
      alert("Lỗi kết nối!");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefreshPIN() {
    if (!isLeader || isRefreshingPIN) return;
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setIsRefreshingPIN(true);
    try {
      const sid = localStorage.getItem(`session_${tableId}`);
      const { data } = await (supabase.rpc as any)("refresh_table_passcode", {
        p_table_id: tableId,
        p_session_id: sid,
        p_new_passcode: newPin
      });
      if (data?.success) {
        setTable((prev: any) => ({ ...prev, session_passcode: newPin }));
      } else {
        alert(data?.message || "Lỗi thay đổi PIN");
      }
    } catch {
      alert("Lỗi kết nối khi đổi PIN");
    } finally {
      setIsRefreshingPIN(false);
    }
  }

  async function handleEndSession() {
    setIsSubmitting(true);
    try {
      const sid = localStorage.getItem(`session_${tableId}`);
      const { data } = await (supabase.rpc as any)("close_table_session", {
        p_table_id: tableId,
        p_session_id: sid
      });
      if (data?.success) {
        localStorage.removeItem(`session_${tableId}`);
        localStorage.removeItem(`is_leader_${tableId}`);
        localStorage.removeItem(`name_${tableId}`);
        document.cookie = "table_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        window.location.reload();
      } else {
        alert(data?.message || "Không thể đóng bàn");
      }
    } catch {
      alert("Lỗi kết nối!");
    } finally {
      setIsSubmitting(false);
      setShowEndSessionConfirm(false);
    }
  }

  const [tenantId, setTenantId] = useState<string | null>(null);

  async function fetchActiveOrders(currentTid?: string | null) {
    const tidToUse = currentTid || tenantId;
    if (!tidToUse || !tableId) return;

    const sid = document.cookie
      .split("; ")
      .find((row) => row.startsWith("table_session_id="))
      ?.split("=")[1] || localStorage.getItem(`session_${tableId}`);

    if (!sid) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items (*, menu_item:menu_items(*))`)
      .eq("table_id", tableId)
      .eq("tenant_id", tidToUse)
      .eq("session_id", sid)
      .in("status", ["pending", "preparing", "completed", "cancelled"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActiveOrders(data as Order[]);
    }
  }

  function guestCancelOrder(orderId: string) {
    setCancelModal({ open: true, orderId });
  }

  async function confirmCancelOrder() {
    if (!cancelModal.orderId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from("orders")
        .update({ status: "cancelled" })
        .eq("id", cancelModal.orderId)
        .eq("status", "pending");
      if (error) throw error;
      await fetchActiveOrders(tenantId);
      setCancelModal({ open: false, orderId: null });
    } catch (err) {
      alert("Không thể hủy đơn. Có thể đơn hàng đã được quán chấp nhận.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!tenantSlug) return;
    const fetchTenant = async () => {
      const { data } = (await supabase.from("tenants").select("*").eq("slug", tenantSlug).maybeSingle()) as { data: any };
      if (data) {
        setTenantId(data.id);
        setTenantConfig(data);
        fetchAllData();
      }
    };
    fetchTenant();

    const channel = supabase
      .channel("guest-tenant-sync")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tenants" }, () => { fetchTenant(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantSlug]);

  useEffect(() => {
    if (!tenantId || !tableId) return;
    fetchActiveOrders(tenantId);
    const pollInterval = setInterval(() => { fetchActiveOrders(tenantId); }, 15000);
    const channel = supabase
      .channel(`rt-table-${tableId}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `table_id=eq.${tableId}` }, () => { fetchActiveOrders(tenantId); })
      .subscribe();
    return () => { clearInterval(pollInterval); supabase.removeChannel(channel); };
  }, [tenantId, tableId]);

  const trackingSummary = useMemo(() => {
    const allItems = activeOrders.flatMap(o => o.order_items.map((it: any) => ({ ...it, status: o.status })));
    const pending = allItems.filter(i => i.status === "pending").length;
    const preparing = allItems.filter(i => i.status === "preparing").length;
    return { pending, preparing, totalActive: pending + preparing, totalItems: allItems.filter(it => it.status !== "cancelled").length };
  }, [activeOrders]);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const cartTotal = items.reduce((total, item) => total + (cart[item.id] || 0) * item.price, 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const statusMap = {
    pending: { label: "Chờ duyệt", color: "text-rose-500 bg-rose-50", icon: Clock },
    preparing: { label: "Đang bếp", color: "text-orange-500 bg-orange-50", icon: ChefHat },
    completed: { label: "Đã phục vụ", color: "text-emerald-500 bg-emerald-50", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "text-slate-400 bg-slate-50", icon: XCircle },
  };

  async function handleSendOrder() {
    if (cartCount === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = items.find(i => i.id === itemId);
        return { menu_item_id: itemId, quantity, unit_price: item?.price || 0 };
      });
      const memberName = localStorage.getItem(`name_${tableId}`) || "Khách ẩn danh";
      const payload: GuestCreateOrderPayload = {
        table_id: tableId,
        customer_name: memberName,
        items: orderItems,
      };
      await guestApi.createOrder(tenantSlug, payload);
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

  if (!isIpAllowed) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="size-24 bg-white/10 rounded-[40px] flex items-center justify-center mb-8 relative">
          <MapPin size={48} className="text-primary animate-bounce" />
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 italic leading-tight">Vui lòng kết nối Wi-Fi quán</h1>
        <p className="text-slate-400 font-bold text-sm leading-relaxed max-w-xs mb-8">
          Để đảm bảo tính bảo mật và đặt món chính xác, bạn cần kết nối vào Wi-Fi của quán để truy cập thực đơn.
        </p>

        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">IP của bạn</p>
              <p className="font-mono text-amber-400 font-bold text-lg">{clientIp || "---.---.---.---"}</p>
            </div>

            {tenantConfig?.wifi_name && (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Globe size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Wi-Fi Quán</p>
                    <p className="text-sm font-black text-white truncate">{tenantConfig.wifi_name}</p>
                  </div>
                </div>
                {tenantConfig?.wifi_password && (
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Lock size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Mật khẩu</p>
                      <p className="text-sm font-black text-white truncate">{tenantConfig.wifi_password}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />

          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-300">Cần hỗ trợ? Liên hệ ngay:</p>
            <a
              href="https://zalo.me/0862267487"
              target="_blank"
              className="flex items-center justify-center gap-3 w-full h-14 bg-[#0068ff] rounded-2xl font-black text-sm uppercase tracking-tight shadow-xl shadow-blue-500/20 active:scale-95 transition-transform"
            >
              <MessageCircle size={20} className="fill-white" /> Nhắn tin Zalo
            </a>
            <p className="text-[10px] font-bold text-slate-500">Số điện thoại: 0862267487</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex justify-center pb-32 font-sans transition-all duration-500 overflow-x-hidden md:items-center md:py-12">
      <div className="w-full max-w-6xl bg-white min-h-screen md:min-h-[90vh] md:rounded-[48px] md:shadow-2xl md:shadow-slate-900/10 relative shadow-none overflow-hidden">

        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="p-5 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2 capitalize">{tenantSlug}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"><MapPin className="size-3" /> Bàn {tableNumber || "..."}</Badge>
                  {table?.session_passcode && (
                    <div className="flex items-center gap-1 group">
                      <Badge className="bg-slate-900 text-white border-none font-black text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg"><Lock className="size-3" /> PIN: {table.session_passcode}</Badge>
                      {isLeader && (
                        <button onClick={handleRefreshPIN} disabled={isRefreshingPIN} className={cn("size-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-primary transition-all active:scale-90", isRefreshingPIN && "animate-spin")}><RefreshCw size={12} /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="size-14 md:size-16 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 shadow-lg relative" onClick={() => setShowHistory(!showHistory)}>
                  <History className="size-5 md:size-6 text-slate-600" />
                  {trackingSummary.totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 size-6 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">{trackingSummary.totalItems}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!showHistory ? (
          <>
            <div className="px-4 md:px-8 py-4 space-y-4">
              <div className="relative group"><Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-slate-400" /><Input placeholder="Tìm món ngon..." className="pl-14 h-14 rounded-2xl bg-slate-50 border-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <Button variant={activeCategory === "all" ? "default" : "secondary"} className={cn("h-11 rounded-xl px-6 font-bold text-sm flex-shrink-0 transition-all", activeCategory === "all" && "bg-primary text-white shadow-lg")} onClick={() => setActiveCategory("all")}>Tất cả</Button>
                {categories.map(cat => (
                  <Button key={cat.id} variant={activeCategory === cat.id ? "default" : "secondary"} className={cn("h-11 rounded-xl px-6 font-bold text-sm flex-shrink-0 transition-all", activeCategory === cat.id && "bg-primary text-white shadow-lg")} onClick={() => setActiveCategory(cat.id)}>{cat.name}</Button>
                ))}
              </div>
            </div>
            <div className="px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-48">
              {filteredItems.map(item => (
                <div key={item.id} className="group bg-white rounded-3xl overflow-hidden border-2 border-slate-100 transition-all hover:border-primary/30 shadow-sm">
                  <div className="aspect-square w-full overflow-hidden bg-slate-100"><img src={item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f1f5f9&color=64748b&bold=true&size=400`} className="size-full object-cover group-hover:scale-110 transition-all duration-500" alt={item.name} /></div>
                  <div className="p-4 space-y-3">
                    <h3 className="font-black text-sm leading-tight line-clamp-2">{item.name}</h3>
                    <div className="flex items-end justify-between gap-2">
                      <span className="text-xl font-black text-primary tracking-tight">{item.price.toLocaleString()}đ</span>
                      <div className="flex-1">
                        {cart[item.id] > 0 ? (
                          <div className="flex items-center bg-slate-900 text-white rounded-xl p-1 shadow-lg">
                            <button onClick={() => setCart(prev => ({ ...prev, [item.id]: Math.max(0, prev[item.id] - 1) }))} className="size-8 flex items-center justify-center"><Minus size={14} /></button>
                            <span className="flex-1 text-center font-black text-sm">{cart[item.id]}</span>
                            <button onClick={() => setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))} className="size-8 flex items-center justify-center"><Plus size={14} /></button>
                          </div>
                        ) : (<Button className="h-9 w-full rounded-xl text-[10px] font-black bg-primary" onClick={() => setCart(prev => ({ ...prev, [item.id]: 1 }))}>+ THÊM</Button>)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 space-y-8 animate-in slide-in-from-left duration-500">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowHistory(false)} className="size-12 rounded-[24px] bg-slate-50 flex items-center justify-center active:scale-90 transition-all text-slate-500"><ArrowLeft size={24} /></button>
              <div className="flex flex-col flex-1"><h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900 leading-none">Món đã đặt</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sẵn sàng phục vụ bạn.</p></div>
            </div>

            <div className="space-y-4">
              {activeOrders.length === 0 && (
                <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 italic space-y-4">
                  <ShoppingCart size={48} className="mx-auto opacity-20" />
                  <p className="font-bold text-xs uppercase tracking-widest">Chưa có món nào được gọi</p>
                </div>
              )}
              {activeOrders.map((order) => {
                const cancelWindow = tenantConfig?.order_cancel_window || 120;
                const createdTime = new Date(order.created_at).getTime();
                const secondsLeft = cancelWindow - Math.floor((currentTime - createdTime) / 1000);
                const canCancel = order.status === "pending" && secondsLeft > 0;

                return (
                  <Card key={order.id} className="p-5 rounded-3xl border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="size-4 text-primary" /></div>
                      <div className="flex flex-col"><span className="text-xs font-black text-slate-900 leading-none">{order.customer_name || "Khách"}</span><span className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-tighter">Đặt lúc {new Date(order.created_at).toLocaleTimeString("vi-VN")}</span></div>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-slate-50">
                      {order.order_items.map((it) => {
                        const St = statusMap[order.status as keyof typeof statusMap] || statusMap.pending;
                        const Icon = St.icon;
                        return (
                          <div key={it.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3"><span className="size-7 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-600">{it.quantity}</span><span className="text-sm font-bold text-slate-800">{it.menu_item?.name}</span></div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-slate-900">{(it.unit_price * it.quantity).toLocaleString()}đ</span>
                              <Badge className={cn("gap-1 font-bold border-none px-2 py-0.5 text-[9px] rounded-full shadow-none", St.color)}><Icon className="size-2.5" />{St.label}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {canCancel && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-100"><Button variant="ghost" size="sm" onClick={() => guestCancelOrder(order.id)} className="w-full rounded-xl text-rose-500 font-black text-[10px] uppercase h-10 hover:bg-rose-50">Hủy đơn (còn {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')})</Button></div>
                    )}
                  </Card>
                );
              })}

              {activeOrders.filter(o => o.status === 'completed').length > 0 && (
                <div className="mt-8 p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[40px] text-white shadow-2xl relative overflow-hidden ring-4 ring-white shadow-black/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-16 -mt-16" />
                  <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Tổng phiên ăn</span>
                      <span className="text-3xl font-black italic tracking-tighter text-amber-400">
                        {activeOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.order_items.reduce((s, it) => s + (it.unit_price * it.quantity), 0), 0).toLocaleString()}đ
                      </span>
                    </div>

                    {tenantConfig?.bank_qr_enabled && tenantConfig?.bank_account_number && (
                      <Button
                        className="w-full h-14 rounded-2xl bg-white text-slate-900 font-black text-sm uppercase tracking-tight hover:bg-slate-100 group transition-all"
                        onClick={() => {
                          setShowPaymentQR(true);
                          guestApi.requestPayment(tenantSlug, tableId);
                        }}
                      >
                        <QrCode className="size-5 mr-3 text-primary group-hover:scale-110 transition-transform" /> Thanh toán qua VietQR
                      </Button>
                    )}

                    <p className="text-[10px] text-center font-bold text-white/30 italic">Chỉ thanh toán cho các món đã được quán xác nhận</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-white/80 backdrop-blur-xl border-t border-slate-100 space-y-3 z-40">
          {cartCount > 0 && !showHistory && (
            <Button size="lg" className="w-full h-16 rounded-[28px] justify-between px-8 bg-gradient-to-r from-primary to-rose-500 shadow-2xl shadow-primary/30 transition-all active:scale-95 text-white" onClick={() => setShowConfirm(true)} disabled={isSubmitting}><span className="font-black text-lg">{cartCount} món</span><span className="font-black text-xl tracking-tighter">{cartTotal.toLocaleString()}đ</span></Button>
          )}
        </div>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="sm:max-w-md rounded-[54px] p-10 border-none bg-white shadow-2xl">
            <DialogHeader className="text-center"><DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Bạn muốn gửi đơn?</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pt-6 no-scrollbar">
              {Object.entries(cart).map(([id, qty]) => {
                const item = items.find(i => i.id === id);
                if (!item || qty === 0) return null;
                return (<div key={id} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-none"><p className="font-bold text-slate-800 flex items-center gap-3"><span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">x{qty}</span>{item.name}</p><span className="font-black text-slate-900">{(item.price * qty).toLocaleString()}đ</span></div>);
              })}
            </div>
            <div className="pt-8 border-t flex justify-between items-baseline"><span className="font-black text-slate-400 uppercase text-[10px] tracking-widest font-sans">Cần trả</span><span className="text-4xl font-black text-primary tracking-tighter">{cartTotal.toLocaleString()}đ</span></div>
            <Button onClick={handleSendOrder} disabled={isSubmitting} className="w-full h-16 rounded-[28px] font-black text-xl bg-primary mt-6 text-white hover:bg-primary/90">XÁC NHẬN</Button>
          </DialogContent>
        </Dialog>


        <Dialog open={cancelModal.open} onOpenChange={(open) => setCancelModal({ ...cancelModal, open })}>
          <DialogContent className="sm:max-w-sm rounded-[40px] p-8 border-none bg-white shadow-2xl text-center"><div className="size-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><XCircle size={32} /></div><DialogHeader><DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Hủy đơn hàng này?</DialogTitle><DialogDescription className="text-xs font-bold text-slate-400 mt-2">Đơn hàng của bạn sẽ được xóa bỏ.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-3 mt-8"><Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setCancelModal({ open: false, orderId: null })}>QUAY LẠI</Button><Button variant="default" className="h-14 rounded-2xl font-black bg-rose-500 text-white" disabled={isSubmitting} onClick={confirmCancelOrder}>{isSubmitting ? <RefreshCw className="animate-spin" /> : "XÁC NHẬN"}</Button></div></DialogContent>
        </Dialog>

        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="sm:max-w-sm rounded-[60px] p-12 text-center border-none shadow-3xl bg-white outline-none"><div className="size-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl animate-bounce"><CheckCircle2 size={48} /></div><DialogHeader className="pt-8 text-center px-4"><DialogTitle className="text-2xl font-black uppercase tracking-tighter mb-2">Xong rồi!</DialogTitle><DialogDescription className="font-bold text-slate-400 leading-tight">Yêu cầu đã gửi vào bếp.</DialogDescription></DialogHeader><Button onClick={() => setShowSuccess(false)} className="w-full h-14 rounded-2xl font-black bg-slate-900 mt-8 text-white">OK</Button></DialogContent>
        </Dialog>

        <Dialog open={showPaymentQR} onOpenChange={setShowPaymentQR}>
          <DialogContent className="sm:max-w-sm rounded-[48px] p-8 border-none bg-white shadow-2xl text-center flex flex-col items-center">
            <div className="size-16 bg-emerald-100 text-emerald-600 rounded-[24px] flex items-center justify-center mb-6">
              <QrCode size={32} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mã VietQR</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest italic">
                Quét để chuyển khoản nhanh
              </DialogDescription>
            </DialogHeader>

            {tenantConfig && (
              <div className="mt-8 relative group">
                <div className="absolute -inset-2 bg-gradient-to-tr from-primary/10 via-amber-500/10 to-emerald-500/10 rounded-[40px] blur-xl opacity-50" />
                <div className="bg-white p-4 rounded-[40px] border-2 border-slate-100 shadow-xl relative z-10 w-[240px] h-[240px] flex items-center justify-center">
                  <img
                    src={`https://qr.sepay.vn/img?acc=${tenantConfig.bank_account_number}&bank=${tenantConfig.bank_name}&amount=${activeOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.order_items.reduce((s, it) => s + (it.unit_price * it.quantity), 0), 0)
                      }&des=${encodeURIComponent(`BAN ${table?.number} ${tenantConfig.slug}`.toUpperCase())}`}
                    alt="Payment QR"
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
              </div>
            )}

            <div className="mt-8 w-full space-y-4">
              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 text-left">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Số tiền</span>
                  <span className="text-xl font-black text-primary italic leading-none">
                    {activeOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.order_items.reduce((s, it) => s + (it.unit_price * it.quantity), 0), 0).toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nội dung</span>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-tight">BAN {table?.number} {tenantConfig?.slug}</span>
                </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-relaxed text-center">
                Vui lòng giữ lại màn hình giao dịch thành công để nhân viên đối soát nếu cần.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEntry} onOpenChange={() => { }}>
          <DialogContent className="sm:max-w-md rounded-[48px] p-10 border-none bg-white shadow-2xl overflow-hidden outline-none"><div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" /><DialogHeader className="text-center relative z-10"><div className="size-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4"><Users2 className="size-8 text-primary" /></div><DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{(!table?.session_id || table.session_id.toString() === "") ? "Bắt đầu nhóm" : "Vào chung vui"}</DialogTitle></DialogHeader><div className="space-y-6 pt-6 relative z-10"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Bạn tên gì?</label><Input placeholder="VD: Tuấn, Hoa..." className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-lg" value={entryForm.name} onChange={(e) => setEntryForm(prev => ({ ...prev, name: e.target.value }))} /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">PIN của bàn</label><Input type={(!table?.session_id || table.session_id.toString() === "") ? "text" : "password"} readOnly={(!table?.session_id || table.session_id.toString() === "")} inputMode="numeric" maxLength={4} className={cn("h-14 rounded-2xl border-slate-100 font-black text-2xl tracking-[0.5em] flex items-center justify-center text-center", (!table?.session_id || table.session_id.toString() === "") ? "bg-primary/5 border-primary/20 text-primary" : "bg-slate-50/50")} value={entryForm.passcode} onChange={(e) => setEntryForm(prev => ({ ...prev, passcode: e.target.value.replace(/\D/g, "") }))} /></div></div><Button onClick={handleEntrySubmit} disabled={isSubmitting} className="w-full h-16 rounded-[28px] font-black text-lg bg-primary text-white mt-8">VÀO BÀN</Button></DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
