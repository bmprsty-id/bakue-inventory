import React from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-12 h-12 rounded-lg',
    md: 'w-16 h-16 rounded-xl',
    lg: 'w-24 h-24 rounded-2xl',
    xl: 'w-full h-56 rounded-2xl',
  };

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-[#FAF7F2] text-[#8E7969] shrink-0 border border-[#ECE4D8] ${sizeMap[size]} ${className}`}
        aria-label={alt}
      >
        <Package className={size === 'xl' ? 'w-12 h-12 text-[#C4B7A7]' : 'w-6 h-6 text-[#A69584]'} />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[#FAF7F2] shrink-0 border border-[#ECE4D8] shadow-xs ${sizeMap[size]} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.target as HTMLElement;
          target.style.display = 'none';
        }}
      />
    </div>
  );
};
