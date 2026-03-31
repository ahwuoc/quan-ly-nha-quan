"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";

interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  image_url?: string;
}

interface Props {
  item?: Category;
  maxSortOrder?: number;
  onSave: (category: Category) => void;
  onClose: () => void;
  tenantSlug: string;
}

export default function CategoryModal({ item, maxSortOrder = 0, onSave, onClose, tenantSlug }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    icon: item?.icon ?? "📁",
    image_url: item?.image_url ?? "",
    sort_order: item?.sort_order !== undefined && !isNaN(item.sort_order) ? item.sort_order : (maxSortOrder + 1),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      id: item?.id ?? `c${Date.now()}`,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Sửa danh mục" : "Thêm danh mục mới"}</DialogTitle>
          <DialogDescription>
            {item ? "Cập nhật tên, icon và hình ảnh hiển thị cho nhóm thực đơn này." : "Tạo và phân loại các món ăn mới cho nhà hàng của bạn."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Hình ảnh danh mục</Label>
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              folder={`${tenantSlug}/categories`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Tên danh mục</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Đồ nhậu"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="icon">Icon (emoji)</Label>
            <Input
              id="icon"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="🍖"
              maxLength={2}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sort_order">Thứ tự</Label>
            <Input
              id="sort_order"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              placeholder="0"
              min={0}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit">{item ? "Lưu thay đổi" : "Thêm danh mục"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
