"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Settings } from "lucide-react";
import { type MenuItem } from "@/lib/api";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  filteredMenuItems: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  saving: boolean;
}

export function AddItemDialog({
  open,
  onOpenChange,
  searchTerm,
  onSearchChange,
  filteredMenuItems,
  onAddItem,
  saving
}: AddItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
        <DialogHeader className="bg-slate-900 p-8 text-white">
          <DialogTitle className="text-2xl font-black italic">THÊM MÓN VÀO BÀN</DialogTitle>
          <DialogDescription className="text-slate-500 font-bold">Tìm kiếm và chọn món ăn để thêm vào phiên phục vụ hiện tại.</DialogDescription>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              placeholder="Tìm kiếm món ăn..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-white/10 border-none text-white font-bold placeholder:text-slate-600 focus-visible:ring-primary/20"
            />
          </div>
        </DialogHeader>
        <div className="p-6 max-h-[400px] overflow-y-auto space-y-4 bg-slate-50">
          {filteredMenuItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="size-16 bg-slate-50 rounded-xl overflow-hidden shadow-inner">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-slate-200"><Settings /></div>
                  )}
                </div>
                <div>
                  <p className="font-black text-slate-800">{item.name}</p>
                  <p className="text-primary font-black text-sm">{item.price.toLocaleString()}đ</p>
                </div>
              </div>
              <Button
                size="icon"
                className="rounded-xl size-12 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-none"
                onClick={() => onAddItem(item)}
                disabled={saving}
              >
                <Plus className="size-5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
