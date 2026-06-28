/**
 * Parse a range query param into a date window.
 * Supported: today, 7d, 30d, month, all
 */
export function parseDateRange(range: string | null): { from: Date | null; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (!range || range === 'all') {
    return { from: null, to };
  }

  let from: Date;

  switch (range.toLowerCase()) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      from = new Date(to);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case '30d':
      from = new Date(to);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return { from: null, to };
  }

  return { from, to };
}
