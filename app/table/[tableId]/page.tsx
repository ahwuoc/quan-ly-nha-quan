export default async function TablePage({ params }: PageProps<"/table/[tableId]">) {
  const { tableId } = await params;

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🍺</div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Chào mừng!</h1>
        <p className="text-amber-700 mb-4">Bàn: <span className="font-mono font-semibold">{tableId}</span></p>
        <p className="text-gray-500 text-sm">Tính năng gọi món sẽ có ở Giai đoạn 2.</p>
      </div>
    </div>
  );
}
