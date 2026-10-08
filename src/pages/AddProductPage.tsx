import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { productService } from '../services/productService';
import { CATEGORIES, UNITS, PackagingType } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { generateSuggestedSKU, normalizeSKU } from '../utils/skuGenerator';
import { useToast } from '../components/common/Toast';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

export const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingProductId = searchParams.get('productId');
  const { showToast } = useToast();

  const existingProduct = useLiveQuery(
    () => (existingProductId ? db.products.get(existingProductId) : undefined),
    [existingProductId]
  );

  // Form fields
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [type, setType] = useState<PackagingType>('ORIGINAL');
  const [productCode, setProductCode] = useState('');
  const [packageSize, setPackageSize] = useState<string>('1');
  const [packageUnit, setPackageUnit] = useState<string>('kg');
  const [stock, setStock] = useState<string>('1');
  const [minimumStock, setMinimumStock] = useState<string>('1');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);

  // Validation & status
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCodeAvailable, setIsCodeAvailable] = useState<boolean | null>(null);

  // If existing product is loaded, preset name and category
  useEffect(() => {
    if (existingProduct) {
      setProductName(existingProduct.name);
      setCategory(existingProduct.category);
      setType('REPACK'); // Commonly people add repack variants
    }
  }, [existingProduct]);

  // Initial code suggestion
  useEffect(() => {
    if (!productCode) {
      const suggested = generateSuggestedSKU(
        productName,
        type,
        Number(packageSize) || 1,
        packageUnit
      );
      setProductCode(suggested);
    }
  }, [productName, type, packageSize, packageUnit]);

  // Live code check
  useEffect(() => {
    if (!productCode.trim()) {
      setIsCodeAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      const avail = await productService.isProductCodeAvailable(productCode);
      setIsCodeAvailable(avail);
    }, 250);
    return () => clearTimeout(timer);
  }, [productCode]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setErrorMsg('');
      const compressedBase64 = await compressImage(file);
      setImage(compressedBase64);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGenerateSKU = () => {
    const suggested = generateSuggestedSKU(
      productName,
      type,
      Number(packageSize) || 1,
      packageUnit
    );
    setProductCode(suggested);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!productName.trim()) {
      setErrorMsg('Nama bahan wajib diisi.');
      return;
    }
    if (!category.trim()) {
      setErrorMsg('Kategori wajib dipilih.');
      return;
    }
    if (!productCode.trim()) {
      setErrorMsg('Kode barang (SKU) wajib diisi.');
      return;
    }

    const sizeNum = Number(packageSize);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setErrorMsg('Ukuran kemasan harus angka lebih besar dari 0.');
      return;
    }

    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMsg('Jumlah stok tidak boleh negatif.');
      return;
    }

    const minStockNum = Number(minimumStock);
    if (isNaN(minStockNum) || minStockNum < 0) {
      setErrorMsg('Minimum stok tidak boleh negatif.');
      return;
    }

    const priceNum = purchasePrice.trim() ? Number(purchasePrice) : undefined;
    if (priceNum !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      setErrorMsg('Harga beli tidak boleh negatif.');
      return;
    }

    try {
      setIsSubmitting(true);

      const normalizedCode = normalizeSKU(productCode);
      const isUnique = await productService.isProductCodeAvailable(normalizedCode);
      if (!isUnique) {
        setErrorMsg(`Kode barang "${normalizedCode}" sudah digunakan.`);
        setIsSubmitting(false);
        return;
      }

      if (existingProductId) {
        // Adding new packaging variant to existing product
        const newPkg = await productService.addPackagingToExistingProduct({
          productId: existingProductId,
          productCode: normalizedCode,
          type,
          packageSize: sizeNum,
          packageUnit,
          initialStock: stockNum,
          minimumStock: minStockNum,
          image,
          purchasePrice: priceNum,
          supplier: supplier.trim(),
          location: location.trim(),
          barcode: barcode.trim(),
          initialNote: 'Penambahan varian kemasan',
        });
        showToast(`Varian kemasan ${newPkg.productCode} berhasil ditambahkan!`);
        navigate(`/packaging/${newPkg.id}`, { replace: true });
      } else {
        // Creating new product with initial packaging
        const result = await productService.createProductWithInitialPackaging({
          productName: productName.trim(),
          category: category.trim(),
          productCode: normalizedCode,
          type,
          packageSize: sizeNum,
          packageUnit,
          initialStock: stockNum,
          minimumStock: minStockNum,
          image,
          purchasePrice: priceNum,
          supplier: supplier.trim(),
          location: location.trim(),
          barcode: barcode.trim(),
          initialNote: 'Penambahan bahan baru pertama kali',
        });
        showToast(`Bahan ${result.product.name} berhasil disimpan!`);
        navigate(`/packaging/${result.packaging.id}`, { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-[#ECE4D8] px-4 py-3.5 sticky top-0 z-30 shadow-2xs flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#5C3317] hover:text-[#46260E] p-1 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>
        <h1 className="text-sm font-extrabold text-[#2D180C]">
          {existingProductId ? 'Tambah Varian Kemasan' : 'Tambah Bahan Baru'}
        </h1>
        <div className="w-8" />
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Foto Produk Section */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs">
          <label className="block text-xs font-bold text-[#4A2810] mb-2">
            Foto Kemasan Bahan
          </label>

          {image ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#ECE4D8] w-full h-48 bg-[#FAF7F2] flex items-center justify-center">
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImage(undefined)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
                aria-label="Hapus foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Kamera Direct */}
              <label className="flex-1 min-h-[56px] border-2 border-dashed border-[#E0D5C5] hover:border-[#5C3317] bg-[#F7EFE8] rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition p-3 text-center">
                <Camera className="w-5 h-5 text-[#5C3317]" />
                <span className="text-[11px] font-bold text-[#5C3317]">Ambil Kamera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {/* Gallery Pick */}
              <label className="flex-1 min-h-[56px] border-2 border-dashed border-[#E0D5C5] hover:border-[#5C3317] bg-[#FAF7F2] rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition p-3 text-center">
                <ImageIcon className="w-5 h-5 text-[#8E7969]" />
                <span className="text-[11px] font-bold text-[#6B5545]">Pilih Galeri</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isCompressing && (
            <p className="text-[11px] text-[#5C3317] font-semibold mt-2 animate-pulse">
              Mengoptimalkan & mengompres foto...
            </p>
          )}
          <p className="text-[10px] text-[#8E7969] mt-2">
            Foto otomatis dikompres ke format ringan untuk kecepatan aplikasi offline.
          </p>
        </div>

        {/* Informasi Utama */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#A65B20]">
            Informasi Bahan
          </h3>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Nama Bahan *
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={!!existingProductId}
              placeholder="Contoh: Tepung Terigu Segitiga Biru"
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none disabled:bg-[#FAF7F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Kategori *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!!existingProductId}
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none disabled:bg-[#FAF7F2]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Spesifikasi Kemasan */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#A65B20]">
            Varian Kemasan
          </h3>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1.5">
              Jenis Kemasan *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('ORIGINAL')}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition border ${
                  type === 'ORIGINAL'
                    ? 'bg-[#5C3317] text-white border-[#5C3317] shadow-xs'
                    : 'bg-[#FAF7F2] text-[#6B5545] border-[#E0D5C5] hover:bg-[#F5ECE1]'
                }`}
              >
                Original (Pabrik/Karung)
              </button>
              <button
                type="button"
                onClick={() => setType('REPACK')}
                className={`py-2.5 rounded-xl text-xs font-extrabold transition border ${
                  type === 'REPACK'
                    ? 'bg-[#C46820] text-white border-[#C46820] shadow-xs'
                    : 'bg-[#FAF7F2] text-[#6B5545] border-[#E0D5C5] hover:bg-[#F5ECE1]'
                }`}
              >
                Repack (Eceran Toko)
              </button>
            </div>
          </div>

          {/* Kode Barang / SKU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A2810]">
                Kode Barang / SKU *
              </label>
              <button
                type="button"
                onClick={handleGenerateSKU}
                className="text-[11px] font-bold text-[#C46820] hover:text-[#5C3317] flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3 h-3" /> Generate Kode
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                placeholder="Contoh: TPG-ORI-001 / BHN001"
                className="w-full min-h-[44px] font-mono px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
              <div className="absolute right-3 top-3">
                {isCodeAvailable === true && (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                {isCodeAvailable === false && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
            {isCodeAvailable === false && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">
                Kode barang ini sudah digunakan. Silakan ganti kode.
              </p>
            )}
          </div>

          {/* Ukuran dan Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Ukuran Kemasan *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                placeholder="25"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Satuan *
              </label>
              <select
                value={packageUnit}
                onChange={(e) => setPackageUnit(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stok Awal dan Minimum */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Jumlah Stok Awal *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="10"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Minimum Stok *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                placeholder="2"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Informasi Opsional */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#A65B20]">
            Informasi Tambahan (Opsional)
          </h3>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Harga Beli (Rp)
            </label>
            <input
              type="number"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Contoh: 285000"
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Bogasari Distributor"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Lokasi Rak
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Rak A-02"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Barcode (Opsional)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="899123456789"
              className="w-full min-h-[44px] font-mono px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isCodeAvailable === false}
          className="w-full min-h-[50px] bg-[#5C3317] hover:bg-[#46260E] text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Bahan ke Inventory'}
        </button>
      </form>
    </div>
  );
};
