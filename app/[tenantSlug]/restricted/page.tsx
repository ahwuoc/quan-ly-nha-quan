import { ShieldAlert, MapPin, Wifi, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RestrictedPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="relative mx-auto size-24 bg-red-50 rounded-[32px] flex items-center justify-center shadow-xl shadow-red-500/10 border-none">
          <div className="absolute inset-0 bg-red-500/20 rounded-[32px] animate-ping" />
          <ShieldAlert size={48} className="text-red-500 relative z-10" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">TRUY CẬP BỊ CHẶN</h1>
          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
            Hệ thống nhận diện bạn đang không sử dụng mạng Wi-Fi của nhà hàng. Vui lòng kết nối để gọi món.
          </p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center gap-4 text-left">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Wifi size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Bước 1</p>
              <p className="text-xs font-bold">Kết nối Wi-Fi tại quán</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-left">
            <div className="bg-primary/10 p-2 rounded-xl">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Bước 2</p>
              <p className="text-xs font-bold">Bạn phải có mặt tại cửa hàng</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
           <p className="text-[10px] text-muted-foreground font-semibold italic">Nếu bạn là nhân viên, hãy liên hệ quản lý để được cấp quyền.</p>
           <div className="flex flex-col gap-3">
              <Link href="/" className="w-full">
                <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg shadow-black/10">
                  VỀ TRANG CHỦ
                </Button>
              </Link>
              <Button variant="ghost" className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2">
                <PhoneCall size={16} /> GỌI NHÂN VIÊN HỖ TRỢ
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
