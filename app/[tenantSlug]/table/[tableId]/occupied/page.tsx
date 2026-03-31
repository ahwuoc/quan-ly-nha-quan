"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import { XCircle, RefreshCw, Info, ArrowRight, BellRing, UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TableOccupied() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const tableId = params.tableId as string;

  const [isChecking, setIsChecking] = useState(false);
  const [staffCalled, setStaffCalled] = useState(false);
  const [callingStaff, setCallingStaff] = useState(false);

  const supabase = getSupabaseClient();

  const callStaff = async () => {
    setCallingStaff(true);
    try {
      await fetch(`/api/tenants/${tenantSlug}/tables/${tableId}/payment-request`, { method: "POST" });
      setStaffCalled(true);
    } catch {
    } finally {
      setCallingStaff(false);
    }
  };

  const checkAndRedirect = async () => {
    setIsChecking(true);
    try {
      const { data } = (await supabase
        .from("tables")
        .select("*")
        .eq("id", tableId)
        .single()) as { data: any };

      if (data?.status === "available") {
        router.push(`/${tenantSlug}/table/${tableId}`);
      }
    } catch (err) {
      console.error("Check error:", err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!tableId || !tenantSlug) return;
    checkAndRedirect();
    const channel = supabase
      .channel(`table-monitor-${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
          filter: `id=eq.${tableId}`,
        },
        (payload: any) => {
          if (payload.new.status === "available") {
            router.push(`/${tenantSlug}/table/${tableId}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, tenantSlug]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-[48px] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
          <div className="relative bg-white shadow-2xl rounded-[40px] overflow-hidden border border-slate-100">
            <div className="pt-12 pb-8 px-8 text-center space-y-6">
              <div className="relative mx-auto size-24">
                <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping" />
                <div className="relative size-24 bg-red-50 rounded-full flex items-center justify-center shadow-inner">
                  <XCircle className="size-12 text-red-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className="bg-red-50 text-red-600 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  Trạng thái: Đang bận
                </Badge>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  Bàn chưa được <br /> giải phóng
                </h1>
                <p className="text-sm text-slate-500 font-medium px-4">
                  Hệ thống nhận thấy bàn này hiện đang được sử dụng hoặc chưa thanh toán xong.
                </p>
              </div>

              <div className="bg-slate-50 rounded-[32px] p-6 text-left space-y-4 border border-slate-100">
                <div className="flex gap-4">
                  <div className="size-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 text-xs font-black">1</div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Nếu bàn thực sự đang trống, hãy nhấn <span className="font-bold text-slate-900 uppercase">TÔI LÀ KHÁCH MỚI</span> để vào menu ngay.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="size-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 text-xs font-black">2</div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Hoặc nhấn nút <span className="font-bold text-slate-900 uppercase">GỌI NHÂN VIÊN</span> để được hỗ trợ kiểm tra trạng thái.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={checkAndRedirect}
                  className="h-16 rounded-[24px] bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl transition-all active:scale-95 text-lg"
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <RefreshCw className="size-5 animate-spin mr-2" />
                  ) : (
                    <UserCheck className="size-5 mr-3" />
                  )}
                  TÔI LÀ KHÁCH MỚI
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "h-14 rounded-[20px] border-slate-100 font-bold transition-all",
                    staffCalled ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={callStaff}
                  disabled={callingStaff || staffCalled}
                >
                  {staffCalled ? (
                    <><CheckCircle2 className="size-4 mr-2" /> Đã gửi — nhân viên sẽ đến ngay</>
                  ) : callingStaff ? (
                    <><RefreshCw className="size-4 mr-2 animate-spin" /> Đang gửi...</>
                  ) : (
                    <><BellRing className="size-4 mr-2" /> GỌI NHÂN VIÊN</>
                  )}
                </Button>
              </div>

              <button
                onClick={() => router.push("/")}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                Về trang chủ <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
