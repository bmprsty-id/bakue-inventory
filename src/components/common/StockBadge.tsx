import React from 'react';
import { StockStatus } from '../../types';

interface StockBadgeProps {
  stock: number;
  minimumStock: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function getStockStatus(stock: number, minimumStock: number): StockStatus {
  if (stock <= 0) return 'HABIS';
  if (stock <= minimumStock) return 'MENIPIS';
  return 'AMAN';
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  stock,
  minimumStock,
  className = '',
  size = 'md',
}) => {
  const status = getStockStatus(stock, minimumStock);

  let badgeColor = '';
  let dotColor = '';

  switch (status) {
    case 'HABIS':
      badgeColor = 'bg-red-50 text-red-700 border border-red-200';
      dotColor = 'bg-red-600 animate-pulse';
      break;
    case 'MENIPIS':
      badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
      dotColor = 'bg-amber-500';
      break;
    case 'AMAN':
      badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      dotColor = 'bg-emerald-600';
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-semibold'
      : 'px-2.5 py-1 text-xs font-bold tracking-wide';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses} ${badgeColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
};
