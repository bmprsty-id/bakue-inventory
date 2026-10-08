import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { stockService } from '../services/stockService';
import { productService } from '../services/productService';
import { formatRupiah } from '../utils/currency';
import { formatIndoRelative } from '../utils/date';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import {
  ArrowLeft,
  Plus,
  Minus,
  Repeat,
  Edit2,
  Trash2,
  Sliders,
  MapPin,
  Building,
  Barcode,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const PackagingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const packaging = useLiveQuery(() => (id ? db.productPackagings.get(id) : undefined), [id]);
  const product = useLiveQuery(
    () => (packaging?.productId ? db.products.get(packaging.productId) : undefined),
    [packaging?.productId]
  );
  const siblingPackagings = useLiveQuery(
    () =>
      packaging?.productId
        ? db.productPackagings.where('productId').equals(packaging.productId).toArray()
        : [],
    [packaging?.productId]
  ) || [];
  const recentMovements = useLiveQuery(
    () => (id ? stockService.getMovements({ packagingId: id }) : []),
    [id]
  ) || [];

  // Modal states
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isReduceStockOpen, setIsReduceStockOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form states
  const [quantity, setQuantity] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!packaging) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">Memuat data kemasan...</p>
      </div>
    );
  }

  const otherVariants = siblingPackagings.filter((p) => p.id !== packaging.id);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setErrorMessage('Masukkan jumlah stok valid lebih dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await stockService.addStock(packaging.id, qty, note || 'Restock manual');
      showToast(`Stok ${packaging.productCode} bertambah +${qty} ${packaging.packageUnit}`);
      setIsAddStockOpen(false);
      setQuantity('');
      setNote('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menambah stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReduceStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setErrorMessage('Masukkan jumlah pengurangan valid lebih dari 0.');
      return;
    }

    if (qty > packaging.stock) {
      setErrorMessage(`Stok tidak mencukupi (tersedia: ${packaging.stock} ${packaging.packageUnit}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await stockService.reduceStock(packaging.id, qty, note || 'Penggunaan produksi');
      showToast(`Stok ${packaging.productCode} berkurang -${qty} ${packaging.packageUnit}`);
      setIsReduceStockOpen(false);
      setQuantity('');
      setNote('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengurangi stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const target = Number(quantity);
    if (isNaN(target) || target < 0) {
      setErrorMessage('Masukkan jumlah stok baru yang valid (minimal 0).');
      return;
    }

    try {
      setIsSubmitting(true);
      await stockService.adjustStock(packaging.id, target, note || 'Penyesuaian stok opname');
      showToast(`Stok ${packaging.productCode} disesuaikan menjadi ${target} ${packaging.packageUnit}`);
      setIsAdjustStockOpen(false);
      setQuantity('');
      setNote('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyesuaikan stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await productService.deletePackaging(packaging.id);
      showToast('Data kemasan berhasil dihapus.');
      navigate('/products', { replace: true });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus data', 'error');
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200/80 px-4 py-3 sticky top-0 z-30 shadow-2xs flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 p-1 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>
        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
          {packaging.productCode}
        </span>
        <div className="flex items-center gap-1">
          <Link
            to={`/packaging/${packaging.id}/edit`}
            className="p-2 text-[#7A6658] hover:text-[#5C3317] rounded-xl hover:bg-[#FAF4EC] transition"
            aria-label="Edit data kemasan"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
            aria-label="Hapus kemasan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Large Product Image & Header */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs">
          <ProductImage
            src={packaging.image}
            alt={product?.name || packaging.productCode}
            size="xl"
            className="mb-4"
          />

          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C46820]">
                {product?.category || 'Kategori'}
              </span>
              <h1 className="text-xl font-black text-[#2D180C] tracking-tight mt-0.5">
                {product?.name || 'Bahan Kue'}
              </h1>
            </div>
            <StockBadge stock={packaging.stock} minimumStock={packaging.minimumStock} />
          </div>

          {/* Core Specs Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F2EAE0] text-xs">
            <div className="bg-[#FAF7F2] border border-[#ECE4D8] rounded-2xl p-3">
              <span className="text-[#8E7969] font-medium">Jenis Kemasan</span>
              <div className="font-extrabold text-sm text-[#2D180C] mt-0.5">
                {packaging.type === 'ORIGINAL' ? 'Original (Pabrik)' : 'Repack (Toko)'}
              </div>
            </div>

            <div className="bg-[#FAF7F2] border border-[#ECE4D8] rounded-2xl p-3">
              <span className="text-[#8E7969] font-medium">Ukuran per Satuan</span>
              <div className="font-extrabold text-sm text-[#2D180C] mt-0.5">
                {packaging.packageSize} {packaging.packageUnit}
              </div>
            </div>

            <div className="bg-[#F7EFE8] border border-[#E9DDD0] rounded-2xl p-3">
              <span className="text-[#5C3317] font-bold">Stok Saat Ini</span>
              <div className="text-2xl font-black text-[#46260E] mt-0.5">
                {packaging.stock}{' '}
                <span className="text-xs font-bold text-[#825330]">
                  {packaging.packageUnit}
                </span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border border-[#ECE4D8] rounded-2xl p-3">
              <span className="text-[#8E7969] font-medium">Batas Min. Stok</span>
              <div className="font-extrabold text-sm text-[#4A2810] mt-0.5">
                {packaging.minimumStock} {packaging.packageUnit}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Tambah / Kurangi / Repack */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setQuantity('');
              setNote('');
              setErrorMessage('');
              setIsAddStockOpen(true);
            }}
            className="min-h-[50px] flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Stok</span>
          </button>

          <button
            onClick={() => {
              setQuantity('');
              setNote('');
              setErrorMessage('');
              setIsReduceStockOpen(true);
            }}
            className="min-h-[50px] flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition"
          >
            <Minus className="w-4 h-4" />
            <span>- Kurangi Stok</span>
          </button>

          {/* Repack Button (Full width) - Bakue Chocolate Brown */}
          <Link
            to={`/repack?sourceId=${packaging.id}`}
            className="col-span-2 min-h-[50px] flex items-center justify-center gap-2 bg-[#5C3317] hover:bg-[#46260E] text-white rounded-2xl text-sm font-bold shadow-xs active:scale-95 transition"
          >
            <Repeat className="w-4 h-4 text-[#F3E2D0]" />
            <span>♻ Proses Repack Bahan</span>
          </Link>

          <button
            onClick={() => {
              setQuantity(String(packaging.stock));
              setNote('');
              setErrorMessage('');
              setIsAdjustStockOpen(true);
            }}
            className="col-span-2 min-h-[44px] flex items-center justify-center gap-2 bg-white hover:bg-[#FAF5EF] border border-[#E2D6C7] text-[#5C3317] rounded-2xl text-xs font-bold active:scale-98 transition shadow-2xs"
          >
            <Sliders className="w-4 h-4 text-[#8A5B38]" />
            <span>Penyesuaian Stok (Opname)</span>
          </button>
        </div>

        {/* Detail Info: Harga, Supplier, Lokasi, Barcode */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3 text-xs">
          <h3 className="font-extrabold text-sm text-[#2D180C]">Informasi Tambahan</h3>

          <div className="flex items-center justify-between py-2 border-b border-[#F4EBE1]">
            <span className="text-[#7A6658]">Harga Beli</span>
            <span className="font-bold text-[#2D180C]">
              {packaging.purchasePrice ? formatRupiah(packaging.purchasePrice) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#F4EBE1]">
            <span className="text-[#7A6658] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#A65B20]" /> Supplier
            </span>
            <span className="font-bold text-[#2D180C]">{packaging.supplier || '-'}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#F4EBE1]">
            <span className="text-[#7A6658] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#A65B20]" /> Lokasi Rak
            </span>
            <span className="font-bold text-[#2D180C]">{packaging.location || '-'}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[#7A6658] flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-[#A65B20]" /> Barcode
            </span>
            <span className="font-mono font-semibold text-[#5C3317]">
              {packaging.barcode || '-'}
            </span>
          </div>
        </div>

        {/* Variants of the same product */}
        {siblingPackagings.length > 1 && (
          <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#2D180C]">
                Kemasan Lain ({product?.name})
              </h3>
              {product && (
                <Link
                  to={`/product/${product.id}`}
                  className="text-xs font-bold text-[#5C3317] flex items-center gap-1 hover:underline"
                >
                  Detail Bahan <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-2">
              {otherVariants.map((varPkg) => (
                <Link
                  key={varPkg.id}
                  to={`/packaging/${varPkg.id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#ECE4D8] hover:border-[#5C3317] bg-[#FAF7F2] hover:bg-[#F5ECE1] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        varPkg.type === 'ORIGINAL'
                          ? 'bg-[#F2E8DC] text-[#5C3317]'
                          : 'bg-[#FAF0E4] text-[#A65B20]'
                      }`}
                    >
                      {varPkg.type}
                    </span>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#2D180C]">
                        {varPkg.productCode}
                      </div>
                      <div className="text-[11px] text-[#8E7969]">
                        {varPkg.packageSize} {varPkg.packageUnit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-[#2D180C]">
                      {varPkg.stock} {varPkg.packageUnit}
                    </div>
                    <StockBadge stock={varPkg.stock} minimumStock={varPkg.minimumStock} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Movements for this packaging */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#2D180C] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#5C3317]" /> Riwayat Mutasi Kemasan Ini
            </h3>
            <Link
              to={`/history?search=${packaging.productCode}`}
              className="text-xs font-bold text-[#5C3317] hover:underline"
            >
              Semua
            </Link>
          </div>

          {recentMovements.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Belum ada riwayat mutasi.</p>
          ) : (
            <div className="space-y-2.5">
              {recentMovements.slice(0, 5).map((mov) => {
                const isPositive = mov.type === 'IN' || mov.type === 'REPACK_IN';
                return (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-none text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-800 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isPositive ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span>{mov.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{mov.note || '-'}</p>
                      <span className="text-[10px] text-gray-400">
                        {formatIndoRelative(mov.createdAt)}
                      </span>
                    </div>
                    <div className="text-right font-extrabold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                        {isPositive ? '+' : '-'}
                        {mov.quantity} {mov.unit}
                      </span>
                      <div className="text-[10px] text-gray-400 font-medium">
                        Sisa: {mov.stockAfter} {mov.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Tambah Stok */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title="Tambah Stok"
        subtitle={`${product?.name} (${packaging.productCode})`}
      >
        <form onSubmit={handleAddStock} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Jumlah Tambahan ({packaging.packageUnit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Contoh: 10"
              autoFocus
              className="w-full min-h-[46px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-base font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Restock supplier Bogasari"
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddStockOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5C7B5] font-bold text-xs text-[#5C3317] hover:bg-[#FAF6F0] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 font-bold text-xs text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Stok Masuk'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Kurangi Stok */}
      <Modal
        isOpen={isReduceStockOpen}
        onClose={() => setIsReduceStockOpen(false)}
        title="Kurangi Stok"
        subtitle={`${product?.name} (${packaging.productCode})`}
      >
        <form onSubmit={handleReduceStock} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <div className="bg-[#FAF7F2] border border-[#ECE4D8] p-3 rounded-xl text-xs">
            <span className="text-[#7A6658]">Stok tersedia saat ini:</span>{' '}
            <strong className="text-[#2D180C]">{packaging.stock} {packaging.packageUnit}</strong>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Jumlah Pengurangan ({packaging.packageUnit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={packaging.stock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Contoh: 2"
              autoFocus
              className="w-full min-h-[46px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-base font-bold text-[#2D180C] focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Catatan Keperluan
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Digunakan produksi roti manis"
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsReduceStockOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5C7B5] font-bold text-xs text-[#5C3317] hover:bg-[#FAF6F0] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] rounded-xl bg-red-700 hover:bg-red-800 font-bold text-xs text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Stok Keluar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Penyesuaian Stok (Opname) */}
      <Modal
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        title="Penyesuaian Stok (Opname)"
        subtitle={`${product?.name} (${packaging.productCode})`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Stok Fisik Sebenarnya ({packaging.packageUnit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Contoh: 15"
              autoFocus
              className="w-full min-h-[46px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-base font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Alasan Penyesuaian
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Hasil stok opname bulanan"
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAdjustStockOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5C7B5] font-bold text-xs text-[#5C3317] hover:bg-[#FAF6F0] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] rounded-xl bg-[#5C3317] hover:bg-[#46260E] font-bold text-xs text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Sesuaikan Stok'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Kemasan Ini?"
        message={`Apakah Anda yakin ingin menghapus kemasan "${packaging.productCode}"? Riwayat transaksi lama tetap dipertahankan.`}
        confirmLabel="Ya, Hapus Kemasan"
        isDanger={true}
        isLoading={isSubmitting}
      />
    </div>
  );
};
