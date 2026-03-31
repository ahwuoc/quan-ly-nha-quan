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
  saving?: boolean;
}

export default function CategoryModal({ item, maxSortOrder = 0, onSave, onClose, tenantSlug, saving }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    icon: item?.icon ?? "📁",
    image_url: item?.image_url ?? "",
    sort_order: item?.sort_order !== undefined && !isNaN(item.sort_order) ? item.sort_order : (maxSortOrder + 1),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    onSave({
      ...form,
      id: item?.id ?? `c${Date.now()}`,
    } as Category);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-8 pb-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {item ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              {item
                ? `Cập nhật thông tin và hình ảnh cho nhóm món ${item.name}.`
                : "Tạo một nhóm món mới để dễ dàng quản lý thực đơn của bạn."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 flex flex-col gap-6">
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
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sort_order">Thứ tự hiển thị</Label>
            <Input
              id="sort_order"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              placeholder="0"
              min={0}
              disabled={saving}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Đang xử lý..." : (item ? "Lưu thay đổi" : "Thêm danh mục")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
