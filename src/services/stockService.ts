import { db } from '../db/db';
import { StockMovement, MovementType } from '../types';

export interface RepackInput {
  sourcePackagingId: string;
  targetPackagingId: string;
  sourceQuantityUsed: number; // Jumlah fisik kemasan sumber yang dikurangi (misal 1 karung) atau jumlah unit
  sourceUnitsDescription: string; // e.g. "1 karung (25 kg)" atau "10 kg"
  targetPacksProduced: number; // Jumlah kemasan repack yang dihasilkan (misal 10 pack)
  leftoverDescription?: string; // Sisa bahan jika ada
  note?: string;
}

export const stockService = {
  /**
   * Menambah stok (+IN)
   */
  async addStock(
    packagingId: string,
    quantity: number,
    note?: string
  ): Promise<StockMovement> {
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Jumlah tambah stok harus lebih besar dari 0.');
    }

    const packaging = await db.productPackagings.get(packagingId);
    if (!packaging) {
      throw new Error('Data kemasan tidak ditemukan.');
    }

    const stockBefore = packaging.stock;
    const stockAfter = stockBefore + qty;
    const now = new Date().toISOString();
    const movementId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const movement: StockMovement = {
      id: movementId,
      productId: packaging.productId,
      packagingId: packaging.id,
      productCode: packaging.productCode,
      type: 'IN',
      quantity: qty,
      unit: packaging.packageUnit,
      stockBefore,
      stockAfter,
      note: note?.trim() || 'Penambahan stok masuk',
      createdAt: now,
    };

    await db.transaction('rw', db.productPackagings, db.stockMovements, async () => {
      await db.productPackagings.update(packagingId, {
        stock: stockAfter,
        updatedAt: now,
      });
      await db.stockMovements.add(movement);
    });

    return movement;
  },

  /**
   * Mengurangi stok (-OUT)
   */
  async reduceStock(
    packagingId: string,
    quantity: number,
    note?: string
  ): Promise<StockMovement> {
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Jumlah pengurangan stok harus lebih besar dari 0.');
    }

    const packaging = await db.productPackagings.get(packagingId);
    if (!packaging) {
      throw new Error('Data kemasan tidak ditemukan.');
    }

    if (qty > packaging.stock) {
      throw new Error(
        `Stok tidak mencukupi. Stok saat ini ${packaging.stock} ${packaging.packageUnit}, diminta ${qty} ${packaging.packageUnit}.`
      );
    }

    const stockBefore = packaging.stock;
    const stockAfter = stockBefore - qty;
    const now = new Date().toISOString();
    const movementId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const movement: StockMovement = {
      id: movementId,
      productId: packaging.productId,
      packagingId: packaging.id,
      productCode: packaging.productCode,
      type: 'OUT',
      quantity: qty,
      unit: packaging.packageUnit,
      stockBefore,
      stockAfter,
      note: note?.trim() || 'Pengurangan stok keluar',
      createdAt: now,
    };

    await db.transaction('rw', db.productPackagings, db.stockMovements, async () => {
      await db.productPackagings.update(packagingId, {
        stock: stockAfter,
        updatedAt: now,
      });
      await db.stockMovements.add(movement);
    });

    return movement;
  },

  /**
   * Penyesuaian stok opname (ADJUSTMENT)
   */
  async adjustStock(
    packagingId: string,
    newStock: number,
    note?: string
  ): Promise<StockMovement> {
    const targetStock = Number(newStock);
    if (isNaN(targetStock) || targetStock < 0) {
      throw new Error('Stok baru tidak boleh negatif.');
    }

    const packaging = await db.productPackagings.get(packagingId);
    if (!packaging) {
      throw new Error('Data kemasan tidak ditemukan.');
    }

    const stockBefore = packaging.stock;
    const stockAfter = targetStock;
    const diff = stockAfter - stockBefore;
    const now = new Date().toISOString();
    const movementId = `MOV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const movement: StockMovement = {
      id: movementId,
      productId: packaging.productId,
      packagingId: packaging.id,
      productCode: packaging.productCode,
      type: 'ADJUSTMENT',
      quantity: Math.abs(diff),
      unit: packaging.packageUnit,
      stockBefore,
      stockAfter,
      note: note?.trim() || `Penyesuaian stok (${diff >= 0 ? '+' : ''}${diff} ${packaging.packageUnit})`,
      createdAt: now,
    };

    await db.transaction('rw', db.productPackagings, db.stockMovements, async () => {
      await db.productPackagings.update(packagingId, {
        stock: stockAfter,
        updatedAt: now,
      });
      await db.stockMovements.add(movement);
    });

    return movement;
  },

  /**
   * Proses Repack:
   * Mengurangi stok packaging asal (REPACK_OUT)
   * Menambah stok packaging tujuan (REPACK_IN)
   * Terhubung dengan relatedMovementId dalam satu transaksi atomik.
   */
  async executeRepack(input: RepackInput): Promise<{
    outMovement: StockMovement;
    inMovement: StockMovement;
  }> {
    const sourcePkg = await db.productPackagings.get(input.sourcePackagingId);
    const targetPkg = await db.productPackagings.get(input.targetPackagingId);

    if (!sourcePkg || !targetPkg) {
      throw new Error('Data kemasan sumber atau kemasan tujuan tidak ditemukan.');
    }

    if (input.sourceQuantityUsed <= 0) {
      throw new Error('Jumlah bahan yang digunakan harus lebih dari 0.');
    }

    if (input.targetPacksProduced <= 0) {
      throw new Error('Jumlah kemasan hasil repack harus lebih dari 0.');
    }

    if (input.sourceQuantityUsed > sourcePkg.stock) {
      throw new Error(
        `Stok kemasan sumber tidak mencukupi (${sourcePkg.stock} ${sourcePkg.packageUnit} tersedia).`
      );
    }

    const sourceStockBefore = sourcePkg.stock;
    const sourceStockAfter = sourceStockBefore - input.sourceQuantityUsed;

    const targetStockBefore = targetPkg.stock;
    const targetStockAfter = targetStockBefore + input.targetPacksProduced;

    const now = new Date().toISOString();
    const outMovementId = `MOV-OUT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const inMovementId = `MOV-IN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const outNote = input.note
      ? `Repack: ${input.note} (${input.sourceUnitsDescription} -> ${input.targetPacksProduced} ${targetPkg.packageUnit} ${targetPkg.productCode})`
      : `Repack ke ${targetPkg.productCode} (${input.targetPacksProduced} ${targetPkg.packageUnit})${input.leftoverDescription ? ` [Sisa: ${input.leftoverDescription}]` : ''}`;

    const inNote = input.note
      ? `Hasil Repack: ${input.note} (dari ${sourcePkg.productCode})`
      : `Hasil Repack dari ${sourcePkg.productCode} (${input.sourceUnitsDescription})`;

    const outMovement: StockMovement = {
      id: outMovementId,
      productId: sourcePkg.productId,
      packagingId: sourcePkg.id,
      productCode: sourcePkg.productCode,
      type: 'REPACK_OUT',
      quantity: input.sourceQuantityUsed,
      unit: sourcePkg.packageUnit,
      stockBefore: sourceStockBefore,
      stockAfter: sourceStockAfter,
      relatedMovementId: inMovementId,
      note: outNote,
      createdAt: now,
    };

    const inMovement: StockMovement = {
      id: inMovementId,
      productId: targetPkg.productId,
      packagingId: targetPkg.id,
      productCode: targetPkg.productCode,
      type: 'REPACK_IN',
      quantity: input.targetPacksProduced,
      unit: targetPkg.packageUnit,
      stockBefore: targetStockBefore,
      stockAfter: targetStockAfter,
      relatedMovementId: outMovementId,
      note: inNote,
      createdAt: now,
    };

    await db.transaction('rw', db.productPackagings, db.stockMovements, async () => {
      await db.productPackagings.update(sourcePkg.id, {
        stock: sourceStockAfter,
        updatedAt: now,
      });
      await db.productPackagings.update(targetPkg.id, {
        stock: targetStockAfter,
        updatedAt: now,
      });
      await db.stockMovements.add(outMovement);
      await db.stockMovements.add(inMovement);
    });

    return { outMovement, inMovement };
  },

  /**
   * Mengambil riwayat mutasi stok, diurutkan dari yang terbaru.
   */
  async getMovements(filters?: {
    productId?: string;
    packagingId?: string;
    type?: MovementType | 'ALL';
    search?: string;
  }): Promise<StockMovement[]> {
    let movements = await db.stockMovements.orderBy('createdAt').reverse().toArray();

    if (filters?.productId) {
      movements = movements.filter((m) => m.productId === filters.productId);
    }
    if (filters?.packagingId) {
      movements = movements.filter((m) => m.packagingId === filters.packagingId);
    }
    if (filters?.type && filters.type !== 'ALL') {
      if (filters.type.startsWith('REPACK')) {
        movements = movements.filter((m) => m.type.startsWith('REPACK'));
      } else {
        movements = movements.filter((m) => m.type === filters.type);
      }
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      movements = movements.filter(
        (m) =>
          m.productCode.toLowerCase().includes(q) ||
          (m.note && m.note.toLowerCase().includes(q))
      );
    }

    return movements;
  },
};
