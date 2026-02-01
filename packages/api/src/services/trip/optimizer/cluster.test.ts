import { clusterAndAssignDays } from "./cluster";
import { describe, expect, test } from "vitest";

function item(
  args: Partial<{
    id: string;
    title: string;
    lat: number | null;
    lng: number | null;
    startsMinute: number | null;
    endsMinute: number | null;
    dayIndex: number | null;
  }> & { id: string },
) {
  return {
    id: args.id,
    title: args.title ?? args.id,
    // Preserve nulls for tests that assert missing coordinate handling.
    lat: args.lat === undefined ? 0 : args.lat,
    lng: args.lng === undefined ? 0 : args.lng,
    startsMinute: args.startsMinute ?? null,
    endsMinute: args.endsMinute ?? null,
    dayIndex: args.dayIndex ?? null,
  };
}

describe("clusterAndAssignDays", () => {
  test("assigns unscheduled items to nearest day centroid and respects capacity", () => {
    const input = {
      days: [{ dayIndex: 10 }, { dayIndex: 20 }],
      items: [
        // fixed anchors
        item({ id: "a", dayIndex: 10, lat: 1, lng: 1, startsMinute: 100, endsMinute: 160 }),
        item({ id: "b", dayIndex: 20, lat: 50, lng: 50, startsMinute: 200, endsMinute: 260 }),
        // candidates
        item({ id: "x", lat: 2, lng: 2, dayIndex: null }),
        item({ id: "y", lat: 49, lng: 49, dayIndex: null }),
      ],
      scope: "onlyUnscheduled" as const,
      defaultVisitMinutes: 90,
      dayStartMinute: 0,
      dayEndMinute: 1440,
    };

    const { assigned, unassigned } = clusterAndAssignDays(input);

    expect(unassigned).toEqual([]);
    expect((assigned.get(10) ?? []).map((i) => i.id)).toEqual(expect.arrayContaining(["a", "x"]));
    expect((assigned.get(20) ?? []).map((i) => i.id)).toEqual(expect.arrayContaining(["b", "y"]));
  });

  test("marks items without coordinates as unassigned with missing_coordinates", () => {
    const input = {
      days: [{ dayIndex: 0 }],
      items: [item({ id: "x", lat: null, lng: null, dayIndex: null })],
      scope: "onlyUnscheduled" as const,
      defaultVisitMinutes: 90,
      dayStartMinute: 0,
      dayEndMinute: 1440,
    };

    const { unassigned, assigned } = clusterAndAssignDays(input);

    expect(unassigned).toHaveLength(1);
    expect(unassigned[0]!.item.id).toBe("x");
    expect(unassigned[0]!.reason).toBe("missing_coordinates");
    expect(assigned.get(0) ?? []).toHaveLength(0);
  });

  test("respects free-time capacity derived from fixedMinutes", () => {
    const input = {
      days: [{ dayIndex: 0 }],
      items: [
        item({ id: "a", dayIndex: 0, lat: 1, lng: 1, startsMinute: 0, endsMinute: 1400 }),
        item({ id: "x", dayIndex: null, lat: 2, lng: 2 }),
      ],
      scope: "onlyUnscheduled" as const,
      defaultVisitMinutes: 90,
      dayStartMinute: 0,
      dayEndMinute: 1440,
    };

    const { unassigned, assigned } = clusterAndAssignDays(input);

    expect((assigned.get(0) ?? []).map((i) => i.id)).toEqual(["a"]);
    expect(unassigned).toHaveLength(1);
    expect(unassigned[0]!.item.id).toBe("x");
    expect(unassigned[0]!.reason).toBe("insufficient_free_time_capacity");
  });
});
