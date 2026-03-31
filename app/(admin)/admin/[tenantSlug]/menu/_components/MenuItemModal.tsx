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
  saving?: boolean;
}

export default function MenuItemModal({ item, onSave, onClose, tenantSlug, categories, saving }: Props) {
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
    if (!form.name.trim() || saving) return;
    onSave({
      ...form,
      id: item?.id ?? `m${Date.now()}`,
    } as any);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-8 pb-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {item ? "Cài đặt món ăn" : "Tạo món mới"}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 italic mt-1">
              {item
                ? `Cập nhật thông tin chi tiết và giá bán cho món ${item.name}.`
                : "Thiết lập một món ăn mới với hình ảnh hấp dẫn để thực khách đặt hàng."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Ảnh món ăn</Label>
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              folder={`${tenantSlug}/menu`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tên món</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Hải sản nướng"
              className="h-12 rounded-xl border-slate-200 focus-visible:ring-primary font-bold"
              required
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Giá bán (VNĐ)</Label>
            <Input
              id="price"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              placeholder="120000"
              className="h-12 rounded-xl border-slate-200 font-bold"
              min={0}
              step={1000}
              required
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Phân loại danh mục</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  type="button"
                  disabled={saving}
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${form.category === cat.id
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desc" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Giới thiệu món</Label>
            <Input
              id="desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Nguyên liệu sạch, công thức bí truyền..."
              className="h-12 rounded-xl border-slate-200 font-medium"
              disabled={saving}
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
            <Checkbox
              id="available"
              checked={form.available}
              onCheckedChange={(v) => setForm({ ...form, available: !!v })}
              disabled={saving}
            />
            <Label htmlFor="available" className="text-sm font-bold text-slate-600">Hiển thị món ăn ngay (Đang bán)</Label>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 mt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl font-bold">Hủy bỏ</Button>
            <Button type="submit" disabled={saving} className="rounded-xl h-12 font-black shadow-lg shadow-primary/20">
              {saving ? "ĐANG XỬ LÝ..." : (item ? "LƯU THAY ĐỔI" : "TẠO MÓN NGAY")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
