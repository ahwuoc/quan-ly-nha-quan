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

interface Table {
  id: string;
  number: number;
  qr_code: string;
  seats: number;
  status: "available" | "occupied";
}

interface Props {
  item?: Table;
  onSave: (table: Table) => void;
  onClose: () => void;
}

function generateQRCode(slug: string, tableId: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const tableUrl = `${baseUrl}/${slug}/table/${tableId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
}

export default function TableModal({ item, onSave, onClose }: Props) {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const tableId = item?.id ?? `temp-${Date.now()}`;
  const [form, setForm] = useState({
    number: item?.number ?? 1,
    qr_code: item?.qr_code ?? generateQRCode(tenantSlug, tableId),
    seats: item?.seats ?? 4,
    status: item?.status ?? ("available" as const),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number) return;
    onSave({
      ...form,
      id: tableId,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 gap-0">
        <div className="bg-primary/5 p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Armchair className="size-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">
                {item ? "Chỉnh sửa bàn" : "Thêm bàn mới"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {item
                ? `Cập nhật thông tin chi tiết cho bàn số ${item.number}.`
                : "Tạo một bàn mới với mã QR tự động để khách hàng gọi món."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="number" className="flex items-center gap-2 text-muted-foreground">
                <Hash className="size-3.5" />
                Số bàn
              </Label>
              <Input
                id="number"
                type="number"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
                className="font-medium"
                placeholder="Ví dụ: 1"
                min={1}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="seats" className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-3.5" />
                Số chỗ ngồi
              </Label>
              <Input
                id="seats"
                type="number"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
                className="font-medium"
                placeholder="Ví dụ: 4"
                min={1}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status" className="flex items-center gap-2 text-muted-foreground">
              <Activity className="size-3.5" />
              Trạng thái hiện tại
            </Label>
            <Select
              value={form.status}
              onValueChange={(val: any) => setForm({ ...form, status: val })}
            >
              <SelectTrigger id="status" className="w-full font-medium">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span>Đang trống</span>
                  </div>
                </SelectItem>
                <SelectItem value="occupied">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-orange-500" />
                    <span>Có khách</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-col items-center gap-3 p-4 bg-muted/40 rounded-xl border border-dashed">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <QrCode className="size-3.5" />
              Mã QR Gọi Món
            </div>
            <div className="relative group grayscale hover:grayscale-0 transition-all duration-300">
              <div className="absolute -inset-2 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={form.qr_code}
                alt="Table QR Code"
                className="relative size-32 bg-white p-2 rounded-lg shadow-sm border"
              />
            </div>

            <div className="w-full space-y-2 px-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                <span>Đường dẫn gọi món</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-primary hover:underline cursor-pointer bg-none border-none p-0"
                    onClick={() => {
                      const fullUrl = `${window.location.origin}/${tenantSlug}/table/${tableId}`;
                      navigator.clipboard.writeText(fullUrl);
                      alert("Đã sao chép link!");
                    }}
                  >
                    Sao chép
                  </button>
                  <span className="text-muted-foreground/30">•</span>
                  <button
                    type="button"
                    className="text-primary hover:underline cursor-pointer bg-none border-none p-0 flex items-center gap-1"
                    onClick={() => {
                      const printWindow = window.open('', '_blank', 'width=600,height=800');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>In mã QR Bàn ${form.number}</title>
                              <style>
                                body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                                .container { border: 2px solid #eee; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; }
                                .logo { font-size: 24px; font-weight: 900; margin-bottom: 20px; text-transform: uppercase; letter-spacing: -1px; }
                                .qr-code { width: 300px; height: 300px; margin: 20px 0; }
                                .table-label { font-size: 48px; font-weight: 900; color: #000; margin: 10px 0; }
                                .instruction { color: #666; font-size: 14px; margin-top: 20px; text-transform: uppercase; font-weight: bold; }
                              </style>
                            </head>
                            <body>
                              <div class="container">
                                <div class="logo">@${tenantSlug}</div>
                                <div class="instruction">Scan QR to order</div>
                                <img src="${form.qr_code}" class="qr-code" />
                                <div class="table-label">BÀN ${form.number}</div>
                                <div style="margin-top: 30px; font-size: 10px; opacity: 0.3;">Power by Kiro</div>
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
                    In mã QR
                  </button>
                </div>
              </div>
              <a
                href={`${typeof window !== "undefined" ? window.location.origin : ""}/${tenantSlug}/table/${tableId}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between bg-background border rounded-xl p-3 text-[11px] font-mono break-all text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 ring-1 ring-primary/5"
              >
                <span className="truncate max-w-[240px]">
                  {typeof window !== "undefined" ? window.location.origin : ""}/{tenantSlug}/table/{tableId}
                </span>
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Activity className="size-3.5" />
                </div>
              </a>
            </div>

            <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
              Khách hàng quét mã trên hoặc truy cập đường dẫn này để xem thực đơn.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Hủy bỏ
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
              {item ? (
                <>
                  <Check className="size-4 mr-2" />
                  Lưu thay đổi
                </>
              ) : (
                <>
                  Thêm bàn ngay
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
