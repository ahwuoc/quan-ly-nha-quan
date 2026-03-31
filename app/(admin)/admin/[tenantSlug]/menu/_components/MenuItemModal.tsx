"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ICONS, type Category, type MenuItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

import ImageUpload from "@/components/ImageUpload";

interface Props {
  item?: MenuItem;
  onSave: (item: MenuItem) => void;
  onClose: () => void;
  tenantSlug: string;
  categories: any[];
}

export default function MenuItemModal({ item, onSave, onClose, tenantSlug, categories }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    price: item?.price ?? 0,
    category: item?.category ?? (categories[0]?.id || "khac"),
    description: item?.description ?? "",
    available: item?.available ?? true,
    image_url: item?.image ?? (item as any)?.image_url ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      id: item?.id ?? `m${Date.now()}`,
    } as any);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Sửa món" : "Thêm món mới"}</DialogTitle>
          <DialogDescription>
            {item ? "Cập nhật thông tin món ăn trên thực đơn." : "Tạo món ăn mới và gán vào một danh mục cụ thể."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Hình ảnh món ăn</Label>
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              folder={`${tenantSlug}/menu`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Tên món</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Gà nướng muối ớt"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Giá (VNĐ)</Label>
            <Input
              id="price"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              placeholder="120000"
              min={0}
              step={1000}
              required
            />
            {form.price > 0 && (
              <p className="text-xs text-muted-foreground">{form.price.toLocaleString("vi-VN")}đ</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Danh mục</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${form.category === cat.id
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <span className="size-5 flex items-center justify-center grayscale group-hover:grayscale-0">
                    {cat.icon}
                  </span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desc">Mô tả</Label>
            <Input
              id="desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về món..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="available"
              checked={form.available}
              onCheckedChange={(v) => setForm({ ...form, available: !!v })}
            />
            <Label htmlFor="available">Còn hàng (hiển thị cho khách)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit">{item ? "Lưu thay đổi" : "Thêm món"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
