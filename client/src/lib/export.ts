/**
 * Share a report as a CSV. On iPhone the share sheet is the natural route
 * (mail it, drop it in Files, send it to the manager on WhatsApp); elsewhere
 * it falls back to a plain download.
 */
export async function shareCsv(filename: string, rows: (string | number)[][]) {
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

  // Excel opens UTF-8 CSVs correctly only when they carry a BOM.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const file = new File([blob], filename, { type: 'text/csv' });

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
