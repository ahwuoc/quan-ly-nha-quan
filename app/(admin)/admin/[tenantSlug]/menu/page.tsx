"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { CATEGORY_LABELS, CATEGORY_ICONS, type Category, type MenuItem } from "@/lib/types";
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
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<{ open: boolean; item?: MenuItem }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  async function fetchData() {
    setLoading(true);
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch(`/api/admin/${tenantSlug}/menu-items`),
        fetch(`/api/admin/${tenantSlug}/categories`),
      ]);

      const itemsData = await itemsRes.json();
      const categoriesData = await categoriesRes.json();

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      if (Array.isArray(itemsData)) {
        setItems(itemsData.map((item: any) => ({
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
  }

  async function fetchItems() {
    fetchData();
  }

  async function handleSave(item: MenuItem) {
    try {
      const isNew = item.id.startsWith("m") || item.id.startsWith("temp-");
      const res = await fetch(`/api/admin/${tenantSlug}/menu-items`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          price: item.price,
          category_id: item.category || item.categoryId,
          description: item.description,
          available: item.available,
          image_url: (item as any).image_url || item.image,
        }),
      });
      if (!res.ok) throw new Error(`Failed to ${isNew ? "create" : "update"} item`);

      await fetchItems();
      setModal({ open: false });
    } catch (error) {
      console.error("Failed to save item:", error);
      alert("Lỗi khi lưu món");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/menu-items?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      await fetchItems();
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Lỗi khi xóa món");
    }
  }

  async function toggleAvailable(id: string) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/menu-items?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      });
      if (!res.ok) throw new Error("Failed to update item");
      await fetchItems();
    } catch (error) {
      console.error("Failed to toggle availability:", error);
      alert("Lỗi khi cập nhật trạng thái");
    }
  }

  const filtered = items
    .filter((i) => filterCat === "all" || (i.category || i.categoryId) === filterCat)
    .filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <UtensilsCrossed className="size-5" />
            <h1 className="text-2xl font-bold tracking-tight">Quản lý thực đơn</h1>
          </div>
          <p className="text-muted-foreground">
            Chỉnh sửa món ăn, giá cả và trạng thái hiển thị trên thực đơn điện tử.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchItems}
            disabled={loading}
            className="rounded-full"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setModal({ open: true })} className="rounded-full shadow-lg shadow-primary/25">
            <Plus className="size-4 mr-2" />
            Thêm món mới
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-muted/30 p-4 rounded-2xl border space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-none shadow-none ring-1 ring-border"
            />
          </div>
          <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>{items.filter(i => i.available).length} Đang bán</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="size-3.5 text-orange-500" />
              <span>{items.filter(i => !i.available).length} Tạm ngưng</span>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant={filterCat === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilterCat("all")}
            className="rounded-full px-4"
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={filterCat === cat.id ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterCat(cat.id)}
              className="rounded-full px-4 whitespace-nowrap"
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <Card key={item.id} className={cn(
              "group overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl border-primary/5",
              !item.available && "bg-muted/50 grayscale-[0.5]"
            )}>
              <div className="aspect-[16/9] bg-muted relative flex items-center justify-center group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/600x400?text=${encodeURIComponent(item.name)}`;
                    }}
                  />
                ) : (
                  <div className="text-6xl">
                    {CATEGORY_ICONS[item.category || item.categoryId || "khac"]}
                  </div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                    <Badge variant="secondary" className="px-3 py-1 font-bold text-xs uppercase tracking-widest">Tạm hết hàng</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold truncate">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1 h-5">{item.description || "Chưa có mô tả"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-primary">
                    {(item.price || 0).toLocaleString("vi-VN")}
                    <span className="text-xs font-medium ml-0.5">đ</span>
                  </span>
                  <Badge variant="outline" className="rounded-full bg-background/50">
                    {(() => {
                      const cat = categories.find(c => c.id === (item.category || item.categoryId));
                      return cat ? (
                        <>{cat.icon} {cat.name}</>
                      ) : (
                        <>{CATEGORY_ICONS[item.category as Category || "khac"]} {CATEGORY_LABELS[item.category as Category || "khac"]}</>
                      );
                    })()}
                  </Badge>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant={item.available ? "outline" : "secondary"}
                    size="sm"
                    className="flex-1 rounded-lg text-xs"
                    onClick={() => toggleAvailable(item.id)}
                  >
                    {item.available ? "Tạm ngưng" : "Mở bán lại"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9 rounded-lg"
                    onClick={() => setModal({ open: true, item })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteId(item.id)}
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
            <UtensilsCrossed className="size-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium">Chưa có món ăn nào</h3>
          <p className="text-muted-foreground text-sm max-w-[300px] text-center mt-1">
            Bắt đầu xây dựng thực đơn của bạn bằng cách thêm món ăn đầu tiên.
          </p>
          <Button variant="outline" className="mt-6 rounded-full" onClick={() => { setSearchTerm(""); setModal({ open: true }) }}>
            Thêm món ngay
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
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa món ăn?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn món ăn này khỏi thực đơn và không thể hoàn tác. Bạn có chắc chắn không?
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
    </div>
  );
}
