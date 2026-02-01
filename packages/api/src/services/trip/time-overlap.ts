export type TimeRange = { startsMinute: number; endsMinute: number };

export type ItemWithTime = {
  id: string;
  startsMinute: number | null;
  endsMinute: number | null;
};

export type Overlap = {
  aId: string;
  bId: string;
  overlapStartsMinute: number;
  overlapEndsMinute: number;
};

export function detectOverlaps(items: ItemWithTime[]): Overlap[] {
  const timed = items
    .filter((it): it is { id: string; startsMinute: number; endsMinute: number } => {
      return it.startsMinute !== null && it.endsMinute !== null;
    })
    .slice()
    .sort((a, b) => a.startsMinute - b.startsMinute);

  const overlaps: Overlap[] = [];
  for (let i = 0; i < timed.length; i += 1) {
    const a = timed[i]!;
    for (let j = i + 1; j < timed.length; j += 1) {
      const b = timed[j]!;
      if (b.startsMinute >= a.endsMinute) break;
      const s = Math.max(a.startsMinute, b.startsMinute);
      const e = Math.min(a.endsMinute, b.endsMinute);
      if (s < e) overlaps.push({ aId: a.id, bId: b.id, overlapStartsMinute: s, overlapEndsMinute: e });
    }
  }
  return overlaps;
}

export function getFreeSlots(args: {
  items: ItemWithTime[];
  dayStartMinute?: number;
  dayEndMinute?: number;
}): Array<{ startsMinute: number; endsMinute: number }> {
  const dayStart = args.dayStartMinute ?? 0;
  const dayEnd = args.dayEndMinute ?? 1440;

  const blocks = args.items
    .filter((it): it is { id: string; startsMinute: number; endsMinute: number } => {
      return it.startsMinute !== null && it.endsMinute !== null;
    })
    .map((it) => ({
      startsMinute: Math.max(dayStart, it.startsMinute),
      endsMinute: Math.min(dayEnd, it.endsMinute),
    }))
    .filter((b) => b.startsMinute < b.endsMinute)
    .sort((a, b) => a.startsMinute - b.startsMinute);

  // Merge blocks
  const merged: Array<{ startsMinute: number; endsMinute: number }> = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (!last || b.startsMinute > last.endsMinute) {
      merged.push({ ...b });
    } else {
      last.endsMinute = Math.max(last.endsMinute, b.endsMinute);
    }
  }

  const free: Array<{ startsMinute: number; endsMinute: number }> = [];
  let cursor = dayStart;
  for (const b of merged) {
    if (cursor < b.startsMinute) free.push({ startsMinute: cursor, endsMinute: b.startsMinute });
    cursor = Math.max(cursor, b.endsMinute);
  }
  if (cursor < dayEnd) free.push({ startsMinute: cursor, endsMinute: dayEnd });
  return free;
}

export function rangeFitsInSlots(range: TimeRange, slots: Array<{ startsMinute: number; endsMinute: number }>): boolean {
  return slots.some((s) => s.startsMinute <= range.startsMinute && range.endsMinute <= s.endsMinute);
}

