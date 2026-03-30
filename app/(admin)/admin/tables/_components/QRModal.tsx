"use client";

import { useEffect, useRef } from "react";
import type { Table } from "@/lib/types";

interface Props {
  table: Table;
  onClose: () => void;
}

// Simple QR code using a free API (no npm package needed)
export default function QRModal({ table, onClose }: Props) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(table.qrCode)}`;

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Bàn ${table.number}</title>
      <style>body{font-family:Arial;text-align:center;padding:40px} h2{margin-bottom:8px} p{color:#666;font-size:14px;margin:4px 0}</style>
      </head><body>
      <h2>🍺 Bàn ${table.number}</h2>
      <p>Quét QR để xem menu và gọi món</p>
      <img src="${qrUrl}" style="margin:16px auto;display:block" />
      <p style="font-size:12px;color:#999;margin-top:8px">${table.id}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">QR Code · Bàn {table.number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR code bàn ${table.number}`} width={200} height={200} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Bàn {table.number} · {table.seats} chỗ</p>
            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{table.id}</p>
          </div>
          <div className="w-full bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">URL khách hàng:</p>
            <p className="text-xs text-amber-700 font-mono break-all">{table.qrCode}</p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              🖨️ In QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
