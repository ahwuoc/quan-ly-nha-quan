"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ICONS, type Category, type MenuItem } from "@/lib/types";

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

interface Props {
  item?: MenuItem;
  onSave: (item: MenuItem) => void;
  onClose: () => void;
}

export default function MenuItemModal({ item, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<MenuItem, "id">>({
    name: item?.name ?? "",
    price: item?.price ?? 0,
    category: item?.category ?? "do-nhau",
    description: item?.description ?? "",
    available: item?.available ?? true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      id: item?.id ?? `m${Date.now()}`,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">
            {item ? "Sửa món" : "Thêm món mới"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên món *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Gà nướng muối ớt"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ) *</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              placeholder="VD: 120000"
              min={0}
              step={1000}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
            {form.price > 0 && (
              <p className="text-xs text-amber-600 mt-1">{form.price.toLocaleString("vi-VN")}đ</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${form.category === cat ? "border-amber-500 bg-amber-50 text-amber-800 font-medium" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về món..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="w-4 h-4 accent-amber-600"
            />
            <span className="text-sm text-gray-700">Còn hàng (hiển thị cho khách)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              {item ? "Lưu thay đổi" : "Thêm món"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
