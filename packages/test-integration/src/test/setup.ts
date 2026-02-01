import { vi } from "vitest";

/**
 * Expo code resolves API baseUrl via EXPO_PUBLIC_API_URL first.
 * In tests (node/jsdom), `expo-constants` hostUri is not present, so we set it explicitly.
 */
process.env.EXPO_PUBLIC_API_URL ??= "http://test.local";

/**
 * A delegating fetch so each test can switch the handler without re-importing modules.
 */
let activeFetch: typeof fetch | null = null;

export function setTestFetch(next: typeof fetch) {
  activeFetch = next;
}

globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  if (!activeFetch) {
    throw new Error(
      "[test] global fetch is not configured. Call setTestFetch(...) in your test.",
    );
  }
  return await activeFetch(...args);
}) as typeof fetch;

/**
 * Minimal mocks so importing Expo-shared modules doesn't explode in jsdom/node.
 * We avoid mocking react-query/tRPC itself—only the Expo-specific platform deps.
 */
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: { hostUri: null },
  },
}));

