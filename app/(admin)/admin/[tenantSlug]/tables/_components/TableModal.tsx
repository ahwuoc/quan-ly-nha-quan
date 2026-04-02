"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QrCode,
  Users,
  Hash,
  Activity,
  Check,
  X,
  Armchair
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { type Table } from "@/lib/api/tables";

interface Props {
  item?: Table;
  onSave: (table: Table) => void;
  onClose: () => void;
  tenantSlug: string;
  saving?: boolean;
}

function generateQRCode(slug: string, tableId: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const tableUrl = `${baseUrl}/${slug}/table/${tableId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
}

export default function TableModal({ item, onSave, onClose, tenantSlug, saving }: Props) {
  const tableId = item?.id ?? `temp-${Date.now()}`;
  const [form, setForm] = useState({
    number: item?.number ?? 1,
    qr_code: item?.qr_code ?? generateQRCode(tenantSlug, tableId),
    seats: item?.seats ?? 4,
    status: item?.status ?? ("available" as const),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number || saving) return;
    onSave({
      ...item,
      ...form,
      id: tableId,
    } as any);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 gap-0 border-none rounded-[2.5rem] shadow-2xl">
        <div className="bg-primary/5 p-8 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 p-2.5 rounded-2xl">
                <Armchair className="size-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {item ? "Cài đặt bàn ăn" : "Thiết lập bàn mới"}
              </DialogTitle>
            </div>
            <DialogDescription className="font-medium text-slate-500">
              {item
                ? `Thay đổi số chỗ ngồi hoặc quản lý mã QR cho Bàn số ${item.number}.`
                : "Tạo một vị trí ngồi mới với mã QR tự động để thực khách gọi món."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="number" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                Số bàn định danh
              </Label>
              <Input
                id="number"
                type="number"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
                className="h-12 rounded-xl border-slate-200 font-black text-xl text-center focus-visible:ring-primary shadow-sm"
                placeholder="VD: 1"
                min={1}
                required
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="seats" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                Số lượng chỗ ngồi
              </Label>
              <Input
                id="seats"
                type="number"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
                className="h-12 rounded-xl border-slate-200 font-bold text-center"
                placeholder="VD: 4"
                min={1}
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
              Trạng thái khả dụng
            </Label>
            <Select
              value={form.status}
              onValueChange={(val: any) => setForm({ ...form, status: val })}
              disabled={saving}
            >
              <SelectTrigger id="status" className="h-12 rounded-xl border-slate-200 font-bold">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 font-bold">
                <SelectItem value="available">
                  <div className="flex items-center gap-2 py-1">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span>Đang trống (Sẵn sàng)</span>
                  </div>
                </SelectItem>
                <SelectItem value="occupied">
                  <div className="flex items-center gap-2 py-1">
                    <div className="size-2 rounded-full bg-orange-500 animate-pulse" />
                    <span> Đang có khách</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-slate-100" />

          <div className="flex flex-col items-center gap-4 p-6 bg-slate-50/80 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              <QrCode className="size-4" />
              Giao diện gọi món kỹ thuật số
            </div>
            <div className="relative group grayscale hover:grayscale-0 transition-all duration-500">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              <img
                src={form.qr_code}
                alt="Table QR Code"
                className="relative size-36 bg-white p-4 rounded-3xl shadow-xl border border-slate-100 group-hover:scale-105 transition-transform"
              />
            </div>

            <div className="w-full space-y-3 px-2">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">
                <span>Cổng đặt hàng online</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-primary hover:text-primary/70 transition-colors"
                    onClick={() => {
                      const fullUrl = `${window.location.origin}/${tenantSlug}/table/${tableId}`;
                      navigator.clipboard.writeText(fullUrl);
                      alert("Đã sao chép đường dẫn bàn " + form.number);
                    }}
                  >
                    SAO CHÉP
                  </button>
                  <span className="opacity-20">•</span>
                  <button
                    type="button"
                    className="text-primary hover:text-primary/70 transition-colors"
                    onClick={() => {
                        const printWindow = window.open('', '_blank', 'width=600,height=800');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>In mã QR Bàn ${form.number}</title>
                                <style>
                                  body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
                                  .container { padding: 60px; border-radius: 40px; text-align: center; border: 1px solid #f0f0f0; box-shadow: 0 10px 40px rgba(0,0,0,0.02); }
                                  .title { font-weight: 900; font-size: 20px; letter-spacing: 2px; color: #888; text-transform: uppercase; margin-bottom: 30px; }
                                  .qr-img { width: 340px; height: 340px; padding: 20px; border-radius: 40px; background: #fff; border: 2px solid #000; }
                                  .label { font-size: 80px; font-weight: 900; color: #000; margin-top: 20px; letter-spacing: -4px; line-height: 0.8; }
                                  .sub { font-size: 14px; font-weight: bold; color: #aaa; margin-top: 40px; text-transform: uppercase; letter-spacing: 4px; }
                                </style>
                              </head>
                              <body>
                                <div class="container">
                                  <div class="title">BÚN QUẬY KIRO</div>
                                  <img src="${form.qr_code}" class="qr-img" />
                                  <div class="label">BÀN ${form.number}</div>
                                  <div class="sub">Quét mã để đặt món</div>
                                </div>
                                <script>
                                  window.onload = () => {
                                    window.print();
                                    setTimeout(() => window.close(), 500);
                                  };
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                    }}
                  >
                    IN MÃ QR
                  </button>
                </div>
              </div>
              <div className="bg-white border-slate-100 border p-3 rounded-xl text-[10px] font-mono text-slate-400 truncate shadow-sm">
                {typeof window !== "undefined" ? window.location.origin : ""}/{tenantSlug}/table/{tableId}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none font-bold rounded-xl"
            >
              Hủy bỏ
            </Button>
            <Button 
                type="submit" 
                disabled={saving} 
                className="flex-1 sm:flex-none h-14 rounded-xl px-10 font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
            >
              {saving ? "ĐANG XỬ LÝ..." : (item ? "LƯU THAY ĐỔI" : "TẠO BÀN NGAY")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
