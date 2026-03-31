"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, FolderOpen, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CategoryModal from "./_components/CategoryModal";

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
  const [modal, setModal] = useState<{ open: boolean; item?: Category }>({ open: false });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [tenantSlug]);

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/categories`);
      const data = await res.json();

      console.log("Fetch categories response:", res.status, data);

      if (!res.ok) {
        console.error("Failed to fetch categories:", res.status, data);
        setCategories([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.error("Invalid response format:", data);
        setCategories([]);
        return;
      }

      console.log("Setting categories:", data);
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(category: Category) {
    try {
      if (category.id.startsWith("c")) {
        const res = await fetch(`/api/admin/${tenantSlug}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(category),
        });
        const data = await res.json();
        console.log("POST response:", res.status, data);
        if (!res.ok) throw new Error(data.error || "Failed to create category");
      } else {
        const res = await fetch(`/api/admin/${tenantSlug}/categories`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(category),
        });
        const data = await res.json();
        console.log("PUT response:", res.status, data);
        if (!res.ok) throw new Error(data.error || "Failed to update category");
      }
      await fetchCategories();
      setModal({ open: false });
      alert("Lưu thành công!");
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Lỗi khi lưu danh mục: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa danh mục này?")) return;
    try {
      const res = await fetch(`/api/admin/${tenantSlug}/categories?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
      await fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Lỗi khi xóa danh mục");
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

    const draggedIndex = categories.findIndex((c) => c.id === draggedId);
    const targetIndex = categories.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newCategories = [...categories];
    [newCategories[draggedIndex], newCategories[targetIndex]] = [
      newCategories[targetIndex],
      newCategories[draggedIndex],
    ];

    // Update sort_order based on new positions
    const updated = newCategories.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));

    setCategories(updated);
    setDraggedId(null);

    // Save all sort_order changes
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

  const maxSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) : 0;

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Danh mục</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} danh mục</p>
        </div>
        <Button size="sm" onClick={() => setModal({ open: true })}>
          <Plus data-icon="inline-start" />
          Thêm danh mục
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card
            key={cat.id}
            draggable
            onDragStart={(e) => handleDragStart(e, cat.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, cat.id)}
            className={`cursor-move transition-opacity ${draggedId === cat.id ? "opacity-50" : ""}`}
          >
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="size-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/100x100?text=${encodeURIComponent(cat.name)}`;
                        }}
                      />
                    ) : (
                      <span className="text-3xl">{cat.icon}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setModal({ open: true, item: cat })}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-2">
          <FolderOpen className="size-8 opacity-40" />
          <p className="text-sm">Chưa có danh mục nào</p>
        </div>
      )}

      {modal.open && (
        <CategoryModal
          item={modal.item}
          maxSortOrder={maxSortOrder}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
          tenantSlug={tenantSlug}
        />
      )}
    </div>
  );
}
