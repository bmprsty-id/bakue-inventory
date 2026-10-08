import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { productService } from '../services/productService';
import { CATEGORIES } from '../types';
import { StockBadge } from '../components/common/StockBadge';
import { ProductImage } from '../components/common/ProductImage';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  PackageCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const product = useLiveQuery(() => (id ? db.products.get(id) : undefined), [id]);
  const packagings = useLiveQuery(
    () => (id ? db.productPackagings.where('productId').equals(id).toArray() : []),
    [id]
  ) || [];

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Memuat data bahan...
      </div>
    );
  }

  const handleOpenEdit = () => {
    setEditName(product.name);
    setEditCategory(product.category);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Nama bahan tidak boleh kosong', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await productService.updateProduct(product.id, editName, editCategory);
      showToast('Data bahan berhasil diperbarui');
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui bahan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      setIsSubmitting(true);
      await productService.deleteProduct(product.id);
      showToast('Bahan dan semua kemasannya berhasil dihapus');
      navigate('/products', { replace: true });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus bahan', 'error');
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const primaryImage = packagings.find((p) => p.image)?.image;

  return (
    <div className="flex flex-col min-h-full pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-[#ECE4D8] px-4 py-3 sticky top-0 z-30 shadow-2xs flex items-center justify-between">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5C3317] hover:text-[#46260E] p-1 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Daftar Bahan</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenEdit}
            className="p-2 text-[#7A6658] hover:text-[#5C3317] rounded-xl hover:bg-[#FAF4EC] transition"
            aria-label="Edit bahan"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="p-2 text-red-500 hover:text-red-700 rounded-xl hover:bg-red-50 transition"
            aria-label="Hapus bahan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Header Card */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-5 shadow-xs">
          {primaryImage && (
            <ProductImage
              src={primaryImage}
              alt={product.name}
              size="xl"
              className="mb-4"
            />
          )}

          <span className="text-xs font-bold uppercase tracking-wider text-[#C46820]">
            {product.category}
          </span>
          <h1 className="text-2xl font-black text-[#2D180C] tracking-tight mt-0.5">
            {product.name}
          </h1>

          <div className="flex items-center gap-3 mt-3 text-xs text-[#8E7969] font-medium">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#A65B20]" />
              {packagings.length} varian kemasan
            </span>
          </div>
        </div>

        {/* Kemasan Tersedia */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#2D180C] flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[#5C3317]" />
              Kemasan Tersedia
            </h2>
            <Link
              to={`/add-product?productId=${product.id}`}
              className="flex items-center gap-1 text-xs font-bold text-[#5C3317] hover:text-[#46260E] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Varian Kemasan</span>
            </Link>
          </div>

          <div className="space-y-2.5">
            {packagings.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => navigate(`/packaging/${pkg.id}`)}
                className="bg-white border border-[#ECE4D8] hover:border-[#5C3317] rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 active:scale-98 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProductImage src={pkg.image} alt={pkg.productCode} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          pkg.type === 'ORIGINAL'
                            ? 'bg-[#F2E8DC] text-[#5C3317]'
                            : 'bg-[#FAF0E4] text-[#A65B20]'
                        }`}
                      >
                        {pkg.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#2D180C]">
                        {pkg.productCode}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A6658] mt-1">
                      {pkg.packageSize} {pkg.packageUnit} / pack
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-[#2D180C]">
                      {pkg.stock} {pkg.packageUnit}
                    </div>
                    <StockBadge stock={pkg.stock} minimumStock={pkg.minimumStock} size="sm" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBB8A3]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Edit Nama/Kategori */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Info Bahan"
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Nama Bahan *
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Kategori *
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-[#D5C7B5] font-bold text-xs text-[#5C3317] hover:bg-[#FAF6F0] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] rounded-xl bg-[#5C3317] hover:bg-[#46260E] font-bold text-xs text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Product */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Hapus Seluruh Bahan?"
        message={`Apakah Anda yakin ingin menghapus "${product.name}" beserta ${packagings.length} varian kemasannya?`}
        confirmLabel="Ya, Hapus Semua"
        isDanger={true}
        isLoading={isSubmitting}
      />
    </div>
  );
};
