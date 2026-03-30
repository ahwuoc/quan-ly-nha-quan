"use client";

import { useState } from "react";
import { mockTables } from "@/lib/mock-data";
import type { Table } from "@/lib/types";
import QRModal from "./_components/QRModal";
import AddTableModal from "./_components/AddTableModal";

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>(mockTables);
  const [qrModal, setQrModal] = useState<Table | null>(null);
  const [addModal, setAddModal] = useState(false);

  function handleAddTable(count: number, seatsPerTable: number) {
    const maxNum = tables.reduce((m, t) => Math.max(m, t.number), 0);
    const newTables: Table[] = Array.from({ length: count }, (_, i) => {
      const num = maxNum + i + 1;
      const rand = Math.random().toString(36).slice(2, 9);
      const id = `b${num}-${rand}`;
      return {
        id,
        number: num,
        qrCode: `${window.location.origin}/table/${id}`,
        seats: seatsPerTable,
        status: "available",
      };
    });
    setTables((prev) => [...prev, ...newTables]);
    setAddModal(false);
  }

  function handleDelete(id: string) {
    if (confirm("Xóa bàn này? QR code sẽ không còn hoạt động.")) {
      setTables((prev) => prev.filter((t) => t.id !== id));
    }
  }

  const available = tables.filter((t) => t.status === "available").length;
  const occupied = tables.filter((t) => t.status === "occupied").length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sơ đồ bàn</h2>
          <p className="text-gray-500 text-sm mt-1">
            {tables.length} bàn ·{" "}
            <span className="text-green-600">{available} trống</span> ·{" "}
            <span className="text-red-500">{occupied} có khách</span>
          </p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
        >
          + Thêm bàn
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span> Trống</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span> Có khách</span>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-xl border-2 shadow-sm p-4 flex flex-col items-center gap-2 ${table.status === "occupied" ? "border-red-200" : "border-green-200"}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${table.status === "occupied" ? "bg-red-400" : "bg-green-400"}`}>
              {table.number}
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-800 text-sm">Bàn {table.number}</div>
              <div className="text-xs text-gray-400">{table.seats} chỗ</div>
            </div>
            <div className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded text-center w-full truncate" title={table.id}>
              {table.id}
            </div>
            <div className="flex gap-1.5 w-full">
              <button
                onClick={() => setQrModal(table)}
                className="flex-1 text-xs py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                📱 QR
              </button>
              <button
                onClick={() => handleDelete(table.id)}
                className="px-2 text-xs py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🪑</div>
          <p>Chưa có bàn nào. Thêm bàn để bắt đầu.</p>
        </div>
      )}

      {qrModal && <QRModal table={qrModal} onClose={() => setQrModal(null)} />}
      {addModal && <AddTableModal onAdd={handleAddTable} onClose={() => setAddModal(false)} />}
    </div>
  );
}
