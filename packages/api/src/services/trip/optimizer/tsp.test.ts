import { pathDistance, twoOpt } from "./tsp";
import { describe, expect, test } from "vitest";

type Pt = { id: string; lat: number; lng: number };

const p = (id: string, lat: number, lng: number): Pt => ({ id, lat, lng });

describe("tsp", () => {
  test("twoOpt does not worsen path distance (monotonic non-increasing)", () => {
    const route = [p("a", 0, 0), p("b", 0, 10), p("c", 10, 10), p("d", 10, 0), p("e", 5, 5)];

    const getPoint = (x: Pt) => ({ lat: x.lat, lng: x.lng });
    const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const dx = a.lat - b.lat;
      const dy = a.lng - b.lng;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const before = pathDistance(route, getPoint, dist);
    const afterRoute = twoOpt(route, getPoint, dist, 200);
    const after = pathDistance(afterRoute, getPoint, dist);

    expect(after).toBeLessThanOrEqual(before + 1e-9);
    expect(afterRoute.map((x) => x.id).sort()).toEqual(route.map((x) => x.id).sort());
  });
});
