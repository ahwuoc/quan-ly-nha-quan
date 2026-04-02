"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { menuApi, categoriesApi } from "@/lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ICONS, type Category, type MenuItem, type CategoryRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import MenuItemModal from "./_components/MenuItemModal";
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

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function MenuPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<{ open: boolean; item?: MenuItem }>({ open: false });

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  const fetchData = useCallback(async function () {
    setLoading(true);
    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        menuApi.getMenuItems(tenantSlug),
        categoriesApi.getCategories(tenantSlug),
      ]);

      const itemsData = itemsResult.payload;
      const categoriesData = categoriesResult.payload;

      setCategories(Array.isArray(categoriesData) ? (categoriesData as any[]).map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        imageUrl: c.image_url,
        sortOrder: c.sort_order
      })) : []);

      if (Array.isArray(itemsData)) {
        setItems(itemsData.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          category: item.category_id,
          categoryId: item.category_id,
          description: item.description,
          available: item.available,
          image: item.image_url,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function fetchItems() {
    fetchData();
  }

  async function handleSave(item: MenuItem) {
    if (saving) return;
    setSaving(true);
    try {
      const isNew = item.id.startsWith("m") || item.id.startsWith("temp-");
      const payload = {
        category_id: item.category || item.categoryId,
        name: item.name,
        price: item.price,
        description: item.description,
        available: item.available,
        image_url: item.image,
      };

      if (isNew) {
        await menuApi.createMenuItem(tenantSlug, payload);
      } else {
        await menuApi.updateMenuItem(tenantSlug, {
          id: item.id,
          ...payload,
        });
      }

      await fetchData();
      setModal({ open: false });
    } catch (error) {
      console.error("Failed to save item:", error);
      alert("Lỗi khi lưu món");
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      await menuApi.deleteMenuItem(tenantSlug, deleteTarget.id);
      await fetchData();
      setDeleteTarget(null);
      setConfirmDeleteText("");
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Lỗi khi xóa món");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(id: string) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      await menuApi.toggleAvailability(tenantSlug, id, !item.available);
      await fetchData();
    } catch (error) {
      console.error("Failed to toggle availability:", error);
      alert("Lỗi khi cập nhật trạng thái");
    }
  }

  const filtered = items
    .filter((i) => filterCat === "all" || (i.category || i.categoryId) === filterCat)
    .filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <UtensilsCrossed className="size-4 md:size-5" />
            <h1 className="text-lg md:text-2xl font-bold tracking-tight">Quản lý thực đơn</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Chỉnh sửa món ăn, giá cả và trạng thái hiển thị trên thực đơn điện tử.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchItems}
            disabled={loading}
            className="rounded-full bg-white shadow-sm size-9 md:size-10"
          >
            <RefreshCw className={cn("size-3 md:size-4 text-slate-500", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setModal({ open: true })} className="rounded-xl md:rounded-2xl h-9 md:h-11 px-4 md:px-6 shadow-lg shadow-primary/25 font-bold text-xs md:text-sm">
            <Plus className="size-3 md:size-4 mr-1.5 md:mr-2" />
            <span className="hidden sm:inline">Thêm món mới</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border-primary/5 shadow-sm space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-3 md:size-4 text-slate-300" />
            <Input
              placeholder="Tìm món ngon của bạn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 md:pl-11 h-10 md:h-12 bg-slate-50 border-none shadow-none rounded-xl md:rounded-2xl font-medium text-sm"
            />
          </div>
          <div className="flex gap-4 md:gap-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="size-1.5 md:size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{items.filter(i => i.available).length} Đang bán</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="size-1.5 md:size-2 rounded-full bg-orange-500" />
              <span>{items.filter(i => !i.available).length} Tạm ngưng</span>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-100" />

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-hide">
          <Button
            variant={filterCat === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilterCat("all")}
            className="rounded-xl h-9 md:h-10 px-4 md:px-5 font-bold transition-all text-xs whitespace-nowrap flex-shrink-0"
          >
            ⚡ Tất cả món
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={filterCat === cat.id ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterCat(cat.id)}
              className="rounded-xl h-9 md:h-10 px-4 md:px-5 font-bold whitespace-nowrap text-xs flex-shrink-0"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 rounded-[1.5rem] md:rounded-[2.5rem] bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {filtered.map((item) => (
            <Card key={item.id} className={cn(
              "group relative overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl border-primary/5 bg-white",
              !item.available && "opacity-75 grayscale-[0.8]"
            )}>
              <div className="aspect-[4/3] bg-slate-50 relative flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="bg-primary/5 size-full flex items-center justify-center">
                    <UtensilsCrossed className="size-16 text-primary/10" />
                  </div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
                    <Badge variant="secondary" className="px-3 md:px-5 py-1.5 md:py-2 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest bg-white text-slate-900">Hết món</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="space-y-1.5 px-1">
                  <div className="flex items-center justify-between gap-3 md:gap-4">
                    <CardTitle className="text-base md:text-xl font-black text-slate-800 truncate">{item.name}</CardTitle>
                    <span className="text-sm md:text-lg font-black text-primary whitespace-nowrap">
                      {(item.price || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <p className="text-xs md:text-sm font-medium text-slate-400 line-clamp-1 h-4 md:h-5">{item.description || "Hương vị tuyệt hảo từ bếp trưởng..."}</p>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="rounded-xl px-2 md:px-3 py-0.5 md:py-1 bg-slate-50 border-none text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {categories.find(c => c.id === (item.category || item.categoryId))?.name as string || "Khác"}
                  </Badge>

                  <div className="flex gap-1.5 md:gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8 md:size-10 rounded-xl bg-slate-50 border-none text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                      onClick={() => setModal({ open: true, item })}
                    >
                      <Pencil className="size-3 md:size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8 md:size-10 rounded-xl bg-slate-50 border-none text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="size-3 md:size-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant={item.available ? "outline" : "default"}
                  size="sm"
                  className={cn(
                    "w-full h-10 md:h-12 rounded-xl md:rounded-2xl font-bold transition-all border-2 text-xs md:text-sm",
                    item.available
                      ? "border-slate-100 text-slate-600 hover:border-primary/20 hover:text-primary"
                      : "bg-slate-900 text-white"
                  )}
                  onClick={() => toggleAvailable(item.id)}
                >
                  {item.available ? "Tạm ngưng phục vụ" : "Mở bán lại ngay"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
          <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 shadow-sm">
            <UtensilsCrossed className="size-12 text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-800">Thực đơn còn trống</h3>
          <p className="text-slate-400 font-medium max-w-[320px] text-center mt-2 leading-relaxed">
            Bạn chưa có món ăn nào. Hãy bắt đầu xây dựng menu tâm đắc của mình.
          </p>
          <Button variant="default" className="mt-8 h-14 px-8 rounded-2xl font-black shadow-xl shadow-primary/20" onClick={() => { setSearchTerm(""); setModal({ open: true }) }}>
            TẠO MÓN ĂN ĐẦU TIÊN
          </Button>
        </div>
      )}

      {modal.open && (
        <MenuItemModal
          item={modal.item}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
          tenantSlug={tenantSlug}
          categories={categories}
          saving={saving}
        />
      )}

      {/* SECURE DELETE MENU ITEM */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmDeleteText("");
          }
        }}
      >
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl max-w-md p-8">
          <AlertDialogHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-50 size-20 rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-50">
                <Trash2 className="size-10 text-red-500" />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <AlertDialogTitle className="text-3xl font-black text-slate-900">Gỡ bỏ món ăn?</AlertDialogTitle>
              <AlertDialogDescription className="text-base font-medium text-slate-500">
                Bạn sắp gỡ món <span className="text-red-600 font-bold underline">&ldquo;{deleteTarget?.name}&rdquo;</span> khỏi hệ thống. Thao tác này không thể hoàn tác.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="mt-8 space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác thực hệ thống</label>
              <p className="text-sm text-slate-600 ml-1">Vui lòng nhập <span className="font-black text-slate-900">&ldquo;{deleteTarget?.name}&rdquo;</span> để xóa:</p>
              <Input
                placeholder="Nhập tên món ăn..."
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="bg-white border-2 border-slate-200 focus-visible:ring-red-500 focus-visible:border-red-500 text-center font-bold h-14 rounded-2xl"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <AlertDialogAction
              onClick={executeDelete}
              disabled={confirmDeleteText !== deleteTarget?.name || saving}
              className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black shadow-xl shadow-red-100 transition-all disabled:opacity-20"
            >
              {saving ? "ĐANG GỠ BỎ..." : "XÁC NHẬN GỠ BỎ"}
            </AlertDialogAction>
            <AlertDialogCancel className="h-14 rounded-2xl border-none bg-transparent hover:bg-slate-100 font-bold text-slate-500 transition-all">
              Hủy và quay lại
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
