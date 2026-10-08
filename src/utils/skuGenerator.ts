import { PackagingType } from '../types';

/**
 * Generates a clean suggested SKU code based on product name, packaging type, and size.
 * Example:
 * - "Tepung Terigu", ORIGINAL, 25, "kg" -> "TPG-ORI-25K" or "TPG-ORI-001"
 * - "Butter Anchor", REPACK, 500, "gram" -> "BUT-RP-500G"
 */
export function generateSuggestedSKU(
  productName: string,
  type: PackagingType,
  packageSize?: number,
  packageUnit?: string
): string {
  if (!productName.trim()) {
    return `${type === 'ORIGINAL' ? 'ORI' : 'RP'}-${Math.floor(100 + Math.random() * 900)}`;
  }

  // Extract up to 3 uppercase letters from first word or initials
  const cleanName = productName.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  const words = cleanName.split(/\s+/).filter(Boolean);
  let prefix = '';

  if (words.length >= 2) {
    prefix = (words[0].slice(0, 2) + words[1].slice(0, 1)).slice(0, 3);
  } else if (words.length === 1) {
    prefix = words[0].slice(0, 3);
  }
  if (prefix.length < 3) {
    prefix = prefix.padEnd(3, 'X');
  }

  const typeSegment = type === 'ORIGINAL' ? 'ORI' : 'RP';

  let sizeSegment = '';
  if (packageSize && packageUnit) {
    const unitInitial = packageUnit.toLowerCase() === 'gram' ? 'G' : packageUnit.toLowerCase() === 'kg' ? 'K' : packageUnit.slice(0, 1).toUpperCase();
    sizeSegment = `-${packageSize}${unitInitial}`;
  } else {
    sizeSegment = `-${Math.floor(100 + Math.random() * 900)}`;
  }

  return `${prefix}-${typeSegment}${sizeSegment}`;
}

/**
 * Normalizes SKU for case-insensitive and whitespace-insensitive comparison.
 */
export function normalizeSKU(code: string): string {
  return code.trim().toUpperCase();
}
