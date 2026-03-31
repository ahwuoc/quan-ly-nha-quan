"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Armchair, RefreshCw, Printer, Plus, Minus, Trash2, Edit2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  originalQty: number;
}

interface CheckoutModalProps {
  open: boolean;
  table: any;
  orders: any[];
  tenantSlug: string;
  saving: boolean;
  onClose: () => void;
  onCheckout: (tableId: string, adjustments: any[], finalItems: BillItem[]) => Promise<void>;
}

export default function CheckoutModal({
  open,
  table,
  orders,
  tenantSlug,
  saving,
  onClose,
  onCheckout
}: CheckoutModalProps) {
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [adjustments, setAdjustments] = useState<Array<{ item: string; reason: string; change: number }>>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  useEffect(() => {
    if (open && table) {
      loadBillItems();
    }
  }, [open, table, orders]);

  function loadBillItems() {
    const currentSessionId = table?.session_id;
    const tableOrders = orders.filter(o => 
      o.table_id === table?.id && 
      ["pending", "preparing", "completed"].includes(o.status) &&
      o.session_id === currentSessionId
    );
    const groupedItems: Record<string, { name: string, quantity: number, price: number }> = {};

    tableOrders.forEach(order => {
      order.order_items.forEach((it: any) => {
        const itId = it.menu_item_id;
        if (!groupedItems[itId]) {
          groupedItems[itId] = {
            name: it.menu_item?.name || "Món đã ngưng",
            quantity: 0,
            price: it.unit_price || it.menu_item?.price || 0
          };
        }
        groupedItems[itId].quantity += it.quantity;
      });
    });

    const items = Object.entries(groupedItems).map(([id, it]) => ({
      id,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      originalQty: it.quantity
    }));

    setBillItems(items);
    setAdjustments([]);
    setAdjustmentReason("");
  }

  function updateQuantity(itemId: string, newQty: number) {
    if (newQty < 0) return;
    
    setBillItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const change = newQty - item.originalQty;
        if (change !== 0 && adjustmentReason.trim()) {
          setAdjustments(prevAdj => [
            ...prevAdj.filter(a => a.item !== item.name),
            { item: item.name, reason: adjustmentReason, change }
          ]);
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }

  function removeItem(itemId: string) {
    const item = billItems.find(i => i.id === itemId);
    if (item && adjustmentReason.trim()) {
      setAdjustments(prev => [
        ...prev.filter(a => a.item !== item.name),
        { item: item.name, reason: adjustmentReason, change: -item.originalQty }
      ]);
    }
    setBillItems(prev => prev.filter(i => i.id !== itemId));
  }

  const finalTotal = billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const hasChanges = billItems.some(item => item.quantity !== item.originalQty) || 
                     billItems.length !== Object.keys(billItems).length;

  return (
    <>
      <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && !saving && onClose()}>
        <AlertDialogContent className={cn(
          "rounded-[3rem] border-none shadow-3xl p-0 max-w-3xl bg-white overflow-hidden no-print max-h-[90vh] overflow-y-auto",
          saving && "opacity-80 pointer-events-none"
        )}>
          <div className="sr-only">
            <AlertDialogTitle>Hóa đơn thanh toán bàn {table?.number}</AlertDialogTitle>
            <AlertDialogDescription>Chi tiết các món ăn và tổng tiền cần thanh toán</AlertDialogDescription>
          </div>

          <div className="bg-emerald-600 p-10 text-white relative overflow-hidden sticky top-0 z-10">
            <div className="absolute top-0 right-0 size-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Hóa đơn Bàn {table?.number}</h2>
                <p className="text-white/70 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <Edit2 size={12} /> Có thể chỉnh sửa trước khi thanh toán
                </p>
              </div>
              <div className="size-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-xl">
                <Armchair size={32} />
              </div>
            </div>
          </div>

          <div className="p-10 space-y-6">
            {/* Adjustment Reason Input */}
            {hasChanges && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-black text-amber-800 uppercase tracking-widest">
                  Lý do điều chỉnh (bắt buộc khi thay đổi)
                </label>
                <Textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="VD: Khách trả lại món, món bị hỏng, giảm giá..."
                  className="bg-white border-none rounded-xl resize-none h-20"
                />
              </div>
            )}

            {/* Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">
                <span>Món ăn</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
                <span>Thao tác</span>
              </div>
              <div className="space-y-3">
                {billItems.map((item) => (
                  <div key={item.id} className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    item.quantity !== item.originalQty ? "bg-amber-50 border border-amber-200" : "bg-slate-50"
                  )}>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      {item.quantity !== item.originalQty && (
                        <p className="text-xs text-amber-600 font-medium mt-1">
                          Đã thay đổi từ {item.originalQty} → {item.quantity}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white rounded-xl p-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity === 0}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="w-8 text-center font-black">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-500"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      <span className="w-32 text-right font-black text-slate-900">
                        {(item.quantity * item.price).toLocaleString()}đ
                      </span>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adjustments History */}
            {adjustments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Lịch sử điều chỉnh</p>
                {adjustments.map((adj, idx) => (
                  <div key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                    <span className="font-black">•</span>
                    <div>
                      <span className="font-bold">{adj.item}</span>: {adj.reason} 
                      <span className={cn("ml-2 font-black", adj.change > 0 ? "text-emerald-600" : "text-red-600")}>
                        ({adj.change > 0 ? "+" : ""}{adj.change})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex items-end justify-between px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tổng cộng thanh toán</p>
                <p className="text-5xl font-black text-emerald-600 tracking-tighter leading-none">
                  {finalTotal.toLocaleString()}đ
                </p>
                {finalTotal !== table?.current_total && (
                  <p className="text-sm text-amber-600 font-bold mt-1">
                    (Gốc: {table?.current_total?.toLocaleString()}đ)
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="size-14 rounded-2xl border-slate-100 shadow-sm hover:bg-slate-50"
                onClick={() => window.print()}
              >
                <Printer className="size-6 text-slate-400" />
              </Button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                className="h-16 rounded-[28px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95 uppercase"
                onClick={() => onCheckout(table!.id, adjustments, billItems)}
                disabled={saving || (hasChanges && !adjustmentReason.trim())}
              >
                {saving ? "ĐANG XỬ LÝ..." : "XÁC NHẬN"}
              </Button>
              <AlertDialogCancel className="h-16 rounded-[28px] border-none bg-slate-100 hover:bg-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest m-0" disabled={saving}>
                Hủy bỏ
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
