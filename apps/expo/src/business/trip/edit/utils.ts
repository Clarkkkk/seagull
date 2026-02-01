import type { EditItem } from "./types";

export function minutesToHHMM(m: number) {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatRange(s: number | null, e: number | null) {
  if (s === null || e === null) return "—";
  return `${minutesToHHMM(s)}-${minutesToHHMM(e)}`;
}

export function normalizeOrders(items: EditItem[]): EditItem[] {
  const byDay = new Map<string, EditItem[]>();
  for (const it of items) {
    const key = it.dayIndex === null ? "unassigned" : String(it.dayIndex);
    const arr = byDay.get(key) ?? [];
    arr.push(it);
    byDay.set(key, arr);
  }

  const normalized: EditItem[] = [];
  for (const [key, arr] of byDay.entries()) {
    const dayIndex = key === "unassigned" ? null : Number(key);
    const sorted = [...arr].sort((a, b) => a.order - b.order);
    sorted.forEach((it, idx) => normalized.push({ ...it, dayIndex, order: idx }));
  }
  return normalized;
}
