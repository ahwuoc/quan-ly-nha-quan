"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Table } from "@/lib/api";

interface TableConfigCardProps {
  table: Table;
  onUpdate: (updates: Partial<Table>) => void;
}

export function TableConfigCard({ table, onUpdate }: TableConfigCardProps) {
  return (
    <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
      <CardHeader className="bg-slate-900 text-white p-10 pt-12 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-10 size-40 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl" />
        <CardTitle className="text-2xl font-black italic relative z-10 uppercase">Cấu hình bàn</CardTitle>
        <CardDescription className="text-slate-400 font-bold relative z-10">Thông số kỹ thuật</CardDescription>
      </CardHeader>
      <CardContent className="p-10 -mt-8 bg-white relative z-20 rounded-t-[3rem] space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Số bàn</Label>
            <Input
              type="number"
              value={table.number}
              onChange={(e) => onUpdate({ number: Number(e.target.value) })}
              className="h-16 rounded-2xl border-slate-100 bg-slate-50 font-black text-2xl text-center focus-visible:ring-primary/20 shadow-inner"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Chỗ ngồi</Label>
            <Input
              type="number"
              value={table.seats}
              onChange={(e) => onUpdate({ seats: Number(e.target.value) })}
              className="h-16 rounded-2xl border-slate-100 bg-slate-50 font-black text-2xl text-center focus-visible:ring-primary/20 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Trạng thái bàn</Label>
          <Select
            value={table.status}
            onValueChange={(val: any) => onUpdate({ status: val })}
          >
            <SelectTrigger className="h-16 rounded-2xl border-slate-100 bg-slate-50 font-black text-lg shadow-inner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 p-2">
              <SelectItem value="available" className="rounded-xl font-bold py-3">BÀN TRỐNG (TRẢ BÀN)</SelectItem>
              <SelectItem value="occupied" className="rounded-xl font-bold py-3 text-emerald-600">ĐANG PHỤC VỤ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
