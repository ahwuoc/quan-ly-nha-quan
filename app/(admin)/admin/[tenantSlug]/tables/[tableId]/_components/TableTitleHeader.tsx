"use client";

import { ChevronLeft, RefreshCw, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type Table } from "@/lib/api";
import { useRouter } from "next/navigation";

interface TableTitleHeaderProps {
  table: Table;
  tenantSlug: string;
  loading: boolean;
  onRefresh: () => void;
  onCheckout: () => void;
  saving: boolean;
}

export function TableTitleHeader({ table, tenantSlug, loading, onRefresh, onCheckout, saving }: TableTitleHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4">
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          className="size-14 rounded-3xl hover:bg-white hover:shadow-lg transition-all active:scale-95"
          onClick={() => router.push(`/admin/${tenantSlug}/tables`)}
        >
          <ChevronLeft className="size-8" />
        </Button>
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">Bàn Số {table.number}</h1>
            <Badge className={cn(
              "rounded-2xl px-6 py-2 font-black text-xs uppercase shadow-none ring-1",
              table.status === "occupied"
                ? "bg-emerald-500 hover:bg-emerald-500 text-white ring-emerald-600/10"
                : "bg-slate-100 text-slate-400 ring-slate-200"
            )}>
              {table.status === "occupied" ? "CÓ KHÁCH" : "BÀN TRỐNG"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-slate-300" /> Identifier: {table.id.slice(0, 8)}
            </p>
            <Separator orientation="vertical" className="h-4" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-slate-300" /> Seats: {table.seats}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="rounded-3xl h-14 w-14 bg-white border-transparent hover:bg-white shadow-xl shadow-slate-200/50"
        >
          <RefreshCw className={cn("size-6 text-slate-400", loading && "animate-spin")} />
        </Button>
        {table.status === "occupied" && (
          <Button
            className="rounded-3xl h-14 px-10 font-black bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-200 transition-all uppercase tracking-tighter"
            onClick={onCheckout}
            disabled={saving}
          >
            <Receipt className="size-5 mr-3" /> THANH TOÁN & TRẢ BÀN
          </Button>
        )}
      </div>
    </div>
  );
}
