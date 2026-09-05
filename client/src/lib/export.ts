import { buildXlsx, type Sheet } from './xlsx';

type Delivery = 'shared' | 'downloaded' | 'cancelled';

/**
 * On iPhone the share sheet is the natural destination for a file (mail it,
 * drop it in Files, send it to the manager on WhatsApp); everywhere else a
 * plain download is right.
 */
async function deliver(blob: Blob, filename: string, mime: string): Promise<Delivery> {
  const file = new File([blob], filename, { type: mime });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      // A cancelled share sheet is not an error worth reporting.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** A real .xlsx workbook — numbers stay numbers, so Excel can total them. */
export function shareXlsx(filename: string, sheets: Sheet[]) {
  return deliver(
    buildXlsx(sheets),
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

/**
 * Share a report as a CSV. On iPhone the share sheet is the natural route
 * (mail it, drop it in Files, send it to the manager on WhatsApp); elsewhere
 * it falls back to a plain download.
 */
export function shareCsv(filename: string, rows: (string | number)[][]): Promise<Delivery> {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? '');
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');

  // Excel opens UTF-8 CSVs correctly only when they carry a BOM — without it,
  // Kurdish and Arabic text arrives as mojibake.
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  return deliver(blob, filename, 'text/csv');
}
