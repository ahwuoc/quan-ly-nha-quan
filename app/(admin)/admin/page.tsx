import Link from "next/link";

const stats = [
  { label: "Tổng món", value: "24", icon: "🍽️", href: "/admin/menu" },
  { label: "Số bàn", value: "12", icon: "🪑", href: "/admin/tables" },
  { label: "Danh mục", value: "3", icon: "📂", href: "/admin/menu" },
  { label: "QR đã tạo", value: "12", icon: "📱", href: "/admin/tables" },
];

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Tổng quan</h2>
      <p className="text-gray-500 mb-8">Chào mừng đến trang quản lý quán</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Truy cập nhanh</h3>
          <div className="space-y-3">
            <Link href="/admin/menu" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
              <span className="text-xl">🍽️</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Quản lý thực đơn</div>
                <div className="text-xs text-gray-500">Thêm, sửa, xóa món ăn và đồ uống</div>
              </div>
            </Link>
            <Link href="/admin/tables" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
              <span className="text-xl">🪑</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Quản lý sơ đồ bàn</div>
                <div className="text-xs text-gray-500">Khai báo bàn và tạo QR code</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Hướng dẫn nhanh</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span className="text-amber-600 font-bold">1.</span> Tạo danh mục và món trong Thực đơn</li>
            <li className="flex gap-2"><span className="text-amber-600 font-bold">2.</span> Khai báo số bàn trong Sơ đồ bàn</li>
            <li className="flex gap-2"><span className="text-amber-600 font-bold">3.</span> In QR code dán lên từng bàn</li>
            <li className="flex gap-2"><span className="text-amber-600 font-bold">4.</span> Khách quét QR để xem menu và gọi món</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
