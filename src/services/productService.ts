import { db } from '../db/db';
import { Product, ProductPackaging, PackagingType } from '../types';
import { normalizeSKU } from '../utils/skuGenerator';

export const productService = {
  /**
   * Verifies case-insensitive uniqueness of productCode (SKU).
   */
  async isProductCodeAvailable(code: string, excludePackagingId?: string): Promise<boolean> {
    const normalized = normalizeSKU(code);
    if (!normalized) return false;

    const all = await db.productPackagings.toArray();
    const existing = all.find(
      (p) => normalizeSKU(p.productCode) === normalized && p.id !== excludePackagingId
    );
    return !existing;
  },

  /**
   * Finds a packaging by productCode (case-insensitive) or barcode.
   */
  async findPackagingByCodeOrBarcode(query: string): Promise<ProductPackaging | undefined> {
    const normalized = normalizeSKU(query);
    const all = await db.productPackagings.toArray();
    return all.find(
      (p) =>
        normalizeSKU(p.productCode) === normalized ||
        (p.barcode && p.barcode.trim() === query.trim())
    );
  },

  async getAllProducts(): Promise<Product[]> {
    return db.products.orderBy('name').toArray();
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return db.products.get(id);
  },

  async getAllPackagings(): Promise<ProductPackaging[]> {
    return db.productPackagings.toArray();
  },

  async getPackagingById(id: string): Promise<ProductPackaging | undefined> {
    return db.productPackagings.get(id);
  },

  async getPackagingsByProductId(productId: string): Promise<ProductPackaging[]> {
    return db.productPackagings.where('productId').equals(productId).toArray();
  },

  /**
   * Creates a new Product with its initial Packaging variant in one transaction.
   */
  async createProductWithInitialPackaging(data: {
    productName: string;
    category: string;
    productCode: string;
    type: PackagingType;
    packageSize: number;
    packageUnit: string;
    initialStock: number;
    minimumStock: number;
    image?: string;
    purchasePrice?: number;
    supplier?: string;
    location?: string;
    barcode?: string;
    initialNote?: string;
  }): Promise<{ product: Product; packaging: ProductPackaging }> {
    const normalizedCode = normalizeSKU(data.productCode);
    const available = await this.isProductCodeAvailable(normalizedCode);
    if (!available) {
      throw new Error(`Kode barang "${normalizedCode}" sudah digunakan. Gunakan kode lain.`);
    }

    const now = new Date().toISOString();
    const productId = `PRD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const packagingId = `PKG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const product: Product = {
      id: productId,
      name: data.productName.trim(),
      category: data.category.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const packaging: ProductPackaging = {
      id: packagingId,
      productId,
      productCode: normalizedCode,
      type: data.type,
      packageSize: Number(data.packageSize),
      packageUnit: data.packageUnit.trim(),
      stock: Math.max(0, Number(data.initialStock) || 0),
      minimumStock: Math.max(0, Number(data.minimumStock) || 0),
      image: data.image,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      supplier: data.supplier?.trim() || undefined,
      location: data.location?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', db.products, db.productPackagings, db.stockMovements, async () => {
      await db.products.add(product);
      await db.productPackagings.add(packaging);

      if (packaging.stock > 0) {
        await db.stockMovements.add({
          id: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          productId,
          packagingId,
          productCode: packaging.productCode,
          type: 'IN',
          quantity: packaging.stock,
          unit: packaging.packageUnit,
          stockBefore: 0,
          stockAfter: packaging.stock,
          note: data.initialNote || 'Stok awal penambahan bahan',
          createdAt: now,
        });
      }
    });

    return { product, packaging };
  },

  /**
   * Adds an additional Packaging variant to an existing Product.
   */
  async addPackagingToExistingProduct(data: {
    productId: string;
    productCode: string;
    type: PackagingType;
    packageSize: number;
    packageUnit: string;
    initialStock: number;
    minimumStock: number;
    image?: string;
    purchasePrice?: number;
    supplier?: string;
    location?: string;
    barcode?: string;
    initialNote?: string;
  }): Promise<ProductPackaging> {
    const normalizedCode = normalizeSKU(data.productCode);
    const available = await this.isProductCodeAvailable(normalizedCode);
    if (!available) {
      throw new Error(`Kode barang "${normalizedCode}" sudah digunakan.`);
    }

    const now = new Date().toISOString();
    const packagingId = `PKG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const packaging: ProductPackaging = {
      id: packagingId,
      productId: data.productId,
      productCode: normalizedCode,
      type: data.type,
      packageSize: Number(data.packageSize),
      packageUnit: data.packageUnit.trim(),
      stock: Math.max(0, Number(data.initialStock) || 0),
      minimumStock: Math.max(0, Number(data.minimumStock) || 0),
      image: data.image,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      supplier: data.supplier?.trim() || undefined,
      location: data.location?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', db.productPackagings, db.stockMovements, async () => {
      await db.productPackagings.add(packaging);

      if (packaging.stock > 0) {
        await db.stockMovements.add({
          id: `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          productId: data.productId,
          packagingId,
          productCode: packaging.productCode,
          type: 'IN',
          quantity: packaging.stock,
          unit: packaging.packageUnit,
          stockBefore: 0,
          stockAfter: packaging.stock,
          note: data.initialNote || 'Stok awal varian kemasan baru',
          createdAt: now,
        });
      }
    });

    return packaging;
  },

  /**
   * Updates packaging metadata (does not change stock, stock is changed via stockService).
   */
  async updatePackagingMetadata(
    packagingId: string,
    data: {
      productCode: string;
      type: PackagingType;
      packageSize: number;
      packageUnit: string;
      minimumStock: number;
      image?: string;
      purchasePrice?: number;
      supplier?: string;
      location?: string;
      barcode?: string;
    }
  ): Promise<void> {
    const normalizedCode = normalizeSKU(data.productCode);
    const available = await this.isProductCodeAvailable(normalizedCode, packagingId);
    if (!available) {
      throw new Error(`Kode barang "${normalizedCode}" sudah digunakan.`);
    }

    const current = await db.productPackagings.get(packagingId);
    if (!current) throw new Error('Packaging tidak ditemukan.');

    const now = new Date().toISOString();
    await db.productPackagings.update(packagingId, {
      productCode: normalizedCode,
      type: data.type,
      packageSize: Number(data.packageSize),
      packageUnit: data.packageUnit.trim(),
      minimumStock: Math.max(0, Number(data.minimumStock)),
      image: data.image !== undefined ? data.image : current.image,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      supplier: data.supplier?.trim() || undefined,
      location: data.location?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      updatedAt: now,
    });
  },

  async updateProduct(productId: string, name: string, category: string): Promise<void> {
    const now = new Date().toISOString();
    await db.products.update(productId, {
      name: name.trim(),
      category: category.trim(),
      updatedAt: now,
    });
  },

  /**
   * Deletes a packaging variant. Preserves historical stockMovements.
   */
  async deletePackaging(packagingId: string): Promise<void> {
    const packaging = await db.productPackagings.get(packagingId);
    if (!packaging) return;

    await db.productPackagings.delete(packagingId);

    // If product has no more packaging, delete product as well
    const remaining = await db.productPackagings.where('productId').equals(packaging.productId).count();
    if (remaining === 0) {
      await db.products.delete(packaging.productId);
    }
  },

  /**
   * Deletes a product and all of its packagings.
   */
  async deleteProduct(productId: string): Promise<void> {
    await db.transaction('rw', db.products, db.productPackagings, async () => {
      await db.productPackagings.where('productId').equals(productId).delete();
      await db.products.delete(productId);
    });
  },
};
