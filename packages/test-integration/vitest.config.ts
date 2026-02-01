import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  define: {
    __DEV__: false,
  },
  resolve: {
    alias: [
      // Make this higher priority than "~" so "~/utils/auth" doesn't resolve to Expo's better-auth client.
      { find: "~/utils/auth", replacement: path.resolve(__dirname, "./src/expo/mocks/auth.ts") },
      { find: "~/navigation/nav", replacement: path.resolve(__dirname, "./src/expo/mocks/nav.ts") },
      { find: "~", replacement: path.resolve(__dirname, "../../apps/expo/src") },

      // Avoid pulling react-native/better-auth Expo dependencies into jsdom tests (safety net).
      {
        find: path.resolve(__dirname, "../../apps/expo/src/utils/auth.ts"),
        replacement: path.resolve(__dirname, "./src/expo/mocks/auth.ts"),
      },

      // react-native package contains Flow syntax Vite can't parse in SSR tests.
      { find: "react-native", replacement: path.resolve(__dirname, "./src/expo/mocks/react-native.ts") },
      { find: "expo-constants", replacement: path.resolve(__dirname, "./src/expo/mocks/expo-constants.ts") },
      { find: "expo-secure-store", replacement: path.resolve(__dirname, "./src/expo/mocks/expo-secure-store.ts") },

      // React Navigation pulls native-only modules; we stub it for business-hook tests.
      {
        find: "@react-navigation/native",
        replacement: path.resolve(__dirname, "./src/expo/mocks/react-navigation-native.ts"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

