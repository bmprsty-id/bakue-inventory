import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'banner' | 'button' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Hide completely if already running in standalone PWA mode
  if (isInstalled) {
    return null;
  }

  const guideTitle = isIOS ? 'Pasang di iPhone / iPad' : 'Pasang Aplikasi di HP';

  if (variant === 'settings') {
    return (
      <>
        <div className={`p-4 bg-[#F8F2EB] border border-[#E9DDD0] rounded-2xl flex items-center justify-between gap-3 ${className}`}>
          <div>
            <h4 className="text-sm font-bold text-[#5C3317]">Pasang Bakue ke HP</h4>
            <p className="text-xs text-[#825330] mt-0.5">
              Gunakan seperti aplikasi native, buka cepat dan offline.
            </p>
          </div>
          {isInstallable ? (
            <button
              onClick={install}
              className="px-3.5 py-2 bg-[#5C3317] hover:bg-[#46260E] text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition active:scale-95"
            >
              Install App
            </button>
          ) : (
            <button
              onClick={() => setShowGuide(true)}
              className="px-3.5 py-2 bg-[#5C3317] hover:bg-[#46260E] text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition active:scale-95"
            >
              Cara Pasang
            </button>
          )}
        </div>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-fade-in border border-[#EBE3D5]">
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE4D8]">
                <h3 className="text-base font-bold text-[#2D180C]">{guideTitle}</h3>
                <button onClick={() => setShowGuide(false)} className="text-[#8E7969] hover:text-[#5C3317] p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs sm:text-sm text-[#5C3317]">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                        <Share className="w-4 h-4" />
                      </div>
                      <p>1. Ketuk tombol <strong>Share</strong> (Bagikan) di Safari.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <p>2. Gulir ke bawah lalu ketuk <strong>Tambah ke Layar Utama</strong> (Add to Home Screen).</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <p>1. Buka menu browser (ikon titik tiga di pojok kanan atas).</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <p>2. Pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="mt-6 w-full rounded-xl bg-[#5C3317] py-3 text-sm font-bold text-white hover:bg-[#46260E] transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-[#5C3317] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#46260E] active:scale-95 transition ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install PWA</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className={`flex items-center gap-1.5 rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#5C3317] hover:bg-[#FAF6F0] active:scale-95 transition shadow-xs ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-[#5C3317]" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-fade-in border border-[#EBE3D5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE4D8]">
              <h3 className="text-base font-bold text-[#2D180C]">{guideTitle}</h3>
              <button onClick={() => setShowGuide(false)} className="text-[#8E7969] hover:text-[#5C3317] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs sm:text-sm text-[#5C3317]">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                      <Share className="w-4 h-4" />
                    </div>
                    <p>1. Ketuk tombol <strong>Share</strong> (Bagikan) di Safari.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <p>2. Pilih <strong>Tambah ke Layar Utama</strong> (Add to Home Screen).</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <p>1. Buka menu browser (ikon titik tiga).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F5ECE1] text-[#5C3317] flex items-center justify-center shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <p>2. Pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full rounded-xl bg-[#5C3317] py-3 text-sm font-bold text-white hover:bg-[#46260E] transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
