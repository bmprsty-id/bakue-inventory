import Dexie, { Table } from 'dexie';
import { Product, ProductPackaging, StockMovement } from '../types';
import { SEED_PRODUCTS, SEED_PACKAGINGS, SEED_MOVEMENTS } from './seedData';

export class BakeStockDB extends Dexie {
  products!: Table<Product, string>;
  productPackagings!: Table<ProductPackaging, string>;
  stockMovements!: Table<StockMovement, string>;

  constructor() {
    super('BakeStockDB');
    this.version(1).stores({
      products: '&id, name, category, createdAt',
      productPackagings: '&id, productId, productCode, type, barcode, createdAt',
      stockMovements: '&id, productId, packagingId, productCode, type, createdAt',
    });
  }

  async initializeSeedIfEmpty(): Promise<void> {
    const count = await this.products.count();
    if (count === 0) {
      await this.transaction('rw', this.products, this.productPackagings, this.stockMovements, async () => {
        await this.products.bulkAdd(SEED_PRODUCTS);
        await this.productPackagings.bulkAdd(SEED_PACKAGINGS);
        await this.stockMovements.bulkAdd(SEED_MOVEMENTS);
      });
      console.log('BakeStockDB: Seed data initialized successfully');
    }
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.products, this.productPackagings, this.stockMovements, async () => {
      await this.products.clear();
      await this.productPackagings.clear();
      await this.stockMovements.clear();
    });
  }
}

export const db = new BakeStockDB();

// Automatically check and seed on app initialization
db.initializeSeedIfEmpty().catch((err) => {
  console.error('Failed to initialize seed data:', err);
});
