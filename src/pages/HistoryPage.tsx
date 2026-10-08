import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { db } from '../db/db';
import { MovementType } from '../types';
import { SearchBar } from '../components/common/SearchBar';
import { BakueLogo } from '../components/common/BakueLogo';
import { formatIndoRelative } from '../utils/date';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Sliders,
  History,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const movements = useLiveQuery(() => db.stockMovements.orderBy('createdAt').reverse().toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const packagings = useLiveQuery(() => db.productPackagings.toArray(), []) || [];

  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<MovementType | 'ALL'>('ALL');

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const packagingMap = useMemo(() => new Map(packagings.map((p) => [p.id, p])), [packagings]);
  const movementMap = useMemo(() => new Map(movements.map((m) => [m.id, m])), [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'IN' && m.type !== 'IN') return false;
        if (typeFilter === 'OUT' && m.type !== 'OUT') return false;
        if (typeFilter === 'ADJUSTMENT' && m.type !== 'ADJUSTMENT') return false;
        if (typeFilter.startsWith('REPACK') && !m.type.startsWith('REPACK')) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const prod = productMap.get(m.productId);
        const prodName = prod ? prod.name.toLowerCase() : '';
        const code = m.productCode.toLowerCase();
        const note = m.note ? m.note.toLowerCase() : '';

        if (!prodName.includes(q) && !code.includes(q) && !note.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [movements, typeFilter, search, productMap]);

  return (
    <div className="flex flex-col min-h-full pb-16">
      {/* Top Header with Bakue Identity */}
      <div className="bg-white border-b border-[#ECE4D8] px-4 pt-4 pb-3 sticky top-0 z-30 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BakueLogo size="sm" />
            <h1 className="text-lg font-black text-[#2D180C] tracking-tight">
              Riwayat Mutasi Stok
            </h1>
          </div>
          <span className="text-xs font-bold text-[#6D3D1B] bg-[#F7EFE8] px-2.5 py-1 rounded-full border border-[#E9DDD0]">
            {filteredMovements.length} transaksi
          </span>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cari kode barang, nama, atau catatan..."
        />

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'ALL'
                ? 'bg-[#5C3317] text-white font-bold shadow-xs'
                : 'bg-[#EFE7DC] text-[#6B5545] hover:bg-[#E5DCCE]'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setTypeFilter('IN')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'IN'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            + Stok Masuk
          </button>
          <button
            onClick={() => setTypeFilter('OUT')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'OUT'
                ? 'bg-red-700 text-white font-bold shadow-xs'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            - Stok Keluar
          </button>
          <button
            onClick={() => setTypeFilter('REPACK_IN')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter.startsWith('REPACK')
                ? 'bg-[#C46820] text-white font-bold shadow-xs'
                : 'bg-[#FAF0E4] text-[#A65B20] border border-[#EAD7C5]'
            }`}
          >
            ♻ Repack
          </button>
          <button
            onClick={() => setTypeFilter('ADJUSTMENT')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'ADJUSTMENT'
                ? 'bg-amber-700 text-white font-bold shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            Opname
          </button>
        </div>
      </div>

      {/* History Items List */}
      <div className="p-4 space-y-3">
        {filteredMovements.length === 0 ? (
          <div className="bg-white border border-[#ECE4D8] rounded-3xl p-8 text-center mt-6">
            <div className="w-14 h-14 rounded-full bg-[#FAF3EB] text-[#5C3317] flex items-center justify-center mx-auto mb-3">
              <History className="w-7 h-7 text-[#A65B20]" />
            </div>
            <h3 className="text-sm font-bold text-[#2D180C]">Tidak Ada Riwayat Mutasi</h3>
            <p className="text-xs text-[#7A6658] mt-1">
              {search || typeFilter !== 'ALL'
                ? 'Tidak ada mutasi yang sesuai filter.'
                : 'Mutasi akan otomatis tercatat saat stok masuk, keluar, atau proses repack.'}
            </p>
          </div>
        ) : (
          filteredMovements.map((mov) => {
            const prod = productMap.get(mov.productId);
            const isRepack = mov.type.startsWith('REPACK');
            const isPositive = mov.type === 'IN' || mov.type === 'REPACK_IN';

            // Linked movement for repack
            const linkedMov = mov.relatedMovementId ? movementMap.get(mov.relatedMovementId) : undefined;

            return (
              <div
                key={mov.id}
                className="bg-white border border-[#ECE4D8] rounded-2xl p-4 shadow-xs space-y-2.5 transition hover:border-[#D5C6B5]"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mov.type === 'IN' && (
                      <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <ArrowDownLeft className="w-4 h-4" />
                      </span>
                    )}
                    {mov.type === 'OUT' && (
                      <span className="p-1.5 bg-red-100 text-red-800 rounded-lg">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    )}
                    {isRepack && (
                      <span className="p-1.5 bg-[#FAF0E4] text-[#A65B20] rounded-lg">
                        <Repeat className="w-4 h-4" />
                      </span>
                    )}
                    {mov.type === 'ADJUSTMENT' && (
                      <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                        <Sliders className="w-4 h-4" />
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : isRepack
                          ? 'bg-[#FAF0E4] text-[#A65B20] border border-[#EAD7C5]'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {mov.type.replace('_', ' ')}
                    </span>
                  </div>

                  <span className="text-[11px] font-medium text-[#8E7969]">
                    {formatIndoRelative(mov.createdAt)}
                  </span>
                </div>

                {/* Main Content */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#2D180C] truncate">
                      {prod?.name || 'Bahan'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs font-semibold text-[#6D3D1B]">
                      <span>{mov.productCode}</span>
                    </div>

                    {/* Linked Repack indicator */}
                    {isRepack && linkedMov && (
                      <div className="mt-2 p-2 bg-[#FAF4EC] border border-[#EAE0D3] rounded-xl text-[11px] text-[#5C3317] flex items-center gap-2 font-mono">
                        {mov.type === 'REPACK_OUT' ? (
                          <>
                            <span>{mov.productCode} (-{mov.quantity} {mov.unit})</span>
                            <span className="text-[#C46820]">→</span>
                            <span className="font-bold">{linkedMov.productCode} (+{linkedMov.quantity} {linkedMov.unit})</span>
                          </>
                        ) : (
                          <>
                            <span>{linkedMov.productCode} (-{linkedMov.quantity} {linkedMov.unit})</span>
                            <span className="text-[#C46820]">→</span>
                            <span className="font-bold">{mov.productCode} (+{mov.quantity} {mov.unit})</span>
                          </>
                        )}
                      </div>
                    )}

                    {mov.note && (
                      <p className="text-xs text-[#7A6658] mt-1 italic">
                        "{mov.note}"
                      </p>
                    )}
                  </div>

                  {/* Quantity and stock before/after */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-base font-black ${
                        isPositive ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {mov.quantity} {mov.unit}
                    </div>
                    <div className="text-[11px] text-[#8E7969] font-medium mt-0.5">
                      {mov.stockBefore} → <strong className="text-[#2D180C]">{mov.stockAfter}</strong> {mov.unit}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

