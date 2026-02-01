import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  return {
    reverseGeocode: vi.fn(async () => ({
      formattedAddress: "Hangzhou, Zhejiang, China",
      country: "China",
      province: "Zhejiang",
      city: "Hangzhou",
    })),
    searchPlaces: vi.fn(async () => []),
  };
});

vi.mock("./mapbox", () => ({
  createMapboxProvider: () => ({
    id: "mapbox",
    reverseGeocode: hoisted.reverseGeocode,
    searchPlaces: hoisted.searchPlaces,
  }),
}));

describe("map-provider", () => {
  it("getMapProvider：不支持的 provider 会抛错", async () => {
    hoisted.reverseGeocode.mockClear();
    process.env.MAP_PROVIDER = "nope";
    const { getMapProvider } = await import("./index");
    expect(() => getMapProvider()).toThrow(/Unsupported MAP_PROVIDER/i);
  });

  it("reverseGeocodeCached：同一坐标命中缓存，避免重复调用 provider", async () => {
    hoisted.reverseGeocode.mockClear();
    process.env.MAP_PROVIDER = "mapbox";
    const { reverseGeocodeCached } = await import("./index");

    const v1 = await reverseGeocodeCached(30.2741, 120.1551);
    const v2 = await reverseGeocodeCached(30.2741, 120.1551);

    expect(v1).toEqual(v2);
    expect(hoisted.reverseGeocode).toHaveBeenCalledTimes(1);
  });

  it("reverseGeocodeCached：round5 归一化（1e-5 精度）", async () => {
    hoisted.reverseGeocode.mockClear();
    process.env.MAP_PROVIDER = "mapbox";
    const { reverseGeocodeCached } = await import("./index");

    await reverseGeocodeCached(1.000001, 2.000001);
    await reverseGeocodeCached(1.000002, 2.000002);

    // 两次应该命中同一 key
    expect(hoisted.reverseGeocode).toHaveBeenCalledTimes(1);
  });
});

