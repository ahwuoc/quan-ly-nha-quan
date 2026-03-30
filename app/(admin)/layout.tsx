import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: "📊" },
  { href: "/admin/menu", label: "Thực đơn", icon: "🍽️" },
  { href: "/admin/tables", label: "Sơ đồ bàn", icon: "🪑" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-amber-900 text-white flex flex-col">
        <div className="p-5 border-b border-amber-800">
          <div className="text-2xl mb-1">🍺</div>
          <h1 className="font-bold text-lg leading-tight">Quản Lý Quán</h1>
          <p className="text-amber-300 text-xs mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-amber-100 hover:bg-amber-800 transition-colors text-sm font-medium"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-amber-800 text-xs text-amber-400">
          v1.0 · Giai đoạn 1
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
