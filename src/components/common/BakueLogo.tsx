import React from 'react';

interface BakueLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const BakueLogo: React.FC<BakueLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const imageSizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-18 h-18',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`relative shrink-0 rounded-2xl overflow-hidden shadow-xs border border-[#5C311B]/15 bg-[#F7F2E6] flex items-center justify-center p-0.5 transition-transform ${sizeMap[size]}`}
      >
        <img
          src="/bakue_logo.png"
          alt="Bakue Logo"
          className={`${imageSizeMap[size]} object-contain`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.endsWith('.png')) {
              target.src = '/bakue_logo.jpg';
            }
          }}
        />
      </div>
      {showSubtitle && (
        <div className="flex flex-col">
          <span className="font-black text-sm tracking-tight text-[#482E1F] leading-none">
            Bakue
          </span>
          <span className="text-[10px] font-bold text-[#8D6A56] uppercase tracking-wider mt-0.5">
            Inventory Bahan Kue
          </span>
        </div>
      )}
    </div>
  );
};

