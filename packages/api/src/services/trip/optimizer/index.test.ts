import { optimizeTripPlan } from "./index";
import { describe, expect, test } from "vitest";

describe("optimizeTripPlan", () => {
  test("returns day plans for each day and unassigns missing coordinates", async () => {
    const res = await optimizeTripPlan({
      days: [{ dayIndex: 0 }, { dayIndex: 1 }],
      items: [
        // Day0 fixed anchor
        { id: "a", title: "a", lat: 0, lng: 0, startsMinute: 60, endsMinute: 120, dayIndex: 0 },
        // flexible
        { id: "x", title: "x", lat: 1, lng: 1, startsMinute: null, endsMinute: null, dayIndex: null },
        { id: "y", title: "y", lat: null, lng: null, startsMinute: null, endsMinute: null, dayIndex: null },
      ],
      scope: "onlyUnscheduled",
      defaultVisitMinutes: 90,
      dayStartMinute: 0,
      dayEndMinute: 1440,
    });

    expect(res.dayPlans).toHaveLength(2);
    expect(res.dayPlans.map((d) => d.dayIndex).sort()).toEqual([0, 1]);

    const allIds = res.dayPlans.flatMap((d) => d.orderedItemIds);
    expect(allIds).toContain("a");
    expect(allIds).toContain("x");
    expect(allIds).not.toContain("y");

    expect(res.unassigned).toEqual([{ itemId: "y", reason: "missing_coordinates" }]);
  });

  test("keeps anchors ordered by startsMinute", async () => {
    const res = await optimizeTripPlan({
      days: [{ dayIndex: 0 }],
      items: [
        { id: "a", title: "a", lat: 0, lng: 0, startsMinute: 300, endsMinute: 360, dayIndex: 0 },
        { id: "b", title: "b", lat: 0, lng: 1, startsMinute: 100, endsMinute: 160, dayIndex: 0 },
        { id: "x", title: "x", lat: 0, lng: 2, startsMinute: null, endsMinute: null, dayIndex: null },
      ],
      scope: "all",
      defaultVisitMinutes: 90,
      dayStartMinute: 0,
      dayEndMinute: 1440,
    });

    const day0 = res.dayPlans.find((d) => d.dayIndex === 0)!;
    const bPos = day0.orderedItemIds.indexOf("b");
    const aPos = day0.orderedItemIds.indexOf("a");
    expect(bPos).toBeGreaterThanOrEqual(0);
    expect(aPos).toBeGreaterThanOrEqual(0);
    expect(bPos).toBeLessThan(aPos);
  });
});
