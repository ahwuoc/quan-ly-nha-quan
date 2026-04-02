"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Banknote, CreditCard, Printer, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Table } from "@/lib/api";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table;
  groupedItems: any[];
  onDeleteItem: (id: string) => void;
  paymentMethod: "cash" | "transfer";
  onPaymentMethodChange: (method: "cash" | "transfer") => void;
  onPrintBill: () => void;
  onConfirm: () => void;
  saving: boolean;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  table,
  groupedItems,
  onDeleteItem,
  paymentMethod,
  onPaymentMethodChange,
  onPrintBill,
  onConfirm,
  saving
}: CheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[3rem] p-0 overflow-hidden border-none shadow-4xl animate-in fade-in zoom-in-95 duration-500 bg-white">
        <div className="bg-slate-900 p-12 text-white relative">
          <div className="absolute top-0 right-0 size-64 bg-emerald-500/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="flex justify-between items-end relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Checkout Process</p>
              <DialogTitle className="text-4xl font-black italic tracking-tight uppercase">Xác nhận thanh toán</DialogTitle>
              <DialogDescription className="text-slate-400 font-bold">
                Bàn Số {table.number} • {new Date().toLocaleTimeString("vi-VN")}
              </DialogDescription>
            </div>
            <div className="text-right border-l border-white/10 pl-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mã phiên</p>
              <p className="font-mono text-xs font-bold text-slate-300">{table.session_id?.slice(0, 12)}</p>
            </div>
          </div>
        </div>

        <div className="p-12 space-y-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Kiểm tra món cuối cùng</h4>
              <Badge variant="outline" className="rounded-lg border-slate-100 text-slate-400 font-bold px-3">
                {groupedItems.length} món
              </Badge>
            </div>
            <div className="rounded-[2rem] border border-slate-50 bg-slate-50/30 overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-4 space-y-2">
                {groupedItems.map((it) => (
                  <div key={it.id} className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100/50 group transition-all hover:scale-[1.01]">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 rounded-xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 -ml-2"
                        onClick={() => onDeleteItem(it.id)}
                      >
                        <X size={16} />
                      </Button>
                      <div className="space-y-0.5">
                        <p className="font-black text-slate-800">{it.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{it.price.toLocaleString()}đ / món</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="font-black text-slate-400 italic text-lg pr-4 border-r border-slate-100">x{it.quantity}</span>
                      <span className="font-black text-slate-900 text-xl min-w-[100px] text-right">{(it.quantity * it.price).toLocaleString()}đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Phương thức chi trả</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onPaymentMethodChange('cash')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 h-28 rounded-3xl transition-all duration-500 border-2",
                    paymentMethod === 'cash'
                      ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 scale-105"
                      : "bg-white border-slate-50 text-slate-400 hover:bg-slate-50 hover:border-slate-100"
                  )}
                >
                  <Banknote className={cn("size-6", paymentMethod === 'cash' ? "text-emerald-400" : "text-slate-200")} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Tiền mặt</span>
                </button>
                <button
                  onClick={() => onPaymentMethodChange('transfer')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 h-28 rounded-3xl transition-all duration-500 border-2",
                    paymentMethod === 'transfer'
                      ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 scale-105"
                      : "bg-white border-slate-50 text-slate-400 hover:bg-slate-50 hover:border-slate-100"
                  )}
                >
                  <CreditCard className={cn("size-6", paymentMethod === 'transfer' ? "text-emerald-400" : "text-slate-200")} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Chuyển khoản</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="bg-emerald-600 p-10 rounded-[2.5rem] shadow-3xl shadow-emerald-100 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2 relative z-10">Số tiền cần thu</p>
                <p className="text-5xl font-black italic tracking-tighter relative z-10">
                  {(table.current_total || 0).toLocaleString("vi-VN")}<span className="text-xl ml-1 not-italic opacity-40">đ</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Button
            variant="outline"
            className="rounded-2xl h-14 border-slate-200 font-bold px-8 hover:bg-white bg-white/50 text-slate-500 transition-all hover:text-slate-900"
            onClick={onPrintBill}
          >
            <Printer className="size-5 mr-3 opacity-40" /> XUẤT HÓA ĐƠN
          </Button>
          <div className="flex gap-4 w-full sm:w-auto">
            <Button
              variant="ghost"
              className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600"
              onClick={() => onOpenChange(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              className="rounded-2xl h-14 px-12 font-black bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-300 transition-all text-lg uppercase tracking-tighter flex-1 sm:flex-none"
              onClick={onConfirm}
              disabled={saving}
            >
              {saving ? <RefreshCw className="size-5 animate-spin" /> : "XÁC NHẬN THANH TOÁN"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
