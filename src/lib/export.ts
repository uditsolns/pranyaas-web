/**
 * Export data as CSV or PDF (simple table layout).
 */

export function exportCSV(filename: string, columns: { key: string; label: string }[], data: Record<string, any>[]) {
  const header = columns.map(c => `"${c.label}"`).join(",");
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportPDF(title: string, columns: { key: string; label: string }[], data: Record<string, any>[]) {
  const colWidths = columns.map(c => Math.max(c.label.length, ...data.map(r => String(r[c.key] ?? "").length)));
  const totalChars = colWidths.reduce((a, b) => a + b, 0) + columns.length * 3;
  const pageWidth = Math.max(800, totalChars * 7);

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: auto; margin: 20mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; }
  h1 { font-size: 18px; margin-bottom: 4px; color: #1a1a2e; }
  .meta { font-size: 10px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: right; }
</style></head><body>
<h1>${title}</h1>
<div class="meta">Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} &middot; ${data.length} records</div>
<table><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>`;

  for (const row of data) {
    html += "<tr>" + columns.map(c => `<td>${escapeHtml(String(row[c.key] ?? "—"))}</td>`).join("") + "</tr>";
  }

  html += `</tbody></table>
<div class="footer">Pranyaas ElderCare &middot; Confidential</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  }
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
