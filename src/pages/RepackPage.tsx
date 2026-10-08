import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { stockService } from '../services/stockService';
import { ProductImage } from '../components/common/ProductImage';
import { useToast } from '../components/common/Toast';
import {
  ArrowLeft,
  Repeat,
  ArrowDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  Package,
} from 'lucide-react';

export const RepackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSourceId = searchParams.get('sourceId');
  const { showToast } = useToast();

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const packagings = useLiveQuery(() => db.productPackagings.toArray(), []) || [];

  const [selectedSourceId, setSelectedSourceId] = useState<string>(preselectedSourceId || '');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  // Mode: apakah mengurangi kemasan utuh (misal 1 karung) atau jumlah parsial (misal 10 kg)
  const [reductionMode, setReductionMode] = useState<'PACK' | 'SUBSTANCE'>('PACK');
  const [packsUsed, setPacksUsed] = useState<string>('1');
  const [substanceUsed, setSubstanceUsed] = useState<string>('');

  const [manualResultPacks, setManualResultPacks] = useState<string>('');
  const [note, setNote] = useState<string>('Repack harian');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Source packaging
  const sourcePkg = useMemo(
    () => packagings.find((p) => p.id === selectedSourceId),
    [packagings, selectedSourceId]
  );
  const sourceProduct = useMemo(
    () => (sourcePkg ? productMap.get(sourcePkg.productId) : undefined),
    [sourcePkg, productMap]
  );

  // Default to first source packaging if none selected
  useEffect(() => {
    if (!selectedSourceId && packagings.length > 0) {
      const defaultSource = packagings.find((p) => p.type === 'ORIGINAL') || packagings[0];
      if (defaultSource) setSelectedSourceId(defaultSource.id);
    }
  }, [packagings, selectedSourceId]);

  // Target packaging options: repack variants of the same product
  const targetOptions = useMemo(() => {
    if (!sourcePkg) return [];
    return packagings.filter(
      (p) => p.productId === sourcePkg.productId && p.id !== sourcePkg.id
    );
  }, [packagings, sourcePkg]);

  // Auto-select first target repack if available
  useEffect(() => {
    if (targetOptions.length > 0) {
      if (!selectedTargetId || !targetOptions.some((t) => t.id === selectedTargetId)) {
        setSelectedTargetId(targetOptions[0].id);
      }
    } else {
      setSelectedTargetId('');
    }
  }, [targetOptions, selectedTargetId]);

  const targetPkg = useMemo(
    () => packagings.find((p) => p.id === selectedTargetId),
    [packagings, selectedTargetId]
  );

  // Conversion calculations:
  // Convert units to common baseline if possible (kg <-> gram, liter <-> ml)
  const calculation = useMemo(() => {
    if (!sourcePkg || !targetPkg) return null;

    let totalSubstance = 0; // Total quantity in source packaging's raw size unit

    if (reductionMode === 'PACK') {
      const numPacks = Number(packsUsed) || 0;
      totalSubstance = numPacks * sourcePkg.packageSize;
    } else {
      totalSubstance = Number(substanceUsed) || 0;
    }

    if (totalSubstance <= 0) {
      return {
        totalSubstance: 0,
        calculatedPacks: 0,
        fullPacks: 0,
        remainder: 0,
        hasRemainder: false,
        unitLabel: sourcePkg.packageUnit,
      };
    }

    // Unit conversion helper
    let sourceWeightInGrams = totalSubstance;
    let targetWeightInGrams = targetPkg.packageSize;

    const sUnit = sourcePkg.packageUnit.toLowerCase();
    const tUnit = targetPkg.packageUnit.toLowerCase();

    // If kg and gram
    if (sUnit === 'kg') sourceWeightInGrams = totalSubstance * 1000;
    if (tUnit === 'kg') targetWeightInGrams = targetPkg.packageSize * 1000;

    // If liter and ml
    if (sUnit === 'liter' || sUnit === 'l') sourceWeightInGrams = totalSubstance * 1000;
    if (tUnit === 'liter' || tUnit === 'l') targetWeightInGrams = targetPkg.packageSize * 1000;

    const exactPacks = sourceWeightInGrams / targetWeightInGrams;
    const fullPacks = Math.floor(exactPacks);
    const remainderWeightInGrams = sourceWeightInGrams - fullPacks * targetWeightInGrams;

    let remainderInSourceUnit = remainderWeightInGrams;
    if (sUnit === 'kg') remainderInSourceUnit = remainderWeightInGrams / 1000;
    if (sUnit === 'liter' || sUnit === 'l') remainderInSourceUnit = remainderWeightInGrams / 1000;

    const hasRemainder = exactPacks !== fullPacks && remainderWeightInGrams > 0.0001;

    return {
      totalSubstance,
      calculatedPacks: exactPacks,
      fullPacks,
      remainder: Number(remainderInSourceUnit.toFixed(3)),
      hasRemainder,
      unitLabel: sourcePkg.packageUnit,
    };
  }, [sourcePkg, targetPkg, reductionMode, packsUsed, substanceUsed]);

  // Set manual / auto result packs
  useEffect(() => {
    if (calculation && calculation.fullPacks > 0) {
      setManualResultPacks(String(calculation.fullPacks));
    }
  }, [calculation]);

  const handleExecuteRepack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sourcePkg || !targetPkg) {
      setErrorMsg('Pilih kemasan sumber dan kemasan tujuan repack.');
      return;
    }

    let sourceStockDeduction = 0;
    let sourceDesc = '';

    if (reductionMode === 'PACK') {
      const pCount = Number(packsUsed);
      if (isNaN(pCount) || pCount <= 0) {
        setErrorMsg('Masukkan jumlah kemasan asal yang digunakan.');
        return;
      }
      if (pCount > sourcePkg.stock) {
        setErrorMsg(`Stok kemasan asal tidak mencukupi (tersedia: ${sourcePkg.stock} kemasan).`);
        return;
      }
      sourceStockDeduction = pCount;
      sourceDesc = `${pCount} kemasan (${pCount * sourcePkg.packageSize} ${sourcePkg.packageUnit})`;
    } else {
      const subAmt = Number(substanceUsed);
      if (isNaN(subAmt) || subAmt <= 0) {
        setErrorMsg('Masukkan jumlah bahan yang digunakan.');
        return;
      }

      // Total substance available across all packs
      const totalAvailableSubstance = sourcePkg.stock * sourcePkg.packageSize;
      if (subAmt > totalAvailableSubstance) {
        setErrorMsg(
          `Stok bahan tidak mencukupi (tersedia: ${totalAvailableSubstance} ${sourcePkg.packageUnit} dari ${sourcePkg.stock} kemasan).`
        );
        return;
      }

      // Calculate how many packs are opened from stock
      if (sourcePkg.packageSize <= 1) {
        sourceStockDeduction = Math.min(sourcePkg.stock, Math.ceil(subAmt));
      } else {
        sourceStockDeduction = Math.min(
          sourcePkg.stock,
          Math.ceil(subAmt / sourcePkg.packageSize)
        );
      }

      const openedCapacity = sourceStockDeduction * sourcePkg.packageSize;
      const openedRemainder = Number((openedCapacity - subAmt).toFixed(3));

      sourceDesc = `${subAmt} ${sourcePkg.packageUnit} (membuka ${sourceStockDeduction} kemasan${
        openedRemainder > 0 ? `, sisa belum dikemas: ${openedRemainder} ${sourcePkg.packageUnit}` : ''
      })`;
    }

    const packsResult = Number(manualResultPacks);
    if (isNaN(packsResult) || packsResult <= 0) {
      setErrorMsg('Jumlah kemasan repack hasil harus lebih besar dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      const leftoverText =
        calculation && calculation.hasRemainder
          ? `${calculation.remainder} ${calculation.unitLabel}`
          : undefined;

      await stockService.executeRepack({
        sourcePackagingId: sourcePkg.id,
        targetPackagingId: targetPkg.id,
        sourceQuantityUsed: sourceStockDeduction,
        sourceUnitsDescription: sourceDesc,
        targetPacksProduced: packsResult,
        leftoverDescription: leftoverText,
        note: note.trim() || undefined,
      });

      showToast(
        `Sukses! Repack ${packsResult} ${targetPkg.packageUnit} ${targetPkg.productCode} berhasil diproses.`
      );
      navigate(`/packaging/${targetPkg.id}`, { replace: true });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses repack.');
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
        <h1 className="text-sm font-extrabold text-[#2D180C] flex items-center gap-1.5">
          <Repeat className="w-4 h-4 text-[#C46820]" />
          Proses Repack Bahan
        </h1>
        <div className="w-8" />
      </div>

      <form onSubmit={handleExecuteRepack} className="p-4 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. KEMASAN SUMBER (DARI) */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C3317]">
              1. Dari Kemasan Asal
            </span>
            <span className="text-xs font-medium text-[#8E7969]">Sumber Bahan</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Pilih Kemasan Asal (Original / Karung / Box) *
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full min-h-[46px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            >
              {packagings.map((pkg) => {
                const prod = productMap.get(pkg.productId);
                return (
                  <option key={pkg.id} value={pkg.id}>
                    {prod?.name} ({pkg.productCode}) — {pkg.type} {pkg.packageSize} {pkg.packageUnit} [Stok: {pkg.stock} kemasan]
                  </option>
                );
              })}
            </select>
          </div>

          {sourcePkg && (
            <div className="bg-[#FAF7F2] border border-[#ECE4D8] rounded-2xl p-3 flex items-center gap-3">
              <ProductImage
                src={sourcePkg.image}
                alt={sourcePkg.productCode}
                size="sm"
              />
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-[#2D180C] truncate">
                  {sourceProduct?.name}
                </div>
                <div className="text-[#7A6658] font-mono mt-0.5">
                  {sourcePkg.productCode} • {sourcePkg.packageSize} {sourcePkg.packageUnit} / kemasan
                </div>
                <div className="font-extrabold text-[#5C3317] mt-1">
                  Stok: {sourcePkg.stock} kemasan (Total: {sourcePkg.stock * sourcePkg.packageSize} {sourcePkg.packageUnit})
                </div>
              </div>
            </div>
          )}

          {/* Mode Pengurangan */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-[#4A2810] mb-1.5">
              Metode Pengambilan Bahan *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setReductionMode('PACK')}
                className={`py-2 px-3 rounded-xl border transition ${
                  reductionMode === 'PACK'
                    ? 'bg-[#5C3317] text-white border-[#5C3317] shadow-xs'
                    : 'bg-[#FAF7F2] text-[#6B5545] border-[#E0D5C5] hover:bg-[#F5ECE1]'
                }`}
              >
                Kemasan Utuh ({sourcePkg?.packageUnit || 'kemasan'})
              </button>
              <button
                type="button"
                onClick={() => setReductionMode('SUBSTANCE')}
                className={`py-2 px-3 rounded-xl border transition ${
                  reductionMode === 'SUBSTANCE'
                    ? 'bg-[#5C3317] text-white border-[#5C3317] shadow-xs'
                    : 'bg-[#FAF7F2] text-[#6B5545] border-[#E0D5C5] hover:bg-[#F5ECE1]'
                }`}
              >
                Porsi Berat ({sourcePkg?.packageUnit || 'kg'})
              </button>
            </div>
          </div>

          {reductionMode === 'PACK' ? (
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Jumlah Kemasan Asal Digunakan (Kemasan) *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                max={sourcePkg?.stock || 9999}
                value={packsUsed}
                onChange={(e) => setPacksUsed(e.target.value)}
                placeholder="1"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-base font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
              <span className="text-[11px] text-[#8E7969] mt-1 block">
                Total bahan dibuka: {(Number(packsUsed) || 0) * (sourcePkg?.packageSize || 0)} {sourcePkg?.packageUnit}
              </span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[#4A2810] mb-1">
                Jumlah Bahan Digunakan ({sourcePkg?.packageUnit}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                max={(sourcePkg?.stock || 0) * (sourcePkg?.packageSize || 1)}
                value={substanceUsed}
                onChange={(e) => setSubstanceUsed(e.target.value)}
                placeholder="Contoh: 10"
                className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-base font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              />
              <span className="text-[11px] text-[#8E7969] mt-1 block">
                Tersedia maksimum: {(sourcePkg?.stock || 0) * (sourcePkg?.packageSize || 1)} {sourcePkg?.packageUnit}
              </span>
            </div>
          )}
        </div>

        {/* Arrow Divider */}
        <div className="flex justify-center -my-1 relative z-10">
          <div className="w-10 h-10 rounded-full bg-[#5C3317] text-[#FAF7F2] flex items-center justify-center shadow-md border-2 border-white">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>

        {/* 2. KEMASAN TUJUAN (MENJADI REPACK) */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C46820]">
              2. Menjadi Kemasan Repack
            </span>
            <span className="text-xs font-medium text-[#8E7969]">Hasil Kemas Toko</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Pilih Kemasan Repack Tujuan *
            </label>
            {targetOptions.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                <p>
                  Bahan ini belum memiliki varian Repack yang terdaftar.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/add-product?productId=${sourcePkg?.productId}`)}
                  className="px-3 py-1.5 bg-[#C46820] text-white rounded-lg text-xs font-bold hover:bg-[#A65516]"
                >
                  + Buat Varian Repack Baru
                </button>
              </div>
            ) : (
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full min-h-[46px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-bold text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
              >
                {targetOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.productCode} — {t.type} {t.packageSize} {t.packageUnit} [Stok sekarang: {t.stock} {t.packageUnit}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {targetPkg && (
            <div className="bg-[#FAF2E8] border border-[#EADAC9] rounded-2xl p-3 flex items-center gap-3">
              <ProductImage src={targetPkg.image} alt={targetPkg.productCode} size="sm" />
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-[#2D180C] truncate">
                  {sourceProduct?.name} ({targetPkg.type})
                </div>
                <div className="text-[#7A6658] font-mono mt-0.5">
                  {targetPkg.productCode} • {targetPkg.packageSize} {targetPkg.packageUnit} / pack
                </div>
                <div className="font-extrabold text-[#C46820] mt-1">
                  Stok saat ini: {targetPkg.stock} {targetPkg.packageUnit}
                </div>
              </div>
            </div>
          )}

          {/* Automatic Calculation & Result */}
          {calculation && (
            <div className="bg-[#FAF7F2] border border-[#ECE4D8] rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#7A6658]">
                <span>Perhitungan Otomatis:</span>
                <span className="font-mono text-[#2D180C]">
                  {calculation.totalSubstance} {calculation.unitLabel} ÷ {targetPkg?.packageSize} {targetPkg?.packageUnit}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EAE0D2] pt-2">
                <span className="font-bold text-[#4A2810]">Estimasi Kemasan Utuh:</span>
                <span className="font-black text-sm text-[#5C3317]">
                  {calculation.fullPacks} {targetPkg?.packageUnit}
                </span>
              </div>

              {calculation.hasRemainder && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Perhatian: Ada sisa bahan!</span>
                    <p className="text-[11px] mt-0.5">
                      Hasil pembagian tidak pas utuh. Terdapat sisa bahan sekitar{' '}
                      <strong>
                        {calculation.remainder} {calculation.unitLabel}
                      </strong>
                      . Sisa dicatat di deskripsi riwayat transaksi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Konfirmasi Jumlah Hasil Repack */}
          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Jumlah Kemasan Repack yang Dihasilkan ({targetPkg?.packageUnit || 'pack'}) *
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={manualResultPacks}
              onChange={(e) => setManualResultPacks(e.target.value)}
              placeholder="Contoh: 10"
              className="w-full min-h-[46px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-base font-black text-[#5C3317] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2810] mb-1">
              Catatan Repack
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Repack harian untuk etalase"
              className="w-full min-h-[44px] px-3.5 py-2 border border-[#E0D5C5] rounded-xl text-xs font-medium text-[#2D180C] focus:ring-2 focus:ring-[#5C3317] focus:outline-none"
            />
          </div>
        </div>

        {/* Ringkasan Eksekusi */}
        {sourcePkg && targetPkg && (
          <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs text-xs space-y-2">
            <h4 className="font-bold text-[#2D180C] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Ringkasan Mutasi Terhubung
            </h4>
            <div className="flex items-center justify-between text-[#6B5545] py-1">
              <span>{sourcePkg.productCode} (Original)</span>
              <strong className="text-red-700">
                -{reductionMode === 'PACK' ? `${packsUsed} kemasan` : `${Math.ceil((Number(substanceUsed) || 0) / (sourcePkg.packageSize || 1))} kemasan`}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[#6B5545] py-1 border-t border-[#F2EBE1]">
              <span>{targetPkg.productCode} (Repack)</span>
              <strong className="text-emerald-700">
                +{manualResultPacks || '0'} {targetPkg.packageUnit}
              </strong>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !sourcePkg || !targetPkg || !manualResultPacks}
          className="w-full min-h-[50px] bg-[#5C3317] hover:bg-[#46260E] text-white rounded-2xl font-bold text-sm shadow-md active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Repeat className="w-4 h-4 text-[#F3E2D0]" />
          <span>{isSubmitting ? 'Memproses Repack...' : 'Konfirmasi & Proses Repack'}</span>
        </button>
      </form>
    </div>
  );
};
