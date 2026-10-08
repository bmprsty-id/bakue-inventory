/**
 * Formats ISO date string to standard Indonesian format.
 * Example: "03 Okt 2026, 09:20"
 */
export function formatIndoDateTime(isoString: string | Date): string {
  try {
    const d = typeof isoString === 'string' ? new Date(isoString) : isoString;
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

/**
 * Returns user-friendly Indonesian relative or short date
 * e.g., "Hari ini 09:30", "Kemarin 14:20", or "03 Okt 2026, 09:20"
 */
export function formatIndoRelative(isoString: string | Date): string {
  try {
    const d = typeof isoString === 'string' ? new Date(isoString) : isoString;
    if (isNaN(d.getTime())) return '-';

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `Hari ini ${hours}:${minutes}`;
    }
    if (isYesterday) {
      return `Kemarin ${hours}:${minutes}`;
    }

    return formatIndoDateTime(d);
  } catch {
    return '-';
  }
}
