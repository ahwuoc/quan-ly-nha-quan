"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, FolderOpen, GripVertical, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import CategoryModal from "./_components/CategoryModal";
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
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  image_url?: string;
}

export default function CategoriesPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; item?: Category }>({ open: false });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // States for secure deletion
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  useEffect(() => {
    fetchCategories();
  }, [tenantSlug]);

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/categories`);
      const data = await res.json();

      if (!res.ok) {
        setCategories([]);
        return;
      }
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(category: Category) {
    if (saving) return;
    setSaving(true);
    try {
      const isNew = category.id.startsWith("c") || category.id.includes("temp");
      const res = await fetch(`/api/admin/${tenantSlug}/categories`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save category");

      await fetchCategories();
      setModal({ open: false });
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Lỗi khi lưu danh mục: " + (error instanceof Error ? error.message : "Sự cố không xác định"));
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/categories?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
      await fetchCategories();
      setDeleteTarget(null);
      setConfirmDeleteText("");
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Lỗi khi xóa danh mục");
    } finally {
      setSaving(false);
    }
  }

  async function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = categories.findIndex((c: Category) => c.id === draggedId);
    const targetIndex = categories.findIndex((c: Category) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newCategories = [...categories];
    [newCategories[draggedIndex], newCategories[targetIndex]] = [
      newCategories[targetIndex],
      newCategories[draggedIndex],
    ];

    const updated = newCategories.map((cat: Category, idx: number) => ({
      ...cat,
      sort_order: idx,
    }));

    setCategories(updated);
    setDraggedId(null);

    try {
      for (const cat of updated) {
        await fetch(`/api/admin/${tenantSlug}/categories`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cat.id, sort_order: cat.sort_order }),
        });
      }
    } catch (error) {
      console.error("Failed to update sort order:", error);
      alert("Lỗi khi cập nhật thứ tự");
      await fetchCategories();
    }
  }

  const maxSortOrder = categories.length > 0 ? Math.max(...categories.map((c: Category) => c.sort_order)) : 0;

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quản lý danh mục</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} nhóm thực đơn đang có</p>
        </div>
        <Button size="sm" className="rounded-xl shadow-lg ring-offset-2 ring-primary/20 hover:ring-2 transition-all" onClick={() => setModal({ open: true })}>
          <Plus className="mr-1 size-4" />
          Thêm danh mục
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-[2rem] bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              draggable
              onDragStart={(e) => handleDragStart(e, cat.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, cat.id)}
              className={cn(
                "group relative border-primary/5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden rounded-[2.5rem] cursor-grab active:cursor-grabbing bg-white",
                draggedId === cat.id && "scale-95 opacity-50 border-primary"
              )}
            >
              <CardContent className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-20 rounded-3xl overflow-hidden bg-slate-50 flex items-center justify-center border-2 border-slate-50 group-hover:border-primary/20 transition-all">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/100x100?text=${encodeURIComponent(cat.name)}`;
                          }}
                        />
                      ) : (
                        <div className="bg-primary/5 size-full flex items-center justify-center">
                          <FolderOpen className="size-8 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 leading-tight">{cat.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sắp xếp: {cat.sort_order}</p>
                    </div>
                  </div>
                  <GripVertical className="size-5 text-slate-300 opacity-40 hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 rounded-2xl h-12 font-bold shadow-sm"
                    onClick={() => setModal({ open: true, item: cat })}
                  >
                    <Pencil className="w-4 h-4 mr-1.5" /> Chỉnh sửa
                  </Button>
                  <Button
                    variant="outline"
                    className="size-12 rounded-2xl text-red-400 hover:text-red-600 hover:bg-red-50 border-none bg-slate-50 group-hover:bg-slate-100 transition-colors"
                    onClick={() => setDeleteTarget(cat)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {categories.length === 0 && !loading && (
        <div className="text-center py-24 bg-muted/20 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center gap-4">
          <div className="bg-white size-16 rounded-full flex items-center justify-center shadow-lg">
            <FolderOpen className="size-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Trống trơn</p>
            <p className="text-sm text-slate-500">Bắt đầu tạo danh mục để tổ chức thực đơn nhà hàng.</p>
          </div>
          <Button variant="outline" className="mt-2 rounded-full" onClick={() => setModal({ open: true })}>
            Tạo danh mục đầu tiên
          </Button>
        </div>
      )}

      {modal.open && (
        <CategoryModal
          item={modal.item}
          maxSortOrder={maxSortOrder}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
          tenantSlug={tenantSlug}
          saving={saving}
        />
      )}

      {/* SECURE DELETE DIALOG */}
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
              <AlertDialogTitle className="text-3xl font-black text-slate-900">Xóa danh mục?</AlertDialogTitle>
              <AlertDialogDescription className="text-base font-medium text-slate-500">
                Mọi món ăn thuộc danh mục <span className="text-red-600 font-bold underline">"{deleteTarget?.name}"</span> sẽ không hiển thị trên thực đơn. Bạn có chắc chắn?
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="mt-8 space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác thực thao tác</label>
              <p className="text-sm text-slate-600 ml-1">Nhập <span className="font-black text-slate-900">"{deleteTarget?.name}"</span> để xác nhận xóa:</p>
              <Input
                placeholder="Nhập tên tại đây..."
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
              {saving ? "ĐANG XÓA..." : "XÁC NHẬN XÓA BỎ"}
            </AlertDialogAction>
            <AlertDialogCancel className="h-14 rounded-2xl border-none bg-transparent hover:bg-slate-50 font-bold text-slate-500 transition-all">
              Hủy bỏ
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
