import { vi } from "vitest";

export const nav = {
  back: vi.fn(() => undefined),
  openPickLocation: vi.fn((_params: unknown) => undefined),
  replaceToTripEdit: vi.fn((_tripId: string) => undefined),
  replaceToWishlistDetail: vi.fn((_jarId: string) => undefined),
  toLogin: vi.fn((_email?: string) => undefined),
};

