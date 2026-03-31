export type CategoryId = "do-nhau" | "bia" | "nuoc-ngot" | "khac";

/** @deprecated Use CategoryId */
export type Category = CategoryId;

export interface CategoryRecord {
  id: CategoryId;
  name: string;
  icon: string;
  imageUrl?: string;
  sortOrder: number;
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  "do-nhau": "Đồ nhậu",
  bia: "Bia",
  "nuoc-ngot": "Nước ngọt",
  khac: "Khác",
};

export const CATEGORY_ICONS: Record<CategoryId, string> = {
  "do-nhau": "🍖",
  bia: "🍺",
  "nuoc-ngot": "🥤",
  khac: "🍴",
};

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: CategoryId;
  /** @deprecated Use categoryId */
  category?: CategoryId;
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
