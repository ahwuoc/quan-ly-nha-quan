"use client";

import { useState } from "react";
import { mockMenuItems } from "@/lib/mock-data";
import { CATEGORY_LABELS, CATEGORY_ICONS, type Category, type MenuItem } from "@/lib/types";
import MenuItemModal from "./_components/MenuItemModal";

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>(mockMenuItems);
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [modal, setModal] = useState<{ open: boolean; item?: MenuItem }>({ open: false });

  const filtered = filterCat === "all" ? items : items.filter((i) => i.category === filterCat);

  function handleSave(item: MenuItem) {
    setItems((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.map((i) => (i.id === item.id ? item : i))
        : [...prev, item]
    );
    setModal({ open: false });
  }

  function handleDelete(id: string) {
    if (confirm("Xóa món này?")) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleAvailable(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, available: !i.available } : i)));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Thực đơn</h2>
          <p className="text-gray-500 text-sm mt-1">{items.length} món · {filtered.length} hiển thị</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
        >
          + Thêm món
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterCat === "all" ? "bg-amber-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-amber-400"}`}
        >
          Tất cả ({items.length})
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterCat === cat ? "bg-amber-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-amber-400"}`}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Menu grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${!item.available ? "opacity-60" : ""}`}>
            {/* Image placeholder */}
            <div className="h-32 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-4xl">
              {CATEGORY_ICONS[item.category]}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {item.available ? "Còn" : "Hết"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-amber-700 font-bold">{item.price.toLocaleString("vi-VN")}đ</span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
                </span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => toggleAvailable(item.id)}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {item.available ? "Đánh dấu hết" : "Còn hàng"}
                </button>
                <button
                  onClick={() => setModal({ open: true, item })}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 text-xs py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🍽️</div>
          <p>Chưa có món nào trong danh mục này</p>
        </div>
      )}

      {modal.open && (
        <MenuItemModal
          item={modal.item}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
