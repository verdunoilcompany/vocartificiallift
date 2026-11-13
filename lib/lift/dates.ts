/** ISO-date (YYYY-MM-DD) helpers that work in UTC so there are no timezone off-by-ones. */

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-11-11" → "2026/11/11", matching the dashboard controls. */
export function slashDate(iso: string): string {
  return iso.replaceAll("-", "/");
}

/** "2026-11-11T17:35:00Z" → "11/11/2026 5:35 PM" in local time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}/${y}`;
}
