import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../db/db';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { BakueLogo } from '../components/common/BakueLogo';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import {
  Boxes,
  Layers,
  Repeat,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Reactive queries using useLiveQuery
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const packagings = useLiveQuery(() => db.productPackagings.toArray(), []) || [];

  // Greeting based on current hour
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? 'Selamat pagi 👋'
      : hour < 15
      ? 'Selamat siang 👋'
      : hour < 18
      ? 'Selamat sore 👋'
      : 'Selamat malam 👋';

  // Counts
  const totalBahan = products.length;
  const originalCount = packagings.filter((p) => p.type === 'ORIGINAL').length;
  const repackCount = packagings.filter((p) => p.type === 'REPACK').length;
  const menipisList = packagings.filter(
    (p) => p.stock > 0 && p.stock <= p.minimumStock
  );
  const habisList = packagings.filter((p) => p.stock === 0);

  // Urgent items needing attention (HABIS first, then MENIPIS)
  const urgentList = [...habisList, ...menipisList];

  // Map product names for lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Top Header with Bakue Brand Identity */}
      <div className="bg-white border-b border-gray-200/80 px-4 pt-4 pb-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BakueLogo size="md" />
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C3317]">
                Bakue Inventory
              </p>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                {greeting}
              </h1>
            </div>
          </div>
          <PWAInstallButton />
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Quick Summary Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Bahan - Bakue Chocolate Gradient */}
          <div className="col-span-2 bg-gradient-to-br from-[#5C3317] via-[#6D3D1B] to-[#8B4C20] text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F2E4D5]">
                  Total Bahan Kue
                </span>
                <span className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                  <Boxes className="w-5 h-5 text-white" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight">
                  {totalBahan}
                </span>
                <span className="text-sm font-medium text-[#F2E4D5]">jenis bahan</span>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Kemasan Original */}
          <div className="bg-white border border-[#ECE4D8] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold text-[#63391A]">Original</span>
              <Layers className="w-4 h-4 text-[#5C3317]" />
            </div>
            <div className="text-2xl font-black text-[#2D180C]">{originalCount}</div>
            <p className="text-[11px] text-[#8E7969] mt-1">Kemasan karung/box</p>
          </div>

          {/* Kemasan Repack */}
          <div className="bg-white border border-[#ECE4D8] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold text-[#8A4B1A]">Repack</span>
              <Repeat className="w-4 h-4 text-[#C46820]" />
            </div>
            <div className="text-2xl font-black text-[#2D180C]">{repackCount}</div>
            <p className="text-[11px] text-[#8E7969] mt-1">Kemasan eceran toko</p>
          </div>

          {/* Stok Menipis */}
          <div
            onClick={() => navigate('/products?filter=menipis')}
            className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition active:scale-98 ${
              menipisList.length > 0
                ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                : 'bg-white border-[#ECE4D8] text-[#2D180C]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">Stok Menipis</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600">{menipisList.length}</div>
            <p className="text-[11px] text-amber-700/80 mt-1">Perlu restock</p>
          </div>

          {/* Stok Habis */}
          <div
            onClick={() => navigate('/products?filter=habis')}
            className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition active:scale-98 ${
              habisList.length > 0
                ? 'bg-red-50/70 border-red-300 text-red-900'
                : 'bg-white border-[#ECE4D8] text-[#2D180C]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">Stok Habis</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-600">{habisList.length}</div>
            <p className="text-[11px] text-red-700/80 mt-1">Stok 0</p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-3">
          <Link
            to="/add-product"
            className="flex-1 min-h-[46px] flex items-center justify-center gap-2 bg-[#5C3317] hover:bg-[#46260E] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan</span>
          </Link>
          <Link
            to="/repack"
            className="flex-1 min-h-[46px] flex items-center justify-center gap-2 bg-white hover:bg-[#FAF4EC] border border-[#E5DACE] text-[#5C3317] rounded-2xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition"
          >
            <Repeat className="w-4 h-4 text-[#C46820]" />
            <span>Proses Repack</span>
          </Link>
        </div>

        {/* Urgent Attention: PERLU DIPERHATIKAN */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#4A2810]">
                Perlu Diperhatikan ({urgentList.length})
              </h2>
            </div>
            {urgentList.length > 4 && (
              <button
                onClick={() => navigate('/products?filter=urgent')}
                className="text-xs font-bold text-[#5C3317] flex items-center gap-1 hover:underline"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {urgentList.length === 0 ? (
            <div className="bg-white border border-[#ECE4D8] rounded-2xl p-5 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-800">Semua Stok Aman</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tidak ada bahan yang habis atau di bawah batas minimum.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentList.slice(0, 5).map((pkg) => {
                const prod = productMap.get(pkg.productId);
                return (
                  <div
                    key={pkg.id}
                    onClick={() => navigate(`/packaging/${pkg.id}`)}
                    className="bg-white border border-[#ECE4D8] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-[#D5C6B5] active:scale-98 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProductImage
                        src={pkg.image}
                        alt={prod?.name || pkg.productCode}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#2D180C] truncate">
                          {prod?.name || 'Bahan Kue'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-semibold text-[#7D6B5D]">
                            {pkg.productCode}
                          </span>
                          <span className="text-[#C4B7A7]">•</span>
                          <span className="text-xs font-bold text-[#4A2810]">
                            {pkg.stock} {pkg.packageUnit}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <StockBadge stock={pkg.stock} minimumStock={pkg.minimumStock} size="sm" />
                      <span className="text-[10px] text-[#8E7969] font-medium">
                        Min: {pkg.minimumStock} {pkg.packageUnit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
