import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db } from '../db/db';
import { CATEGORIES } from '../types';
import { SearchBar } from '../components/common/SearchBar';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { BakueLogo } from '../components/common/BakueLogo';
import { Plus, SlidersHorizontal, PackageOpen } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter');

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const packagings = useLiveQuery(() => db.productPackagings.toArray(), []) || [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ORIGINAL' | 'REPACK'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilter === 'menipis'
      ? 'MENIPIS'
      : initialFilter === 'habis'
      ? 'HABIS'
      : initialFilter === 'urgent'
      ? 'URGENT'
      : 'ALL'
  );

  // Sync statusFilter whenever searchParams change (fixes navigation bug from Dashboard)
  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'menipis') setStatusFilter('MENIPIS');
    else if (f === 'habis') setStatusFilter('HABIS');
    else if (f === 'urgent') setStatusFilter('URGENT');
    else if (!f) setStatusFilter('ALL');
  }, [searchParams]);

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  // Filtered packagings
  const filteredPackagings = useMemo(() => {
    return packagings.filter((pkg) => {
      const prod = productMap.get(pkg.productId);
      const prodName = prod ? prod.name.toLowerCase() : '';
      const category = prod ? prod.category : '';
      const query = search.trim().toLowerCase();

      // Search match
      if (query) {
        const matchName = prodName.includes(query);
        const matchCode = pkg.productCode.toLowerCase().includes(query);
        const matchBarcode = pkg.barcode ? pkg.barcode.toLowerCase().includes(query) : false;
        const matchCategory = category.toLowerCase().includes(query);
        const matchSupplier = pkg.supplier ? pkg.supplier.toLowerCase().includes(query) : false;
        const matchLocation = pkg.location ? pkg.location.toLowerCase().includes(query) : false;

        if (!matchName && !matchCode && !matchBarcode && !matchCategory && !matchSupplier && !matchLocation) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'ALL' && pkg.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'HABIS' && pkg.stock !== 0) return false;
      if (statusFilter === 'MENIPIS' && (pkg.stock === 0 || pkg.stock > pkg.minimumStock)) return false;
      if (statusFilter === 'URGENT' && pkg.stock > pkg.minimumStock) return false;
      if (statusFilter === 'AMAN' && pkg.stock <= pkg.minimumStock) return false;

      return true;
    });
  }, [packagings, productMap, search, typeFilter, categoryFilter, statusFilter]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      {/* Sticky Header */}
      <div className="bg-white border-b border-[#ECE4D8] px-4 pt-4 pb-3 sticky top-0 z-30 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BakueLogo size="sm" />
            <h1 className="text-lg font-black text-[#2D180C] tracking-tight">
              Stok Bahan
            </h1>
          </div>
          <Link
            to="/add-product"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5C3317] hover:bg-[#46260E] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </Link>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cari nama, SKU (TPG-001), barcode, rak..."
        />

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'ALL'
                ? 'bg-[#5C3317] text-white font-bold shadow-xs'
                : 'bg-[#EFE7DC] text-[#6B5545] hover:bg-[#E5DCCE]'
            }`}
          >
            Semua ({packagings.length})
          </button>
          <button
            onClick={() => setTypeFilter('ORIGINAL')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'ORIGINAL'
                ? 'bg-[#5C3317] text-white font-bold shadow-xs'
                : 'bg-[#EFE7DC] text-[#6B5545] hover:bg-[#E5DCCE]'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setTypeFilter('REPACK')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              typeFilter === 'REPACK'
                ? 'bg-[#5C3317] text-white font-bold shadow-xs'
                : 'bg-[#EFE7DC] text-[#6B5545] hover:bg-[#E5DCCE]'
            }`}
          >
            Repack
          </button>

          <span className="text-[#DACEC0]">|</span>

          {/* Status Pills */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'URGENT' ? 'ALL' : 'URGENT')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 font-bold ${
              statusFilter === 'URGENT'
                ? 'bg-[#C46820] text-white shadow-xs'
                : 'bg-[#FAF0E4] text-[#A65B20] border border-[#EAD7C5]'
            }`}
          >
            Perlu Cek
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'MENIPIS' ? 'ALL' : 'MENIPIS')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 font-bold ${
              statusFilter === 'MENIPIS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            Menipis
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'HABIS' ? 'ALL' : 'HABIS')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 font-bold ${
              statusFilter === 'HABIS'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            Habis (0)
          </button>
        </div>

        {/* Category filter dropdown */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#9E8B7C] shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#FAF7F2] border border-[#E0D5C5] rounded-lg px-2.5 py-1 text-xs font-bold text-[#4A2810] focus:outline-none focus:ring-1 focus:ring-[#5C3317]"
          >
            <option value="ALL">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-[#8E7969] ml-auto font-medium">
            {filteredPackagings.length} kemasan
          </span>
        </div>
      </div>

      {/* Product List */}
      <div className="p-4 space-y-3">
        {filteredPackagings.length === 0 ? (
          <div className="bg-white border border-[#ECE4D8] rounded-3xl p-8 text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-[#FAF3EB] text-[#5C3317] flex items-center justify-center mx-auto mb-3">
              <PackageOpen className="w-8 h-8 text-[#A65B20]" />
            </div>
            <h3 className="text-base font-bold text-[#2D180C]">Belum Ada Bahan Sesuai</h3>
            <p className="text-xs text-[#7A6658] mt-1 max-w-xs mx-auto">
              {search || typeFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Tidak ada kemasan yang cocok dengan kata kunci atau filter terpilih.'
                : 'Tambahkan bahan pertama untuk mulai mencatat inventory toko.'}
            </p>
            {search || typeFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('ALL');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="mt-4 px-4 py-2 bg-[#F2E9DE] hover:bg-[#E8DDCF] text-[#5C3317] rounded-xl text-xs font-bold transition"
              >
                Reset Semua Filter
              </button>
            ) : (
              <Link
                to="/add-product"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#5C3317] text-white rounded-xl text-xs font-bold hover:bg-[#46260E] transition"
              >
                <Plus className="w-4 h-4" /> Tambah Bahan Baru
              </Link>
            )}
          </div>
        ) : (
          filteredPackagings.map((pkg) => {
            const prod = productMap.get(pkg.productId);
            const isRepack = pkg.type === 'REPACK';

            return (
              <div
                key={pkg.id}
                onClick={() => navigate(`/packaging/${pkg.id}`)}
                className="bg-white border border-[#ECE4D8] rounded-2xl p-3.5 shadow-xs hover:border-[#CBB8A3] active:scale-98 transition cursor-pointer flex gap-3.5 items-start"
              >
                {/* Photo */}
                <ProductImage
                  src={pkg.image}
                  alt={prod?.name || pkg.productCode}
                  size="md"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-sm font-bold text-[#2D180C] truncate">
                      {prod?.name || 'Bahan'}
                    </h3>
                    <StockBadge stock={pkg.stock} minimumStock={pkg.minimumStock} size="sm" />
                  </div>

                  {/* SKU and Type Tag */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-[#5C3317] bg-[#F7EFE8] px-1.5 py-0.5 rounded-md">
                      {pkg.productCode}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                        isRepack
                          ? 'bg-[#FAF0E4] text-[#A65B20]'
                          : 'bg-[#F2E8DC] text-[#5C3317]'
                      }`}
                    >
                      {pkg.type}
                    </span>
                  </div>

                  {/* Physical Stock & Package Specs */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F2EBE1] text-xs">
                    <div className="text-[#7A6658] font-medium">
                      Ukuran: <span className="font-semibold text-[#4A2810]">{pkg.packageSize} {pkg.packageUnit}</span>
                    </div>
                    <div className="font-extrabold text-sm text-[#2D180C]">
                      {pkg.stock} <span className="text-xs font-semibold text-[#8E7969]">{pkg.packageUnit}</span>
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
