"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { type Table } from "@/lib/api";

interface SessionItemsCardProps {
  table: Table;
  groupedItems: any[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onDeleteItem: (id: string) => void;
  onOpenAddItems: () => void;
  saving: boolean;
}

export function SessionItemsCard({ table, groupedItems, onUpdateQuantity, onDeleteItem, onOpenAddItems, saving }: SessionItemsCardProps) {
  return (
    <Card className="rounded-[3.5rem] border-none shadow-3xl shadow-slate-900/5 overflow-hidden bg-white">
      <CardHeader className="p-10 md:p-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 border-b border-slate-50 bg-gradient-to-br from-white to-slate-50/30">
        <div className="space-y-2">
          <CardTitle className="text-3xl font-black text-slate-900 italic uppercase">Phiên gọi món</CardTitle>
          <CardDescription className="text-slate-400 font-bold uppercase tracking-widest font-mono text-[10px]">Session: {table.session_id?.slice(0, 8) || 'NONE'}</CardDescription>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 min-w-72 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 size-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2 opacity-80 relative z-10">Tiền hàng tạm tính</p>
          <p className="text-5xl font-black tracking-tighter leading-none relative z-10">
            {(table.current_total || 0).toLocaleString("vi-VN")}<span className="text-xl ml-1">đ</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-10 md:p-14 pt-10">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black italic text-slate-800">DANH SÁCH MÓN PHỤC VỤ</h3>
          <Button
            className="rounded-2xl h-12 px-6 font-black bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            onClick={onOpenAddItems}
          >
            <Plus className="size-5 mr-2" /> THÊM MÓN
          </Button>
        </div>

        {groupedItems.length > 0 ? (
          <div className="space-y-10">
            <div className="grid grid-cols-12 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] px-4 pb-4 border-b border-slate-50">
              <span className="col-span-6">Món ăn / Đơn giá</span>
              <span className="col-span-3 text-center">Số lượng</span>
              <span className="col-span-3 text-right">Thành tiền</span>
            </div>
            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
              {groupedItems.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center px-4 group transition-all duration-500 hover:bg-slate-50 rounded-3xl p-6 -mx-4">
                  <div className="col-span-6 flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteItem(it.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                    <div>
                      <p className="font-black text-slate-800 leading-tight text-xl">{it.name}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">S/Price: {it.price.toLocaleString()}đ</p>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 rounded-xl border-slate-100 shadow-sm text-slate-400 hover:text-primary hover:bg-white"
                        onClick={() => onUpdateQuantity(it.id, it.quantity - 1)}
                        disabled={saving}
                      >
                        <Plus size={14} className="rotate-45" /> {/* Use Minus icon actually but following origin style */}
                        <Minus size={14} />
                      </Button>
                      <span className="font-black italic text-2xl text-slate-900 w-10 text-center">{it.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 rounded-xl border-slate-100 shadow-sm text-slate-400 hover:text-primary hover:bg-white"
                        onClick={() => onUpdateQuantity(it.id, it.quantity + 1)}
                        disabled={saving}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="font-black text-slate-900 text-2xl tracking-tighter">{(it.quantity * it.price).toLocaleString()}đ</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-slate-100 my-4" />

            <div className="bg-emerald-600 p-10 rounded-[3rem] shadow-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 size-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="size-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center backdrop-blur-xl border border-white/10">
                  <CheckCircle2 className="size-10 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-2">Quy trình vận hành</p>
                  <p className="text-2xl font-black italic">PHIÊN PHỤC VỤ SẴN SÀNG</p>
                </div>
              </div>
              {table.payment_requested && (
                <div className="bg-slate-900 text-white font-black px-10 py-5 rounded-[2rem] shadow-2xl animate-pulse text-sm relative z-10 flex items-center gap-3">
                  <CreditCard className="size-5" /> KHÁCH ĐÃ YÊU CẦU THANH TOÁN
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100 shadow-inner">
            <div className="bg-white p-10 rounded-[3rem] mb-6 shadow-2xl shadow-slate-200/50">
              <Clock className="size-16 text-slate-100" />
            </div>
            <h3 className="text-2xl font-black text-slate-300 uppercase tracking-widest italic text-center">Bàn trống - Chưa có món ăn</h3>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
