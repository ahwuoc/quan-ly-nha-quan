import { XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TableOccupied({ params }: { params: Promise<{ tenantSlug: string, tableId: string }> }) {
  const { tenantSlug, tableId } = await params;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative mx-auto size-24 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="size-12 text-red-500" />
          <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Bàn này đã có khách</h1>
          <p className="text-gray-500 font-medium">Xin lỗi, hiện tại bàn này đang có người sử dụng. Nếu bạn là khách mới, vui lòng đợi cho đến khi bàn trống hoặc liên hệ nhân viên để được hỗ trợ.</p>
        </div>

        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gợi ý cho bạn</p>
          <ul className="text-sm text-gray-600 text-left space-y-3">
            <li className="flex items-center gap-3">
              <div className="size-2 bg-red-400 rounded-full" />
              Kiểm tra lại số bàn trên mã QR
            </li>
            <li className="flex items-center gap-3">
              <div className="size-2 bg-red-400 rounded-full" />
              Yêu cầu nhân viên đặt lại trạng thái bàn
            </li>
            <li className="flex items-center gap-3">
              <div className="size-2 bg-red-400 rounded-full" />
              Thử tải lại trang nếu bạn vừa mới đến
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20">
            <Link href={`/${tenantSlug}/table/${tableId}`}>
              <RefreshCw className="mr-2 size-5" /> THỬ TẢI LẠI TRANG
            </Link>
          </Button>
          <Button variant="ghost" asChild className="h-12 rounded-2xl text-gray-400 font-bold hover:bg-gray-50">
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
