"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { tenantsApi, type TenantSettings } from "@/lib/api/tenants";
import {
   CreditCard,
   Save,
   Building2,
   User,
   Hash,
   QrCode,
   Info,
   RefreshCw,
   Wallet,
   ShieldCheck,
   CheckCircle2,
   Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BankingPage() {
   const params = useParams();
   const tenantSlug = params.tenantSlug as string;
   const [data, setData] = useState<TenantSettings | null>(null);
   const [banks, setBanks] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   const fetchSettings = useCallback(async function () {
      try {
         const result = await tenantsApi.getSettings(tenantSlug);
         const sanitized = {
            ...result.payload,
            bank_name: result.payload.bank_name || "",
            bank_account_number: result.payload.bank_account_number || "",
            bank_account_name: result.payload.bank_account_name || "",
            bank_qr_enabled: !!result.payload.bank_qr_enabled
         };
         setData(sanitized);
      } catch (error) {
         console.error(error);
         toast.error("Không thể tải thông tin ngân hàng");
      } finally {
         setLoading(false);
      }
   }, [tenantSlug]);

   useEffect(() => {
      fetchSettings();
      // Fetch bank list from sepay
      fetch("https://qr.sepay.vn/banks.json")
         .then(res => res.json())
         .then(json => {
            if (json.data) setBanks(json.data);
         })
         .catch(err => console.error("Failed to fetch banks:", err));
   }, [fetchSettings]);

   async function handleSave() {
      if (!data) return;
      setSaving(true);
      try {
         await tenantsApi.updateSettings(tenantSlug, {
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            bank_account_name: data.bank_account_name,
            bank_qr_enabled: data.bank_qr_enabled,
         });
         toast.success("Thông tin ngân hàng đã được cập nhật!");
      } catch (error) {
         toast.error("Lỗi khi lưu thông tin!");
      } finally {
         setSaving(false);
      }
   }

   if (loading || !data) {
      return (
         <div className="p-8 animate-pulse space-y-6 max-w-4xl mx-auto">
            <div className="h-10 bg-muted/50 w-64 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
               <div className="h-48 bg-muted/30 rounded-[40px]" />
               <div className="space-y-4">
                  <div className="h-14 bg-muted/30 rounded-2xl" />
                  <div className="h-14 bg-muted/30 rounded-2xl" />
                  <div className="h-14 bg-muted/30 rounded-2xl" />
               </div>
            </div>
         </div>
      );
   }

   const selectedBank = banks.find(b => b.code === data.bank_name);

   return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4 md:space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
               <div className="bg-emerald-500/10 p-3 rounded-2xl shadow-inner">
                  <Wallet className="size-8 text-emerald-600" />
               </div>
               <div>
                  <h1 className="text-xl md:text-3xl font-black tracking-tight uppercase italic text-slate-900 leading-none">Tài khoản nhận tiền</h1>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Cấu hình thông tin thanh toán cho khách hàng</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Card Preview Section */}
            <div className="lg:col-span-5 space-y-6 sticky top-24">
               <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group border border-white/5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32 transition-all duration-1000 group-hover:scale-125" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-32 -mb-32" />

                  <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
                     <div className="flex justify-between items-start">
                        <div className="size-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                           <Building2 className="text-white size-8" />
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Ngân hàng</p>
                           <p className="text-lg font-black text-white italic tracking-tight leading-tight">
                              {selectedBank?.short_name || data.bank_name || "CHƯA CHỌN"}
                           </p>
                           <p className="text-[9px] font-bold text-white/50">{selectedBank?.name.substring(0, 30)}...</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Số tài khoản</p>
                           <p className="text-xl md:text-2xl font-black text-white font-mono tracking-widest leading-none">
                              {data.bank_account_number || "•••• •••• ••••"}
                           </p>
                        </div>
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Chủ tài khoản</p>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{data.bank_account_name || "Tên của bạn"}</p>
                           </div>
                           <div className="size-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                              <ShieldCheck className="text-emerald-400 size-6" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                           <QrCode className="size-5 text-primary" />
                        </div>
                        <div>
                           <p className="text-sm font-black text-slate-800">Thanh toán QR</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Hiển thị mã QR khi khách thanh toán</p>
                        </div>
                     </div>
                     <Switch
                        checked={data.bank_qr_enabled}
                        onCheckedChange={(val) => setData({ ...data, bank_qr_enabled: val })}
                        className="scale-110 data-[state=checked]:bg-primary"
                     />
                  </div>

                  {data.bank_qr_enabled && data.bank_account_number && data.bank_name && (
                     <div className="pt-4 border-t border-slate-50 flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-center">Bản xem trước mã QR</p>
                        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl">
                           <img
                              src={`https://qr.sepay.vn/img?acc=${data.bank_account_number}&bank=${data.bank_name}&amount=10000&des=KHACH%20TEST`}
                              alt="QR Preview"
                              className="w-48 h-48 object-contain"
                           />
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 text-center leading-relaxed">
                           Mã này sẽ hiển thị cho khách kèm số tiền thật.<br />
                           <span className="text-primary font-bold">Thanh khoản 24/7 qua VietQR.</span>
                        </p>
                     </div>
                  )}
               </div>
            </div>

            {/* Form Section */}
            <div className="lg:col-span-7">
               <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                     <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Chi tiết tài khoản</CardTitle>
                     <CardDescription className="text-xs font-bold text-slate-400 uppercase">Vui lòng chọn ngân hàng và nhập STK</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                     <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 flex items-center gap-2">
                              <Building2 size={12} /> Chọn ngân hàng
                           </label>

                           <Select
                              value={data.bank_name}
                              onValueChange={(val) => setData({ ...data, bank_name: val })}
                           >
                              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg focus:ring-primary/20">
                                 <SelectValue placeholder="Bấm để chọn ngân hàng" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl p-2 max-h-[300px]">
                                 {banks.map((bank) => (
                                    <SelectItem
                                       key={bank.bin}
                                       value={bank.code}
                                       className="rounded-xl py-3 font-bold text-slate-700 focus:bg-primary focus:text-white"
                                    >
                                       <div className="flex items-center gap-2">
                                          <span className="text-primary group-focus:text-white">{bank.code}</span>
                                          <span className="opacity-50 text-[10px]">- {bank.short_name}</span>
                                       </div>
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 flex items-center gap-2">
                              <Hash size={12} /> Số tài khoản
                           </label>
                           <Input
                              placeholder="Nhập số tài khoản của bạn"
                              className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg focus-visible:ring-primary/20 font-mono"
                              value={data.bank_account_number || ""}
                              onChange={(e) => setData({ ...data, bank_account_number: e.target.value })}
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 flex items-center gap-2">
                              <User size={12} /> Tên chủ tài khoản
                           </label>
                           <Input
                              placeholder="Viết hoa không dấu (VD: NGUYEN VAN A)"
                              className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg focus-visible:ring-primary/20 uppercase"
                              value={data.bank_account_name || ""}
                              onChange={(e) => setData({ ...data, bank_account_name: e.target.value })}
                           />
                        </div>
                     </div>

                     <Separator className="my-8 bg-slate-100" />

                     <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                        <div className="flex gap-4">
                           <div className="size-10 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                              <Info size={20} />
                           </div>
                           <div className="space-y-1">
                              <p className="text-sm font-black text-blue-900 uppercase italic">Kết nối VietQR</p>
                              <p className="text-xs font-medium text-blue-800/80 leading-relaxed">
                                 Danh sách ngân hàng được đồng bộ từ hệ thống SePay. Vui lòng chọn đúng ngân hàng để QR Code hoạt động chuẩn xác nhất.
                              </p>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>

         <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-5xl px-8 pointer-events-none z-50">
            <Button
               className="w-full h-16 rounded-[28px] bg-primary hover:bg-primary/90 text-white font-black shadow-2xl shadow-primary/30 text-lg tracking-tight pointer-events-auto transition-transform active:scale-95 flex items-center justify-center gap-3"
               onClick={handleSave}
               disabled={saving}
            >
               {saving ? (
                  <RefreshCw className="size-6 animate-spin" />
               ) : (
                  <>
                     <Save className="size-6" /> LƯU THÔNG TIN THANH TOÁN
                  </>
               )}
            </Button>
         </div>
      </div>
   );
}
