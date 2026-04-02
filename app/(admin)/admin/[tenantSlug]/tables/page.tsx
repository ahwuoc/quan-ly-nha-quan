"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useParams, useRouter } from "next/navigation";
import { tablesApi, ordersApi, type Table } from "@/lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  Armchair,
  Users,
  MapPin,
  RefreshCw,
  Search,
  Eye,
  Printer,
  Sparkles,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import TableModal from "./_components/TableModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";



export default function TablesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<{ open: boolean; item?: Table }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; item?: Table }>({ open: false });
  const [baseUrl, setBaseUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [billItems, setBillItems] = useState<Array<{ id: string; name: string; quantity: number; price: number; originalQty: number }>>([]);
  const [billAdjustments, setBillAdjustments] = useState<Array<{ item: string; reason: string; change: number }>>([]);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const fetchData = useCallback(async function () {
    setLoading(true);
    try {
      const [tablesResult, ordersResult] = await Promise.all([
        tablesApi.getTables(tenantSlug),
        ordersApi.getOrders(tenantSlug),
      ]);

      if (Array.isArray(tablesResult.payload)) setTables(tablesResult.payload);
      if (Array.isArray(ordersResult.payload)) setOrders(ordersResult.payload);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    setMounted(true);
    setBaseUrl(window.location.origin);
    fetchData();

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel("tables-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
        },
        (payload: any) => {
          setTables((prev) =>
            prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timeInterval);
    };
  }, [tenantSlug, fetchData]);
  if (!mounted) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        <div className="h-64 bg-muted/20 rounded-[40px] animate-pulse" />
      </div>
    );
  }

  async function handleCheckout(tableId: string) {
    if (saving) return;
    setSaving(true);
    try {
      if (billAdjustments.length > 0) {
        const adjustments = billAdjustments.map(adj => ({
          type: adj.item as 'discount' | 'service_charge' | 'tax',
          amount: adj.change,
          description: adj.reason,
        }));
        await tablesApi.saveBillAdjustments(tenantSlug, tableId, adjustments);
      }
      await tablesApi.clearPaymentRequest(tenantSlug, tableId);
      await tablesApi.checkout(tenantSlug, { tableId });
      await fetchData();
      setCheckoutModal({ open: false });
      setBillItems([]);
      setBillAdjustments([]);
      setAdjustmentReason("");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Lỗi khi thanh toán. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }



  const tableStats = {
    total: tables.length,
    available: tables.filter((t) => t.status === "available").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    browsing: tables.filter((t) => {
      if (!t.last_active_at) return false;
      return (currentTime.getTime() - new Date(t.last_active_at).getTime()) < 60000;
    }).length,
    paymentRequested: tables.filter((t) => t.payment_requested).length,
  };

  async function handleSave(table: Table) {
    if (saving) return;
    setSaving(true);
    try {
      const isNew = !table.id || table.id.toString().startsWith("temp-");
      const payload = {
        number: table.number,
        seats: table.seats,
        status: table.status,
      };
      
      if (isNew) {
        await tablesApi.createTable(tenantSlug, payload);
      } else {
        await tablesApi.updateTable(tenantSlug, payload);
      }
      await fetchData();
      setModal({ open: false });
    } catch (error) {
      console.error("Failed to save table:", error);
      alert("Lỗi khi lưu bàn");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId || saving) return;
    setSaving(true);
    try {
      await tablesApi.deleteTable(tenantSlug, deleteId);
      await fetchData();
      setDeleteId(null);
      setConfirmDeleteText("");
    } catch (error) {
      console.error("Failed to delete table:", error);
      alert("Lỗi khi xóa bàn");
    } finally {
      setSaving(false);
    }
  }

  const filtered = tables.filter(t => t.number.toString().includes(searchTerm));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <div className="bg-primary/10 p-1.5 md:p-2 rounded-xl text-primary">
              <Armchair className="size-5 md:size-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Sơ đồ nhà hàng</h1>
          </div>
          <p className="text-slate-500 font-medium text-xs md:text-sm ml-1">Quản lý trạng thái bàn ăn và QR gọi món.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            className="rounded-xl md:rounded-2xl h-10 w-10 md:h-12 md:w-12 bg-white border-slate-100 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={cn("size-4 md:size-5 text-slate-400", loading && "animate-spin")} />
          </Button>
          <Button
            onClick={() => setModal({ open: true })}
            className="rounded-xl md:rounded-2xl h-10 md:h-12 px-4 md:px-6 font-black text-xs md:text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus className="mr-1.5 md:mr-2 size-4 md:size-5" /> THÊM BÀN
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 md:gap-0 md:flex-row items-start md:items-center justify-between overflow-hidden">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm số bàn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 md:pl-11 h-10 md:h-12 bg-slate-50 border-none rounded-xl md:rounded-2xl font-bold placeholder:text-slate-300 focus-visible:ring-primary/20 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-8 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] md:tracking-[0.2em]">
          <div className="flex items-center gap-2">
            <div className="size-2.5 md:size-3 rounded-full bg-slate-200" />
            <span>{tableStats.available} Trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2.5 md:size-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span>{tableStats.occupied} Phục vụ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2.5 md:size-3 rounded-full bg-blue-500 animate-bounce shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            <span className="text-blue-600">{tableStats.browsing} Lướt</span>
          </div>
          {tableStats.paymentRequested > 0 && (
            <div className="flex items-center gap-2">
              <div className="size-2.5 md:size-3 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <span className="text-amber-600">{tableStats.paymentRequested} Bill</span>
            </div>
          )}
        </div>
      </div>

      {loading && tables.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-[280px] md:h-[340px] rounded-2xl md:rounded-[2.5rem] bg-slate-50 animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {filtered.map((table) => (
            <Card key={table.id} className={cn(
              "group relative overflow-hidden rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl border-none bg-white",
              table.status === "occupied" ? "ring-2 ring-emerald-500/20" : "shadow-sm",
              table.payment_requested && "ring-2 ring-amber-400/60"
            )}>
              {table.status === "occupied" && (
                <div className="absolute top-6 right-6 z-10">
                  <div className="size-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                </div>
              )}
              <CardContent className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "size-16 rounded-[1.5rem] flex items-center justify-center transition-colors shadow-sm",
                    table.status === "occupied" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300"
                  )}>
                    <Armchair className="size-8" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Mã bàn</p>
                    <p className="text-4xl font-black text-slate-800 tracking-tighter">#{table.number}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-400">Sức chứa:</span>
                    <span className="text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg">{table.seats} chỗ ngồi</span>
                  </div>
                  <Separator className="bg-slate-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái:</span>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={table.status === "occupied" ? "default" : "secondary"} className={cn(
                        "rounded-xl px-3 py-1 font-bold text-[10px] uppercase shadow-none",
                        table.status === "occupied" ? "bg-emerald-500 hover:bg-emerald-500" : "bg-slate-100 text-slate-400"
                      )}>
                        {table.status === "occupied" ? "CÓ KHÁCH" : "BÀN TRỐNG"}
                      </Badge>

                      {table.payment_requested && (
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-none flex items-center gap-1 animate-pulse">
                          <span className="text-[9px] font-black uppercase tracking-widest">💳 Yêu cầu thanh toán</span>
                        </Badge>
                      )}

                      {(() => {
                        const isBrowsing = table.last_active_at && (currentTime.getTime() - new Date(table.last_active_at).getTime()) < 60000;
                        if (isBrowsing) {
                          return (
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50 flex items-center gap-1 animate-in slide-in-from-right-2">
                              <Eye size={10} className="animate-pulse" />
                              <span className="text-[8px] font-black uppercase">Đang chọn món</span>
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {table.status === "occupied" && (
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 space-y-1 animate-in zoom-in-95 duration-300">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none opacity-50">Tổng hóa đơn tạm tính</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                      {(table.current_total || 0).toLocaleString("vi-VN")}<span className="text-sm ml-0.5">đ</span>
                    </p>
                  </div>
                )}

                <div className={cn(
                  "grid gap-3",
                  table.status === "occupied" ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {table.status === "occupied" && (
                    <Button
                      className="rounded-2xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"
                      onClick={() => setCheckoutModal({ open: true, item: table })}
                      disabled={saving}
                    >
                      BILL
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-2xl h-12 border-slate-100 font-bold hover:bg-slate-50 hover:text-primary transition-all",
                      table.status !== "occupied" && "w-full"
                    )}
                    onClick={() => router.push(`/admin/${tenantSlug}/tables/${table.id}`)}
                    disabled={saving}
                  >
                    <Settings className="size-4 mr-2" /> Quản lý
                  </Button>
                </div>

                <div className="flex gap-2 items-center pt-2">
                  <Button variant="ghost" className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary hover:bg-primary/5 rounded-xl h-10" asChild>
                    <a href={`${baseUrl}/${tenantSlug}/table/${table.id}`} target="_blank" rel="noopener noreferrer">
                      Tải Mã QR <MapPin className="ml-2 size-3" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteId(table.id)}
                    disabled={saving || table.status === "occupied"}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
          <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-6 shadow-sm">
            <Armchair className="size-16 text-slate-200" />
          </div>
          <h3 className="text-3xl font-black text-slate-800">Không tìm thấy bàn</h3>
          <p className="text-slate-400 font-medium max-w-[320px] text-center mt-2 leading-relaxed italic">
            {searchTerm ? "Thử tìm kiếm với số bàn khác xem sao bạn nhé!" : "Bắt đầu thiết kế không gian quán của bạn bằng cách thêm bàn đầu tiên."}
          </p>
          <Button variant="default" className="mt-8 h-14 px-10 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all" onClick={() => { setSearchTerm(""); setModal({ open: true }); }}>
            TẠO KHÔNG GIAN NGAY
          </Button>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-bill, #printable-bill * {
            visibility: visible;
          }
          #printable-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {modal.open && (
        <TableModal
          item={modal.item}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
          tenantSlug={tenantSlug}
          saving={saving}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setConfirmDeleteText("");
          }
        }}
      >
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm no-print">
          <div className="sr-only">
            <AlertDialogTitle>Xác nhận xóa bàn</AlertDialogTitle>
            <AlertDialogDescription>Xác nhận xóa vĩnh viễn bàn này khỏi hệ thống. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </div>
          <AlertDialogHeader>
            <div className="bg-red-50 size-20 rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-sm text-red-500">
              <Trash2 className="size-10" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-center text-slate-800">Xóa bàn vĩnh viễn?</AlertDialogTitle>
            <div className="space-y-4 pt-4 text-center">
              <AlertDialogDescription className="font-medium text-slate-500 leading-relaxed italic">
                Sau khi xóa, mã QR của bàn này sẽ không còn tác dụng. Khách hàng không thể gọi món được nữa.
              </AlertDialogDescription>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-red-600">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Số bàn cần xóa
                </p>
                <div className="text-3xl font-black tracking-tighter">
                  #{tables.find(t => t.id === deleteId)?.number}
                </div>
                <Input
                  placeholder="Nhập lại số bàn để xóa..."
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  className="bg-white border-none text-center font-black text-xl h-12 rounded-xl shadow-inner focus-visible:ring-red-500/20"
                />
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-col gap-3 mt-8">
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={saving || confirmDeleteText !== tables.find(t => t.id === deleteId)?.number.toString()}
              className="w-full rounded-2xl h-14 bg-red-600 hover:bg-red-700 text-white font-black shadow-xl shadow-red-200 transition-all disabled:opacity-30 disabled:grayscale uppercase"
            >
              {saving ? "ĐANG XÓA..." : "XÁC NHẬN XÓA BÀN"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-2xl h-14 border-none bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-all uppercase text-xs tracking-widest">Gác lại đã</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={checkoutModal.open}
        onOpenChange={(open) => !open && !saving && setCheckoutModal({ open: false })}
      >
        <AlertDialogContent className={cn(
          "rounded-[3rem] border-none shadow-3xl p-0 max-w-2xl bg-white overflow-hidden no-print",
          saving && "opacity-80 pointer-events-none transition-opacity"
        )}>
          <div className="sr-only">
            <AlertDialogTitle>Hóa đơn thanh toán bàn {checkoutModal.item?.number}</AlertDialogTitle>
            <AlertDialogDescription>Chi tiết các món ăn và tổng tiền cần thanh toán cho bàn này.</AlertDialogDescription>
          </div>

          <div className="bg-emerald-600 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 size-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Hóa đơn Bàn {checkoutModal.item?.number}</h2>
                <p className="text-white/70 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Đã sẵn sàng thanh toán
                </p>
              </div>
              <div className="size-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-xl">
                <Armchair size={32} />
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            {/* Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">
                <span>Món ăn / Số lượng</span>
                <span>Thành tiền</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-6 pt-2">
                {(() => {
                  const currentSessionId = checkoutModal.item?.session_id;
                  const tableOrders = orders.filter(o => 
                    o.table_id === checkoutModal.item?.id && 
                    ["pending", "preparing", "completed"].includes(o.status) &&
                    o.session_id === currentSessionId
                  );
                  const groupedItems: Record<string, { name: string, quantity: number, price: number }> = {};

                  tableOrders.forEach(order => {
                    order.order_items.forEach((it: any) => {
                      const itId = it.menu_item_id;
                      if (!groupedItems[itId]) {
                        groupedItems[itId] = {
                          name: it.menu_item?.name || "Món đã ngưng",
                          quantity: 0,
                          price: it.unit_price || it.menu_item?.price || 0
                        };
                      }
                      groupedItems[itId].quantity += it.quantity;
                    });
                  });

                  return Object.values(groupedItems).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="size-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors italic">
                          {it.quantity}
                        </div>
                        <p className="font-bold text-slate-800 leading-tight">{it.name}</p>
                      </div>
                      <p className="font-black text-slate-900 tracking-tighter">{(it.quantity * it.price).toLocaleString()}đ</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="flex items-end justify-between px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tổng cộng thanh toán</p>
                <p className="text-5xl font-black text-emerald-600 tracking-tighter leading-none">
                  {checkoutModal.item?.current_total?.toLocaleString()}đ
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="size-14 rounded-2xl border-slate-100 shadow-sm hover:bg-slate-50"
                onClick={() => window.print()}
              >
                <Printer className="size-6 text-slate-400" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                className="h-16 rounded-[28px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95 uppercase tracking-tighter"
                onClick={() => handleCheckout(checkoutModal.item!.id)}
                disabled={saving}
              >
                {saving ? "ĐANG XỬ LÝ..." : "XÁC NHẬN"}
              </Button>
              <AlertDialogCancel className="h-16 rounded-[28px] border-none bg-slate-100 hover:bg-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest m-0" disabled={saving}>Hủy bỏ</AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>

        {/* PRINTABLE BILL - ONLY VISIBLE DURING PRINTING */}
        <div id="printable-bill" className="hidden print:block font-mono text-black">
          <div className="text-center space-y-2 mb-10">
            <h1 className="text-3xl font-bold uppercase">@{tenantSlug} RESTAURANT</h1>
            <p className="text-sm">HÓA ĐƠN THANH TOÁN</p>
            <div className="border-t-2 border-black border-dashed my-4" />
            <div className="flex justify-between text-xs">
              <span>BÀN: #{checkoutModal.item?.number}</span>
              <span>NGÀY: {new Date().toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>THỜI GIAN: {new Date().toLocaleTimeString("vi-VN")}</span>
              <span>NHÂN VIÊN: ADMIN</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-6 text-[10px] font-bold border-b border-black pb-2">
              <span className="col-span-3 italic">Món ăn</span>
              <span className="text-center italic">SL</span>
              <span className="col-span-2 text-right italic">Thành tiền</span>
            </div>
            {(() => {
              const currentSessionId = checkoutModal.item?.session_id;
              const tableOrders = orders.filter(o =>
                o.table_id === checkoutModal.item?.id &&
                o.session_id === currentSessionId &&
                ["pending", "preparing", "completed", "paid"].includes(o.status)
              );
              const groupedItems: Record<string, { name: string, quantity: number, price: number }> = {};

              tableOrders.forEach(order => {
                order.order_items.forEach((it: any) => {
                  const itId = it.menu_item_id;
                  if (!groupedItems[itId]) {
                    groupedItems[itId] = {
                      name: it.menu_item?.name || "Món đã ngưng",
                      quantity: 0,
                      price: it.unit_price || it.menu_item?.price || 0
                    };
                  }
                  groupedItems[itId].quantity += it.quantity;
                });
              });

              return Object.values(groupedItems).map((it, idx) => (
                <div key={idx} className="grid grid-cols-6 text-[11px]">
                  <span className="col-span-3 font-bold">{it.name}</span>
                  <span className="text-center">{it.quantity}</span>
                  <span className="col-span-2 text-right">{(it.quantity * it.price).toLocaleString()}đ</span>
                </div>
              ));
            })()}
          </div>

          <div className="border-t-2 border-black border-dashed my-8" />
          <div className="flex justify-between items-baseline mb-10">
            <span className="text-xl font-bold">TỔNG CỘNG:</span>
            <span className="text-4xl font-bold tracking-tighter">
              {checkoutModal.item?.current_total?.toLocaleString()} VNĐ
            </span>
          </div>

          <div className="text-center italic text-xs space-y-1">
            <p>Cảm ơn quý khách và hẹn gặp lại!</p>
            <p>Vui lòng kiểm tra kỹ hóa đơn trước khi thanh toán.</p>
          </div>
        </div>
      </AlertDialog>
    </div>
  );
}
