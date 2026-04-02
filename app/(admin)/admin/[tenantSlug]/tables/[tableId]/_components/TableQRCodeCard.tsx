"use client";

import { QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Table } from "@/lib/api";

interface TableQRCodeCardProps {
  table: Table;
  tenantSlug: string;
  onPrintQR: () => void;
}

export function TableQRCodeCard({ table, tenantSlug, onPrintQR }: TableQRCodeCardProps) {
  const getOrigin = () => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  };

  const fullUrl = `${getOrigin()}/${tenantSlug}/table/${table.id}`;

  return (
    <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
      <CardHeader className="p-10 pb-0">
        <CardTitle className="text-2xl font-black flex items-center gap-3">
          <QrCode className="size-6 text-primary" /> MÃ QR TRUY CẬP
        </CardTitle>
      </CardHeader>
      <CardContent className="p-10 flex flex-col items-center">
        <div className="p-8 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 mb-8 relative group cursor-pointer overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img
            src={table.qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`}
            alt="QR Code"
            className="size-56 bg-white p-6 rounded-[2rem] shadow-2xl relative z-10 transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="w-full flex flex-col gap-4">
          <Button
            variant="outline"
            className="rounded-2xl h-14 font-black border-slate-100 uppercase tracking-widest text-[10px] hover:bg-slate-50"
            onClick={() => {
              navigator.clipboard.writeText(fullUrl);
              alert("Đã sao chép link");
            }}
          >
            SAO CHÉP LINK GUEST
          </Button>
          <Button
            className="rounded-2xl h-14 font-black bg-slate-900 shadow-xl shadow-slate-300 uppercase tracking-widest text-[10px]"
            onClick={onPrintQR}
          >
            <Printer className="size-4 mr-3" /> PRINT QR CODE
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
