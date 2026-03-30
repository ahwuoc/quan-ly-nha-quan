export type Category = "do-nhau" | "bia" | "nuoc-ngot" | "khac";

export const CATEGORY_LABELS: Record<Category, string> = {
  "do-nhau": "Đồ nhậu",
  bia: "Bia",
  "nuoc-ngot": "Nước ngọt",
  khac: "Khác",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  "do-nhau": "🍖",
  bia: "🍺",
  "nuoc-ngot": "🥤",
  khac: "🍴",
};

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  image?: string;
  description?: string;
  available: boolean;
}

export interface Table {
  id: string;       // e.g. "b5-xyz-123"
  number: number;   // e.g. 5
  qrCode: string;   // URL encoded in QR
  seats: number;
  status: "available" | "occupied";
}
