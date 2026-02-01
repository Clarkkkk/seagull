import { describe, expect, it } from "vitest";

import { detectOverlaps, getFreeSlots, rangeFitsInSlots } from "./time-overlap";

describe("trip/time-overlap", () => {
  describe("detectOverlaps", () => {
    it("忽略没有时间的 item", () => {
      const overlaps = detectOverlaps([
        { id: "a", startsMinute: null, endsMinute: null },
        { id: "b", startsMinute: 60, endsMinute: 120 },
        { id: "c", startsMinute: null, endsMinute: 90 },
      ]);
      expect(overlaps).toEqual([]);
    });

    it("能检测出重叠区间（含链式重叠）", () => {
      const overlaps = detectOverlaps([
        { id: "a", startsMinute: 60, endsMinute: 120 },
        { id: "b", startsMinute: 90, endsMinute: 150 },
        { id: "c", startsMinute: 110, endsMinute: 130 },
      ]);

      expect(overlaps).toEqual([
        { aId: "a", bId: "b", overlapStartsMinute: 90, overlapEndsMinute: 120 },
        { aId: "a", bId: "c", overlapStartsMinute: 110, overlapEndsMinute: 120 },
        { aId: "b", bId: "c", overlapStartsMinute: 110, overlapEndsMinute: 130 },
      ]);
    });

    it("边界相接不算重叠", () => {
      const overlaps = detectOverlaps([
        { id: "a", startsMinute: 60, endsMinute: 120 },
        { id: "b", startsMinute: 120, endsMinute: 150 },
      ]);
      expect(overlaps).toEqual([]);
    });
  });

  describe("getFreeSlots + rangeFitsInSlots", () => {
    it("会合并相交或相接的 blocks，并返回剩余空闲区间", () => {
      const free = getFreeSlots({
        dayStartMinute: 0,
        dayEndMinute: 300,
        items: [
          { id: "a", startsMinute: 60, endsMinute: 120 },
          { id: "b", startsMinute: 120, endsMinute: 150 }, // 相接
          { id: "c", startsMinute: 200, endsMinute: 240 },
        ],
      });

      expect(free).toEqual([
        { startsMinute: 0, endsMinute: 60 },
        { startsMinute: 150, endsMinute: 200 },
        { startsMinute: 240, endsMinute: 300 },
      ]);
    });

    it("会把越界区间裁剪到 dayStart/dayEnd 以内", () => {
      const free = getFreeSlots({
        dayStartMinute: 100,
        dayEndMinute: 200,
        items: [
          { id: "a", startsMinute: 0, endsMinute: 120 }, // 被裁剪成 [100,120]
          { id: "b", startsMinute: 180, endsMinute: 400 }, // 被裁剪成 [180,200]
        ],
      });
      expect(free).toEqual([{ startsMinute: 120, endsMinute: 180 }]);
    });

    it("rangeFitsInSlots：完全包含才算 fits", () => {
      const slots = [
        { startsMinute: 0, endsMinute: 60 },
        { startsMinute: 120, endsMinute: 180 },
      ];

      expect(rangeFitsInSlots({ startsMinute: 10, endsMinute: 50 }, slots)).toBe(true);
      expect(rangeFitsInSlots({ startsMinute: 60, endsMinute: 61 }, slots)).toBe(false);
      expect(rangeFitsInSlots({ startsMinute: 130, endsMinute: 200 }, slots)).toBe(false);
    });
  });
});

