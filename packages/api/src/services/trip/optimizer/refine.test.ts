import { refineOrderWithDistanceFn } from "./refine";
import { describe, expect, test } from "vitest";

type Item = { id: string; lat: number; lng: number };

const getPoint = (t: Item) => ({ lat: t.lat, lng: t.lng });

describe("refineOrderWithDistanceFn", () => {
  test("works with sync distanceFn", async () => {
    const items: Item[] = [
      { id: "a", lat: 0, lng: 0 },
      { id: "b", lat: 0, lng: 10 },
      { id: "c", lat: 10, lng: 10 },
      { id: "d", lat: 10, lng: 0 },
    ];

    const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const dx = a.lat - b.lat;
      const dy = a.lng - b.lng;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const out = await refineOrderWithDistanceFn({ items, getPoint, distanceFn: dist });
    expect(out.map((x) => x.id).sort()).toEqual(items.map((x) => x.id).sort());
  });

  test("works with async distanceFn (best-effort wrapper)", async () => {
    const items: Item[] = [
      { id: "a", lat: 0, lng: 0 },
      { id: "b", lat: 0, lng: 10 },
      { id: "c", lat: 10, lng: 10 },
      { id: "d", lat: 10, lng: 0 },
    ];

    const asyncDist = async (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const dx = a.lat - b.lat;
      const dy = a.lng - b.lng;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const out = await refineOrderWithDistanceFn({ items, getPoint, distanceFn: asyncDist });
    expect(out.map((x) => x.id).sort()).toEqual(items.map((x) => x.id).sort());
  });
});
