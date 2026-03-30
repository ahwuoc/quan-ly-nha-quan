import type { MenuItem, Table } from "./types";

export const mockMenuItems: MenuItem[] = [
  { id: "m1", name: "Gà nướng muối ớt", price: 120000, category: "do-nhau", available: true, description: "Gà ta nướng than hoa" },
  { id: "m2", name: "Bò lúc lắc", price: 150000, category: "do-nhau", available: true, description: "Bò Mỹ xào tỏi bơ" },
  { id: "m3", name: "Mực chiên giòn", price: 95000, category: "do-nhau", available: true },
  { id: "m4", name: "Đậu phụ chiên", price: 45000, category: "do-nhau", available: true },
  { id: "m5", name: "Lòng heo xào chua ngọt", price: 75000, category: "do-nhau", available: false },
  { id: "m6", name: "Bia Tiger lon", price: 25000, category: "bia", available: true },
  { id: "m7", name: "Bia Heineken chai", price: 30000, category: "bia", available: true },
  { id: "m8", name: "Bia Saigon đỏ", price: 20000, category: "bia", available: true },
  { id: "m9", name: "Bia 333", price: 18000, category: "bia", available: true },
  { id: "m10", name: "Coca Cola lon", price: 15000, category: "nuoc-ngot", available: true },
  { id: "m11", name: "Pepsi lon", price: 15000, category: "nuoc-ngot", available: true },
  { id: "m12", name: "Nước suối", price: 10000, category: "nuoc-ngot", available: true },
];

function genTableId(num: number): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `b${num}-${rand}`;
}

export const mockTables: Table[] = Array.from({ length: 12 }, (_, i) => {
  const num = i + 1;
  const id = `b${num}-${["abc123", "def456", "ghi789", "jkl012", "mno345", "pqr678", "stu901", "vwx234", "yza567", "bcd890", "efg123", "hij456"][i]}`;
  return {
    id,
    number: num,
    qrCode: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/table/${id}`,
    seats: num <= 4 ? 4 : num <= 8 ? 6 : 8,
    status: i % 3 === 0 ? "occupied" : "available",
  };
});
