import { db } from '../db/db';
import { BackupData, StockStatus } from '../types';

export const backupService = {
  /**
   * Generates a complete JSON backup file and triggers browser download.
   */
  async exportJSONBackup(): Promise<void> {
    const products = await db.products.toArray();
    const productPackagings = await db.productPackagings.toArray();
    const stockMovements = await db.stockMovements.toArray();

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      products,
      productPackagings,
      stockMovements,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bakue-Backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Restores database from a JSON backup string.
   */
  async importJSONBackup(jsonString: string): Promise<{
    productCount: number;
    packagingCount: number;
    movementCount: number;
  }> {
    let parsed: BackupData;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Format file tidak valid. Pastikan file berupa JSON valid.');
    }

    if (
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.productPackagings) ||
      !Array.isArray(parsed.stockMovements)
    ) {
      throw new Error('Struktur data backup tidak sesuai format BakeStock.');
    }

    await db.transaction('rw', db.products, db.productPackagings, db.stockMovements, async () => {
      await db.products.clear();
      await db.productPackagings.clear();
      await db.stockMovements.clear();

      await db.products.bulkAdd(parsed.products);
      await db.productPackagings.bulkAdd(parsed.productPackagings);
      await db.stockMovements.bulkAdd(parsed.stockMovements);
    });

    return {
      productCount: parsed.products.length,
      packagingCount: parsed.productPackagings.length,
      movementCount: parsed.stockMovements.length,
    };
  },

  /**
   * Exports inventory data as CSV file.
   */
  async exportCSV(): Promise<void> {
    const products = await db.products.toArray();
    const packagings = await db.productPackagings.toArray();

    const productMap = new Map(products.map((p) => [p.id, p]));

    const headers = [
      'Kode Barang',
      'Nama Produk',
      'Kategori',
      'Jenis Kemasan',
      'Ukuran',
      'Satuan',
      'Stok',
      'Minimum Stok',
      'Harga Beli',
      'Supplier',
      'Lokasi',
      'Status',
    ];

    const rows = packagings.map((pkg) => {
      const prod = productMap.get(pkg.productId);
      const prodName = prod ? prod.name : '-';
      const category = prod ? prod.category : '-';
      const typeStr = pkg.type === 'ORIGINAL' ? 'Original' : 'Repack';

      let status: StockStatus = 'AMAN';
      if (pkg.stock === 0) {
        status = 'HABIS';
      } else if (pkg.stock <= pkg.minimumStock) {
        status = 'MENIPIS';
      }

      const escapeCSV = (val: string | number | undefined) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      return [
        escapeCSV(pkg.productCode),
        escapeCSV(prodName),
        escapeCSV(category),
        escapeCSV(typeStr),
        escapeCSV(pkg.packageSize),
        escapeCSV(pkg.packageUnit),
        escapeCSV(pkg.stock),
        escapeCSV(pkg.minimumStock),
        escapeCSV(pkg.purchasePrice ?? 0),
        escapeCSV(pkg.supplier || '-'),
        escapeCSV(pkg.location || '-'),
        escapeCSV(status),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bakue-Inventory-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
