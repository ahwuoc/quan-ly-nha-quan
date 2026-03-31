"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Armchair,
  Users,
  MapPin,
  RefreshCw,
  Search
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

interface Table {
  id: string;
  number: number;
  qr_code: string;
  seats: number;
  status: "available" | "occupied";
  current_total?: number;
}

export default function TablesPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<{ open: boolean; item?: Table }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; item?: Table }>({ open: false });
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    setBaseUrl(window.location.origin);
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  if (!mounted) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        <div className="h-64 bg-muted/20 rounded-[40px] animate-pulse" />
      </div>
    );
  }

  async function handleCheckout(tableId: string) {
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/tables/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      if (!res.ok) throw new Error("Thanh toán thất bại");
      await fetchTables();
      setCheckoutModal({ open: false });
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Lỗi khi thanh toán. Vui lòng thử lại.");
    }
  }

  async function fetchTables() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/tables`);
      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch tables:", res.status, data);
        setTables([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.error("Invalid response format:", data);
        setTables([]);
        return;
      }

      setTables(data);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(table: Table) {
    try {
      // Corrected logic: only POST if it's a temporary ID
      const isNew = table.id.startsWith("temp-");

      const res = await fetch(`/api/admin/${tenantSlug}/tables`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(table),
      });

      if (!res.ok) throw new Error(`Failed to ${isNew ? "create" : "update"} table`);

      await fetchTables();
      setModal({ open: false });
    } catch (error) {
      console.error("Failed to save table:", error);
      alert("Lỗi khi lưu bàn. Vui lòng thử lại.");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/tables?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete table");
      await fetchTables();
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete table:", error);
      alert("Lỗi khi xóa bàn");
    }
  }

  const filteredTables = tables.filter(t =>
    t.number.toString().includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="size-5" />
            <h1 className="text-2xl font-bold tracking-tight">Sơ đồ nhà hàng</h1>
          </div>
          <p className="text-muted-foreground">
            Quản lý vị trí bàn, số lượng chỗ ngồi và mã QR gọi món cho từng khu vực.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTables}
            disabled={loading}
            className="rounded-full"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setModal({ open: true })} className="rounded-full shadow-lg shadow-primary/25">
            <Plus className="size-4 mr-2" />
            Thêm bàn mới
          </Button>
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo số bàn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-none shadow-none ring-1 ring-border"
          />
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span>{tables.filter(t => t.status === 'available').length} bàn trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-orange-500" />
            <span>{tables.filter(t => t.status === 'occupied').length} có khách</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTables.map((table) => (
            <Card key={table.id} className="group overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-primary/5">
              <CardHeader className="pb-2 flex-row flex items-start justify-between space-y-0">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Table Registry</span>
                  <CardTitle className="text-2xl font-black">BÀN {table.number}</CardTitle>
                </div>
                <div
                  className="size-14 bg-white p-1 rounded-xl border-2 border-dashed border-primary/20 group-hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setModal({ open: true, item: table })}
                >
                  <img
                    src={table.qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(baseUrl + "/table/" + table.id)}`}
                    alt="QR"
                    className="size-full object-contain"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 px-3 bg-muted/40 rounded-xl">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4 text-muted-foreground" />
                    <span>{table.seats} chỗ</span>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full px-2 py-0 border-none text-[10px] font-bold uppercase",
                      table.status === "available"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-orange-500/10 text-orange-600"
                    )}
                  >
                    {table.status === "available" ? "Bàn trống" : "Có khách"}
                  </Badge>
                </div>

                {table.status === "occupied" && (
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between animate-in zoom-in-95 duration-300">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Bill hiện tại</p>
                      <p className="text-lg font-black text-primary tracking-tighter">
                        {table.current_total?.toLocaleString() || 0}<span className="text-xs ml-0.5">đ</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg bg-primary hover:bg-primary/90 text-white font-bold h-9 shadow-lg shadow-primary/20"
                      onClick={() => setCheckoutModal({ open: true, item: table })}
                    >
                      THANH TOÁN
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 rounded-lg h-9 font-bold text-muted-foreground hover:text-foreground"
                    onClick={() => setModal({ open: true, item: table })}
                  >
                    Sửa bàn
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-none"
                    onClick={() => setDeleteId(table.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Armchair className="size-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium">Không có bàn nào</h3>
          <p className="text-muted-foreground text-sm max-w-[300px] text-center mt-1">
            Không tìm thấy bàn nào khớp với tìm kiếm của bạn hoặc nhà hàng chưa thiết lập sơ đồ.
          </p>
          <Button variant="outline" className="mt-6 rounded-full" onClick={() => { setSearchTerm(""); setModal({ open: true }) }}>
            Thiết lập bàn đầu tiên
          </Button>
        </div>
      )}

      {modal.open && (
        <TableModal
          item={modal.item}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bàn?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn bàn này khỏi sơ đồ nhà hàng và không thể hoàn tác. Bạn có chắc chắn không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={checkoutModal.open} onOpenChange={(open) => !open && setCheckoutModal({ open: false })}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="bg-primary/10 size-16 rounded-3xl flex items-center justify-center mb-4 mx-auto">
              <Armchair className="size-8 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-center uppercase tracking-tight">Thanh toán Bàn {checkoutModal.item?.number}</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium pt-2">
              Xác nhận khách đã thanh toán toàn bộ hóa đơn:
              <span className="block text-3xl font-black text-primary mt-3 tracking-tighter">
                {checkoutModal.item?.current_total?.toLocaleString()}đ
              </span>
              Hệ thống sẽ hoàn tất các đơn hàng và chuyển trạng thái bàn về <span className="text-emerald-600 font-black italic">TRỐNG</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3 mt-6">
            <AlertDialogCancel className="rounded-2xl h-12 px-8 border-none bg-muted hover:bg-muted/80 font-bold transition-all">Quay lại</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 transition-all"
              onClick={() => handleCheckout(checkoutModal.item!.id)}
            >
              XÁC NHẬN THANH TOÁN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
