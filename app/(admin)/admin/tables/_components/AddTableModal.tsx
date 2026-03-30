"use client";

import { useState } from "react";

interface Props {
  onAdd: (count: number, seats: number) => void;
  onClose: () => void;
}

export default function AddTableModal({ onAdd, onClose }: Props) {
  const [count, setCount] = useState(1);
  const [seats, setSeats] = useState(4);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Thêm bàn mới</h3>
          <p className="text-sm text-gray-500 mt-1">Hệ thống sẽ tự tạo ID và QR code cho mỗi bàn</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng bàn cần thêm</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCount(Math.max(1, count - 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
              >−</button>
              <span className="text-xl font-bold text-gray-800 w-8 text-center">{count}</span>
              <button
                onClick={() => setCount(Math.min(20, count + 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
              >+</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Số chỗ ngồi mỗi bàn</label>
            <div className="flex gap-2">
              {[2, 4, 6, 8, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setSeats(n)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${seats === n ? "border-amber-500 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
            Sẽ thêm <strong>{count} bàn</strong>, mỗi bàn <strong>{seats} chỗ</strong>.
            Mỗi bàn sẽ có 1 QR code riêng.
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => onAdd(count, seats)}
              className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Tạo {count} bàn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
