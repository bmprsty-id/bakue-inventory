import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { productService } from '../services/productService';
import { UNITS, PackagingType } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { normalizeSKU } from '../utils/skuGenerator';
import { useToast } from '../components/common/Toast';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';

export const EditPackagingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const packaging = useLiveQuery(() => (id ? db.productPackagings.get(id) : undefined), [id]);
  const product = useLiveQuery(
    () => (packaging?.productId ? db.products.get(packaging.productId) : undefined),
    [packaging?.productId]
  );

  const [type, setType] = useState<PackagingType>('ORIGINAL');
  const [productCode, setProductCode] = useState('');
  const [packageSize, setPackageSize] = useState<string>('1');
  const [packageUnit, setPackageUnit] = useState<string>('kg');
  const [minimumStock, setMinimumStock] = useState<string>('1');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCodeAvailable, setIsCodeAvailable] = useState<boolean | null>(true);

  useEffect(() => {
    if (packaging) {
      setType(packaging.type);
      setProductCode(packaging.productCode);
      setPackageSize(String(packaging.packageSize));
      setPackageUnit(packaging.packageUnit);
      setMinimumStock(String(packaging.minimumStock));
      setPurchasePrice(packaging.purchasePrice !== undefined ? String(packaging.purchasePrice) : '');
      setSupplier(packaging.supplier || '');
      setLocation(packaging.location || '');
      setBarcode(packaging.barcode || '');
      setImage(packaging.image);
    }
  }, [packaging]);

  // Check code availability
  useEffect(() => {
    if (!productCode.trim() || !id) return;
    const timer = setTimeout(async () => {
      const avail = await productService.isProductCodeAvailable(productCode, id);
      setIsCodeAvailable(avail);
    }, 250);
    return () => clearTimeout(timer);
  }, [productCode, id]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setErrorMsg('');
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMsg('');

    if (!productCode.trim()) {
      setErrorMsg('Kode barang (SKU) wajib diisi.');
      return;
    }

    const sizeNum = Number(packageSize);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setErrorMsg('Ukuran kemasan harus lebih dari 0.');
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
      const isUnique = await productService.isProductCodeAvailable(normalizedCode, id);
      if (!isUnique) {
        setErrorMsg(`Kode barang "${normalizedCode}" sudah digunakan.`);
        setIsSubmitting(false);
        return;
      }

      await productService.updatePackagingMetadata(id, {
        productCode: normalizedCode,
        type,
        packageSize: sizeNum,
        packageUnit,
        minimumStock: minStockNum,
        image,
        purchasePrice: priceNum,
        supplier: supplier.trim(),
        location: location.trim(),
        barcode: barcode.trim(),
      });

      showToast('Data kemasan berhasil diperbarui.');
      navigate(`/packaging/${id}`, { replace: true });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!packaging) {
    return <div className="p-6 text-center text-sm text-gray-500">Memuat data...</div>;
  }

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
        <h1 className="text-sm font-extrabold text-gray-900">
          Edit Kemasan ({product?.name})
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

        {/* Info Note: Stock cannot be modified here */}
        <div className="p-3.5 bg-[#FAF4EC] border border-[#E9DDD0] rounded-2xl flex items-start gap-2.5 text-xs text-[#5C3317]">
          <Info className="w-4 h-4 text-[#C46820] shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Stok saat ini: {packaging.stock} {packaging.packageUnit}</strong>
            <p className="text-[11px] text-[#7A6658] mt-0.5">
              Perubahan stok fisik dilakukan melalui menu Tambah/Kurangi Stok atau Repack agar tercatat rapi di riwayat.
            </p>
          </div>
        </div>

        {/* Foto Produk */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs">
          <label className="block text-xs font-bold text-[#4A2810] mb-2">
            Foto Kemasan
          </label>
          {image ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#ECE4D8] w-full h-44 bg-[#FAF7F2] flex items-center justify-center">
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImage(undefined)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex-1 min-h-[50px] border-2 border-dashed border-[#E0D5C5] hover:border-[#5C3317] bg-[#F7EFE8] rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition p-3 text-center">
                <Camera className="w-5 h-5 text-[#5C3317]" />
                <span className="text-[11px] font-bold text-[#5C3317]">Kamera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <label className="flex-1 min-h-[50px] border-2 border-dashed border-[#E0D5C5] hover:border-[#5C3317] bg-[#FAF7F2] rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition p-3 text-center">
                <ImageIcon className="w-5 h-5 text-[#8E7969]" />
                <span className="text-[11px] font-bold text-[#6B5545]">Galeri</span>
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
              Mengompres foto...
            </p>
          )}
        </div>

        {/* Metadata Kemasan */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-4">
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
                Original
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
                Repack
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Kode Barang / SKU *
            </label>
            <div className="relative">
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                className="w-full min-h-[44px] font-mono px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
              <div className="absolute right-3 top-3">
                {isCodeAvailable === true && (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                {isCodeAvailable === false && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
          </div>

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

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Batas Minimum Stok *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-sm font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>
        </div>

        {/* Informasi Opsional */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Harga Beli (Rp)
            </label>
            <input
              type="number"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
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
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Barcode
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full min-h-[44px] font-mono px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isCodeAvailable === false}
          className="w-full min-h-[50px] bg-[#5C3317] hover:bg-[#46260E] text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  );
};
