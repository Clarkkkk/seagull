import { vi } from "vitest";

/**
 * Expo code resolves API baseUrl via EXPO_PUBLIC_API_URL first.
 * In tests (node/jsdom), `expo-constants` hostUri is not present, so we set it explicitly.
 */
process.env.EXPO_PUBLIC_API_URL ??= "http://test.local";

/**
 * Expo Modules Core expects a global `expo` object (native runtime).
 * In node/jsdom tests we provide the minimal shape used by expo-modules-core
 * so that packages like `expo-image-picker` can be safely mocked/imported.
 */
(globalThis as any).expo ??= {
  modules: new Map([
    [
      "ExpoModulesCoreJSLogger",
      {
        // noop
        log: () => undefined,
      },
    ],
  ]),
  EventEmitter: class {
    addListener() {
      return { remove: () => undefined };
    }
    removeAllListeners() {
      return undefined;
    }
  },
};

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


