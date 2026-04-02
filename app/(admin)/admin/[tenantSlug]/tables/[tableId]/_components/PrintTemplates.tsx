"use client";

import { cn } from "@/lib/utils";
import { type Table } from "@/lib/api";

interface PrintTemplatesProps {
  table: Table;
  tenantSlug: string;
  groupedItems: any[];
  printMode: "bill" | "qr";
}

export function PrintTemplates({ table, tenantSlug, groupedItems, printMode }: PrintTemplatesProps) {
  return (
    <>
      {/* Hidden Printable Bill */}
      <div id="printable-bill" className="hidden print:block font-mono text-black p-10">
        <div className="text-center space-y-6 mb-24">
          <h1 className="text-5xl font-bold uppercase tracking-tight">@{tenantSlug.toUpperCase()}</h1>
          <p className="text-xl font-black uppercase tracking-[0.3em]">HÓA ĐƠN GIAO DỊCH</p>
          <div className="border-t-8 border-black border-dashed my-10" />
          <div className="flex justify-between text-lg uppercase font-black">
            <span>BÀN SỐ: {table.number}</span>
            <span>NGÀY: {new Date().toLocaleDateString("vi-VN")}</span>
          </div>
          <div className="flex justify-between text-base opacity-70">
            <span>MÃ SESSION: {table.session_id?.slice(0, 12)}</span>
            <span>XUẤT LÚC: {new Date().toLocaleTimeString("vi-VN")}</span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-6 text-lg font-black border-b-4 border-black pb-6 uppercase tracking-widest">
            <span className="col-span-3">DIỄN GIẢI</span>
            <span className="text-center">SL</span>
            <span className="col-span-2 text-right">TỔNG</span>
          </div>
          {groupedItems.map((it, idx) => (
            <div key={idx} className="grid grid-cols-6 text-2xl font-bold py-2">
              <span className="col-span-3">{it.name}</span>
              <span className="text-center italic">{it.quantity}</span>
              <span className="col-span-2 text-right">{(it.quantity * it.price).toLocaleString()}đ</span>
            </div>
          ))}
        </div>

        <div className="border-t-8 border-black border-dashed my-24" />
        <div className="flex flex-col items-center gap-10">
          <div className="flex justify-between items-baseline w-full">
            <span className="text-4xl font-black uppercase">TỔNG THANH TOÁN:</span>
            <span className="text-8xl font-black tracking-tighter">
              {table.current_total?.toLocaleString()}
            </span>
          </div>
          <p className="text-4xl font-black">VNĐ</p>
        </div>

        <div className="text-center mt-48 space-y-6 border-t-2 border-black pt-20">
          <p className="text-2xl font-black uppercase italic tracking-widest">Cảm ơn và hẹn gặp lại!</p>
        </div>
      </div>

      {/* Hidden Printable QR Code */}
      <div id="printable-qr" className={cn("hidden p-10 items-center justify-center flex-col text-center", printMode === "qr" && "print:flex")}>
        <div className="space-y-8 mb-12">
          <h1 className="text-6xl font-black italic tracking-tighter text-slate-900 italic">BÀN SỐ {table.number}</h1>
          <p className="text-xl font-bold text-slate-400 uppercase tracking-[0.4em]">QUÉT MÃ ĐỂ ĐẶT MÓN</p>
          <div className="border-t-4 border-slate-100 w-32 mx-auto" />
        </div>
        <div className="p-10 bg-white border-2 border-slate-100 rounded-[4rem]">
          <img
            src={table.qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${window.location.origin}/${tenantSlug}/table/${table.id}`)}`}
            alt="QR Code"
            className="size-[600px] object-contain"
          />
        </div>
        <div className="mt-16 space-y-4">
          <p className="text-2xl font-black italic">@{tenantSlug.toUpperCase()}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; height: 0; overflow: hidden; padding: 0; margin: 0; }
          #printable-bill, #printable-bill *, #printable-qr, #printable-qr * { visibility: visible; height: auto; overflow: visible; }
          
          #printable-bill { 
            display: ${printMode === 'bill' ? 'block' : 'none'} !important; 
            position: absolute; left: 0; top: 0; width: 100%; 
            padding: 40px !important;
          }
          #printable-qr { 
            display: ${printMode === 'qr' ? 'flex' : 'none'} !important; 
            position: absolute; left: 0; top: 0; width: 100%; height: 100vh;
            flex-direction: column; align-items: center; justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
