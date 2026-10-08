import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { backupService } from '../services/backupService';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { BakueLogo } from '../components/common/BakueLogo';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { useToast } from '../components/common/Toast';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Info,
  ShieldCheck,
  Smartphone,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productCount = useLiveQuery(() => db.products.count(), []) || 0;
  const packagingCount = useLiveQuery(() => db.productPackagings.count(), []) || 0;
  const movementCount = useLiveQuery(() => db.stockMovements.count(), []) || 0;

  // Clear data dialog states (Two-stage confirmation)
  const [isClearStep1Open, setIsClearStep1Open] = useState(false);
  const [isClearStep2Open, setIsClearStep2Open] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Backup handlers
  const handleExportJSON = async () => {
    try {
      setIsProcessing(true);
      await backupService.exportJSONBackup();
      showToast('File backup JSON berhasil diunduh!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mengekspor backup', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsProcessing(true);
      await backupService.exportCSV();
      showToast('File CSV laporan stok berhasil diunduh!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mengekspor CSV', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const res = await backupService.importJSONBackup(text);
      showToast(
        `Restore berhasil! ${res.productCount} bahan, ${res.packagingCount} kemasan dipulihkan.`
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memulihkan backup', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearDataFinal = async () => {
    try {
      setIsProcessing(true);
      await db.clearAllData();
      showToast('Semua data lokal berhasil dibersihkan.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus data', 'error');
    } finally {
      setIsProcessing(false);
      setIsClearStep2Open(false);
    }
  };

  const handleResetToSeed = async () => {
    try {
      setIsProcessing(true);
      await db.clearAllData();
      await db.initializeSeedIfEmpty();
      showToast('Data contoh (seed) berhasil dimuat kembali!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat ulang data', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-16">
      {/* Header */}
      <div className="bg-white border-b border-[#ECE4D8] px-4 pt-5 pb-4 sticky top-0 z-30 shadow-2xs">
        <h1 className="text-xl font-black text-[#2D180C] tracking-tight">
          Pengaturan & Cadangan
        </h1>
        <p className="text-xs text-[#8E7969] mt-0.5">
          Kelola data lokal, backup, dan pengaturan aplikasi.
        </p>
      </div>

      <div className="p-4 space-y-5">
        {/* PWA Install Banner */}
        <PWAInstallButton variant="settings" />

        {/* Local Storage Stats */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8E7969] uppercase tracking-wider mb-3">
            <HardDrive className="w-4 h-4 text-[#5C3317]" />
            <span>Penyimpanan Lokal (IndexedDB)</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#ECE4D8]/60">
              <span className="text-lg font-black text-[#2D180C]">{productCount}</span>
              <p className="text-[10px] text-[#8E7969] font-semibold mt-0.5">Bahan</p>
            </div>
            <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#ECE4D8]/60">
              <span className="text-lg font-black text-[#2D180C]">{packagingCount}</span>
              <p className="text-[10px] text-[#8E7969] font-semibold mt-0.5">Kemasan</p>
            </div>
            <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#ECE4D8]/60">
              <span className="text-lg font-black text-[#2D180C]">{movementCount}</span>
              <p className="text-[10px] text-[#8E7969] font-semibold mt-0.5">Mutasi</p>
            </div>
          </div>
        </div>

        {/* Backup & Export Section */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#A65B20]">
            Cadangan & Ekspor Data
          </h3>

          {/* Backup JSON */}
          <button
            onClick={handleExportJSON}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ECE4D8] hover:border-[#5C3317] hover:bg-[#FAF4EC] transition text-left active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7EFE8] text-[#5C3317] flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D180C]">Backup Data (JSON)</h4>
                <p className="text-[11px] text-[#8E7969] mt-0.5">
                  Unduh seluruh database (produk, kemasan, riwayat, foto).
                </p>
              </div>
            </div>
          </button>

          {/* Restore JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ECE4D8] hover:border-emerald-600 hover:bg-emerald-50/40 transition text-left active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D180C]">Restore Data (JSON)</h4>
                <p className="text-[11px] text-[#8E7969] mt-0.5">
                  Pulihkan data dari file cadangan sebelumnya.
                </p>
              </div>
            </div>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ECE4D8] hover:border-[#C46820] hover:bg-amber-50/40 transition text-left active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D180C]">Export Laporan CSV</h4>
                <p className="text-[11px] text-[#8E7969] mt-0.5">
                  Buka di Excel atau Google Sheets untuk laporan stok.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Data Reset & Danger Zone */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#A65B20]">
            Pengelolaan Data
          </h3>

          <button
            onClick={handleResetToSeed}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ECE4D8] hover:bg-[#FAF6F0] transition text-left active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] text-[#5C3317] flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D180C]">Muat Ulang Data Contoh</h4>
                <p className="text-[11px] text-[#8E7969] mt-0.5">
                  Mengembalikan data awal bahan kue untuk demo / testing.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setIsClearStep1Open(true)}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-red-200 bg-red-50/30 hover:bg-red-50 transition text-left active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-700">Kosongkan Semua Data</h4>
                <p className="text-[11px] text-red-600/80 mt-0.5">
                  Hapus seluruh database lokal di perangkat ini.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* About App */}
        <div className="bg-white border border-[#ECE4D8] rounded-3xl p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-3.5">
            <BakueLogo size="lg" />
            <div>
              <h4 className="text-base font-black text-[#5C3317]">Bakue</h4>
              <p className="text-[11px] font-semibold text-[#8E7969]">Versi 1.0.0 — PWA Offline-First</p>
            </div>
          </div>

          <p className="text-[#6D5849] leading-relaxed text-[11px] pt-2 border-t border-[#F2EAE0]">
            Aplikasi pencatatan, pengecekan, dan pengelolaan stok bahan-bahan kue khusus toko Bakue. Beroperasi 100% lokal di browser smartphone tanpa ketergantungan koneksi internet.
          </p>

          <div className="flex items-center gap-4 text-[11px] text-[#8E7969] pt-1">
            <span className="flex items-center gap-1 font-semibold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> Local-First DB
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#5C3317]">
              <Smartphone className="w-3.5 h-3.5" /> Mobile PWA
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Step 1 */}
      <ConfirmDialog
        isOpen={isClearStep1Open}
        onClose={() => setIsClearStep1Open(false)}
        onConfirm={() => {
          setIsClearStep1Open(false);
          setIsClearStep2Open(true);
        }}
        title="Konfirmasi Tahap 1: Kosongkan Data?"
        message="Apakah Anda yakin ingin menghapus seluruh data inventory bahan kue dari perangkat ini? Pastikan Anda sudah mengunduh file backup JSON."
        confirmLabel="Lanjut ke Konfirmasi Akhir"
        isDanger={true}
      />

      {/* Confirmation Step 2 (Mandatory two-stage as per master prompt Section 45) */}
      <ConfirmDialog
        isOpen={isClearStep2Open}
        onClose={() => setIsClearStep2Open(false)}
        onConfirm={handleClearDataFinal}
        title="Konfirmasi Tahap 2: Tindakan Permanen"
        message="PERINGATAN: Tindakan ini TIDAK DAPAT DIBATALKAN. Seluruh produk, kemasan, dan riwayat mutasi akan dihapus secara permanen dari browser ini."
        confirmLabel="Ya, Bersihkan Permanen"
        cancelLabel="Batalkan"
        isDanger={true}
        isLoading={isProcessing}
      />
    </div>
  );
};
