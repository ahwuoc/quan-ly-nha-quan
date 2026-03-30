import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🍺</div>
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Quản Lý Quán</h1>
        <p className="text-amber-700 mb-8">Hệ thống quản lý quán nhậu, quán nước</p>
        <Link
          href="/admin"
          className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
        >
          Vào trang Admin →
        </Link>
      </div>
    </div>
  );
}
