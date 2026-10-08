export type PackagingType = 'ORIGINAL' | 'REPACK';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'REPACK_OUT' | 'REPACK_IN';

export type StockStatus = 'AMAN' | 'MENIPIS' | 'HABIS';

export interface Product {
  id: string;
  name: string;
  category: string;
  createdAt: string; // ISO string
  updatedAt: string;
}

export interface ProductPackaging {
  id: string;
  productId: string;
  productCode: string; // SKU (normalized case-insensitively for uniqueness)
  type: PackagingType;
  packageSize: number;
  packageUnit: string;
  stock: number;
  minimumStock: number;
  image?: string; // base64 or data URL
  purchasePrice?: number;
  supplier?: string;
  location?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  packagingId: string;
  productCode: string;
  type: MovementType;
  quantity: number;
  unit: string;
  stockBefore: number;
  stockAfter: number;
  relatedMovementId?: string; // Links REPACK_OUT with REPACK_IN
  note?: string;
  createdAt: string;
}

export const CATEGORIES = [
  'Tepung',
  'Gula',
  'Butter & Margarine',
  'Coklat',
  'Susu',
  'Telur',
  'Bahan Pengembang',
  'Topping',
  'Bahan Lain',
] as const;

export const UNITS = [
  'kg',
  'gram',
  'liter',
  'ml',
  'pcs',
  'pack',
  'box',
  'botol',
  'sachet',
  'karung',
] as const;

export interface BackupData {
  version: string;
  exportedAt: string;
  products: Product[];
  productPackagings: ProductPackaging[];
  stockMovements: StockMovement[];
}
