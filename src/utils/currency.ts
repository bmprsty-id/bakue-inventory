/**
 * Formats a number to Indonesian Rupiah currency format.
 * Example: 12000 -> "Rp12.000"
 */
export function formatRupiah(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s+/g, ''); // Ensure no whitespace: "Rp12.000"
}
